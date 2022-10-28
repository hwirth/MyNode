// manager.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS         } = require( '../server/config.js' );
const { DEBUG, COLORS    } = require( '../server/debug.js' );
const { color_log, dump  } = require( '../server/debug.js' );
const { REASONS, RESULT } = require( './constants.js' );


module.exports = function ServerManager (persistent_data, callbacks) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// UPTIME
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (! persistent_data.serverStartTime) persistent_data.serverStartTime = Date.now();

	function get_uptime (formatted = false) {
		const milliseconds = Date.now() - persistent_data.serverStartTime + 0*99999999999;

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

	}; // getUpTime


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

		callbacks.triggerExit();

	}; // restart


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
						debug: DEBUG,
						settings: SETTINGS,
					},
				);
			}

		} else {
			const command = Object.keys( parameters )[0];
			client.respond( RESULT.FAILURE, request_id, {[command]: REASONS.UNKNOWN_COMMAND} );
		}

	}; // status


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

}; // ServerManager


//EOF
