// debug.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
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
	LOG_SETTINGS              : DEBUG_ENABLED && !false,   // On startup, show SETTINGS[] on console

	INSTANCES                 : DEBUG_ENABLED && !false,   // Functions announcing when they are called
	BANNER_HEADERS            : DEBUG_ENABLED && !false,   // Group logs for (dis)connect or messages, show counter
	HTTP_COOKIES              : DEBUG_ENABLED && !false,   // Show cookies on websocket connect

	CONNECT                   : DEBUG_ENABLED && false,    // Trace onConnect
	DISCONNECT                : DEBUG_ENABLED && false,    // Trace onDisconnect
	MESSAGE                   : DEBUG_ENABLED && !false,   // Trace onMessage

	MESSAGE_IN                : DEBUG_ENABLED && !false,   // Show received, onMessage
	MESSAGE_OUT               : DEBUG_ENABLED && !false,   // Show sent, socket.send()

	HTTP_GET_ALL              : DEBUG_ENABLED && !false,   // Log all GET requests
	HTTP_GET_ROOT             : DEBUG_ENABLED && !false,   // Log GET / requests

	RELOADER                  : DEBUG_ENABLED && false,   // Report changed and re-required files
	RELOADER_TIMES            : DEBUG_ENABLED && false,   // Debug reloader itself

	PROTOCOLS                 : DEBUG_ENABLED && false,
	PROTOCOLS_PERSISTENT_DATA : DEBUG_ENABLED && false,

	PARSE_RULES               : DEBUG_ENABLED && !false,

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
 * Actual colors used with  color_log()
 */
const COLORS = {
	DEFAULT      : ANSI_COLORS.DIM     + ANSI_COLORS.WHITE,
	STRONG       : ANSI_COLORS.BRIGHT  + ANSI_COLORS.WHITE,
	BOOT         : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,
	RUNNING_AS   : ANSI_COLORS.BRIGHT  + ANSI_COLORS.YELLOW,

	CONNECT      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.CYAN,
	DISCONNECT   : ANSI_COLORS.RED,
	TRAFFIC      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,

	RECEIVED     : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	SENDING      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,

	WSS          : ANSI_COLORS.GREEN,
	HTTP         : ANSI_COLORS.GREEN,
	INSTANCES    : ANSI_COLORS.BRIGHT  + ANSI_COLORS.YELLOW,
	PROTOCOLS    : ANSI_COLORS.BRIGHT  + ANSI_COLORS.MAGENTA,
	PROTOCOL     : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,
	SESSION      : ANSI_COLORS.GREEN,

	RELOADER     : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	UP_TO_DATE   : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	REQUIRE      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.YELLOW,

	COMMAND      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,
	EXIT         : ANSI_COLORS.BRIGHT  + ANSI_COLORS.RED,
	ERROR        : ANSI_COLORS.BRIGHT  + ANSI_COLORS.RED,
	WARNING      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.YELLOW,
	HTTPS        : ANSI_COLORS.DIM     + ANSI_COLORS.WHITE,
	SOCKET       : ANSI_COLORS.YELLOW,
	ADDRESS      : ANSI_COLORS.GREEN,

	RESET        : ANSI_COLORS.RESET,

}; // COLORS


module.exports.DEBUG         = DEBUG;
module.exports.COLORS        = COLORS;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

//function debug_log (tags = null, heading = null, ...logees) {
//} // debug_log


/**
 * color_log
 * Creates nice output to the console while debugging, and/or writes text sans color to a log file.
 * See also  config.js: SETTINGS.LOG.*
 */
function color_log (colors = '', heading = '', ...text) {
	if (colors == '\n') return console.log();

	heading = String( heading );

	const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' ';

	util.inspect.defaultOptions.depth = SETTINGS.LOG.MAX_DEPTH;

	if (SETTINGS.LOG.TO_CONSOLE) {
		const colored_heading
		= (heading.slice(-1) == ':')
		? heading.slice( 0, -1 ) + COLORS.RESET + ':'
		: heading + COLORS.RESET
		;
	/*
		if ([...text].length >= 1) {
			console.log(
				date + colors + colored_heading,
				...[...text].map( (entry)=>{
					return JSON.parse( JSON.stringify( entry, null, '\t' ));
				}),
				COLORS.RESET,
			);
		} else {
	*/
			console.log(
				date + colors + colored_heading,
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

			if (! fs.existsSync( path )) {
				console.log( 'debug.js: color_log: Attempting to create directory "' + path + '"' );
				fs.mkdirSync( path, { recursive: true } );
			}

			let data = date + heading;

			[...text].forEach( (entry)=>{
				if (typeof entry == 'string') {
					entry = entry.replace( /\x1b\[[0-9;]*m/g, '' );
				}

				data += JSON.stringify( entry, null, '\t' ) + '\n';
			});

			fs.appendFileSync( file_name, data );

			if (SETTINGS.LOG.MAX_FILE_SIZE !== null) {
				const size = fs.statSync( file_name ).size;

				if (size > SETTINGS.LOG.MAX_FILE_SIZE) {
					const truncated_log
					= fs
					.readFileSync( file_name )
					.toString()
					.substr( SETTINGS.LOG.MAX_FILE_SIZE / 2 )
					;

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

} // color_log


function dump (data) {
	return (
		(data instanceof Error)? (
			'Error: "'
			+ data.message
			+ '"\nStack: '
			+ data.stack
		):(
			JSON.parse( JSON.stringify(data) )
		)
	);

} // dump


module.exports.color_log = color_log;
module.exports.dump      = dump;


//EOF
