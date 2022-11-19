// config.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEB SOCKET SERVER - copy(l)eft 2022 - http://spielwiese.central-dogma.at/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fs   = require( 'fs' );
const path = require( 'path' );

const DEV_SERVER = true || (os.hostname() == 'labor');

const PROGRAM_NAME    = 'MyNode';
const PROGRAM_VERSION = 'v0.0.6p';

// Dict of parsed values, used for exporting in this file via SETTINGS[], etc.
const CONGIGURATION_FILE = '/etc/spielwiese.conf';
const config_file = parse_config_file();

function parse_config_file () {
		// Read file and remove comments
		const empty_lines = line => line.split('#')[0].trim().length > 0;
		const lines = fs.readFileSync( CONGIGURATION_FILE, 'utf8' ).split( '\n' ).filter( empty_lines );

		// Extract variable names and store values in dict
		const configuration = {}
		lines.forEach( (line)=>{
			const words = line.replace( /\t/g, ' ' ).split( ' ' );
			const variable = words[0];
			words.shift();
			configuration[variable] = words.join( ' ' ).trim();
		})

		return configuration;

} // parse_config_file


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SETTINGS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

let base_dir = __dirname.split( path.sep );  base_dir.pop();  base_dir = base_dir.join( path.sep ) + path.sep;  // SODD
const server_name = (config_file.SERVER_NAME || PROGRAM_VERSION);

const SETTINGS = {
	SERVER_NAME   : server_name,
	SERVER_BANNER : (`
 __  __       _   _           _
|  \\/  |_   _| \\ | | ___   __| | ___
| |\\/| | | | |  \\| |/ _ \\ / _\` |/ _ \\
| |  | | |_| | |\\  | (_) | (_| |  __/
|_|  |_|\\__, |_| \\_|\\___/ \\__,_|\\___|
        |___/
`
//... Workaround for Geany bug: `
	) + ' '.repeat(37 - server_name.length) + server_name,

	DEV_SERVER  : DEV_SERVER,
	INSTALL_GEH : true,   // Global error and unhandled rejection handler

	BASE_DIR    : base_dir,
	APP_PATH    : '../application/',
	MAIN_MODULE : '../application/router.js',

	MESSAGE_TIMESTAMPS   : true,    // Send time with each JSON reply
	REPORT_HANDLED       : !true,   // Always send response handled/rejected

	PING: {
		LOG      : !true,      // true: Might flood your log output
		KICK     : true,       // false: Allow clients to ignore ping updates
		INTERVAL : 6*1000,
	},

	LOG_PINGPONG         : false,
	KICK_NO_PONG         : true,
	ROUTER_ALWAYS_RELOAD : false,

	LOG: {
		FILE_NAME     : config_file.LOG_FILE_NAME,                // File name for log output
		TO_CONSOLE    : (config_file.LOG_TO_CONSOLE == 'true'),   // Whether color_log() outputs to STDOUT
		TO_FILE       : (config_file.LOG_TO_FILE == 'true'),      // Whether color_log() outputs to file
		MAX_FILE_SIZE : ((true) ? 1000*1000 : null),              // After write, file size will be adjusted
		MAX_DEPTH     : ((DEV_SERVER) ? 9 : 3),                   // null or int, objects log detail
	},

	SERVER: {
		RUN_AS_USER   : config_file.RUN_AS_USER,
		RUN_AS_GROUP  : config_file.RUN_AS_GROUP,
		DOCUMENT_ROOT : config_file.DOCUMENT_ROOT,
	},

	// Upper case chars are also accepted
	ALLOWED_URI_CHARS  : 'abcdefghijklmnopqrstuvwxyz0123456789_.,?&%=-+/:[]',   // http server white list
	ALLOWED_NAME_CHARS : 'abcdefghijklmnopqrstuvwxyz0123456789_[]()@-/äöüß',   // Chat name white list

	TIMEOUT: {
		SOCKET_CLOSE  : 300,
		LOGIN         : 5*1000,
		IDLE          : 5*1000,
	},

}; // SETTINGS


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// FROM CONFIG FILE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const SSL_KEYS = {
	PRIVATE : config_file.SSL_PRIVATE_KEY_FILE,
	PUBLIC  : config_file.SSL_PUBLIC_KEY_FILE,
};


const HTTPS_OPTIONS = {
	key  : fs.readFileSync( SSL_KEYS.PRIVATE ),
	cert : fs.readFileSync( SSL_KEYS.PUBLIC ),
	port : config_file.HTTPS_PORT,                        // 443, if https is running as standalone web server
	//...? agent: new https.Agent({ keepalive: true; }),
};


const WSS_OPTIONS = {
	port : config_file.WS_PORT,
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MAIN SCRIPT (HTTPS- and WSS SERVER)
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const EXIT_CODES = {
	UNKNOWN                 : -2,
	REQUEST_RESTART         : -1,
	EXIT                    : 0,
	PORT_IN_USE             : 1,
	CANT_DROP_PRIVILEGES    : 2,
	GLOBAL_ERROR_HANDLER    : 3,

}; // EXIT_CODES


// https://www.sitepoint.com/mime-types-complete-list/
const MIME_TYPES = {
	html  : 'text/html',
	css   : 'text/css',
	js    : 'application/javascript',
	txt   : 'text/plain',
	png   : 'image/png',
	jpg   : 'image/jpeg',
	jpeg  : 'image/jpeg',
	ico   : 'image/x-icon',
	woff  : 'font/woff',
	woff2 : 'font/woff2',

}; // MIME_TYPES


module.exports.PROGRAM_NAME    = PROGRAM_NAME;
module.exports.PROGRAM_VERSION = PROGRAM_VERSION;
module.exports.DEV_SERVER      = DEV_SERVER;
module.exports.SETTINGS        = SETTINGS;
module.exports.SSL_KEYS        = SSL_KEYS;
module.exports.HTTPS_OPTIONS   = HTTPS_OPTIONS;
module.exports.WSS_OPTIONS     = WSS_OPTIONS;
module.exports.EXIT_CODES      = EXIT_CODES;
module.exports.MIME_TYPES      = MIME_TYPES;


//EOF
