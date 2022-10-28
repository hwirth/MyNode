// server_main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const {
	PROGRAM_NAME, PROGRAM_VERSION,
	SETTINGS, EXIT_CODES,
	MIME_TYPES, HTTPS_OPTIONS, WSS_OPTIONS, /*TURN_OPTIONS,*/

} = require( './config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );

const AppReloader = require( './reloader.js' );

const os        = require( 'os' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const http      = require( 'follow-redirects' ).http;
const https     = require( 'https' );
const WebSocket = require( 'ws' );


const WebSocketServer = function () {
	const self = this;

	this.httpServer;
	this.wsServer;
	this.appReloader;


	this.onRestart = function () {
		self.appReloader.exit().then( ()=>{
			process.terminate( EXIT_CODES.RESULTED_RESTART );
		});

	}; // onRestart


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_header (color, text, extra_dashes = 0) {
		if (! DEBUG.BANNER_HEADERS) return;

		const banner
		= '--[ '
		+ text
		+ ' ]'
		+ ('-').repeat(
			79               // Total line max
			- 20             // Timestamp
			- text.length
			- 6              // Brackets and spaces
			+ extra_dashes
		);

		//if (text.charAt(0) != '/') color_log( '\n' );
		color_log( color, banner );
		if (text.charAt(0) == '/') color_log( '\n' );

	} // log_header


	function end_header (color, text, extra_dashes) {
		if (DEBUG.BANNER_HEADERS) log_header( color, '/' + text, extra_dashes );
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENT RELAYS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const EXTRA_HEADER_DASHES = 18;
	let connect_id    = 0;
	let message_id    = 0;
	let disconnect_id = 0;

	this.onConnect = async function (socket, client_address, data) {
		const request_nr = ++connect_id;

		log_header(
			COLORS.CONNECT,
			'CONNECT '
			+ request_nr
			+ ' ]--[ '
			+ COLORS.STRONG
			+ client_address
			+ COLORS.CONNECT
			,
			EXTRA_HEADER_DASHES,
		);

		await self.appReloader.onConnect( socket, client_address );

		if (DEBUG.CONNECT) end_header( COLORS.CONNECT, 'CONNECT ' + request_nr ); else console.log();

	}; // onConnect


	this.onMessage = async function (socket, client_address, json_string) {
		const request_nr = ++message_id;

		log_header(
			COLORS.TRAFFIC,
			'MESSAGE '
			+ request_nr
			+ ' ]--[ '
			+ COLORS.STRONG
			+ client_address
			+ COLORS.TRAFFIC
			,
			EXTRA_HEADER_DASHES,
		);

		await self.appReloader.onMessage( socket, client_address, json_string );

		if (DEBUG.MESSAGE) end_header( COLORS.TRAFFIC, 'MESSAGE ' + request_nr ); else console.log();

	}; // onMessage


	this.onDisconnect = async function (socket, client_address) {
		const request_nr = ++disconnect_id;

		log_header(
			COLORS.DISCONNECT,
			'DISCONNECT '
			+ request_nr
			+ ' ]--[ '
			+ COLORS.STRONG
			+ client_address
			+ COLORS.RESET
			+ COLORS.DISCONNECT
			,
			EXTRA_HEADER_DASHES,
		);

		await self.appReloader.onDisconnect( socket, client_address );

		if (DEBUG.DISCONNECT) end_header( COLORS.DISCONNECT, 'DISCONNECT ' + request_nr ); else console.log();

	}; // onDisconnect


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const server_start_time = Date.now();

	this.getUpTime = function (formatted = false) {
		let milliseconds = Date.now() - server_start_time;
		if (formatted) {
			let seconds = Math.floor( milliseconds / 1000 );   milliseconds -= seconds * 1000;
			let minutes = Math.floor( seconds      / 60   );   seconds      -= minutes * 60;
			let hours   = Math.floor( minutes      / 60   );   minutes      -= hours   * 60;
			let days    = Math.floor( hours        / 24   );   hours        -= days    * 24;
			let weeks   = Math.floor( days         / 7    );   days         -= weeks   * 24;
			return (
				  (weeks   ? weeks   + 'w, ' : '')
				+ (days    ? days    + 'd ' : '')
				+ (hours   ? hours   + 'h ' : '')
				+ (minutes ? minutes + 'm ' : '')
				+ (seconds ? seconds + 's ' : '')
				+ milliseconds + 'ms'
			);

		} else {
			return milliseconds;
		}

	}; // getUpTime


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function drop_privileges () {
		try {
			process.setgid( SETTINGS.SERVER.RUN_AS_GROUP );
			process.setuid( SETTINGS.SERVER.RUN_AS_USER );

			const after = os.userInfo();

			color_log(
				COLORS.RUNNING_AS,
				'PRIVILEGES DROPPED:',
				'User:', COLORS.RUNNING_AS + after.username + COLORS.DEFAULT,
				'UID:',  after.uid,
				'GID:',  after.gid,
			);

		} catch (error) {
			color_log( COLORS.DEFAULT, error );
			color_log(
				COLORS.WSS,
				'WebSocketServer-drop_privileges:',
				'Could not drop privileges, terminating program.',
			);
			process.exit( EXIT_CODES.CANT_DROP_PRIVILEGES );
		}

	} // drop_privileges


// HTTP SERVER ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_http_server (websocket_server) {
		color_log( COLORS.WSS, 'WebSocketServer:', 'Creating http server' );

		const new_http_server = https.createServer( HTTPS_OPTIONS ).listen( HTTPS_OPTIONS.port );

		new_http_server.on( 'error', (error)=>{
			if (error.code == 'EADDRINUSE') {
				color_log(
					'WebSocketServer-create_http_server: http_server.onError:'
					+ ' Port '
					+ error.port
					+ ' already in use.'
				);
				process.exit( EXIT_CODES.PORT_IN_USE );
			} else {
				global_error_handler( error );
			}

		}); // onError

		new_http_server.on( 'upgrade', (request, socket, head)=>{
			let client_address
			= socket.remoteAddress
			+ ':'
			+ socket.remotePort
			;

			if (client_address.slice(0, 7) === '::ffff:') {
				client_address = client_address.slice( 7 );
			}

			color_log(
				COLORS.HTTP,
				'http_server.onUpgrade:',
				client_address,
			);

			self.wsServer.handleUpgrade( request, socket, head, (socket)=>{
				self.wsServer.emit( 'connection', socket, request );
			});

		}); // onUpgrade

		new_http_server.on( 'request', (request, response)=>{

			function return_http_error (response, code) {
				color_log( COLORS.ERROR, 'http:', 'Client address:', request.socket.remoteAddress );
				color_log( COLORS.ERROR, 'http:', 'Requested URL:', request.url );
				color_log( COLORS.ERROR, 'http:', 'Headers:', request.headers );

				response.statusCode = code;
				response.end( '<h1>' + code + '</h1><p>' + http.STATUS_CODES[code] );

			} // return_http_error


			//if ( DEBUG.HTTP_GET_ALL || (DEBUG.HTTP_GET_ROOT && (request.url == '/')) ) {
			//	color_log( COLORS.HTTPS, 'GET', request.url );
			//}

			if (request.url == '/public_ip') {
				response.setHeader( 'Content-Type', MIME_TYPES.txt + '; charset=utf8' );
				response.writeHead( 200 );
				response.end( request.connection.remoteAddress );

				return;
			}

			let request_url_tainted = request.url;
			let request_url_clean = '';
			for (let i = 0; i < request_url_tainted.length; ++i) {
				const char = request_url_tainted[i].toLowerCase();
				if (SETTINGS.ALLOWED_URI_CHARS.indexOf(char) >= 0) {
					request_url_clean += char;
				}
			}

			if (request_url_clean != request_url_tainted) {
				color_log( COLORS.ERROR, 'http:', 'Invalid URL: ' + request_url_tainted );
				return_http_error( response, 404 );
				return;
			}

			const pos = (request_url_clean + '?').indexOf( '?' );
			request_url_clean = request_url_clean.substr( 0, pos );

			const file_name
			= SETTINGS.SERVER.DOCUMENT_ROOT
			+ ((request_url_clean == '/') ? '/index.html' : request_url_clean)
			;

			if (! fs.existsSync( file_name )) {
				color_log( COLORS.ERROR, 'http:', 'File not found: ' + file_name );
				return_http_error( response, 404 );
				return;
			}

			fs.stat( file_name, (error)=>{
				if (error !== null) {
					color_log( COLORS.ERROR, 'http:', error.code );
					return_http_error( response, 404 );
					return;
				}
			});

			if (! fs.statSync( file_name ).isFile()) {
				color_log( COLORS.ERROR, 'http:', 'Not a file ' + file_name );
				return_http_error( response, 404 );
				return;
			}

			fs.readFile( file_name, (error, data)=>{
				if (error) {
					color_log( COLORS.ERROR, 'http:', error );
					return;
				} else {
					const file_extension = path.extname( file_name ).substr( 1 );
					let mime_type = MIME_TYPES[file_extension];
					if (mime_type == undefined) mime_type = 'text/plain';

					response.setHeader( 'Content-Type', mime_type + '; charset=utf8' );
					response.writeHead( 200 );
					response.end( data );
				}
			});

		}); // onRequest

		return new_http_server;

	} // create_http_server


// WEB SOCKET ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_web_socket (callbacks) {
		color_log( COLORS.WSS, 'WebSocketServer:', 'Creating web socket' );

		const new_server = new WebSocket.Server({ noServer: true });

		new_server.on( 'connection', (socket, request)=>{
			let client_address = null;

			if (DEBUG.HTTP_COOKIES) if (request.headers.cookie) {
				color_log( COLORS.WSS, 'Cookie:', request.headers.cookie );
			}

			if (request.headers['x-forwarded-for']) {
				color_log( COLORS.WARNING, 'Unexpected header:', 'x-forwarded-for' );
				client_address = request.headers['x-forwarded-for'];   //... not tested

			} else {
				client_address
				= request.connection.remoteAddress
				+ ':'
				+ request.connection.remotePort
				;
			}

			// Remove IPv6 prefix
			if (client_address.slice(0, 7) === '::ffff:') {
				client_address = client_address.slice( 7 );
			}

			socket.on( 'close', ()=>{
				callbacks.onDisconnect( socket, client_address );
			});

			socket.on( 'message', (message_data)=>{
				callbacks.onMessage( socket, client_address, message_data );
			});

			socket.onerror = function (error) {
				color_log( COLORS.ERROR, 'WebSocketServer-create_websocket:', error  );
			}

			callbacks.onConnect( socket, client_address );
		});

		color_log( COLORS.WSS, 'WebSocketServer:', 'Web socket running on port', HTTPS_OPTIONS.port );

		return new_server;

	} // create_web_socket


// ERROR HANDLER /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function global_error_handler (error) {
		color_log( COLORS.ERROR, 'GLOBAL ERROR HANDLER', dump(error) );

		self.exit( EXIT_CODES.GLOBAL_ERROR_HANDLER );
		//terminate_program( EXIT_CODES.GLOBAL_ERROR_HANDLER );

	} // global_error_handler


	function install_error_handler() {
		color_log( COLORS.WSS, 'WebSocketServer:', 'Setting up error handler' );

		process.on( 'uncaughtException', global_error_handler );
		process.on( 'unhandledRejection', global_error_handler );
		process.on( 'SIGINT',  terminate_program );
		process.on( 'SIGQUIT', terminate_program );
		process.on( 'SIGTERM', terminate_program );
		process.on( 'SIGUSR1', terminate_program );
		process.on( 'SIGUSR2', terminate_program );
		process.on( 'exit',    terminate_program );

	} // install_error_handler


// EXIT //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function terminate_program (event) {
		if (event == 'SIGINT') {
			console.log();
			return self.exit();
		}

		console.log( '.' + '-'.repeat(78) );
		console.log( '| SHUTTING DOWN' );
		console.log( "'" + '-'.repeat(78) );

		console.time( 'Shutdown time' );

		if (self.appReloader) {
			self.appReloader.exit().then( cleanup_and_die );
		} else {
			cleanup_and_die();
		}

		function cleanup_and_die () {
			console.log( '.' + '-'.repeat(78) );
			console.log( '| main.js: exit: signal', event, '- Cleaning up...' );
			console.log( "'" + '-'.repeat(78) );

			const exit_code = ((typeof event == 'number') ? event : EXIT_CODES.UNKNOWN);
			color_log( COLORS.EXIT, 'EXIT', 'Server terminating with exit code', exit_code );

			process.removeListener( 'uncaughtException', global_error_handler );
			process.removeListener( 'unhandledRejection', global_error_handler );
			process.removeListener( 'SIGINT',  terminate_program );
			process.removeListener( 'SIGQUIT', terminate_program );
			process.removeListener( 'SIGUSR1', terminate_program );
			process.removeListener( 'SIGUSR2', terminate_program );
			process.removeListener( 'exit',    terminate_program );

			console.timeEnd( 'Shutdown time' );
			console.log( '\n\n' );

			process.exit( exit_code );

		} // cleanup_and_die

	} // terminate_program


	this.exit = function (event) {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'WebSocketServer.exit' );

		terminate_program( event );

	}; // exit


// INIT //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'WebSocketServer.init' );

		return new Promise( async (done)=>{
			console.log( '.' + '-'.repeat(78) );
			console.log( '|', COLORS.BOOT + PROGRAM_NAME + ' ' + PROGRAM_VERSION + COLORS.DEFAULT );
			console.log( '|' + '-'.repeat(78) );
			console.log( '| HOST NAME         ', os.hostname() );
			console.log( '| PORT              ', HTTPS_OPTIONS.port );
		if (DEBUG.LOG_SETTINGS) {
			console.log( '| SETTINGS          ', SETTINGS );
		}
			console.log( "'" + '-'.repeat(78) );
			//...process.argv.forEach( (value, index)=>console.log( index + ': ' + value ) );

			install_error_handler();
			drop_privileges();
			self.wsServer      = create_web_socket({
				onConnect    : self.onConnect,
				onDisconnect : self.onDisconnect,
				onMessage    : self.onMessage,
			});
			self.httpServer    = create_http_server( self.wsServer );
			self.appReloader   = await new AppReloader( self.wsServer, {
				triggerExit : self.exit,
				getUpTime   : self.getUpTime,
			});

			done();
		});

	}; // init


	return self.init().then( ()=>self );   // const server = await new WebSocketServer()
	//... Why does it require a return here, but not with the other object templates in this project??

}; // WebSocketServer



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

console.time( '| READY. Boot time' );
new WebSocketServer().then( ()=>{
	console.log( '.' + '-'.repeat(78) );
	console.timeEnd( '| READY. Boot time' );
	console.log( "'" + '-'.repeat(78) );
});


//EOF
