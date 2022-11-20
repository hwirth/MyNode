// mcp: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fs   = require( 'fs' );
const exec = require( 'child_process' ).exec;

const { SETTINGS          } = require( '../../server/config.js' );
const { DEBUG, COLORS     } = require( '../../server/debug.js' );
const { color_log, dump   } = require( '../../server/debug.js' );

const { RESPONSE, REASONS, STATUS, STRINGS } = require( '../constants.js' );


module.exports = function ServerControl (persistent, callback) {
	const self = this;

	this.request = {};


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
			console.log( COLORS.MCP + "MCP '" + '='.repeat(14) + "'" + COLORS.DEFAULT );
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
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (!persistent.serverStartTime) persistent.serverStartTime = Date.now() - process.uptime();

	function get_uptime (formatted = false) {
		const milliseconds = process.uptime() * 1000;
		//...const milliseconds = Date.now() - persistent.serverStartTime + 0*99999999999;

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


	function get_memory_info () {
		const memory_usage = process.memoryUsage();
		return Object.entries( memory_usage ).reduce( (previous, [key, value]) => {
			const formatted = Math.floor(value / 1024**2 * 100) / 100 + ' MiB';
			return { ...previous, [key]: formatted }
		}, {});

	} // get_memory_info


	async function get_source_info () {
		const entries = await new Promise( (resolve, reject)=>{
			const command = SETTINGS.BASE_DIR + 'functions.sh';
			console.log( COLORS.ERROR, 'EXEC', command );
			exec( command, (error, stdout, stderr)=>{
				if (error !== null) {
					reject( error );
				} else {
					resolve( stdout.trim().replace( /\t/g, ' ' ).split('\n') );
				}
			});
		})

		const result = {};
		entries.forEach( (entry)=>{
			const key = entry.split( ':', 1 )[0];
			if (!result[key]) result[key] = [];

			const rest = entry.slice( key.length + 1 );
			result[key].push( rest );
		});
		return result;

	} // get_source_info


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.token = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.token>', client );

		if (!client.inGroup( 'admin', 'dev' )) {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		create_new_access_token();

		client.respond( STATUS.SUCCESS, request_id, REASONS.TOKEN_ISSUED );

	}; // token


	this.request.status = async function (client, request_id, parameters) {
		let response = null;

		if (!client.login) {
			color_log( COLORS.ERROR, '<mcp.status.persistent>', client );
			response = [ STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS ];

		} else if (parameters.persistent || (parameters.persistent === null)) {
			color_log( COLORS.COMMAND, '<mcp.status.persistent>', client );
			if (client.inGroup( 'admin', 'dev' )) {
				response = [
					STATUS.SUCCESS,
					request_id,
					callback.getAllPersistentData(),
				];
			} else {
				response = [
					STATUS.SUCCESS,
					request_id,
					REASONS.INSUFFICIENT_PERMS,
				];
			}

		} else if (Object.keys(parameters).length > 0) {
			color_log( COLORS.COMMAND, '<mcp.status.persistent>', client );

			let add_uptime, add_memory, add_settings, add_debug, add_source, add_access;

			function has (key) {
				return (key == 'all') || (Object.keys( parameters ).indexOf(key) >= 0);
			}
			if (has('persistent')) add_persistent = persistent;
			if (has('uptime'    )) add_uptime     = get_uptime( /*formatted*/true );
			if (has('memory'    )) add_memory     = get_memory_info();
			if (has('settings'  )) add_settings   = SETTINGS;
			if (has('debug'     )) add_debug      = DEBUG;
			if (has('source'    )) add_source     = await get_source_info();
			if (has('access'    )) add_access     = {
				rules : callback.getProtocolDescription().split('\n'),
				meta  : callback.getAllPersistentData().access.descriptionState,
			};

			response = [
				STATUS.SUCCESS,
				request_id,
				{
					upTime   : add_uptime,
					memory   : add_memory,
					settings : add_settings,
					debug    : add_debug,
					source   : add_source,
					access   : add_access,
				},
			];

		} else {
			response = [
				STATUS.SUCCESS,
				request_id,
				{
					upTime   : get_uptime( /*formatted*/true ),
					memory   : get_memory_info(),
					source   : await get_source_info(),
				},
			];
		}

		client.respond( ...response );

	}; // status


	this.request.reset = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.reset>', client );

		if (!client.inGroup('dev')) {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		callback.broadcast({ [REASONS.PERSISTENCE_RESET]: {} });
		callback.reset();

		client.respond( STATUS.SUCCESS, request_id, REASONS.PERSISTENCE_RESET );

	}; // reset


	this.request.restart = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.restart>', client );

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


// CRASH TEST ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	//...? How to automatically recover from application errors like this:

	const TEST_URL = 'https://rss.orf.at/news.xml';

	// Mistake in application code: Uses a Promise, doesn't catch
	this.request.crashSync = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.crashSync>', client );

		fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashSync

	// Mistake in application code: Uses a Promise, doesn't await
	this.request.crashAsync = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.crashAsync>', client );

		fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashAsync

	// This will get caught properly:
	this.request.crashSafe = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<mcp.crashSafe>', client );

		await fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashAsync


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
		self.fsWatcher.close();
		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'ServerManager.reset' );
		if (Object.keys( persistent ).length == 0) ;

		create_new_access_token();

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ServerManager.init' );
		self.reset();

		self.fsWatcher = fs.watch( SETTINGS.BASE_DIR + 'client', (event, filename)=>{
			if (filename && (filename.charAt(0) != '.')) {
				callback.broadcast({
					type   : 'reload/client',
					reload : {
						[filename] : {},
					},
				});
			} else {
				//console.log( 'filename not provided' );
			}
		});
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const manager = await new ServerManager();

}; // ServerManager


//EOF
