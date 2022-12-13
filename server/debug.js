// debug.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const os = require( 'os' );
const fs   = require( 'fs' );
const util = require( 'util' );

const { SETTINGS } = require( './config.js' );


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTANTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

/**
 * DEBUG
 * Flags controlling, what is logged and to which extent the output should contain details.
 */
const DEBUG_ENABLED = (SETTINGS.DEV_SERVER === true);          // Globally turn debug on or off
const DEBUG = {                                                // What to log
	LOG_SETTINGS              : DEBUG_ENABLED && false,   // On startup, show SETTINGS[] on console

	INSTANCES                 : DEBUG_ENABLED && !false,   // Functions announcing when they are called
	BANNER_HEADERS            : DEBUG_ENABLED && !false,   // Group logs for (dis)connect or messages, show counter
	HTTP_COOKIES              : DEBUG_ENABLED && !false,   // Show cookies on websocket connect

	CONNECT                   : DEBUG_ENABLED && false,    // Trace onConnect
	DISCONNECT                : DEBUG_ENABLED && !false,    // Trace onDisconnect
	MESSAGE                   : DEBUG_ENABLED && !false,   // Trace onMessage

	MESSAGE_IN                : DEBUG_ENABLED && !false,   // Show received, onMessage
	MESSAGE_OUT               : DEBUG_ENABLED && false,   // Show sent, socket.send()

	HTTP_UPGRADE              : DEBUG_ENABLED && false,
	HTTP_GET_ALL              : DEBUG_ENABLED && !false,   // Log all GET requests
	HTTP_GET_ROOT             : DEBUG_ENABLED && !false,   // Log GET / requests

	RELOADER                  : DEBUG_ENABLED && false,   // Report changed and re-required files
	RELOADER_TIMES            : DEBUG_ENABLED && false,   // Debug reloader itself

	ROUTER                    : DEBUG_ENABLED && false,
	ROUTER_PERSISTENT_DATA    : DEBUG_ENABLED && false,

	FILE_WATCHER              : DEBUG_ENABLED && !false,

	BOOT_TIME                 : Date.now(),

	// Publish functions
	log         : color_log,
	dump        : dump,
	formatError : format_error,

}; // DEBUG


/**
 * ANSI-escape codes to create colored log output on the console
 */
const ANSI_COLORS = {
	RESET   : '\x1b[0m',
	BRIGHT  : '\x1b[1m',
	DIM     : '\x1b[2m',
	BLACK   : '\x1b[30m',
	RED     : '\x1b[31m',
	GREEN   : '\x1b[32m',
	YELLOW  : '\x1b[33m',
	BLUE    : '\x1b[34m',
	MAGENTA : '\x1b[35m',
	CYAN    : '\x1b[36m',
	WHITE   : '\x1b[37m',

}; // ANSI_COLORS


/**
 * COLORS
 * Actual colors used with  DEBUG.log()
 */
const COLORS = {
	DEFAULT      : ANSI_COLORS.DIM    + ANSI_COLORS.WHITE,
	STRONG       : ANSI_COLORS.BRIGHT + ANSI_COLORS.WHITE,
	BOOT         : ANSI_COLORS.BRIGHT + ANSI_COLORS.GREEN,
	RUNNING_AS   : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,

	CONNECT      : ANSI_COLORS.BRIGHT + ANSI_COLORS.CYAN,
	DISCONNECT   : ANSI_COLORS.RED,
	TRAFFIC      : ANSI_COLORS.BRIGHT + ANSI_COLORS.GREEN,

	RECEIVED     : ANSI_COLORS.BRIGHT + ANSI_COLORS.BLUE,
	SENDING      : ANSI_COLORS.BRIGHT + ANSI_COLORS.GREEN,

	WSS          : ANSI_COLORS.GREEN,
	HTTP         : ANSI_COLORS.GREEN,
	RELOADER     : ANSI_COLORS.BRIGHT + ANSI_COLORS.BLUE,
	UP_TO_DATE   : ANSI_COLORS.BRIGHT + ANSI_COLORS.BLUE,
	REQUIRE      : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,
	INSTANCES    : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,
	PROTOCOLS    : ANSI_COLORS.BRIGHT + ANSI_COLORS.MAGENTA,
	PROTOCOL     : ANSI_COLORS.BRIGHT + ANSI_COLORS.GREEN,

	RELOAD       : ANSI_COLORS.GREEN,
	ROUTER       : ANSI_COLORS.CYAN,
	SESSION      : ANSI_COLORS.GREEN,
	ACCESS       : ANSI_COLORS.BRIGHT + ANSI_COLORS.CYAN,

	FILE_WATCHER : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,

	COMMAND      : ANSI_COLORS.BRIGHT + ANSI_COLORS.CYAN,
	SUCCESS      : ANSI_COLORS.BRIGHT + ANSI_COLORS.GREEN,
	ERROR        : ANSI_COLORS.BRIGHT + ANSI_COLORS.RED,
	WARNING      : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,
	HTTPS        : ANSI_COLORS.DIM    + ANSI_COLORS.WHITE,
	SOCKET       : ANSI_COLORS.YELLOW,
	ADDRESS      : ANSI_COLORS.GREEN,

	MCP          : ANSI_COLORS.BRIGHT + ANSI_COLORS.BLUE,
	TOKEN        : ANSI_COLORS.BRIGHT + ANSI_COLORS.CYAN,
	EXEC         : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,

	RSS_ENABLED  : ANSI_COLORS.GREEN,
	RSS_DISABLED : ANSI_COLORS.DIM    + ANSI_COLORS.CYAN,

	RESET        : ANSI_COLORS.RESET,
	EXIT         : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,

	SHUT_DOWN    : ANSI_COLORS.BRIGHT + ANSI_COLORS.YELLOW,

}; // COLORS


module.exports.DEBUG         = DEBUG;
module.exports.COLORS        = COLORS;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

function format_error (error) {
	if (!error) console.trace();
	const node_internal = line => line.indexOf('(node:') < 0;
	const empty         = line => line.trim() != '';
	return (
		(error.stack ? error.stack : '')
		.split('\n').filter( node_internal ).filter( empty ).join('\n')
		.replaceAll( SETTINGS.BASE_DIR, '' )
		//....replace( 'Error: ', '')
	);

} // format_error


/**
 * DEBUG.log
 * Creates nice output to the console while debugging, and/or writes text sans color to a log file.
 * See also  config.js: SETTINGS.LOG.*
 */
function color_log (colors = '', heading = '', ...text_list) {
	if (colors == '\n') return console.log();
	//...if (heading.charAt(0) == '<') heading = '\n' + heading;




	function dump_client (client) {
		if (client.login) return [
			client.address,
			client.login.userName,
			client.login.nickName,
			client.factor2,

		]; else return [
			client.address,
			client.factor2,
		];

	} // dump_client

	const text = [...text_list];

	if (JSON.stringify(text).indexOf( 'pong' ) >= 0) return;


	if (text[0] && (typeof text[0].idleSince != 'undefined')) {
		text[0] = dump_client( text[0] );
	}


try {
	heading = String( heading );
} catch (error) {
console.log( 'DEBUG.log: HEADING' );//...
}
	function format_uptime (milliseconds) {
		const seconds = Math.floor( milliseconds / 1000 );
		const frac = ms => '000'.slice( String(ms).length ) + String(ms);
		return seconds + '.' + frac( milliseconds % 1000 );
	}

	const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' ';
	const uptime = format_uptime(Date.now() - DEBUG.BOOT_TIME) + ' ';

	util.inspect.defaultOptions.depth = SETTINGS.LOG.MAX_DEPTH;

	if (SETTINGS.LOG.TO_CONSOLE) {
		const colored_heading
		= (heading.slice(-1) == ':')
		? heading.slice( 0, -1 ) + COLORS.RESET + ':'
		: heading + COLORS.RESET
		;
	/*
		if (text.length >= 1) {
			console.log(
				date + colors + colored_heading,
				...text.map( (entry)=>{
					return JSON.parse( JSON.stringify( entry, /*replacer* /null, '\t' ));
				}),
				COLORS.RESET,
			);
		} else {
	*/
			console.log(
				COLORS.RESET + uptime + date + colors + colored_heading,
				...text,
				COLORS.RESET,
			);
	/*
		}
	*/

	}

	if (SETTINGS.LOG.TO_FILE) {
		try {
			const file_name = SETTINGS.LOG.FILE_NAME;
			const pos  = file_name.lastIndexOf( '/' );
			const path = file_name.substr( 0, pos + 1 );

			if (!fs.existsSync( path )) {
				console.log( 'debug.js: DEBUG.log: Attempting to create directory "' + path + '"' );
				fs.mkdirSync( path, { recursive: true } );
			}

			let data = date + heading;

			text.forEach( (entry)=>{
				if (typeof entry == 'string') {
					entry = entry.replace( /\x1b\[[0-9;]*m/g, '' );
				}

				data += JSON.stringify( entry, null, '\t' ) + '\n';
			});

			fs.appendFileSync( file_name, data );

			if (SETTINGS.LOG.MAX_FILE_SIZE !== null) {
				const size = fs.statSync( file_name ).size;

				if (size > SETTINGS.LOG.MAX_FILE_SIZE) {
					const truncated_log = (
						fs
						.readFileSync( file_name )
						.toString()
						.substr( SETTINGS.LOG.MAX_FILE_SIZE / 2 )
					);

					fs.writeFileSync(
						file_name,
						'\n*** TRUNCATED: ' + date + '\n' + truncated_log
					);
				}
			}

		} catch (error) {
			console.log( 'ERROR: Log to file failed' );
			console.log( error );
		}
	}

} // DEBUG.log


function dump (data, short_format = false) {
	if (typeof data == 'undefined') return 'dump undefined';
	if (data instanceof Error     ) return 'Error: "' + data.message + '"\nStack: ' + data.stack;
	if (typeof data == 'undefined') return null;

	if (data.login && short_format) {
		return [ data.address, data.login.userName, data.login.nickName, data.login.factor2 ];
	} else {
		return JSON.parse( JSON.stringify(data) );   // Re-parsing turns it into a single line
	}

} // dump


//EOF
