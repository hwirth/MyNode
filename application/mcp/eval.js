// eval.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


module.exports = function ChatServer (persistent_data, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.js = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<eval.js>', dump(client) );

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const everyone      = callback.getAllClients();
			const authenticated = client => client.login;

			everyone.filter( authenticated )
			.forEach( recipient =>
				recipient.respond(
					STATUS.CHAT,
					login_id,
					{
						time   : t0,
						sender : client.login.userName,
						text   : message,
					},
				)
			);

			client.respond( STATUS.SUCCESS, request_id, STATUS.INSUFFICIENT_PERMS );

		} else {
			client.respond( STATUS.FAILURE, request_id, STATUS.INSUFFICIENT_PERMS );
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
