// chat: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


STATUS.CHAT = 'chat';


module.exports = function ChatServer (persistent_data, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESULT HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	th is.request.nick = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<chat.nick>',
			dump( client ),
		);

		if (client.login) {
			const new_nick      = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			//... Check nick validity/availability

			const nick_before = client.login.nickName;
			client.login.nickName = new_nick;

			const message
			= (nick_before)
			? nick_before +' is now known as ' + new_nick
			: client.login.userName + ' chose the nick name ' + new_nick
			;

			client.broadcast({
				time   : t0,
				sender : client.login.nickName,
				chat   : message,
			});

		/*
			Object.keys( all_clients ).filter( authenticated ).forEach( recipient =>
				all_clients[recipient].respond(
					STATUS.NONE,
					request_id,
					{
						time   : t0,
						sender : client.login.nickName,
						chat   : message,
					},
				)
			);
		*/

			client.respond( STATUS.SUCCESS, request_id, STATUS.INSUFFICIENT_PERMS );

		} else {
			client.respond( STATUS.FAILURE, request_id, STATUS.INSUFFICIENT_PERMS );
		}

	}; // request.nick


	this.request.say = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<chat.say>',
			dump( client ),
		);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients ).filter( authenticated ).forEach( recipient =>
				all_clients[recipient].respond(
					STATUS.NONE,
					request_id,
					{
						time   : t0,
						sender : client.login.nickName || client.login.userName,
						chat   : message,
					},
				)
			);

			client.respond( STATUS.SUCCESS, request_id, STATUS.INSUFFICIENT_PERMS );

		} else {
			client.respond( STATUS.FAILURE, request_id, STATUS.INSUFFICIENT_PERMS );
		}

	}; // request.say


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.exit' );

		return Promise.resolve();

	}; // exit


	function load_data () {
		return {};

	} // load_data


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.init' );

		if (Object.keys( persistent_data ).length == 0) {
			const data = load_data();
			Object.keys( data ).forEach( (key)=>{
				persistent_data[key] = data[key];
			});
		}

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // ChatServer


//EOF
