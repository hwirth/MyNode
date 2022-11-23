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

		const handled_commands  = [];
		const rejected_commands = [];
		const request_id = {
			tag: message.tag,
			request: null,
		}

		const client = self.protocols.session.getClientByAddress( client_address );
		if (!client) {
			color_log( COLORS.ERROR, 'ERROR', 'Router.onMessage:0: Unknown client:', client_address );
			callback.broadcast({ 'ROUTER ERROR 1': 'Unknown client in onMessage' });
			return;
		}


		function send_error (error, catch_mode = '') {
			color_log( COLORS.ERROR, 'ERROR Router.onMessage-send_error:', error );

			callback.broadcast({
				//...?settings  address  : client_address,
				type     : 'error/router/' + catch_mode,
				tag      : request_id.tag,
				request  : request_id.request || null,
				success  : false,
				reason   : REASONS.APPLICATION_ERROR,
				error    : format_error( error ),
			});
		}


		async function call_request_handler (protocol_name, command_name) {
			const combined_name = protocol_name + '.' + command_name;
			const request_handler = self.protocols[protocol_name].request[command_name];

			++request_id.request;
			request_id.command = combined_name;

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

					try {
						await request_handler(
							client,
							request_id,
							request_arguments

						).catch( (error)=>{
							send_error( error, 3 );
						});

					} catch (error) {
						send_error( error, 4 );
					}

				} else {
					if (DEBUG.ROUTER) color_log( COLORS.ROUTER, 'SYNC', combined_name );

					try {
						request_handler(
							client,
							request_id,
							request_arguments,
						);

					} catch (error) {
						send_error( error, 5 );
					}
				}

			} catch (error) {
				send_error( error, 'T/C:2' );
			}

			if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onMessage:', 'POST COMMAND: ' );

		} // call_request_handler


		// For each protocol addressed (top level key),  call_request_handler(...);

		let handler_count = 0;
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

		if (typeof message == 'string') {
			color_log(
				COLORS.WARNING,
				'Not JSON:',
				'String "' + message + '", ignoring',
			);
			return;
		}

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

		const debug_message = {
			response: {
				time      : Date.now(),
				type      : 'rejected',
				tag       : request_id.tag,
				request   : request_id.request,
			},
		};
		if (handled_commands .length) debug_message.response.handled = handled_commands;
		if (true || rejected_commands.length) {
			debug_message.response = {
				...debug_message.response,
				success  : debug_message.success,
				rejected : rejected_commands,
			}
		}

		if (SETTINGS.REPORT_HANDLED || rejected_commands.length) {
			debug_message.response.success = (rejected_commands.length === 0);
			send_as_json( socket, debug_message );
		}

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


	this.reset = function () {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'Router.reset' );

	}; // reset


	this.init = async function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Router.init' );

		self.protocols = {};

// PROTOCOL INTERFACE ////////////////////////////////////////////////////////////////////////////////////////////119:/
		const SessionHandler = require( './session.js' );
		const AccessControl  = require( './access.js' );
		const ServerControl  = require( './server.js' );
		const ChatServer     = require( './chat/main.js' );
		const RSSServer      = require( './rss/main.js' );

		const registered_callbacks = {
			broadcast              : (...params)=>{ return self.protocols.session.broadcast(...params); },
			reset                  : callback.reset,
			triggerExit            : callback.triggerExit,
			verifyToken            : (...params)=>{ return self.protocols.mcp.verifyToken(...params); },
			getRules               : ()=>{ return self.protocols.access.rules; },
			getProtocols           : ()=>self.protocols,
			getWho                 : (...params)=>{ return self.protocols.session.getWho(...params); },
			getAllClients          : ()=>{ return persistent.session.clients; },
			getAllPersistentData   : ()=>{ return persistent; },
			getProtocolDescription : (show_line_numbers)=>{
				return self.protocols.access
				.getProtocolDescription( show_line_numbers );//...?
			},
		};

		const registered_protocols = {
			session: {
				template: SessionHandler,
				callbacks: [
					'broadcast',
					'verifyToken',
					'getAllClients',
				],
			},
			access: {
				template: AccessControl,
			},
			//...server: { template: ServerControl, callbacks: Object.keys(registered_callbacks) },
			server: {
				template: ServerControl,
				callbacks : [
					'broadcast',
					'reset',
					'getRules',
					'getUpTime',
					'getProtocols',
					'getAllClients',
					'getAllPersistentData',
					'getProtocolDescription',
					'triggerExit',
				],
			},
			chat: {
				template: ChatServer,
				callbacks : [
					'broadcast',
					'getWho',
					'getAllClients',
				],
			},
			rss: {
				template: RSSServer,
				callbacks : [
					'broadcast',
				],
			},
		};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const declared_rules = [];
		function meta (rule) {
			//...console.log( COLORS.ACCESS + 'RULE' + COLORS.RESET + ': ' + rule );
			declared_rules.push( rule );
		}


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

			self.protocols[protocol_name] = await new protocol.template( data, new_callbacks, meta );
		});

		await Promise.all( load_requests );


		// Protocol description

		const registered_rules   = registered_callbacks.getProtocolDescription().split('\n');
		const validation_results = { registered:{}, declared:{} };

		function log (type, rule, good) {
			validation_results[type][rule] = !!good;
			//...color_log( COLORS[good ? 'ROUTER' : 'WARNING'], type + ':', rule );
		}

		declared_rules.forEach( (description)=>{
			const found = registered_rules.find( rule => rule == description );
			log( 'declared', description, found );
		});
		registered_rules.forEach( (description)=>{
			const found = declared_rules.find( rule => rule == description );
			log( 'registered', description, found );
		});
persistent.access.descriptionState = validation_results;
		//color_log( COLORS.ROUTER, 'Protocols:', Object.keys(self.protocols), validation_results );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const router = await new Router();

}; // Router


//EOF
