// cep.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from './config.js';

export const ClientEndPoint = function (parameters = {}) {
	const self = this;

	const callbacks = parameters.events;

	let nr_attempts = 0;
	let connection_timeout = null;
	let unload_handler = null;

	let websocket = null;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEB SOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_event (caption, data) {
		if (!DEBUG.WEBSOCKET) return;

		console.groupCollapsed( caption );
		console.log( data );
		console.groupEnd();
	}

	function websocket_connection (callback_connection_established) {
		console.log( 'Connecting to ' + parameters.url + '...' );

		// When unable to connect, try again after a few seconds
		connection_timeout = setTimeout( ()=>{
			console.log( 'Connection timed out' );
			connection_timeout = null;
			websocket_connection( callback_connection_established );
		}, CONNECTION_TIMEOUT_MS );


		function stop_timeout_loop () {
			clearTimeout( connection_timeout );   // Prevent new connection attempt

		} // stop_timeout_loop


		// Create socket and connect
		//...document.cookie = 'username=' + parameters.username + '; path=/';
		//...document.cookie = 'password=' + parameters.password + '; path=/';

		let ws = null;
		try {
			ws = new WebSocket( parameters.url );
		} catch (error) {
			console.log( 'Connection failed', error.message );
		}

		ws.addEventListener( 'open', on_open );
		ws.addEventListener( 'close', on_close );
		ws.addEventListener( 'error', on_error );
		ws.addEventListener( 'message', on_receive );

		self.websocket = ws;

	} // websocket_connection


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_open (event) {
		log_event( 'WebSocketClient.onOpen', event );
		stop_timeout_loop();

		if (callbacks.onOpen) callbacks.onOpen( event, self );

		callback_connection_established();

	} // on_open


	function on_close (event) {
		log_event( 'WebSocketClient.onClose', event );
		stop_timeout_loop();

		if (callbacks.onClose) callbacks.onClose( event, self );

	} // on_close


	function on error (event) {
		log_event( 'WebSocketClient.onError', event );
		console.log( 'ws: Error:', event );
		stop_timeout_loop();

		if (callbacks.onError) callbacks.onError( event, self );

	} // on_error


	function on_receive (event) {
		let message = event.data;

		if (typeof message == 'string') {
			try { message = JSON.parse( message ); }
			catch { /* Assume string */ }
		}

		// Hide ping/pong log messages
		const is_pingpong = message.update && message.update.pong;
		const do_log = (!SETTINGS.HIDE_MESSAGES.PING || (SETTINGS.HIDE_MESSAGES.PING && !is_pingpong));
		if (DEBUG.WEBSOCKET && do_log) {
			const key = Object.keys( message )[0];
			console.groupCollapsed(
				'%c🡇 WebSocketClient received%c:',
				'color:#48f', 'color:unset',
				key + ':',
				Object.keys( message[key] ).join(' '),
			);
			console.log( JSON.stringify(message, null, '\t') );
			console.groupEnd();
		}

		if (callbacks.onMessage) callbacks.onMessage( event, self, message );

	} // on_receive


	function on_send (request) {
		// Hide ping/pong log messages
		const is_pingpong = request.session && request.session.pong;
		const do_log = (!SETTINGS.HIDE_MESSAGES.PING || (SETTINGS.HIDE_MESSAGES.PING && !is_pingpong));
		if (DEBUG.WEBSOCKET && do_log) {
			console.groupCollapsed(
				'%c🡅 WebSocketClient sending%c:',
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

		// See app-on_websocket_message
		const hide_message =  (SETTINGS.HIDE_MESSAGES.PING && request.session && request.session.pong);
		if (!hide_message) {
			parameters.terminal.print( request, 'request' );
		}

		self.websocket.send( JSON.stringify(request, null, '\t') );

	} // on_send


	function on_beforeunload () {
		self.send( 'HUP' );   //...! Does this work?

	} // on_beforeunload


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONNECTION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.isConnected;

	this.closeConnection = function (connection_name) {
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.connect = function (websocket_url) {
		return new Promise( async (done)=>{
			await websocket_connection( done );
			addEventListener( 'beforeunload', on_beforeunload, false );
		});

	}; // connect


	this.isConnected = function () {
		return (self.websocket.readyState == SOCKET_STATES.OPEN);

	}; // isConnected


	this.disconnect = function () {
	}; // disconnect


	this.send = on_send;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		removeEventListener( 'beforeunload', on_before_unload, false );
		self.websocket.close();
		return Promise.resolve();

	}; // exit


	this.init = function () {
		console.log( 'WebSocketClient.init' );
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const websocket = await new WebSocketClient()

}; // WebSocketClient


//EOF
