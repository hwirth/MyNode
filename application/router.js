// router.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { REASONS         } = require( './constants.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump, format_error } = require( '../server/debug.js' );


const WebSocketClient = require( './client.js' );


module.exports.Router = function (persistent, callback) {
	const self = this;

	this.protocols;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function send_as_json (socket, data) {
		const stringified_json = JSON.stringify( data, null, '\t' );

		if (DEBUG.MESSAGE_OUT) color_log(
			COLORS.ROUTER,
			'Router-send_as_json:',
			JSON.parse( stringified_json ),   // Re-parsing turns it into a single line
		);

		if (socket.send) socket.send( stringified_json );

	} // send_as_json


	function log_persistent (event_name, caption = '') {
		color_log(
			COLORS.ROUTER,
			'Router.' + event_name + ':',
			caption + 'persistent:',
			persistent, //.clients,
		);

	} // log_persistent


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = function (socket, client_address) {
		self.protocols.session.onConnect( socket, client_address );   // Will create new  WebSocketClient()
		if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onConnect' );

	}; // onConnect


	this.onDisconnect = function (socket, client_address) {
		self.protocols.session.onDisconnect( socket, client_address );
		if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onDisconnect' );

	}; // onDisconnect


// ON MESSAGE ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onMessage = async function (socket, client_address, message) {
		// A message can contain multiple commands. We will keep track of failures and sucesses,
		// find the right protocol and pass on the message to the final response handler.
		// JSON format: { <protocol>: { <command>: { <request> }}}
		// Main level keys designate target protocol, second level a command
		// Since keys in objects must be unique, each command can only be used once

		const request_id = message;   //...? Usually .tag is used, but not always

		const client = self.protocols.session.getClientByAddress( client_address );
		if (!client) {
			color_log( COLORS.ERROR, 'ERROR', 'Router.onMessage:0: Unknown client:', client_address );
			callback.broadcast({ 'ROUTER ERROR 1': 'Unknown client in onMessage' });
			return;
		}


		function send_error (error, catch_mode = '') {
			const new_message = {
				tag      : request_id.tag,
				success  : false,
				reason   : REASONS.INTERNAL_ERROR,
			};

			const show_full_report = client.login && client.inGroup( 'admin', 'dev' );

			if (show_full_report) {
				color_log( COLORS.ERROR, 'ERROR Router.onMessage:1' );
				new_message.response = format_error( error );
			} else {
				color_log( COLORS.ERROR, 'ERROR Router.onMessage-send_error:', error );
			}

			callback.broadcast({ ['ROUTER ERROR ' + catch_mode + ':']: new_message });
		}


		const handled_commands = [];
		const rejected_commands = [];

		async function call_request_handler (protocol_name, command_name) {
			const combined_name = protocol_name + '.' + command_name;
			const request_handler = self.protocols[protocol_name].request[command_name];

			if (!request_handler) {
				rejected_commands.push( combined_name );

				if (DEBUG.ROUTER) color_log(
					COLORS.ERROR,
					'Router.onMessage:',
					'unknown command:',
					combined_name,
				);

				return;
			}


			handled_commands.push( combined_name );

			if (DEBUG.ROUTER) color_log(
				COLORS.ROUTER,
				'Router.onMessage:',
				'request_handler: ',
				request_handler,
			);

			if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onMessage:', 'PRE COMMAND: ' );

			const request_arguments = message[protocol_name][command_name];

			try {
				//... How do I catch, when I accidentially
				//... forgot to await something in there?
				if (request_handler.constructor.name === 'AsyncFunction') {
					if (DEBUG.ROUTER) color_log( COLORS.ROUTER, 'AWAIT:', combined_name );

					await request_handler(
						client,
						request_id,
						request_arguments

					).catch( (error)=>{
						send_error( error, 3 );
					});

				} else {
					if (DEBUG.ROUTER) color_log( COLORS.ROUTER, 'SYNC', combined_name );

					try {
						request_handler(
							client,
							request_id,
							request_arguments,
						);

					} catch (error) {
						send_error( error, 4 );
					}
				}

			} catch (error) {
				send_error( error, 'T/C:2' );
			}

			if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onMessage:', 'POST COMMAND: ' );

		} // call_request_handler


		// For each protocol addressed (top level key),  call_request_handler(...);

		const handler_calls = async ([protocol_name, protocol_command_names]) => {
			const protocol = self.protocols[protocol_name];

			if (!protocol) {
				rejected_commands.push( protocol_name );

				if (DEBUG.ROUTER) color_log(
					COLORS.WARNING,
					'Router.onMessage:',
					'unknown protocol:',
					protocol_name,
				);

			} else {
				if (DEBUG.ROUTER) color_log(
					COLORS.ROUTER,
					'Router.onMessage:',
					'protocol_commands:',
					Object.keys( message[protocol_name] ),
				);

				if (protocol.onMessage) {
					protocol.onMessage( socket, client_address, message );
				}

				const commands = Object.keys( protocol_command_names );
				await commands.reduce( async (prev, command_name)=>{
					// Enforce execution order on second level (commands)
					await prev;
					return call_request_handler(protocol_name, command_name);
				}, Promise.resolve());
			}

			return Promise.resolve();

		}/*.reduce( async (prev, next)=>{//...? Execution order of protocols currently not guaranteed
			// Enforce execution order on top level (protocols)
			await prev;
			return next;
		})*/;

		const tags                = ([protocol_name]) => protocol_name != 'tag';
		const addressed_protocols = Object.entries( message );
		const requests_processed  = addressed_protocols.filter( tags ).map( handler_calls );

		await Promise.allSettled( requests_processed );

		if (rejected_commands.length) color_log(
			COLORS.ROUTER,
			'Router.onMessage:',
			(rejected_commands.length ? COLORS.ERROR : COLORS.DEFAULT)
			+ 'Commands handled/rejected:'
			+ COLORS.DEFAULT
			, handled_commands.length
			, '/'
			, rejected_commands.length
		);

		const debug_message = { protocols: {} };
		if (handled_commands .length) debug_message.protocols.handled  = handled_commands;
		if (rejected_commands.length) debug_message.protocols.rejected = rejected_commands;
		if (rejected_commands.length) send_as_json( socket, debug_message );

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Router.exit' );

		return Promise.allSettled(
			Object.keys( self.protocols ).map( (name)=>{
				return (
					self.protocols[name].exit
					? self.protocols[name].exit()
					: Promise.resolve()
				);
			}),
		);

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Router.init' );

		self.protocols = {};

// PROTOCOL INTERFACE ////////////////////////////////////////////////////////////////////////////////////////////119:/
		const SessionHandler = require( './session.js' );
		const AccessControl  = require( './access.js' );
		const MasterControl  = require( './mcp/main.js' );
		const ChatServer     = require( './chat/main.js' );

		const registered_callbacks = {
			broadcast              : (...params)=>{ return self.protocols.session.broadcast(...params); },
			reset                  : callback.reset,
			triggerExit            : callback.triggerExit,
			verifyToken            : (...params)=>{ return self.protocols.mcp.verifyToken(...params); },
			getProtocols           : ()=>self.protocols,
			getAllClients          : ()=>{ return persistent.session.clients; },
			getAllPersistentData   : ()=>{ return persistent; },
			getProtocolDescription : (show_line_numbers)=>{
				return self.protocols.access
				.getProtocolDescription( show_line_numbers );//...?
			},
		};

		const registered_protocols = {
			session : { template: SessionHandler,
				callbacks: [
					'verifyToken',
					'getAllClients',
				],
			},
			access  : { template: AccessControl },

			//...mcp    : { template: MasterControl, callbacks: Object.keys(registered_callbacks) },
			mcp     : { template: MasterControl,
				callbacks : [
					'broadcast',
					'reset',
					'getUpTime',
					'getProtocols',
					'getAllPersistentData',
					'getProtocolDescription',
					'triggerExit',
				],
			},
			chat    : { template: ChatServer,
				callbacks : [
					'getAllClients',
				],
			},
		};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		// Instantiate protocols
		const load_requests = Object.keys( registered_protocols ).map( async (protocol_name)=>{
			if (!persistent[protocol_name]) {
				color_log( COLORS.PROTOCOL, 'No persistent data for protocol:', protocol_name );
				persistent[protocol_name] = {};
			}

			const protocol  = registered_protocols[protocol_name];
			const data      = persistent[protocol_name];

			const new_callbacks = {};
			if (protocol.callbacks) protocol.callbacks.forEach( (name)=>{
				new_callbacks[name] = registered_callbacks[name];
			});

			self.protocols[protocol_name] =
				await new protocol.template( data, new_callbacks );
		});

		await Promise.all( load_requests );

		color_log( COLORS.ROUTER, 'Protocols:', Object.keys(self.protocols) );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const router = await new Router();

}; // Router


//EOF
