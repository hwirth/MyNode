// debug.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
const DEBUG_ENABLED = (SETTINGS.DEV_SERVER === true);       // Globally turn debug on or off
const DEBUG = {                                    // What to log

	LOG_SETTINGS              : DEBUG_ENABLED && !false,   // On startup, show SETTINGS[] on console

	TRACE_INIT                : DEBUG_ENABLED && !false,   // Functions announcing when they are called
	TRAFFIC                   : DEBUG_ENABLED && !false,   //

	CONNECT                   : DEBUG_ENABLED && !false,   // Trace onConnect
	DISCONNECT                : DEBUG_ENABLED && !false,   // Trace onDisconnect
	MESSAGE_IN                : DEBUG_ENABLED && !false,   // Show received, onMessage
	MESSAGE_OUT               : DEBUG_ENABLED && !false,   // Show sent, socket.send()

	HTTP_GET_ALL              : DEBUG_ENABLED && !false,   // Log all GET requests
	HTTP_GET_ROOT             : DEBUG_ENABLED && !false,   // Log GET / requests

	RELOADER_UP_TO_DATE 	  : DEBUG_ENABLED && false,    // Report unchanged files
	RELOADER_REQUIRE    	  : DEBUG_ENABLED && !false,   // Report changed and re-required files

	PROTOCOLS                 : DEBUG_ENABLED && false,
	PROTOCOLS_PERSISTENT_DATA : DEBUG_ENABLED && false,

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
	DEFAULT      : ANSI_COLORS.WHITE   + ANSI_COLORS.DIM,
	BOOT         : ANSI_COLORS.GREEN   + ANSI_COLORS.BRIGHT,
	RUNNING_AS   : ANSI_COLORS.YELLOW  + ANSI_COLORS.BRIGHT,

	CONNECT      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,
	DISCONNECT   : ANSI_COLORS.RED,
	RECEIVED     : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	SENDING      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.GREEN,

	WSS          : ANSI_COLORS.GREEN,
	HTTP         : ANSI_COLORS.GREEN,
	TRACE_INIT   : ANSI_COLORS.YELLOW  + ANSI_COLORS.BRIGHT,
	TRAFFIC      : ANSI_COLORS.CYAN    + ANSI_COLORS.BRIGHT,
	PROTOCOLS    : ANSI_COLORS.MAGENTA + ANSI_COLORS.BRIGHT,
	PROTOCOL     : ANSI_COLORS.GREEN   + ANSI_COLORS.BRIGHT,
	SESSION      : ANSI_COLORS.GREEN   + ANSI_COLORS.BRIGHT,

	RELOADER     : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	UP_TO_DATE   : ANSI_COLORS.BRIGHT  + ANSI_COLORS.BLUE,
	REQUIRE      : ANSI_COLORS.BRIGHT  + ANSI_COLORS.YELLOW,

	EXIT         : ANSI_COLORS.RED     + ANSI_COLORS.BRIGHT,
	ERROR        : ANSI_COLORS.RED     + ANSI_COLORS.BRIGHT,
	WARNING      : ANSI_COLORS.YELLOW  + ANSI_COLORS.BRIGHT,
	HTTPS        : ANSI_COLORS.WHITE   + ANSI_COLORS.DIM,
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

	const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' ';

	util.inspect.defaultOptions.depth = SETTINGS.LOG.MAX_DEPTH;

	if (SETTINGS.LOG.TO_CONSOLE) {
		const colored_heading
		= (heading.slice(-1) == ':')
		? heading.slice( 0, -1 ) + COLORS.RESET + ':'
		: heading + COLORS.RESET
		;

		console.log( date + colors + colored_heading, ...text, COLORS.RESET );
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


module.exports.color_log = color_log;


//EOF
