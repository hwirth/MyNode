// chat: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, RESULT } = require( '../constants.js' );


RESULT.CHAT = 'chat';


module.exports = function ChatServer (persistent_data, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESULT HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.say = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<chat.say>',
			dump( client ),
		);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const everyone      = callback.getAllClients();
			const authenticated = client => client.login;

			everyone.filter( authenticated )
			.forEach( recipient =>
				recipient.respond(
					RESULT.CHAT,
					login_id,
					{
						time   : t0,
						sender : client.login.userName,
						text   : message,
					},
				)
			);

			client.respond( RESULT.SUCCESS, request_id, RESULT.INSUFFICIENT_PERMS );

		} else {
			client.respond( RESULT.FAILURE, request_id, RESULT.INSUFFICIENT_PERMS );
		}

	}; // say


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
