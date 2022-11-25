// websocket.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from './config.js';

const CONNECTION_TIMEOUT_MS = 5000;

const SOCKET_STATES = {
	CONNECTING : 0,   // Socket has been created. The connection is not yet open
	OPEN       : 1,   // The connection is open and ready to communicate
	CLOSING    : 2,   // The connection is in the process of closing
	CLOSED     : 3,   // The connection is closed or couldn't be opened
};

export const WebSocketClient = function (parameters = {}) {
	const self = this;

	const callbacks = parameters.events;

	let nr_attempts = 0;
	let connection_timeout = null;
	let unload_handler = null;

	this.websocket = null;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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

		function log_event (caption, data) {
			if (!DEBUG.WEBSOCKET) return;

			console.groupCollapsed( caption );
			console.log( data );
			console.groupEnd();
		}

		ws.addEventListener( 'open', (event)=>{
			log_event( 'WebSocketClient.onOpen', event );
			stop_timeout_loop();

			if (callbacks.onOpen) callbacks.onOpen( event, self );

			callback_connection_established();
		});
		ws.addEventListener( 'close', (event)=>{
			log_event( 'WebSocketClient.onClose', event );
			stop_timeout_loop();

			if (callbacks.onClose) callbacks.onClose( event, self );
		});
		ws.addEventListener( 'error', (event)=>{
			log_event( 'WebSocketClient.onError', event );
			console.log( 'ws: Error:', event );
			stop_timeout_loop();

			if (callbacks.onError) callbacks.onError( event, self );
		});
		ws.addEventListener( 'message', (event)=>{
			let message = event.data;

			if (typeof message == 'string') {
				try {
					message = JSON.parse( message );
				} catch {
					// Assume string
				}
			}

			// Hide ping/pong log messages
			const is_pingpong = message.update && message.update.pong;
			const do_log = (!SETTINGS.HIDE_PINGPONG || (SETTINGS.HIDE_PINGPONG && !is_pingpong));
			if (DEBUG.WEBSOCKET && do_log) {
				const key = Object.keys( message )[0];
				console.groupCollapsed(
					'%c🡇 WebSocketClient received%c:',
					'color:#48f', 'color:unset',
					key + ':',
					Object.keys( message[key] ).join(' '),
				/*
					message[key].type,
					message[key].command,
					message[key].success,
				*/
				/*//...
					JSON.stringify( message )
					.replaceAll( '"', '' )
					.replaceAll( '{', '' )
					.replaceAll( '}', '' )
					.slice(0, SETTINGS.WEBSOCKET.LOG_SLICE)
					split( ':', 1 )[0]
					,
				*/
				);
				console.log( JSON.stringify(message, null, '\t') );
				console.groupEnd();
			}

			if (callbacks.onMessage) callbacks.onMessage( event, self, message );
		});

		self.websocket = ws;

	} // websocket_connection


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_before_unload () {
		self.send( 'HUP' );

	} // on_before_unload


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.connect = function (websocket_url) {
	}; // connect


	this.isConnected = function () {
		return (self.websocket.readyState == SOCKET_STATES.OPEN);

	}; // isConnected


	this.disconnect = function () {
	}; // disconnect


	this.send = function (request) {
		// Hide ping/pong log messages
		const is_pingpong = request.session && request.session.pong;
		const do_log = (!SETTINGS.HIDE_PINGPONG || (SETTINGS.HIDE_PINGPONG && !is_pingpong));
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
		const hide_message
		=  (DEBUG.HIDE_MESSAGES.PING && request.session && request.session.pong)
		|| (DEBUG.HIDE_MESSAGES.CHAT && request.chat && request.chat.say)
		;

		if (!hide_message) {
			parameters.terminal.print( request, 'request' );
		}

		self.websocket.send( JSON.stringify(request, null, '\t') );

	} // send


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

		return new Promise( async (done)=>{
			await websocket_connection( done );
			addEventListener( 'beforeunload', on_before_unload, false );
		});

	}; // init


	self.init().then( ()=>self );   // const websocket = await new WebSocketClient()

}; // WebSocketClient


//EOF
