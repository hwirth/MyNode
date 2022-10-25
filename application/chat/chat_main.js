// chat_main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS, color_log } = require( '../../server/debug.js' );
const { REASONS                  } = require( '../constants.js' );


module.exports = function ChatServer (persistent_data) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.requestHandlers = {};

	this.requestHandlers.test = function (client, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<chat.test>',
			client,
		);

		respond_success( client, 'test', 'niy' );

	}; // test


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
