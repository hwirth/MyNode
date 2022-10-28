// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
const { REASONS, RESULT } = require( './constants.js' );

const WebSocketClient = require( './client.js' );


module.exports = function SessionHandler (persistent_data, callbacks) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_warning (command_name, reason, ...specifics) {
		color_log(
			COLORS.WARNING,
			'<session.' + command_name + '> ' + reason,
			...[...specifics].map( entry => JSON.parse(JSON.stringify(entry)) ),
		);

	} // log_warning


 	function log_persistent_data () {
		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.PROTOCOL,
			'<session>',
			'persistent_data:',
			persistent_data
		);

	} // log_persistent_data


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getClientByAddress = function (address) {
		return persistent_data.clients[address];

	}; // getClientByAddress


	this.getClientByName = function (name) {
		const client_address = Object.keys( persistent_data.clients ).find( (test_address)=>{
			const client = persistent_data.clients[test_address];
			return (client.login && (client.login.userName == name));
		});

		return (client_address) ? persistent_data.clients[client_address] : null;

	}; // getClientByName


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.SESSION, 'SessionHandler.onConnect:', client_address );

		if (persistent_data.clients[client_address]) {
			color_log(
				COLORS.PROTOCOLS,
				'SessionHandler.onConnect:',
				REASONS.ALREADY_LOGGED_IN,
				client_address
			);
			return;
		}

		persistent_data.clients[client_address] = await new WebSocketClient( socket, client_address );

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		const client = persistent_data.clients[client_address];

		if (! client) {
			color_log(
				COLORS.ERROR,
				'ERROR',
				'SessionHandler.onDisconnect: Unknown client:',
				client_address,
			);
			return;
		}

		await client.exit();
		delete persistent_data.clients[client_address];

	}; // onDisconnect


	this.onMessage = function (socket, client_address, message) {
		persistent_data.clients[client_address ].registerActivity();

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESULT HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.requestHandlers = {};

	this.requestHandlers.login = function (client, request_id, parameters) {
		if (client.login) {
			log_warning( 'login', REASONS.ALREADY_LOGGED_IN, dump(client) );
			client.respond( RESULT.FAILURE, request_id, REASONS.ALREADY_LOGGED_IN );
			return;
		}

		if (! parameters.username) {
			log_warning( 'login', REASONS.BAD_USERNAME, dump(client) );
			client.respond( RESULT.FAILURE, request_id, REASONS.BAD_USERNAME );
			return;
		}

		if (! parameters.password) {
			log_warning( 'login', REASONS.BAD_PASSWORD, dump(client) );
			client.respond( RESULT.FAILURE, request_id, REASONS.BAD_PASSWORD );
			return;
		}

		const user_record = persistent_data.accounts[parameters.username];
		if (! user_record) {
			log_warning( 'login', REASONS.BAD_USERNAME, dump(client) );
			client.respond(
				RESULT.FAILURE,
				request_id,
				REASONS.USER_UNKNOWN.replace('NAME', parameters.username)
			);

		} else {
			const password_correct = (user_record.password === parameters.password);

			if (password_correct) {
				client.clearLoginTimeout();

				client.login = {
					userName : parameters.username,
					groups   : (user_record.groups) ? user_record.groups : ['guest'],
				};


				if (typeof user_record.maxIdleTime !== 'undefined') {
					client.setIdleTime( user_record.maxIdleTime );
				}

				color_log( COLORS.COMMAND, '<session.login>', dump(client) );
				client.respond( RESULT.SUCCESS, request_id, REASONS.SUCCESSFULLY_LOGGED_IN );

			} else {
				log_warning( 'login', REASONS.BAD_PASSWORD, dump(client) );
				client.respond( RESULT.FAILURE, request_id, REASONS.BAD_PASSWORD );
			}
		}

	}; // login


	this.requestHandlers.logout = function (client, request_id, parameters) {
		if (client.login) {
			color_log( COLORS.COMMAND, '<session.logout>', client.login );
			client.login = false;
			client.respond( RESULT.SUCCESS, request_id, REASONS.SUCCESSFULLY_LOGGED_OUT );
		} else {
			log_warning( 'logout', REASONS.NOT_LOGGED_IN, dump(client) );
			client.respond( RESULT.FAILURE, request_id, REASONS.NOT_LOGGED_IN );
		}

	}; // logout


	this.requestHandlers.who = function (client, request_id, parameters) {

		//... session who {multiclients, idles, ...}
		//... session who {filter, sort, sort:{reverse:{}} }

		if (client.inGroup('admin') ) {
			color_log( COLORS.COMMAND, '<session.who>', 'Sending persistent_data.clients' );
			client.respond( RESULT.SUCCESS, request_id, persistent_data.clients );

		} else if (client.login) {
			const clients = JSON.parse( JSON.stringify(persistent_data.clients, null, '\t') );
			for (let address in clients) {
				clients[address]
				= (clients[address].login)
				? { userName: clients[address].login.userName }
				: { login: false }
				;
			}

			color_log( COLORS.COMMAND, '<session.who>', 'Sending reduced persistent_data.clients' );
			client.respond( RESULT.SUCCESS, request_id, clients );
		} else {
			color_log( COLORS.COMMAND, '<session.who>', 'Sending persistent_data.clients' );
			client.respond( RESULT.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // who


	this.requestHandlers.kick = async function (client, request_id, parameters) {
		if (! client.inGroup( 'admin' )) {
			log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, dump(client) );
			client.respond( RESULT.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		let target_client = null;
		if (parameters.address) {
			target_client = persistent_data.clients[parameters.address];
		}
		else if (parameters.username) {
			target_client = self.getClientByName( parameters.username );
		}

		if (! target_client) {
			if (parameters.address) {
				log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, dump(client) );
				client.respond( RESULT.FAILURE, request_id, REASONS.INVALID_ADDRESS );
			}
			else if (parameters.username) {
				log_warning( 'kick', REASONS.INVALID_USERNAME, dump(client) );
				client.respond( RESULT.FAILURE, request_id, REASONS.INVALID_USERNAME );
			}
			else {
				log_warning( 'kick', REASONS.INVALID_ADDRESS_OR_USERNAME, dump(client) );
				client.respond( RESULT.FAILURE, request_id, REASONS.INVALID_ADDRESS_OR_USERNAME );
			}

			return;
		}

		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.SESSION,
			'<session.kick>',
			'Terminating connection to ',
			target_client,
		);

		target_client.respond(
			RESULT.NONE,
			request_id,
			REASONS.KICKED_BY + ' ' + client.login.userName,
			null,
		);

		const target_address  = target_client.address;
		const target_username = target_client.login.userName;

		target_client.login = false;
		await target_client.closeSocket();

		client.respond(
			RESULT.SUCCESS,
			request_id,
			(
				REASONS.KICKED_USER
				.replace('NAME', target_username)
				.replace('ADDRESS', target_address)
			)
		);

		if (parameters.username) {
			if (self.getClientByName( parameters.username )) {
				self.requestHandlers.kick( client, parameters );
			}
		}

	}; // kick


	this.requestHandlers.status = function (client, request_id, parameters) {
		if (Object.keys(parameters).length == 0) {
			client.respond( RESULT.SUCCESS, request_id, {client: client} );

		} else {
			const command = Object.keys( parameters )[0];
			client.respond( RESULT.FAILURE, request_id, {[command]: REASONS.UNKNOWN_COMMAND} );
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'SessionHandler.exit' );

		return Promise.resolve();

	}; // exit


	function load_data () {
		color_log( COLORS.SESSION, 'SessionHandler-load_data' );

		return ;

	} // load_data


	function save_data () {
		color_log( COLORS.SESSION, 'SessionHandler-save_data' );

	} // save_data


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'SessionHandler.init' );

		if (Object.keys( persistent_data ).length == 0) {
			// "Load from database"
			const data = {
				accounts: {
					hmw: {
						password: 'pass1',
						groups: [
							'admin',
						],
						maxIdleTime: 0,
					},
					sec: {
						password: 'pass2',
					},
				}, // accounts
				clients: {
				}, // clients
			};
			Object.keys( data ).forEach( (key)=>{
				persistent_data[key] = data[key];
			});
		}

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const sessions = await new SessionHandler();

}; // SessionHandler


//EOF
