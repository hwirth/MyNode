// manager.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
const { REASONS         } = require( './constants.js' );


module.exports = function ServerManager (persistent_data, callbacks) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function respond_success (client, command, reason, status = true) {
		client.send({
			server: {
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
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.requestHandlers = {};

	this.requestHandlers.restart = function (client, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<server.restart>',
			dump( client ),
		);

		callbacks.triggerExit();

	}; // restart


	this.requestHandlers.status = function (client, parameters) {

		function respond (success, response) {
			client.send({
				server : {
					status: response,
				},
				success : success,
			});
		}


		if (parameters.persistent || (parameters.persistent === null)) {
			if (client.login) {
				if (client.inGroup( 'admin' )) {
					respond( true, {
						persistent: callbacks.getAllPersistentData(),
					});
				} else {
					respond( true, {
						persistent: {
							success : false,
							reason  : REASONS.INSUFFICIENT_PERMS,
						},
					});
				}
			}

		} else if (Object.keys(parameters).length == 0) {
			if (client.inGroup( 'admin' )) {
				const heap = process.memoryUsage().heapUsed;
				respond( true, {
					upTime   : get_uptime( /*formatted*/true ),
					heapUsed : Math.floor(heap / 1024**2 * 100) / 100 + ' MiB',
					access   : {
						rules: (
							callbacks
							.getProtocolDescription( /*show_line_numbers*/false )
							.split( '\n' )
						),
					debug: DEBUG,
					settings: SETTINGS,
					}
				});
			}

		} else {
			const command = Object.keys( parameters )[0];
			respond( false, {[command]: REASONS.UNKNOWN_COMMAND} );
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
