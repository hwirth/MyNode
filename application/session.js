// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { REASONS, STATUS, STRINGS } = require( './constants.js' );

const WebSocketClient = require( './client.js' );


module.exports = function SessionHandler (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_warning (command_name, reason, ...specifics) {
		DEBUG.log(
			COLORS.WARNING,
			'<session.' + command_name + '> ' + reason,
			...[...specifics].map( entry => JSON.parse(JSON.stringify(entry)) ),
		);

	} // log_warning


 	function log_persistent () {
		if (DEBUG.ROUTER_PERSISTENT_DATA) DEBUG.log(
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
			return (
				client.login
				&&( (client.login.userName.toLowerCase() == name.toLowerCase())
				||  client.login.nickName && (client.login.nickName.toLowerCase() == name.toLowerCase())
				)
			);
		});

		return (client_address) ? persistent.clients[client_address] : null;

	}; // getClientByName


	this.getWho = function () {
		const clients = {};
		Object.keys( persistent.clients ).forEach( (address)=>{
			const login = persistent.clients[address].login;
			if (login) {
				clients[address] = {
					userName: login.userName,
					nickName: login.nickName || null,
				};
			} else {
				clients[address] = address;
			}
		});
		return clients;

	}; // getWho


	this.broadcast = async function (message) {
console.log( COLORS.ERROR + 'Seesion.broadcast()' + COLORS.RESET + ' should no longer be used?' );
		const time = (SETTINGS.MESSAGE_TIMESTAMPS) ? Date.now() : undefined;

		const who_data = (message.who) ?  self.getWho() : undefined;
		delete message.who;

		const recipients = client => message.recipients && message.recipients(client) || true;
		Object.values( callback.getAllClients() )
		.filter( recipients )
		.forEach( client => client.send({
				broadcast : message,
				who       : who_data,
				time      : time,
			}),
		);

	}; // broadcast


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (persistent.clients[client_address]) {
			DEBUG.log(
				COLORS.PROTOCOLS,
				'SessionHandler.onConnect:',
				REASONS.ALREADY_LOGGED_IN,
				client_address
			);
			return;
		}
		persistent.clients[client_address] = await new WebSocketClient( socket, client_address, {
			getAllCLients : callback.getAllClients,
			broadcast     : self.broadcast,
		});


		self.broadcast({
			who     : true,
			type    : 'session/connect',
			address : client_address,
		});

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		const client = persistent.clients[client_address];

		if (!client) {
			DEBUG.log(
				COLORS.ERROR,
				'ERROR',
				'SessionHandler.onDisconnect: Unknown client:',
				client_address,
			);
			return;
		}

		await client.exit();
		delete persistent.clients[client_address];

		if (true || client.login) {
			self.broadcast({
				who      : true,
				type     : 'session/disconnect',
				address  : client_address,
				userName : client.login.userName,
				nickName : client.login.nickName,
			});
		} else {
			self.broadcast({
				who     : true,
				type    : 'session/disconnect',
				address : client_address,
			});
		}

	}; // onDisconnect


	this.onMessage = function (socket, client_address, message) {
		if (!message.session || !message.session.pong) {
			//...?persistent.clients[client_address ].registerActivity();
		}

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};
	this.guestNr = 0;

// PONG //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'pong', 'Answer to a server ping (Usually happens automatically)' );
	RULE( 'connecting,guest,user,mod,admin,dev,owner: {session:{pong:number}}' );
	this.request.pong = function (client, request_id, parameters) {
		if (isNaN( parameters )) {
			return { failure: REASONS.INVALID_REQUEST };
		} else {
client.receivePong( parameters );
		}

	}; // pong


// LOGIN /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'login', 'Authenticate as registered user' );
	RULE( 'connecting: {session:{login:{username:guest}}}' );
	RULE( 'connecting: {session:{login:{username:string,password:string}}}' );
	RULE( 'connecting: {session:{login:{username:string,password:string,factor2:string}}}' );
	this.request.login = function (client, request_id, parameters) {
		if (client.login) {
			log_warning( 'login', REASONS.ALREADY_LOGGED_IN, client );
			return { failure: REASONS.ALREADY_LOGGED_IN };
		}

		if (!parameters.username) {
			log_warning( 'login', REASONS.BAD_USERNAME, client );
			return { failure: REASONS.INVALID_USERNAME };
		}

		parameters.username = parameters.username.toLowerCase();

		if (!parameters.password && (parameters.username != 'guest')) {
			log_warning( 'login', REASONS.BAD_PASSWORD, client );
			return { failure: REASONS.INVALID_PASSWORD };
		}

		const user_record = persistent.accounts[parameters.username];
		if (!user_record) {
			log_warning( 'login', REASONS.INVALID_USERNAME, client );
			return { failure: REASONS.INVALID_USERNAME };
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

			const login = client.login = {
				userName      : parameters.username,
				groups        : new_groups,
				subscriptions : new_subscriptions,
			};

			client.factor2
			=  (typeof parameters.factor2 == 'undefined')
			|| (typeof parameters.factor2 == 'null')
			? null
			: callback.verifyToken(
				parameters.factor2,
				client,
				/*login_request*/true,
			);

			if (login.userName == 'guest') {
				login.userName = 'Guest' + (++self.guestNr);
			}

			client.setIdleTime( user_record.maxIdleTime );

			DEBUG.log( COLORS.COMMAND, '<session.login>', client );

			return {
				result    : client,
				broadcast : {
					who      : true,
					type     : 'session/login',
					address  : client.address,
					userName : login.userName,
				},
			};
		/*
			send_cookie();
			async function send_cookie () {
				const exec = require( 'child_process' ).exec;
				const command = '/usr/games/fortune';//SETTINGS.BASE_DIR + 'functions.sh';
				console.log( COLORS.EXEC + 'EXEC' + COLORS.RESET + ':', command );

				const fortune_cookie = await new Promise( (resolve, reject)=>{
					exec( command, (error, stdout, stderr)=>{
						if (error !== null) {
							reject( error );
						} else {
							resolve( stdout.trim().replace( /\t/g, ' ' ) );
						}
					});
				})

				console.log( 'COOKIE:', fortune_cookie );
				client.send({
					notice: {
						login       : login.nickName || login.userName || client.address,
						maxIdleTime : client.maxIdleTime,
						fortune     : '"' + fortune_cookie + '"',
					},
				});
			}
		*/

// /client.js ////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		} else {
			log_warning( 'login', REASONS.BAD_PASSWORD, client );
			return { failure: REASONS.BAD_PASSWORD };
		}

	}; // login


// AUTHENTICATE //////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'authenticate', 'Authenticate via second factor' );
	RULE( 'connecting,guest,user,mod,admin,dev,owner: {session:{authenticate:string}}' );
	this.request.authenticate = function (client, request_id, parameters) {
		const token = parameters.factor2 || parameters.token;
		client.factor2 = callback.verifyToken(
			token,
			client,
			/*login_request*/true,
		);
		if (client.factor2) {
			DEBUG.log( COLORS.COMMAND, '<session.authenticate>', client );
			client.respond( STATUS.SUCCESS, request_id, REASONS.SUCCESSFULLY_AUTHENTICATED );
		} else {
			log_warning( 'authenticate', REASONS.NOT_LOGGED_IN, client );
			client.respond( STATUS.FAILURE, request_id, REASONS.AUTHENTICATION_FAILED );
		}

	}; // logout


// LOGOUT ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'logout', 'Log out of a registered account' );
	RULE( 'guest,user,mod,admin,dev,owner: {session:{logout:empty}}' );
	this.request.logout = function (client, request_id, parameters) {
		if (client.login) {
			DEBUG.log( COLORS.COMMAND, '<session.logout>', client );

			const user_name = client.login.userMame;
			const nick_name = client.login.nickName;
			client.login = false;

			return {
				result    : REASONS.SUCCESSFULLY_LOGGED_OUT,
				broadcast : {
					type     : 'session/logout',
					address  : client.address,
					userName : user_name,
					nickName : nick_name,
					who      : true,
				},
			};

		} else {
			log_warning( 'logout', REASONS.NOT_LOGGED_IN, client );
			return { failure: REASONS.NOT_LOGGED_IN };
		}

	}; // logout


// WHO ///////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'who', 'Request list of connected users' );
	RULE( 'guest,user,mod,admin,dev,owner: {session:{who:*}}' );
	this.request.who = async function (client, request_id, parameters) {
		const clients = self.getWho();
		if (clients) {
			DEBUG.log( COLORS.COMMAND, '<session.who>', client );
			return { result: clients };
		} else {
			DEBUG.log( COLORS.COMMAND, '<session.who>', client );
			return { failure: REASONS.INSUFFICIENT_PERMS };
		}

	}; // who


// CLIENTS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'clients', 'Request all connected client data' );
	RULE( 'admin,dev,owner: {session:{clients:empty}}' );
	this.request.clients = async function (client, request_id, parameters) {
		if (client.login) {
			DEBUG.log( COLORS.COMMAND, '<session.clients>', client );

			const clients = {};
			Object.keys( persistent.clients ).forEach( (address)=>{
				clients[address] = DEBUG.dump( persistent.clients[address] );
			});

client.respond( STATUS.SUCCESS, request_id, clients );

		} else {
			DEBUG.log( COLORS.COMMAND, '<session.clients>', client );
client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // clients


	this.request.kick = async function (client, request_id, parameters) {
		if (!client.inGroup( 'mod', 'admin', 'dev' )) {
			log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, client );
client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}
if (!client.login) throw new Error( 'NO CLIENT' );
		//... cant kick multiple
console.log( 'KICK: parameters:', parameters );
		if (parameters.username) parameters.username = parameters.username.toLowerCase();

		let target_client = null;
		if (parameters.address) {
			target_client = persistent.clients[parameters.address];
		}
		else if (parameters.username) {
			target_client = self.getClientByName( parameters.username );
		}
		else if (typeof parameters == 'string') {
			target_client = self.getClientByName( parameters );
		}

if (!target_client) {
	if (parameters.address) {
		log_warning( 'kick', REASONS.INSUFFICIENT_PERMS, client );
client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_ADDRESS );
	}
	else if (parameters.username) {
		log_warning( 'kick', REASONS.INVALID_USERNAME, client );
client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_USERNAME );
	}
	else {
		log_warning( 'kick', REASONS.INVALID_ADDRESS_OR_USERNAME, client );
client.respond( STATUS.FAILURE, request_id, REASONS.INVALID_ADDRESS_OR_USERNAME );
	}

	return;
}

		if (DEBUG.ROUTER_PERSISTENT_DATA) DEBUG.log(
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


// STATUS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
	HELP( 'status', 'Request current login status' );
	RULE( 'connecting,guest,user,mod,admin,dev,owner: {session:{status:empty}}' );
	this.request.status = function (client, request_id, parameters) {
		if (Object.keys(parameters).length == 0) {
			return { result: {client:client} };
		} else {
			return { failure: REASONS.INVALID_REQUEST };
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'SessionHandler.exit' );
		return Promise.resolve();
		//return new Promise( done => setTimeout(done, SETTINGS.TIMEOUT.SOCKET_CLOSE) );

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'SessionHandler.reset' );

		if (Object.keys( persistent ).length == 0) {
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
						maxIdleTime: SETTINGS.TIMEOUT.IDLE,
					},
					'user': {
						password: 'pass2',
						maxIdleTime: SETTINGS.TIMEOUT.IDLE,
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

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'SessionHandler.init' );
		self.reset();
		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const sessions = await new SessionHandler();

}; // SessionHandler


//EOF
