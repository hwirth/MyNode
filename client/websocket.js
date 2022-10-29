// websocket.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from './client_main.js';

const CONNECTION_TIMEOUT_MS = 5000;


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
		const ws = new WebSocket( parameters.url );

		function log (caption, data) {
			if (! DEBUG.WEBSOCKET) return;

			console.groupCollapsed( caption );
			console.log( data );
			console.groupEnd();
		}

		ws.addEventListener( 'open', (event)=>{
			log( 'WebSocketClient.onOpen', event );
			stop_timeout_loop();

			if (callbacks.onOpen) callbacks.onOpen( event, self );

			callback_connection_established();
		});
		ws.addEventListener( 'close', (event)=>{
			log( 'WebSocketClient.onClose', event );
			stop_timeout_loop();

			if (callbacks.onClose) callbacks.onClose( event, self );
		});
		ws.addEventListener( 'error', (event)=>{
			log( 'WebSocketClient.onError', event );
			console.log( 'ws: Error:', event );
			stop_timeout_loop();

			if (callbacks.onError) callbacks.onError( event, self );
		});
		ws.addEventListener( 'message', (event)=>{
			log( 'WebSocketClient.onMessage', event );
			const message = JSON.parse( event.data );

			console.log(
				'%c🡇 WebSocketClient received%c:',
				'color:#48f',
				'color:unset',
				JSON.stringify( message, null, '   ' ),
			);

			if (callbacks.onMessage) callbacks.onMessage( event, self, message );
		});

		self.websocket = ws;

	} // websocket_connection


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.connect = function (websocket_url) {
	}; // connect


	this.isConnected = function () {
		return (self.websocket.readyState == 1);//... use a constant

	}; // isConnected


	this.disconnect = function () {
	}; // disconnect


	this.send = function (request) {
		console.log(
			'%c🡅 WebSocketClient sending%c:',
			'color:#480',
			'color:unset',
			JSON.stringify( request, null, '   ' ),
		);

		parameters.debugConsole.print( request, 'request' );
		self.websocket.send( JSON.stringify(request, null, '\t') );

	} // send


	function on_before_unload () {
		self.send({ text: 'Goodbye' });

	} // on_before_unload


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		removeEventListener( 'beforeunload', on_before_unload, false );

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
