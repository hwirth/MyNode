// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS, color_log } = require( '../server/debug.js' );
const { REASONS                  } = require( './constants.js' );


const WebSocketClient = function WebSocketClient (socket, client_address) {
	const self = this;

	this.address;
	this.login;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function send_as_json (socket, data) {
		if (DEBUG.MESSAGE_OUT) color_log( COLORS.PROTOCOLS, 'WebSocketClient-send_as_json', data );
		if (socket.send) socket.send( JSON.stringify( data ) );
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.send = function (message) {
		send_as_json( socket, message );

	}; // send


	this.closeSocket = function () {
		socket.close();

	}; // closeSocket


	this.inGroup = function (group) {
		return self.login && (self.login.groups.indexOf( group ) >= 0);

	}; // send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function init () {
		self.address = client_address;
		self.login   = false;
	}


	init();

}; // WebSocketClient





module.exports.SessionHandler = function SessionHandler (persistent_data) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_persistent_data () {
		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.PROTOCOL,
			'<session>',
			'persistent_data:',
			persistent_data
		);

	} // log_persistent_data


	function respond_success (client, command, reason, status = true) {
		client.send({
			session: {
				[command]: {
					success   : status,
					reason    : reason,
				},
			},
		});

	} // respond_success


	function respond_failure (client, command, reason) {
		respond_success( client, command, reason, false );

	} // respond_failure


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.SESSION, 'SessionHandler.onConnect', client_address );

		persistent_data.clients[ client_address ] = new WebSocketClient( socket, client_address );

	}; // onConnect


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


	this.requestHandlers = {};

	this.requestHandlers.login = function (client, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<session.login>',
			client,
		);


		if (client.login) {
			respond_failure( client, 'login', 'Already logged in' );
			return;
		}

		if (! parameters.username) {
			respond_failure( client, 'login', 'username undefined' );
			return;
		}

		if (! parameters.password) {
			respond_failure( client, 'login', 'password undefined' );
			return;
		}

		const user_record = persistent_data.accounts[ parameters.username ];

		if (! user_record) {
			respond_failure( client, 'login', 'User "' + parameters.username + '" unknown' );

		} else {
			const password_correct = (user_record.password === parameters.password);

			if (password_correct) {
				client.login = {
					userName : parameters.username,
					groups   : (user_record.groups) ? user_record.groups : [],
				};
				respond_success( client, 'login', 'Logged in' );

			} else {
				respond_failure( client, 'login', 'Login failed' );
			}
		}

	}; // login


	this.requestHandlers.logout = function (client, parameters) {
		if (client.login) {
			client.login = false;
			respond_success( client, 'logout', 'Logged out' );
		} else {
			respond_failure( client, 'logout', 'Not logged in' );
		}

	}; // logout


	function find_client_by_username (username) {
		const client_address = Object.keys( persistent_data.clients ).find( (address)=>{
			const client = persistent_data.clients[ address ];
			return (client.login && (client.login.userName == username));
		});
		return (client_address) ? persistent_data.clients[ client_address ] : null;

	} // find_client_by_username


	this.requestHandlers.kick = function (client, parameters) {
		if (! client.inGroup( 'admin' )) {
			respond_failure( client, 'kick', REASONS.INSUFFICIENT_PERMS );
			return;
		}

		let target_client = null;
		if (parameters.address) {
			target_client = persistent_data.clients[ parameters.address ];
		}
		else if (parameters.username) {
			target_client = find_client_by_username( parameters.username );
		}

		if (! target_client) {
			if (parameters.address) {
				respond_failure( client, 'kick', REASONS.INVALID_ADDRESS );
			}
			else if (parameters.username) {
				respond_failure( client, 'kick', REASONS.INVALID_USERNAME );
			}
			else {
				respond_failure( client, 'kick', REASONS.INVALID_ADDRESS_OR_USERNAME );
			}
			return;
		}

		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.SESSION,
			'<session.kick>',
			'Terminating connection to ',
			target_client,
		);

		target_client.send({
			session: {
				status: {
					connection : 'terminating',
					reason     : REASONS.KICKED_BY + client.login.userName,
				},
			},
		});

		//... This timeout should not be neccessary, but apparently is;
		//... Without it, the previous message may not arrive at the client.
		setTimeout( ()=>{
			target_client.closeSocket();
		}, 1000);

		target_client.login = false;

	}; // kick


	this.requestHandlers.status = function (client, parameters) {
		if (parameters.persistent || (parameters.persistent === null)) {
			if (client.login) {
				if (client.inGroup('admin')) {
					client.send({
						session: {   //... Move to a debug protocol
							status: {
								persistent: 'persistent_data no longer global',
							},
						},
					});
				} else {
					//respond_failure( client, 'status.persistent', REASONS.INSUFFICIENT_PERMS );
					client.send({
						session: {
							status: {
								persistent: {
									success : false,
									reason  : REASONS.INSUFFICIENT_PERMS,
								},
							},
						},
					});
				}
			} else {
				client.send({
					session: {
						status: {
							persistent: {
								success : false,
								reason  : REASONS.INSUFFICIENT_PERMS,
							},
						},
					},
				});
			}
		} else if (Object.keys(parameters).length == 0) {
			client.send({
				session: {
					status: {
						client: client,
					},
				},
			});
		} else {
			respond_failure( client, 'status', REASONS.UNKNOWN_COMMAND );
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		color_log( COLORS.TRACE_EXIT, 'SessionHandler.exit()' );

		return Promise.resolve();

	}; // exit


	function load_data () {
		color_log( COLORS.SESSION, 'SessionHandler', 'save_data' );

		return {
			accounts: {
				hmw: {
					password: 'pass1',
					groups: [
						'admin',
					],
				},
				sec: {
					password: 'pass2',
				},
			}, // accounts
			clients: {
			}, // clients
		};

	} // load_data


	function save_data () {
		color_log( COLORS.SESSION, 'SessionHandler', 'save_data' );

	} // save_data


	this.init = function () {
		if (DEBUG.TRACE_INIT) color_log( COLORS.TRACE_INIT, 'SessionHandler.init' );

		if (Object.keys( persistent_data ).length == 0) {
			// "Load from database"
			const data = load_data();
			Object.keys( data ).forEach( (key)=>{
				persistent_data[key] = data[key];
			});

			//... Before: "Global" persistent_data.session = load_data();
		}

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const sessions = await new SessionHandler();

}; // SessionHandler


//EOF
