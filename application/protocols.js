// protocols.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS, color_log } = require( '../server/debug.js' );

// Protocol object templates
const SessionHandler  = require( './session.js' ).SessionHandler;
const WebSocketClient = require( './session.js' ).WebSocketClient;
const ServerManager   = require( './server_manager.js' );
const ChatServer    = require( './chat/chat_main.js' );


module.exports.Protocols = function (persistent_data, callbacks) {
	const self = this;

	this.protocols;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_persistent_data (event_name, caption = '') {
		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.PROTOCOLS,
			'Protocols.' + event_name,
			caption + 'persistent_data:',
			persistent_data, //.clients,
		);

	} // log_persistent_data


	function send_as_json (socket, data) {
		if (DEBUG.MESSAGE_OUT) color_log( COLORS.PROTOCOLS, 'Protocols-send_as_json', data );
		if (socket.send) socket.send( JSON.stringify( data ) );
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.PROTOCOLS, 'Protocols.onConnect', client_address );

		if (persistent_data.session.clients[ client_address ]) {
			color_log( COLORS.PROTOCOLS, 'Protocols.onConnect: Client already logged in', client_address );
		}

		self.protocols.session.onConnect( socket, client_address );

		//persistent_data.session.clients[ client_address ] = new WebSocketClient( socket, client_address );

		log_persistent_data( 'onConnect' );

	}; // onConnect


	this.onDisconnect = function (socket, client_address) {
		if (DEBUG.DISCONNECT) color_log( COLORS.PROTOCOLS, 'Protocols.onDisconnect', client_address );

		if (! persistent_data.session.clients[ client_address ]) {
			color_log( COLORS.ERROR, 'ERROR', 'Protocols.onDisconnect: Unknown client:', client_address );
			return;
		}

		delete persistent_data.session.clients[ client_address ];

		log_persistent_data( 'onDisconnect' );

	}; // onDisconnect


	function create_command_lut () {
		const lut = {};

		Object.keys( self.protocols ).forEach( (protocol_name)=>{
			const protocol_commands = self.protocols[ protocol_name ].requestHandlers;

			Object.keys( protocol_commands ).forEach( (command_name)=>{
				const combined = protocol_name + '.' + command_name;
				lut[combined] = protocol_commands[ command_name ];
			});
		});

		return lut;
	}


	this.onMessage = function (socket, client_address, message) {
		if (DEBUG.MESSAGE_IN) color_log( COLORS.PROTOCOLS, 'Protocols.onMessage', client_address, message );

		const client = persistent_data.session.clients[ client_address ];
		if (! client) {
			color_log( COLORS.ERROR, 'ERROR', 'Protocols.onMessage: Unknown client:', client_address );
			return;
		}

		const command_lut = create_command_lut();

		const handled_commands = [];
		const rejected_commands = [];

		Object.keys( message ).forEach( (protocol_name)=>{
			if (! self.protocols[ protocol_name ]) {
				rejected_commands.push( protocol_name + '.*' );

				if (DEBUG.PROTOCOLS) color_log(
					COLORS.ERROR,
					'Protocols.onMessage',
					'unknown protocol:',
					protocol_name,
				);

			} else {
				const message_commands = message[ protocol_name ];

				if (DEBUG.PROTOCOLS) color_log(
					COLORS.PROTOCOLS,
					'Protocols.onMessage',
					'protocol_commands:',
					self.protocols[ protocol_name ],
				);

				Object.keys( message_commands ).forEach( (command_name)=>{
					const combined_name = protocol_name + '.' + command_name;

					const request_handler
					= self.protocols[ protocol_name  ].requestHandlers[ command_name ]
					;

					if (! request_handler) {
						rejected_commands.push( combined_name );

						if (DEBUG.PROTOCOLS) color_log(
							COLORS.ERROR,
							'Protocols.onMessage',
							'unknown command:',
							combined_name,
						);

					} else {
						handled_commands.push( combined_name );

						if (DEBUG.PROTOCOLS) color_log(
							COLORS.PROTOCOLS,
							'Protocols.onMessage',
							'request_handler: ',
							request_handler
						);

						log_persistent_data( 'onMessage:', 'PRE COMMAND: ' );
						const request_arguments = message[ protocol_name ][ command_name ];

						request_handler( client, request_arguments );

						log_persistent_data( 'onMessage:', 'POST COMMAND: ' );
					}
				});
			}
		});

		color_log(
			COLORS.PROTOCOLS,
			'Protocols.onMessage:',
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
		color_log( COLORS.PROTOCOLS, 'Protocols.exit()' );

		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.TRACE_INIT) color_log( COLORS.TRACE_INIT, 'Protocols.init' );

		self.protocols = {};

		function protocol (protocol_name, object_template) {
			if (! persistent_data[ protocol_name ]) {
				color_log( COLORS.PROTOCOL, 'No persistent data for protocol:', protocol_name );
				persistent_data[ protocol_name ] = null;
			}

			return new Promise( async (done)=>{
				self.protocols[ protocol_name ]
				= await new object_template( persistent_data )
				;

				done();
			});
		}

		return Promise.all([
			protocol( 'session' , SessionHandler ),
			protocol( 'server'  , ServerManager  ),
			protocol( 'chat'    , ChatServer     ),
		]);

	}; // init


	return self.init().then( ()=>self );   // Instantiation: const protocols = await new Protocols();

}; // Protocols


//EOF
