// cep.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG, log_event } from './config.js';

import { Events        } from './events.js';
import { DebugTerminal } from './terminal/terminal.js';

const SOCKET_STATES = {
	CONNECTING : 0,   // Socket has been created. The connection is not yet open
	OPEN       : 1,   // The connection is open and ready to communicate
	CLOSING    : 2,   // The connection is in the process of closing
	CLOSED     : 3,   // The connection is closed or couldn't be opened
};

export const CONNECTION_STATE = {
	OFFLINE       : 'offline',
	CONNECTING    : 'connecting',
	CONNECTED     : 'connected',
	AUTHENTICATED : 'authenticated',
	ERROR         : 'error',
};


export const AutoWebSocket = function (parameters = {}) {
	const self = this;
	self.templateName = 'AutoWebSocket';

	this.webSocket;
	this.state;

	this.getCredentials;    // Callback returning a Promise while displaying a dialog

	this.eventListeners;    // Dict of arrays of registered event handlers
	this.webSocketURL;      // Set at creation time
	this.autoReconnect;     // Clear this flag to stop the reconnect loop
	this.sentCredentials;   // Wether we sent the JSON after the socket opened


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const EMITS_EVENTS = [
		'open', 'close', 'error', 'retry', 'message', 'send', 'ping',
		'statechange', 'login', 'logout',
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEB SOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function websocket_connection (credentials, attempt_nr = 0) {
		return new Promise( (resolve, reject)=>{
			if (attempt_nr > 0) {
				console.log(
					'ClientEndPoint-websocket_connection:',
					self.webSocketURL, 'Attempt:', attempt_nr,
				);
			} else {
				console.log( 'ClientEndPoint-websocket_connection:', self.webSocketURL );
			}
			// Create socket and connect
			//...document.cookie = 'username=' + parameters.username + '; path=/';
			//...document.cookie = 'password=' + parameters.password + '; path=/';

			if (self.webSocket) {
				self.webSocket.close();
				self.webSocket = null;
			}
			let timeout = null; //...setTimeout( retry, SETTINGS.WEBSOCKET.RETRY_TIMOUT );

			self.state = CONNECTION_STATE.CONNECTING;
			self.events.emit( 'statechange', self.state );

			try {
				//...clearTimeout( timeout );
				self.webSocket = new WebSocket( self.webSocketURL );
				self.webSocket.addEventListener( 'open'   , on_open    );
				self.webSocket.addEventListener( 'close'  , on_close   );
				self.webSocket.addEventListener( 'error'  , on_error   );
				self.webSocket.addEventListener( 'message', on_message );
			}
			catch (error) {
				self.events.emit( 'error', error );
				self.state = CONNECTION_STATE.ERROR;
				self.events.emit( 'statechange', self.state );
				reject( error );
			}


			function on_error (event) {
				if (!timeout) {
					clearTimeout( timeout );
					timeout = setTimeout( retry, SETTINGS.WEBSOCKET.RETRY_INTERVAL );
				}
				self.state = CONNECTION_STATE.ERROR;
				self.events.emit( 'statechange', self.state );
				self.events.emit( 'error', event );
				self.webSocket = null;
			}
			function on_close (event) {
				const state_before = self.state;
				if (!timeout) {
					clearTimeout( timeout );
					//timeout = setTimeout( retry, SETTINGS.WEBSOCKET.RETRY_INTERVAL );
					//self.state = CONNECTION_STATE.CONNECTING;
				} else {
					//self.state = CONNECTION_STATE.OFFLINE;
				}
				self.state = CONNECTION_STATE.OFFLINE;
				if (self.state != state_before) self.events.emit( 'statechange', self.state );
				self.events.emit( 'close', event );
				self.webSocket = null;
			}
			function retry () {
				timeout = null;
				const max_attempts = (attempt_nr >= SETTINGS.WEBSOCKET.MAX_RETRIES);

				if (self.autoReconnect && !max_attempts) {
					++attempt_nr;
					self.events.emit( 'retry', attempt_nr );
					websocket_connection( credentials, attempt_nr );
				} else {
					reject( 'Giving up' );
				}
			}
			function on_open (event) {
				clearTimeout( timeout );
				self.events.emit( 'open', event );

				if (credentials) {
					self.sentCredentials = true;
					on_send( credentials );
				}

				attempt_nr = 0;
				self.state = CONNECTION_STATE.CONNECTED;
				self.events.emit( 'statechange', self.state );

				resolve();
			}
		});

	} // websocket_connection


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_message (event) {
		let message = event.data;

		if (typeof message != 'string') {
			throw new Error( 'ClientEndPoint-on_message: Received non-string' );//...?
		}

		try { message = JSON.parse( message ); }
		catch { /* Assume string */ }

		const is_pingpong = message.broadcast && message.broadcast.pong;
		const do_log = (!SETTINGS.WEBSOCKET.HIDE_PING || (SETTINGS.WEBSOCKET.HIDE_PING && !is_pingpong));

		if (DEBUG.WEBSOCKET.LOG_MESSAGES && do_log) {
			const key = Object.keys( message )[0];
			console.groupCollapsed(
				'%c🡇 ClientEndPoint received%c:',
				'color:#48f', 'color:unset',
				key + ':',
				(
					(typeof message == 'string')
					? message
					: (typeof message[key] == 'string')
					? message[key]
					: Object.keys( message[key] ).join(' ')
				),
			);
			console.log( JSON.stringify(message, null, '\t') );
			console.groupEnd();
		}

		if (message.broadcast && (message.broadcast.type == 'session/ping') && SETTINGS.WEBSOCKET.HANDLE_PING) {
			if (!SETTINGS.WEBSOCKET.HIDE_PING) self.events.emit( 'ping', message.broadcast.pong );
			self.send( {session:{pong:message.broadcast.pong}} );
			return;
		}

		self.events.emit( 'message', message );

		if (message.response) {
			const responses = (message.response instanceof Array) ? message.response : [message.response];
			responses.forEach( (response)=>{
				if (!response.success) return;
				switch (response.command) {
					case 'session.login': {
						self.state = CONNECTION_STATE.AUTHENTICATED;
						self.events.emit( 'statechange', self.state );
						self.events.emit( 'login' );
						break;
					}
					case 'session.logout': {
						self.events.emit( 'logout' );
						break;
					}
				}
			});
		}

	} // on_message


	async function on_send (request) {
		const is_pingpong = request.session && request.session.pong;
		const do_log = (!SETTINGS.WEBSOCKET.HIDE_PING || (SETTINGS.WEBSOCKET.HIDE_PING && !is_pingpong));

		if (DEBUG.WEBSOCKET.LOG_MESSAGES && do_log) {
			console.groupCollapsed(
				'%c🡅 ClientEndPoint sending%c:',
				'color:#480', 'color:unset',
				(
					(typeof request == 'string')
					? request.slice(0, SETTINGS.WEBSOCKET.LOG_SLICE)
					: (
						JSON.stringify( request )
						.replaceAll( '"', '' )
						.replaceAll( '{', '' )
						.replaceAll( '}', '' )
						.slice(0, SETTINGS.WEBSOCKET.LOG_SLICE)
					)
				),
			);
			console.log( JSON.stringify(request, null, '\t') );
			console.groupEnd();
		}

		if (!self.isConnected()) {
			try { await self.connect(); }
			catch { return; }
		}

		self.webSocket.send( JSON.stringify(request) );
		if (request.session && request.session.pong) {
			self.events.emit( 'ping', request.session.pong );
		}
		if (!(request.session && request.session.pong && SETTINGS.WEBSOCKET.HIDE_PING)) {
			self.events.emit( 'send', request );
		}

	} // on_send


	function on_beforeunload () {
		if (self.isConnected()) {
			self.send( 'HUP' );   //...! Does this work?
		}

	} // on_beforeunload


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.isConnected = function () {
		return (self.webSocket && (self.webSocket.readyState == SOCKET_STATES.OPEN));

	} // isConnected


	this.connect = function () {
		if (self.isConnected()) {
			throw new Error( 'ClientEndPoint.connect: Already connected' );
		}

		if (self.isConnecting) {
			//throw new Error( 'ClientEndPoint.connect: Already connecting' );
			return new Promise( (resolve, reject) =>{
				self.events.add( 'login', resolve );
				setTimeout( ()=>{
					console.log( 'WAITING FOR OPEN TIMED OUT' );
					self.events.remove( 'login', resolve );
					reject( 'AutoWebSocket.connect(): Connection timed out' );
				}, 1000);
			});
		}

		self.isConnecting = true;

		return (
			self.events.callback( 'login', self.webSocketURL )
			.then( credentials => websocket_connection(credentials) )
			.then( ()=>{
				console.log( 'AutoWebSocket.connect' );
				addEventListener( 'beforeunload', on_beforeunload, false );
				self.isConnecting = false;
			})
			.catch( (error)=>{
				console.log( 'AutoWebSocket.connect: Error:', error );
				self.events.emit( 'error', error );
				self.isConnecting = false;
			})
		);

	}; // connect


	this.disconnect = async function () {
		if (self.isConnected()) {
			removeEventListener( 'beforeunload', on_beforeunload, false );
			self.webSocket.close();
		}

	}; // connect


	this.send = function (request, callback = null) {
		if (!self.isConnected()) {
			console.log( 'AutoWebSocket.send: !self.isConnected, calling self.connect()' );
			return self.connect().then( ()=>on_send(request) );
		} else {
			on_send( request );
		}

		if (callback) callback();//...! Buffer outgoing while reconnecting

	};  // send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'AutoWebSocket.exit' );
		self.disconnect();
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'AutoWebSocket.init' );

		self.state           = CONNECTION_STATE.OFFLINE;
		self.webSocket       = null;
		self.webSocketURL    = parameters.webSocketURL;
		self.autoReconnect   = parameters.autoReconnect;
		self.sentCredentials = false;

		if (!self.webSocketURL) throw new Error( 'ClientEndPoint.init: WebSocket URL undefined' );
		//...! Check for valid URL

		self.events = await new Events( self, EMITS_EVENTS, parameters.events );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const websocket = await new WebSocketClient()

}; // AutoWebSocket


//EOF
