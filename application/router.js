// router.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
const { REASONS         } = require( './constants.js' );


const WebSocketClient = require( './client.js' );


module.exports.Router = function (persistent, callback) {
	const self = this;

	this.protocols;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_persistent (event_name, caption = '') {
		if (DEBUG.ROUTER_PERSISTENT_DATA) color_log(
			COLORS.ROUTER,
			'Router.' + event_name + ':',
			caption + 'persistent:',
			persistent, //.clients,
		);

	} // log_persistent


	function send_as_json (socket, data) {
		const stringified_json = JSON.stringify( data, null, '\t' );

		if (DEBUG.MESSAGE_OUT) color_log(
			COLORS.ROUTER,
			'Router-send_as_json:',
			JSON.parse( stringified_json ),
		);
		//if (DEBUG.MESSAGE_OUT) color_log( COLORS.ROUTER, 'send_as_json:', data );
		if (socket.send) socket.send( stringified_json );

	} // send_as_json //... Redundant with same function in  SessionHandler()


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.ROUTER, 'Router.onConnect:', client_address );

		self.protocols.session.onConnect( socket, client_address );   // Will create new WebSocketClient()

		log_persistent( 'onConnect' );

	}; // onConnect


	this.onDisconnect = function (socket, client_address) {
		if (DEBUG.DISCONNECT) color_log( COLORS.ROUTER, 'Router.onDisconnect:', client_address );

		self.protocols.session.onDisconnect( socket, client_address );

		log_persistent( 'onDisconnect' );

	}; // onDisconnect


	function create_command_lut () {
		const lut = {};

		Object.keys( self.protocols ).forEach( (protocol_name)=>{
			const protocol_commands = self.protocols[protocol_name].request;

			if (protocol_commands) {
				Object.keys( protocol_commands ).forEach( (command_name)=>{
					const combined = protocol_name + '.' + command_name;
					lut[combined] = protocol_commands[command_name];
				});
			}
		});

		return lut;
	}

	this.onMessage = function (socket, client_address, message) {
		const request_id = message;

		const client = self.protocols.session.getClientByAddress( client_address );
		if (!client) {
			color_log( COLORS.ERROR, 'ERROR', 'Router.onMessage: Unknown client:', client_address );
			return;
		}

		function send_error (error) {
			if (typeof error != 'error') {
				send_as_json( socket, {
					tag      : message.tag,
					success  : false,
					response : error,
				});
				return;
			}

			let stringified_error = error.stack
			.replace( /\\n/g, '\n' )
			.replace( /\n    /g, '\n' )
			.replace( new RegExp(SETTINGS.BASE_DIR, 'g'), '' )
			;

			const new_message = {
				tag      : request_id.tag,
				success  : false,
				reason   : REASONS.INTERNAL_ERROR,
			};

			if (client.login && client.inGroup( 'admin' )) {
				color_log( COLORS.ERROR, 'ERROR Router.onMessage' );
				new_message.response = stringified_error;
			} else {
				color_log( COLORS.ERROR, 'ERROR Router.onMessage:2:', error );
			}

			send_as_json( socket, new_message );
		}


		const command_lut = create_command_lut();

		const handled_commands = [];
		const rejected_commands = [];


		// A message can have several protocol requests.
		// JSON format: { <protocol>: { <command>: { <request> }}}
		// Main level keys designate target protocol, second level a command
		// Since keys in objects must be unique, each command can only be used once
		Object.keys( message ).forEach( (protocol_name)=>{
			if (protocol_name == 'tag') return;

			// Registered protocol?
			if (!self.protocols[protocol_name]) {
				rejected_commands.push( protocol_name + '.*' );

				if (DEBUG.ROUTER) color_log(
					COLORS.ERROR,
					'Router.onMessage:',
					'unknown protocol:',
					protocol_name,
				);

			} else {
				// A protocol request can contain several commands
				const message_commands = message[protocol_name];

				if (DEBUG.ROUTER) color_log(
					COLORS.ROUTER,
					'Router.onMessage:',
					'protocol_commands:',
					self.protocols[protocol_name],
				);

				if (self.protocols[protocol_name].onMessage) {
					self.protocols[protocol_name].onMessage( socket, client_address, message );
				}

				Object.keys( message_commands ).forEach( (command_name)=>{
					const combined_name = protocol_name + '.' + command_name;

					const request_handler
					= self.protocols[protocol_name].request[command_name]
					;

					if (!request_handler) {
						rejected_commands.push( combined_name );

						if (DEBUG.ROUTER) color_log(
							COLORS.ERROR,
							'Router.onMessage:',
							'unknown command:',
							combined_name,
						);

					} else {
						handled_commands.push( combined_name );

						if (DEBUG.ROUTER) color_log(
							COLORS.ROUTER,
							'Router.onMessage:',
							'request_handler: ',
							request_handler
						);

						log_persistent( 'onMessage:', 'PRE COMMAND: ' );
						const request_arguments = message[ protocol_name ][ command_name ];

						//try {
							request_handler(
								client,
								request_id,
								request_arguments
							);
							//... How do I catch, when I accidentially
							//... forgot to await something in there?
//console.log( 'RESILT', result instanceof Promise );

						//} catch (error) {
//console.log( '>>>>>>>>>', typeof error, dump(error) );
//console.log( typeof request_handler );
//console.log( '>>>>>>' );
//console.log( request_handler.toString() );
//console.log( '>>>>>>' );
						//	send_error( error );
						//}

						log_persistent( 'onMessage:', 'POST COMMAND: ' );
					}
				});
			}
		});

		color_log(
			COLORS.ROUTER,
			'Router.onMessage:',
			(handled_commands.length ? COLORS.DEFAULT : COLORS.ERROR)
			+ 'nr_handled_commands'
			+ COLORS.DEFAULT
			, handled_commands.length
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


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Router.init' );

		self.protocols = {};

// PROTOCOL INTERFACE ////////////////////////////////////////////////////////////////////////////////////////////119:/
		const SessionHandler = require( './session.js' );
		const AccessControl  = require( './access.js' );
		const MasterControl  = require( './mcp/main.js' );
		const ChatServer     = require( './chat/main.js' );

		const registered_callbacks = {
			mcp                    : ()=>{ return self.protocols.mcp },
			getUpTime              : ()=>{ return self.protocols.server.getUpTime(); },
			getProtocols           : ()=>self.protocols,
			getAllPersistentData   : ()=>persistent,
			escalatePrivileges     : callback.escalatePrivileges,
			getProtocolDescription : (show_line_numbers)=>{
				return self.protocols.access
				.getProtocolDescription( show_line_numbers );
			},
		};

		const registered_protocols = {
			session : { template: SessionHandler, callbacks: ['mcp'] },
			access  : { template: AccessControl },
			//...mcp    : { template: MasterControl, callbacks: Object.keys(registered_callbacks) },
			mcp     : { template: MasterControl,
				callbacks : [
					'getUpTime',
					'getProtocosl',
					'getAllPersistentData',
					'escalatePrivileges',
					'triggerExit',
					'getProtocolDescription',
				],
			},
			chat    : { template: ChatServer },
		};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const load_requests = Object.keys( registered_protocols ).map( (protocol_name)=>{
			if (!persistent[protocol_name]) {
				color_log( COLORS.PROTOCOL, 'No persistent data for protocol:', protocol_name );
				persistent[protocol_name] = {};
			}

			const protocol  = registered_protocols[protocol_name];
			const data      = persistent     [protocol_name];

			const new_callbacks = {};
			if (protocol.callbacks) protocol.callbacks.forEach( (name)=>{
				new_callbacks[name] = registered_callbacks[name];
			});

			return new Promise( async (done)=>{
				self.protocols[protocol_name] =
					await new protocol.template( data, new_callbacks )
				;
				done();
			});
		});

		return Promise.allSettled( load_requests );

	}; // init


	return self.init().then( ()=>self );   // const protocols = await new Router();

}; // Router


//EOF
