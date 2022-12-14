// server/main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const os        = require( 'os' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const http      = require( 'follow-redirects' ).http;
const https     = require( 'https' );
const WebSocket = require( 'ws' );

const AppReloader = require( './reloader.js' );

const { PROGRAM_NAME, PROGRAM_VERSION  } = require( './config.js' );
const { SETTINGS, EXIT_CODES           } = require( './config.js' );
const { MIME_TYPES, HTTPS_OPTIONS      } = require( './config.js' );
const { WSS_OPTIONS, /*TURN_OPTIONS,*/ } = require( './config.js' );
const { STRINGS                        } = require( '../application/constants.js' );
const { DEBUG, COLORS                  } = require( '../server/debug.js' );

const EXIT_MESSAGE = STRINGS.END_OF_LINE;


const Main = function () {
	const self = this;

	this.httpServer;
	this.wsServer;

	this.reloader;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_header (color, text, extra_dashes = 0) {
		if (!DEBUG.BANNER_HEADERS) return;

		const banner = '--[ ' + text + ' ]' + ('-').repeat(
			79               // Total line max
			- 20             // Timestamp
			- text.length
			- 6              // Brackets and spaces
			+ extra_dashes
		);

		//if (text.charAt(0) != '/') DEBUG.log( '\n' );
		DEBUG.log( color, banner );
		if (text.charAt(0) == '/') DEBUG.log( '\n' );

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

		await self.reloader.onConnect( socket, client_address );

		if (DEBUG.CONNECT) end_header( COLORS.CONNECT, 'CONNECT ' + request_nr ); else console.log();

	}; // onConnect


	this.onMessage = async function (socket, client_address, json_string) {
		const request_nr  = ++message_id;

if (!true && typeof json_string != 'string') {
	log_header(
		COLORS.WARNING,
		'GOT BUFFER '
		+ request_nr
		+ ' ]--[ '
		+ COLORS.STRONG
		+ client_address
		+ COLORS.WARNING
		,
		EXTRA_HEADER_DASHES,
	);

	return socket.close();
}

function parse_json(message) {//...
	let result = message;
	try   { result = JSON.parse( message ); }
	catch { /* Assume string */
		log_header(
			COLORS.WARNING,
			'GOT BUFFER '
			+ request_nr
			+ ' ]--[ '
			+ COLORS.STRONG
			+ client_address
			+ COLORS.WARNING
			,
			EXTRA_HEADER_DASHES,
		);

		socket.close();
	}

	return result;
}

		const message     = parse_json( json_string );
		const is_pingpong = message.session && message.session.pong;
		const do_log      = (!is_pingpong || (is_pingpong && SETTINGS.PING.LOG));

		if (do_log) log_header(
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

		if (DEBUG.MESSAGE_IN && do_log) DEBUG.log( COLORS.RECEIVED, 'Received:', message );

		await self.reloader.onMessage( socket, client_address, json_string );

		if (do_log) {
			if (DEBUG.MESSAGE) {
				end_header( COLORS.TRAFFIC, 'MESSAGE ' + request_nr );
			} else {
				console.log();
			}
		}

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

		await self.reloader.onDisconnect( socket, client_address );

		if (DEBUG.DISCONNECT) end_header( COLORS.DISCONNECT, 'DISCONNECT ' + request_nr ); else console.log();

	}; // onDisconnect


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function drop_privileges () {
		try {
			process.setgid( SETTINGS.SERVER.RUN_AS_GROUP );
			process.setuid( SETTINGS.SERVER.RUN_AS_USER );

			const after = os.userInfo();

			DEBUG.log(
				COLORS.RUNNING_AS,
				'PRIVILEGES DROPPED:',
				'User:', COLORS.RUNNING_AS + after.username + COLORS.DEFAULT,
				'UID:',  after.uid,
				'GID:',  after.gid,
			);

		} catch (error) {
			DEBUG.log( COLORS.DEFAULT, error );
			DEBUG.log(
				COLORS.WSS,
				'WebSocketServer-drop_privileges:',
				'Could not drop privileges, terminating program.',
			);
			process.exit( EXIT_CODES.CANT_DROP_PRIVILEGES );
		}

	} // drop_privileges


// HTTP SERVER ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_http_server (websocket_server) {
		DEBUG.log( COLORS.WSS, 'WebSocketServer:', 'Creating http server' );

		const new_http_server = https.createServer( HTTPS_OPTIONS ).listen( HTTPS_OPTIONS.port );

		new_http_server.on( 'error', (error)=>{
			if (error.code == 'EADDRINUSE') {
				DEBUG.log(
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

			if (DEBUG.HTTP_UPGRADE) DEBUG.log(
				COLORS.HTTP,
				'http_server.onUpgrade:',
				client_address,
			);

			self.wsServer.handleUpgrade( request, socket, head, (socket)=>{
				self.wsServer.emit( 'connection', socket, request );
				socket.send( //JSON.stringify({ [
					'Welcome on ' + SETTINGS.SERVER_BANNER
				//: {},] })
				);

				socket.send(
					JSON.stringify({
						broadcast : {
							type : 'server/name',
							name : SETTINGS.SERVER_NAME,
						},
						time : Date.now(),
					}),
				);
			});



		}); // onUpgrade

		new_http_server.on( 'request', (request, response)=>{

			function return_http_error (response, code, url) {
				DEBUG.log( COLORS.ERROR, 'http:', 'Client address:', request.socket.remoteAddress );
				DEBUG.log( COLORS.ERROR, 'http:', 'Requested URL:', request.url );
				DEBUG.log( COLORS.ERROR, 'http:', 'Headers:', request.headers , '-'.repeat(77) );

				response.statusCode = code;
				response.end(
					  '<h1>'  + code + '</h1>'
					+ '<h2>'  + http.STATUS_CODES[code] + '</h2>'
					+ '<pre>' + url + '</pre>'
				);

			} // return_http_error


			//if ( DEBUG.HTTP_GET_ALL || (DEBUG.HTTP_GET_ROOT && (request.url == '/')) ) {
			//	DEBUG.log( COLORS.HTTPS, 'GET', request.url );
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
				const char = request_url_tainted[i];   // Allow upper case too.
				if (SETTINGS.ALLOWED_URI_CHARS.indexOf(char.toLowerCase()) >= 0) {
					request_url_clean += char;
				}
			}

			if (request_url_clean != request_url_tainted) {
				DEBUG.log( COLORS.ERROR, 'http:', 'Invalid URL: ' + request_url_tainted );
				return_http_error( response, 404, request_url_tainted );
				return;
			}

			const pos = (request_url_clean + '?').indexOf( '?' );
			request_url_clean = request_url_clean.substr( 0, pos );

			const file_name = SETTINGS.SERVER.DOCUMENT_ROOT + (
				  (request_url_clean == '/') ? '/index.html'
				: (request_url_clean == '/README' ) ? '/README/index.html'
				: (request_url_clean == '/README/') ? '/README/index.html'
				: (request_url_clean == '/README/index.html') ? '/README/index.html'
				: request_url_clean
			);

			if (!fs.existsSync( file_name )) {
				DEBUG.log( COLORS.ERROR, 'http:', 'File not found: ' + file_name );
				return_http_error( response, 404, file_name );
				return;
			}

			fs.stat( file_name, (error)=>{
				if (error !== null) {
					DEBUG.log( COLORS.ERROR, 'http:', error.code );
					return_http_error( response, 404, file_name );
					return;
				}
			});

			if (!fs.statSync( file_name ).isFile()) {
				DEBUG.log( COLORS.ERROR, 'http:', 'Not a file ' + file_name );
				return_http_error( response, 404, file_name );
				return;
			}

			fs.readFile( file_name, (error, data)=>{
				if (error) {
					DEBUG.log( COLORS.ERROR, 'http:', error );
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

	function create_web_socket (callback) {
		DEBUG.log( COLORS.WSS, 'WebSocketServer:', 'Creating web socket' );

		const new_server = new WebSocket.Server({ noServer: true });

		new_server.on( 'connection', (socket, request)=>{
			let client_address = null;

			if (DEBUG.HTTP_COOKIES) if (request.headers.cookie) {
				DEBUG.log( COLORS.WSS, 'Cookie:', request.headers.cookie );
			}

			if (request.headers['x-forwarded-for']) {
				DEBUG.log( COLORS.WARNING, 'Unexpected header:', 'x-forwarded-for' );
				client_address = request.headers['x-forwarded-for'];   //... SODD, not tested

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

			socket.on( 'message', (message_data)=>{
				callback.onMessage( socket, client_address, message_data );
			});

			socket.on( 'pong', (...params)=>{//...?
				console.log( 'pong:', ...params );
			});

			socket.on( 'close', ()=>{
				callback.onDisconnect( socket, client_address );
			});

			socket.onerror = function (error) {
				DEBUG.log( COLORS.ERROR, 'WebSocketServer-create_websocket:', error  );
			}

			callback.onConnect( socket, client_address );
		});

		DEBUG.log( COLORS.WSS, 'WebSocketServer:', 'Web socket running on port', HTTPS_OPTIONS.port );

		return new_server;

	} // create_web_socket


// ERROR HANDLER /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function global_error_handler (error) {
		DEBUG.log( COLORS.WARNING, STRINGS.GLOBAL_ERROR_HANDLER, error.message );
		console.trace();
		console.log( error );

		if (error == undefined) return;

		if( self.reloader
		&&  self.reloader.persistent
		&&  self.reloader.persistent.session
		&&  self.reloader.persistent.session.clients
		) {
			try {
				self.reloader.router.protocols.session.broadcast({
					type    : 'fatal',
					message : error.message,
					error   : DEBUG.formatError( error ),
				});

			} catch (error) {
				DEBUG.log( COLORS.ERROR, 'FATAL SYSTEM FAILURE:', 'GEH', error );
			}

			await new Promise( done => setTimeout(done, 1000) );
		}

		if (SETTINGS.ERROR_SHUT_DOWN) {
			self.exit( EXIT_CODES.GLOBAL_ERROR_HANDLER );
			console.log( EXIT_MESSAGE );

		} else {
			console.log( EXIT_MESSAGE );
			process.exit( EXIT_CODES.GLOBAL_ERROR_HANDLER );
		}

	} // global_error_handler


	function install_error_handler() {
		if (!SETTINGS.INSTALL_GEH) return;

		DEBUG.log( COLORS.WSS, 'WebSocketServer:', 'Setting up error handler' );

		process.on( 'uncaughtException'  , global_error_handler );
		process.on( 'unhandledRejection' , global_error_handler );

		process.on( 'SIGINT',  self.exit );
		process.on( 'SIGQUIT', self.exit );
		process.on( 'SIGTERM', self.exit );
		process.on( 'SIGUSR1', self.exit );
		process.on( 'SIGUSR2', self.exit );
		process.on( 'exit',    self.exit );

	} // install_error_handler


// EXIT //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = async function (event) {
		console.time( 'Shutdown time' );
		if (event == 'SIGINT') console.log();

		console.log( '.' + '-'.repeat(78) );
		console.log( '| ' + COLORS.RESET + COLORS.SHUT_DOWN + 'SHUTTING DOWN' + COLORS.RESET );
		console.log( "'" + '-'.repeat(78) );

		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'WebSocketServer.exit' );

		if (self.reloader.exit) {
			const EC = EXIT_CODES;
			let reason = '';
			switch (event) {
				case 'SIGINT' :  reason = '/shutdown';  break;
				case -1       :  reason = '/restart';   break;
				default       :  reason = '/' + error;  break;   //...? Does this always work?
			}
			const notice = JSON.stringify( {notice: 'server/exit' + reason} );
			const clients = self.reloader.persistent.session.clients;
			Object.keys( clients ).forEach( (address)=>{
				clients[address].send( notice );
				clients[address].exit();
			});

			await self.reloader.exit().then( cleanup_and_die );
		} else {
			cleanup_and_die();
		}

		function cleanup_and_die () {
			let exit_code = EXIT_CODES.UNKNOWN;
			if (typeof event == 'number') exit_code = event;
			if (event == 'SIGINT') exit_code = EXIT_CODES.EXIT;

			DEBUG.log( COLORS.EXIT, 'EXIT', 'Server terminating with exit code', exit_code );

			process.removeListener( 'uncaughtException'  , global_error_handler );
			process.removeListener( 'unhandledRejection' , global_error_handler );
			process.removeListener( 'SIGINT',  self.exit );
			process.removeListener( 'SIGQUIT', self.exit );
			process.removeListener( 'SIGUSR1', self.exit );
			process.removeListener( 'SIGUSR2', self.exit );
			process.removeListener( 'exit',    self.exit );

			console.timeEnd( 'Shutdown time' );

			console.log( EXIT_MESSAGE );
			process.exit( exit_code );

		} // cleanup_and_die

	}; // exit


// INIT //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'WebSocketServer.init' );

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
			//... process.argv.forEach( (value, index)=>console.log( index + ': ' + value ) );

			install_error_handler();
			drop_privileges();
			self.wsServer = create_web_socket({
				onConnect    : self.onConnect,
				onDisconnect : self.onDisconnect,
				onMessage    : self.onMessage,
			});
			self.httpServer = create_http_server( self.wsServer );

			console.log( '.' + '-'.repeat(78) );
			console.log( '| APPLICATION' );
			console.log( "'" + '-'.repeat(78) );

			self.reloader = await new AppReloader({
				triggerExit: ()=>self.exit( EXIT_CODES.REQUEST_RESTART ),
				getServerInstance : ()=>self,
			});

			done();
		});

	}; // init


	return self.init().then( ()=>self );   // const server = await new WebSocketServer()

}; // Main



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const time_label = '| ' + COLORS.BOOT + 'ONLINE' + COLORS.DEFAULT + '. Boot time';
console.time( time_label );

new Main().then( ()=>{
	console.log( '.' + '-'.repeat(78) );
	console.timeEnd( time_label );
	console.log( "'" + '-'.repeat(78) );
});


//EOF
