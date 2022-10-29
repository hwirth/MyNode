// mcp_main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../../server/config.js' );
const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, RESULT } = require( '../constants.js' );


module.exports = function MasterControlProgram (persistent, callbacks) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// UPTIME
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (! persistent.serverStartTime) persistent.serverStartTime =  DEBUG.BOOT_TIME;

	function get_uptime (formatted = false) {
		const milliseconds = Date.now() - persistent.serverStartTime + 0*99999999999;

		if (formatted) {
			let seconds = Math.floor( milliseconds / 1000 );
			let minutes = Math.floor( seconds      / 60   );   seconds -= 60 * minutes;
			let hours   = Math.floor( minutes      / 60   );   minutes -= 60 * hours;
			let days    = Math.floor( hours        / 24   );   hours   -= 24 * days;
			let weeks   = Math.floor( days         / 7    );   days    -=  7 * weeks;
			let years   = Math.floor( weeks        / 52   );   weeks   -= 52 * years;  //...
			let millis  = milliseconds % 1000;

			function leading (value, digits) {
				const string = String( value );
				const zeros  = '0'.repeat( digits - string.length );
				return zeros + string;
			}

			return (
					  (years   ? years      + 'y' : '')
					+ (weeks   ? weeks      + 'w' : '')
					+ (days    ? days       + 'd:' : '')
					+ leading( hours  , 2 ) + 'h'
					+ leading( minutes, 2 ) + 'm'
					+ leading( seconds, 2 ) + '.'
					+ leading( millis, 3 )  + 's'
			);

		} else {
			return milliseconds;
		}

	} // get_uptime


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// VERIFY ACCESS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let current_access_token = create_new_access_token();

	function create_new_access_token () {
		return Math.floor( Math.random() * 900 ) + 100;
	}

	function token_is_valid (token) {
		return (token == current_access_token);

	} // token_is_valid


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESULT HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.requestHandlers = {};

	this.requestHandlers.restart = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<server.restart>',
			dump( client ),
		);

		callbacks
		.getFullAccess( 'secret$token' )
		.then( ()=>app.exit )
		;

		//...callbacks.triggerExit();

	}; // restart


	this.requestHandlers.inspect = function (client, request_id, parameters) {
		let target = callbacks.getFullAccess();

		if (Object.keys(parameters).length > 0) {
	let count = 0;
			const path = parameters.split('.');
	console.log( 'path:', path );
	console.log( ++count, 'target:', typeof target );

			if (parameters) {
				path.find( (token)=>{


					if (target[ token ]) {
						target = target[token];
	console.log( ++count, 'target<'+typeof target+'>[' + token + ']:', Object.keys(target) );
					} else {
						client.respond( false, request_id, REASONS.YOU_SHOULDNT_HAVE );
					}
				});
			}
		}

		var result;
		switch (typeof target) {
		case 'object' :  result = Object.keys( target );  break;
		default       :  result = target;                 break;
		}

		client.respond( true, request_id, { [parameters]: result }  );

	}; // inspect


	this.requestHandlers.status = function (client, request_id, parameters) {
		if (parameters.persistent || (parameters.persistent === null)) {
			if (client.login) {
				if (client.inGroup( 'admin' )) {
					client.respond(
						RESULT.SUCCESS,
						request_id,
						callbacks.getAllPersistentData(),
					);
				} else {
					client.respond(
						RESULT.SUCCESS,
						request_id,
						REASONS.INSUFFICIENT_PERMS,
					);
				}
			}

		} else if (Object.keys(parameters).length == 0) {
			if (client.inGroup( 'admin' )) {
				const heap = process.memoryUsage().heapUsed;
				client.respond(
					RESULT.SUCCESS,
					request_id,
					{
						upTime   : get_uptime( /*formatted*/true ),
						heapUsed : Math.floor(heap / 1024**2 * 100) / 100 + ' MiB',
						access   : {
							rules: (
								callbacks
								.getProtocolDescription( /*show_line_numbers*/false )
								.split( '\n' )
							),
						},
						//...debug: DEBUG,
						settings: SETTINGS,
					},
				);
			}

		} else {
			const command = Object.keys( parameters )[0];
			client.respond( RESULT.FAILURE, request_id, {[command]: REASONS.INVALID_REQUEST} );
		}

	}; // status


	this.onMessage = function (...parameters) {
		color_log( COLORS.MCP, 'MCP:', ...parameters.map( (parameter)=>{
			return Object.keys( parameter );
		}));
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ServerManager.exit' );

		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ServerManager.init' );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const manager = await new ServerManager();

}; // MasterControlProgram


//EOF
