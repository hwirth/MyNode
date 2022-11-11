// mcp: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS          } = require( '../../server/config.js' );
const { DEBUG, COLORS     } = require( '../../server/debug.js' );
const { color_log, dump   } = require( '../../server/debug.js' );

const { RESPONSE, REASONS, STATUS, STRINGS } = require( '../constants.js' );


module.exports = function MasterControl (persistent, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// GRANT ACCESS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let current_access_token = null;

	function create_new_access_token () {
		const new_token = String( Math.floor( Math.random() * 900 ) + 100 );
		const formatted_token = new_token.split('').join(' ');

		setTimeout( ()=>{
			// Delay output for nicer log filegue
			console.log( COLORS.MCP + 'MCP .' + '='.repeat(14) + '.' );
			console.log( COLORS.MCP + 'MCP | TOKEN:', COLORS.TOKEN + formatted_token, COLORS.MCP + '|' );
			console.log( COLORS.MCP + "MCP '" + '='.repeat(14) + "'" );
			console.log( COLORS.DEFAULT );
		});

		current_access_token = new_token;

		return new_token;

	} // create_new_access_token


	function verify_token (provided_token, client, login_request = false) {
		return (
			(login_request || client.inGroup( 'admin', 'dev' ))
			&& (provided_token == current_access_token)
		);

	} // verify_token


	this.verifyToken = verify_token;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.token = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<mcp.token>',
			dump( client ),
		);

		if (!client.inGroup( 'admin', 'dev' )) {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		create_new_access_token();

		client.respond( STATUS.SUCCESS, request_id, REASONS.TOKEN_ISSUED );

	}; // token


	this.request.status = function (client, request_id, parameters) {
		if (parameters.persistent || (parameters.persistent === null)) {
			if (client.login) {
				if (client.inGroup( 'admin', 'dev' )) {
					client.respond(
						STATUS.SUCCESS,
						request_id,
						callback.getAllPersistentData(),
					);
				} else {
					client.respond(
						STATUS.SUCCESS,
						request_id,
						REASONS.INSUFFICIENT_PERMS,
					);
				}
			}

		} else if (Object.keys(parameters).length == 0) {
			if (client.inGroup( 'admin', 'dev' )) {
				const memory_usage = process.memoryUsage();
				const memory_info = Object.entries(memory_usage).reduce( (previous, [key, value]) => {
					const formatted = Math.floor(value / 1024**2 * 100) / 100 + ' MiB';
					return { ...previous, [key]: formatted }
				}, {});

				client.respond(
					STATUS.SUCCESS,
					request_id,
					{
						upTime   : get_uptime( /*formatted*/true ),
						memory   : memory_info,
						access   : {
							rules: (
								callback
								.getProtocolDescription( /*show_line_numbers*/false )
								.split( '\n' )
							),
						},
						settings: SETTINGS,
						debug: DEBUG,
					},
				);

			} else {
				client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			}


		} else {
			const command = Object.keys( parameters )[0];
			client.respond( STATUS.FAILURE, request_id, {[command]: REASONS.INVALID_REQUEST} );
		}

	}; // status


	this.request.reset = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<mcp.reset>',
			dump( client ),
		);

		if (!client.inGroup('dev')) {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		callback.broadcast({ [REASONS.PERSISTENCE_RESET]: {} });
		callback.reset();

		client.respond( STATUS.SUCCESS, request_id, REASONS.PERSISTENCE_RESET );

	}; // reset


	this.request.restart = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<mcp.restart>',
			dump( client ),
		);

		const provided_token = String( parameters.token || null );

		if (false&&!verify_token( provided_token, client )) {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		callback.triggerExit();

	}; // restart


	this.request.inspect = function (client, request_id, parameters) {
/*
		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

console.log( 'MCP INSPECT', parameters );
		escalate_privileges(
			client,
			request_id.token || DEBUG.MCPTOKEN,
			execute,
		);

		function respond_error () {
			client.respond( STATUS.FAILURE, request_id, STRINGS.YOU_SHOULDNT_HAVE );
		}

		function execute () {
			let target = parameters;

			if (!target) {
				respond_error();
				return;
			}

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
							respond_error();
							return;
						}
					});
				}
			}

			if (typeof target == 'undefined') target = 'undefined';

			let Xresult = null;
			switch (typeof target) {
			case 'object' :  result = Object.keys( target );  break;
			default       :  result = target;                 break;
			}

			if (!parameters) parameters = 'master';
			client.respond( STATUS.SUCCESS, request_id, result );
		}
*/
	}; // inspect


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (!persistent.serverStartTime) persistent.serverStartTime = Date.now() - process.uptime();

	function get_uptime (formatted = false) {
		const milliseconds = process.uptime() * 1000;
		//const milliseconds = Date.now() - persistent.serverStartTime + 0*99999999999;

		if (formatted) {
			let seconds = Math.floor( milliseconds / 1000 );
			let minutes = Math.floor( seconds      / 60   );   seconds -= 60 * minutes;
			let hours   = Math.floor( minutes      / 60   );   minutes -= 60 * hours;
			let days    = Math.floor( hours        / 24   );   hours   -= 24 * days;
			let weeks   = Math.floor( days         / 7    );   days    -=  7 * weeks;
			let years   = Math.floor( weeks        / 52   );   weeks   -= 52 * years;  //...
			let millis  = Math.floor( milliseconds % 1000 );

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
					+ leading( millis , 3 ) + 's'
			);

		} else {
			return milliseconds;
		}

	} // get_uptime


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onMessage = function (...parameters) {
		if (DEBUG.MCP) color_log(
			COLORS.MCP,
			'MASTER CONTROL:',
			...parameters.map( (parameter)=>{
				switch (typeof parameter) {
					case 'object' : return '\n' + Object.keys( parameter );  break;
					default       : return '\n' + parameter;                 break;
				}
			}),
		);

	} // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ServerManager.exit' );

		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ServerManager.init' );

		create_new_access_token();

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const manager = await new ServerManager();

}; // MasterControlProgram


//EOF
