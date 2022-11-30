// cep.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DebugTerminal } from './terminal/terminal.js';
import { SETTINGS, DEBUG, log_event } from './config.js';

const KNOWN_EVENTS = ['open', 'close', 'error', 'message', 'send'];

const SOCKET_STATES = {
	CONNECTING : 0,   // Socket has been created. The connection is not yet open
	OPEN       : 1,   // The connection is open and ready to communicate
	CLOSING    : 2,   // The connection is in the process of closing
	CLOSED     : 3,   // The connection is closed or couldn't be opened
};


export const ClientEndPoint = function (parameters = {}) {
	const self = this;

	if (DEBUG.WINDOW_APP) window.CEP = self;

	this.webSocket;
	this.debugTerminal;

	this.getCredentials;   // Callback returning a Promise while displaying a dialog

	this.eventListeners;   // Dict of arrays of registered event handlers
	this.webSocketURL;     // Set at creation time
	this.autoReconnect;    // Clear flag to false to stop the reconnect loop


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function call_event_handlers (event_name, event) {
		self.eventListeners[event_name].forEach( callback => callback(event) );

	} // call_event_handlers


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEB SOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function websocket_connection (credentials, nr_attempts = 1) {
		//...? self.state = 'connecting' to prevent several parallel calls?

		return new Promise( (resolve, reject)=>{
			console.log( 'ClientEndPoint-websocket_connection:', self.webSocketURL );

			// Create socket and connect
			//...document.cookie = 'username=' + parameters.username + '; path=/';
			//...document.cookie = 'password=' + parameters.password + '; path=/';

			const connection_timeout = setTimeout( retry, SETTINGS.WEBSOCKET.RETRY_INTERVAL );

			let new_websocket = null;
			try {
				new_websocket = new WebSocket( self.webSocketURL );
			}
			catch (error) {
				console.log(
					'ClientEndPoint-websocket_connection: Connection failed:', error.message,
				);
			}
			if (new_websocket) {
				new_websocket.addEventListener( 'open'   , on_open    );
				new_websocket.addEventListener( 'close'  , on_close   );
				new_websocket.addEventListener( 'error'  , on_error   );
				new_websocket.addEventListener( 'message', on_message );
				self.webSocket = new_websocket;
			}


			function on_open (event) {
				clearTimeout( connection_timeout );
				call_event_handlers( 'open', event );
				on_send( credentials );
				resolve();
			}
			function on_close (event) {
				clearTimeout( connection_timeout );
				call_event_handlers( 'close', event );
				if (SETTINGS.WEBSOCKET.RESET_RETRIES) nr_attempts = 0;
				setTimeout( retry, SETTINGS.WEBSOCKET.RETRY_INTERVAL );
			}
			function on_error (event) {
				clearTimeout( connection_timeout );
				call_event_handlers( 'error', event );
				//...? resolve, reject
			}
			function retry () {
				const max_attempts = (nr_attempts >= SETTINGS.WEBSOCKET.MAX_RETRIES);

				if (self.autoReconnect && !max_attempts) {
					++nr_attempts;
					console.log( 'ClientEndPoint-retry: Attempt nr:', nr_attempts );
					websocket_connection( credentials, nr_attempts ).then( resolve );
				} else {
					console.log( 'ClientEndPoint-retry: Aborting' );
					reject();
				}
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

		const is_pingpong = message.update && message.update.pong;
		const do_log = (!SETTINGS.WEBSOCKET.HIDE_PING || (SETTINGS.WEBSOCKET.HIDE_PING && !is_pingpong));

		if (DEBUG.WEBSOCKET.LOG_MESSAGES && do_log) {
			const key = Object.keys( message )[0];
			console.groupCollapsed(
				'%c🡇 ClientEndPoint received%c:',
				'color:#48f', 'color:unset',
				key + ':',
				(
					(typeof message[key] == 'string')
					? message[key]
					: Object.keys( message[key] ).join(' ')
				),
			);
			console.log( JSON.stringify(message, null, '\t') );
			console.groupEnd();
		}

		if (message.update && (message.update.type == 'session/ping') && SETTINGS.WEBSOCKET.HIDE_PING) {
			self.send({
				session: {
					pong: message.update.pong,
				},
			});
		} else {
			call_event_handlers( 'message', message );
		}

	} // on_message


	function on_send (request) {
		const is_pingpong = request.session && request.session.pong;
		const do_log = (!SETTINGS.WEBSOCKET.HIDE_PING || (SETTINGS.WEBSOCKET.HIDE_PING && !is_pingpong));

		if (DEBUG.WEBSOCKET.LOG_MESSAGES && do_log) {
			console.groupCollapsed(
				'%c🡅 ClientEndPoint sending%c:',
				'color:#480', 'color:unset',
				JSON.stringify( request )
				.replaceAll( '"', '' )
				.replaceAll( '{', '' )
				.replaceAll( '}', '' )
				.slice(0, SETTINGS.WEBSOCKET.LOG_SLICE),
			);
			console.log( JSON.stringify(request, null, '\t') );
			console.groupEnd();
		}

		self.webSocket.send( JSON.stringify(request) );
		if (!(request.session && request.session.pong && SETTINGS.WEBSOCKET.HIDE_PING)) {
			call_event_handlers( 'send', request );
		}

	} // on_send


	function on_beforeunload () {
		if (self.connected()) {
			self.send( 'HUP' );   //...! Does this work?
			self.disconnect();
		}

	} // on_beforeunload


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.addEventListener = function (event_name, event_handler) {
		if (KNOWN_EVENTS.indexOf(event_name) < 0) {
			throw new Error( 'ClientEndPoint.addEventListener: Unknown event' );
		}

		const already_registered = self.eventListeners[event_name].indexOf( event_handler ) >= 0;
		if (already_registered) {
			throw new Error( 'ClientEndPoint.addEventListener: Event handler already registered' );
		}

		self.eventListeners[event_name].push( event_handler );

	}; // addEventListener


	this.removeEventListener = function (event_name, event_handler) {
		if (typeof self.eventListeners[event_name] == 'undefined') {
			throw new Error( 'ClientEndPoint.removeEventListener: Unknown event' );
		}

		const found_index = self.eventListeners[event_name].indexOf( event_handler );
		if (found_index < 0) {
			throw new Error( 'ClientEndPoint.removeEventListener: Handler not registered' );
		}

		self.eventListeners[event_name].splice( index, 1 );

	}; // removeEventListener


	this.connected = function () {
		return (self.webSocket && (self.webSocket.readyState == SOCKET_STATES.OPEN));

	} // connected


	this.connect = function () {
		if (self.connected()) {
			throw new Error( 'ClientEndPoint.connect: Already connected' );
		}

		return (
			self.getCredentials( self.webSocketURL )
			.then( credentials => websocket_connection(credentials) )
			.then( ()=>addEventListener('beforeunload', on_beforeunload, false) )
		);

	}; // connect


	this.disconnect = async function () {
		if (!self.connected()) {
			throw new Error( 'ClientEndPoint.disconnect: Not connected' );
		}

		self.webSocket.close();
		removeEventListener( 'beforeunload', on_beforeunload, false );

	}; // connect


	this.send = function (request) {
		if (!self.connected()) {
			return self.connect().then( ()=>on_send(request) );
		} else {
			on_send( request );
		}

	};  // send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		removeEventListener( 'beforeunload', on_before_unload, false );
		self.webSocket.close();
		return Promise.resolve();

	}; // exit


	this.init = function () {
		console.log( 'ClientEndPoint.init' );

		self.webSocket      = null;
		self.webSocketURL   = parameters.webSocketURL;
		self.getCredentials = parameters.getCredentials;
		self.autoReconnect  = parameters.autoReconnect;

		if (!self.webSocketURL) throw new Error( 'ClientEndPoint.init: WebSocket URL undefined' );
		//...! Check for valid URL
		if (!self.getCredentials) throw new Error( 'ClientEndPoint.init: getCredentials callback undefined' );

		self.eventListeners = {};
		KNOWN_EVENTS.forEach( (event_name)=>{
			self.eventListeners[event_name] = [];
		});

		KNOWN_EVENTS.forEach( (event_name)=>{
			const handler_name = 'on' + event_name.slice(0,1).toUpperCase() + event_name.slice(1);
			if (parameters[handler_name]) {
				self.addEventListener( event_name, parameters[handler_name] );
			}
		});

		document.documentElement.addEventListener( 'keydown', async(event)=>{
			if ((event.key == 't') && !event.shiftKey && !event.ctrlKey && event.altKey) {
				event.preventDefault();
				if (!self.terminal) self.terminal = await new DebugTerminal();
				self.terminal.show();
			}
		});

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const websocket = await new WebSocketClient()

}; // ClientEndPoint


//EOF
