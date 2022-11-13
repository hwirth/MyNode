// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
const { REASONS, STATUS, STRINGS } = require( './constants.js' );

const WebSocketClient = require( './client.js' );


module.exports = function SessionHandler (persistent, callback) {
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


 	function log_persistent () {
		if (DEBUG.ROUTER_PERSISTENT_DATA) color_log(
			COLORS.PROTOCOL,
			'<session>',
			'persistent:',
			persistent
		);

	} // log_persistent


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getClientByAddress = function (address) {
		return persistent.clients[address];

	}; // getClientByAddress


	this.getClientByName = function (name) {
		const client_address = Object.keys( persistent.clients ).find( (test_address)=>{
			const client = persistent.clients[test_address];
			return (client.login && (client.login.userName == name));
		});

		return (client_address) ? persistent.clients[client_address] : null;

	}; // getClientByName


	this.broadcast = async function (message) {
		function get_formatted_time () {
			return Intl.DateTimeFormat( 'en', {
				weekday : 'short',
				year    : 'numeric',
				month   : 'short',
				day     : 'numeric',
				hour    : '2-digit',
				minute  : '2-digit',
				second  : '2-digit',
				//fractionalSecondDigits: '3',
				timeZoneName: ['short', 'shortOffset', 'shortGeneric'][0],
				hour12  : false,

			}).format(new Date());
			//...new Date().toUTCString();
		}

		//...if (typeof message != 'string') message = JSON.stringify( message, null, '\t' );

		const time = (SETTINGS.MESSAGE_TIMESTAMPS) ? Date.now() : undefined;
		const bulletin = {
			broadcast: {
				time : time,
				type : message.type,
				...message,
			}
		};

		const clients = callback.getAllClients();
		Object.keys( clients ).forEach( (address)=>{
			clients[address].send( bulletin );
		});

	}; // broadcast


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (persistent.clients[client_address]) {
			color_log(
				COLORS.PROTOCOLS,
				'SessionHandler.onConnect:',
				REASONS.ALREADY_LOGGED_IN,
				client_address
			);
			return;
		}

		self.broadcast({
			type    : 'connect',
			address : client_address,
		});

		persistent.clients[client_address] = await new WebSocketClient( socket, client_address, {
			getAllCLients : callback.getAllClients,
			broadcast     : self.broadcast,
		});

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		const client = persistent.clients[client_address];

		if (!client) {
			color_log(
				COLORS.ERROR,
				'ERROR',
				'SessionHandler.onDisconnect: Unknown client:',
				client_address,
			);
			return;
		}

		await client.exit();
		delete persistent.clients[client_address];

		if (client.login) {
			self.broadcast({
				type     : 'disconnect',
				address  : client_address,
				userName : client.login.userName,
				nickName : client.login.nickName,
			});
		} else {
			self.broadcast({
				type    : 'disconnect',
				address : client_address,
			});
		}

	}; // onDisconnect


	this.onMessage = function (socket, client_address, message) {
		if (!message.session || !message.session.pong) {
			//persistent.clients[client_address ].registerActivity();
		}

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESULT HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.guestNr = 0;
	this.request = {};

	this.request.pong = function (client, request_id, parameters) {
		if (isNaN( parameters )) {
			client.respond( STATUS.FAILURE, request_id, {[command]: REASONS.INVALID_REQUEST} );
		} else {
			client.receivePong( parameters );
		}

		/*
		if (Object.keys(parameters).length == 0) {
			client.respond( STATUS.SUCCESS, request_id, {client: dump(client)} );

		} else {
			const command = Object.keys( parameters )[0];
			client.respond( STATUS.FAILURE, request_id, {[command]: REASONS.INVALID_REQUEST} );
		}
		*/

	}; // pong


	this.request.login = function (client, request_id, parameters) {
		if (client.login) {
			log_warning( 'login', REASONS.ALREADY_LOGGED_IN, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.ALREADY_LOGGED_IN );
			return;
		}

		if (!parameters.username) {
			log_warning( 'login', REASONS.BAD_USERNAME, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_USERNAME );
			return;
		}

		if (!parameters.password && (parameters.username != 'guest')) {
			log_warning( 'login', REASONS.BAD_PASSWORD, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_PASSWORD );
			return;
		}

		const user_record = persistent.accounts[parameters.username];
		if (!user_record) {
			log_warning( 'login', REASONS.INVALID_USERNAME, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_USERNAME );
			return;

		}


		const password_correct
		=  (user_record.password === String(parameters.password))
		|| ((user_record.password === null) && (parameters.username == 'guest'))
		;

		if (password_correct) {

// client.js /////////////////////////////////////////////////////////////////////////////////////////////////////119:/

			// Make new client object

			client.clearLoginTimeout();

			const new_groups        = (user_record.groups) ? user_record.groups : ['guest'];
			const new_subscriptions = ['broadcast'];
			if (user_record.subscriptions) subs.push( ...user_record.subscriptions );

			client.login = {
				userName      : parameters.username,
				groups        : new_groups,
				subscriptions : new_subscriptions,
			};

			client.secondFactor
			=  (typeof parameters.secondFactor == 'undefined')
			|| (typeof parameters.secondFactor == 'null')
			? null
			: callback.verifyToken(
				parameters.secondFactor,
				client,
				/*login_request*/true,
			);

			if (client.login.userName == 'guest') {
				client.login.userName += ++self.guestNr;
			}

			client.setIdleTime( user_record.maxIdleTime );

			callback.broadcast({
				type     : 'login',
				address  : client.address,
				userName : client.login.userName,
			});

			color_log( COLORS.COMMAND, '<session.login>', 'client:', dump(client) );
			client.respond( STATUS.SUCCESS, request_id, REASONS.SUCCESSFULLY_LOGGED_IN );
;
			client.send({ notice: user_record.banner || STRINGS.LOGIN_BANNER });

// /client.js ////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		} else {
			log_warning( 'login', REASONS.BAD_PASSWORD, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.BAD_PASSWORD );
		}

	}; // login


	this.request.authenticate = function (client, request_id, parameters) {
		const token = parameters.secondFactor || parameters.token;
		client.secondFactor = callback.verifyToken(
			token,
			client,
			/*login_request*/true,
		);
		if (client.secondFactor) {
			color_log( COLORS.COMMAND, '<session.authenticate>', 'client:', dump(client) );
			client.respond( STATUS.SUCCESS, request_id, REASONS.SUCCESSFULLY_AUTHENTICATED );
		} else {
			log_warning( 'authenticate', REASONS.NOT_LOGGED_IN, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.AUTHENTICATION_FAILED );
		}

	}; // logout


	this.request.logout = function (client, request_id, parameters) {
		if (client.login) {
			color_log( COLORS.COMMAND, '<session.logout>', 'client:', dump(client) );
			client.respond( STATUS.SUCCESS, request_id, REASONS.SUCCESSFULLY_LOGGED_OUT );

			callback.broadcast({
				type     : 'logout',
				address  : client.address,
				userName : client.login.userName,
				nickName : client.login.nickName,
			});

			client.login = false;

		} else {
			log_warning( 'logout', REASONS.NOT_LOGGED_IN, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.NOT_LOGGED_IN );
		}

	}; // logout


	this.request.who = async function (client, request_id, parameters) {

		//... session who {multiclients, idles, ...}
		//... session who {filter, sort, sort:{reverse:{}} }
//...color_log( COLORS.ERROR, 'TEST ERROR.' );
//...throw new Error('TEST ERROR');

		if (client.inGroup( 'mod', 'admin', 'dev') ) {
			color_log( COLORS.COMMAND, '<session.who>', 'Sending persistent.clients' );

			const clients = {};
			Object.keys( persistent.clients ).forEach( (address)=>{
				clients[address] = dump( persistent.clients[address] );
			});

			client.respond( STATUS.SUCCESS, request_id, clients );

		} else if (client.login) {
			const clients = {};
			Object.keys( persistent.clients ).forEach( (address)=>{
				const login = persistent.clients[address].login;
				if (login) {
					clients[login.userName] = {
						nickName: login.nickName || null,
					};
				}
			});

			for (let address in clients) {
				/*
				clients[address]
				= (clients[address].login)
				? {
					userName: clients[address].login.userName,
					nickName: clients[address].login.nickName,

				}
				: { login: false }
				;
				*/
			}

			color_log( COLORS.COMMAND, '<session.who>', 'Sending reduced persistent.clients' );
			client.respond( STATUS.SUCCESS, request_id, clients );
		} else {
			color_log( COLORS.COMMAND, '<session.who>', 'Sending persistent.clients' );
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // who


	this.request.kick = async function (client, request_id, parameters) {
		if (!client.inGroup( 'mod', 'admin', 'dev' )) {
			log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, dump(client) );
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}
if (!client.login) throw new Error( 'NO CLIENT' );
		//... cant kick multiple
		let target_client = null;
		if (parameters.address) {
			target_client = persistent.clients[parameters.address];
		}
		else if (parameters.username) {
			target_client = self.getClientByName( parameters.username );
		}

		if (!target_client) {
			if (parameters.address) {
				log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, dump(client) );
				client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_ADDRESS );
			}
			else if (parameters.username) {
				log_warning( 'kick', REASONS.INVALID_USERNAME, dump(client) );
				client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_USERNAME );
			}
			else {
				log_warning( 'kick', REASONS.INVALID_ADDRESS_OR_USERNAME, dump(client) );
				client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_ADDRESS_OR_USERNAME );
			}

			return;
		}

		if (DEBUG.ROUTER_PERSISTENT_DATA) color_log(
			COLORS.SESSION,
			'<session.kick>',
			'Terminating connection to ',
			target_client,
		);

		target_client.respond(
			STATUS.NONE,
			request_id,
			REASONS.KICKED_BY + ' ' + client.login.userName,
			null,
		);

		const target_address  = target_client.address;
		const target_username = target_client.login.userName;

		target_client.login = false;
		await target_client.closeSocket();

		client.respond(
			STATUS.SUCCESS,
			request_id,
			(
				REASONS.KICKED_USER
				.replace('NAME', target_username)
				.replace('ADDRESS', target_address)
			)
		);

		if (parameters.username) {
			if (self.getClientByName( parameters.username )) {
				self.request.kick( client, parameters );
			}
		}

	}; // kick


	this.request.status = function (client, request_id, parameters) {
		if (Object.keys(parameters).length == 0) {
			client.respond( STATUS.SUCCESS, request_id, {client: dump(client)} );

		} else {
			const command = Object.keys( parameters )[0];
			client.respond( STATUS.FAILURE, request_id, {[command]: REASONS.INVALID_REQUEST} );
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'SessionHandler.exit' );

		callback.broadcast({ type: 'restart' });

		return new Promise( done => setTimeout(done, SETTINGS.TIMEOUT.SOCKET_CLOSE) );

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

		if (Object.keys( persistent ).length == 0) {
			// "Load from database"
			const data = {
				accounts: {
					'root': {
						password: '12345',
						groups: [
							'admin',
							'dev',
						],
						maxIdleTime: null,
					},
					'guest': {
						password: null,
						maxIdleTime: 5*60*1000,
					},
					'user': {
						password: 'pass2',
						maxIdleTime: 5*60*1000,
					},
					'idler': {
						password: 'pass3',
					},
				}, // accounts
				clients: {
				}, // clients
			};
			Object.keys( data ).forEach( (key)=>{
				persistent[key] = data[key];
			});
		}

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const sessions = await new SessionHandler();

}; // SessionHandler


//EOF
