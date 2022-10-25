// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const os        = require( 'os' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const http      = require( 'follow-redirects' ).http;
const https     = require( 'https' );
const WebSocket = require( 'ws' );

const AppReloader = require( './reloader.js' );

const {
	PROGRAM_NAME, PROGRAM_VERSION,
	SETTINGS, EXIT_CODES,
	//ALLOWED_URI_CHARS,
	SSL_KEYS, MIME_TYPES, HTTPS_OPTIONS, WSS_OPTIONS, /*TURN_OPTIONS,*/

} = require( './config.js' );

const { DEBUG, COLORS, color_log } = require( './debug.js' );


const WebSocketServer = function () {
	const self = this;

	this.httpServer;
	this.wsServer;
	this.appReloader;


	this.onRestart = function () {
		self.appReloader.exit().then( ()=>{
			process.terminate( EXIT_CODES.REQUESTED_RESTART );
		});

	}; // onRestart


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENT RELAYS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_header (color, text) {
		if (! DEBUG.TRAFFIC) return;

		const banner
		= '--[ '
		+ text
		+ ' ]'
		+ ('-').repeat(79-20 - text.length - 6)
		;

		//if (text.charAt(0) != '/') color_log( '\n' );
		color_log( color, banner );
		if (text.charAt(0) == '/') color_log( '\n' );

	} // log_header


	function end_header (color, text) {
		log_header( color, '/' + text );
	}


	let connect_id = 0;
	this.onConnect = async function (socket, client_address, data) {
		const request_nr = ++connect_id;
		log_header( COLORS.CONNECT, 'CONNECT ' + request_nr + ' ]--[ ' + client_address );
		await self.appReloader.onConnect( socket, client_address );
		end_header( COLORS.CONNECT, 'CONNECT ' + request_nr );

	}; // onConnect


	let message_id = 0;
	this.onMessage = async function (socket, client_address, json_string) {
		const request_nr = ++message_id;
		log_header( COLORS.TRAFFIC, 'MESSAGE ' + request_nr + ' ]--[ ' + client_address );
		await self.appReloader.onMessage( socket, client_address, json_string );
		end_header( COLORS.TRAFFIC, 'MESSAGE ' + request_nr );

	}; // onMessage


	let disconnect_id = 0;
	this.onDisconnect = async function (socket, client_address) {
		const request_nr = ++disconnect_id;
		log_header( COLORS.DISCONNECT, 'DISCONNECT ' + request_nr + ' ]--[ ' + client_address );
		await self.appReloader.onDisconnect( socket, client_address );
		end_header( COLORS.DISCONNECT, 'DISCONNECT ' + request_nr );

	}; // onDisconnect


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
				'WebSocketServer',
				'Cowardly refusing to keep the process alive as root.',
			);
			process.exit( EXIT_CODES.CANT_DROP_PRIVILEGES );
		}

	} // drop_privileges


// HTTP SERVER ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_http_server (websocket_server) {
		color_log( COLORS.WSS, 'WebSocketServer:', 'Creating http server' );

		const new_http_server = https.createServer( HTTPS_OPTIONS ).listen( HTTPS_OPTIONS.port )

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
				'http_server.onUpgrade',
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
		/*
			if (request.headers.cookie) {
				color_log( COLORS.WSS, 'Cookie:', request.headers.cookie );
			}
		*/
			if (request.headers['x-forwarded-for']) {
				color_log( COLORS.WARNING, 'Unexpected header', 'x-forwarded-for' );
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
				color_log( COLORS.ERROR, 'websocket:', error  );
			}

			callbacks.onConnect( socket, client_address );
		});

		color_log( COLORS.WSS, 'WebSocketServer', 'Web socket running on port', HTTPS_OPTIONS.port );

		return new_server;

	} // create_web_socket


// ERROR HANDLER /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function global_error_handler (error) {
		color_log( COLORS.ERROR, '== GLOBAL = ERROR = HANDLER ==', '' );
		color_log( COLORS.ERROR, 'ERROR', 'WebSocketServer: ', error );

		cleanup( EXIT_CODES.GLOBAL_ERROR_HANDLER );

	} // global_error_handler


	function cleanup (event) {
		if (event == 'SIGINT') console.log();

		console.log( '.' + '-'.repeat(78) );
		console.log( '| main.js: exit: signal', event, '- Cleaning up...' );
		console.log( "'" + '-'.repeat(78) );

		const exit_code = ((typeof event == 'number') ? event : EXIT_CODES.UNKNOWN);

		process.removeListener( 'uncaughtException', global_error_handler );
		process.removeListener( 'unhandledRejection', global_error_handler );
		process.removeListener( 'SIGINT',  cleanup );
		process.removeListener( 'SIGQUIT', cleanup );
		process.removeListener( 'SIGUSR1', cleanup );
		process.removeListener( 'SIGUSR2', cleanup );
		process.removeListener( 'exit',    cleanup );

		if (self.ephemeralCode) {
			self.ephemeralCode.exit().then( ()=>{
				color_log( COLORS.EXIT, 'EXIT', 'Server terminating with exit code', exit_code );
				process.exit( exit_code );
			});
		} else {
			process.exit( exit_code );
		}

	} // cleanup


	function install_error_handler() {
		color_log( COLORS.WSS, 'WebSocketServer', 'Setting up error handler' );

		process.on( 'uncaughtException', global_error_handler );
		process.on( 'unhandledRejection', global_error_handler );
		process.on( 'SIGINT',  cleanup );
		process.on( 'SIGQUIT', cleanup );
		process.on( 'SIGTERM', cleanup );
		process.on( 'SIGUSR1', cleanup );
		process.on( 'SIGUSR2', cleanup );
		process.on( 'exit',    cleanup );

	} // install_error_handler


// INIT //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		if (DEBUG.TRACE_INIT) color_log( COLORS.TRACE_INIT, 'WebSocketServer.init' );

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
			//process.argv.forEach( (value, index)=>console.log( index + ': ' + value ) );

			install_error_handler();
			drop_privileges();
			self.wsServer      = create_web_socket({
				onConnect    : self.onConnect,
				onDisconnect : self.onDisconnect,
				onMessage    : self.onMessage,
			});
			self.httpServer    = create_http_server( self.wsServer );
			self.appReloader   = await new AppReloader( self.wsServer );

			done();
		});

	}; // init


	return self.init().then( ()=>self );

}; // WebSocketServer



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

console.time( '| READY. Boot time' );

// Exporting the instance, so the payload can require and access .data and .modules
new WebSocketServer().then( ()=>{
	console.log( '.' + '-'.repeat(78) );
	console.timeEnd( '| READY. Boot time' );
	console.log( "'" + '-'.repeat(78) );
});


//EOF
