// client: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { WebSocketClient } from './websocket.js';
import { DebugConsole    } from './debug_console.js';

export const DEBUG = {
	WEBSOCKET: true,
};

const WS_URL = 'wss://spielwiese.central-dogma.at:1337';


const Application = function () {
	const app = self = this;

	this.webSocketClient;
	this.debugConsole;


	const boot_sequence = [
		{
			session: {
				login: {
					username : 'root',
					password : '12345',
				},
				status: {},
				who: {},
			},
		},
	/*
		{

			session: {
				status: {
					persistent: {},
				},
				kick: {
					username: 'root',
				},
			},
		},
		{
			session : {
				status: {},
			},
			tag : 0,
		},
	*/
	]; // boot_sequence



	function on_websocket_open (event, socket)  {
		self.debugConsole.print( 'Connected to ' + WS_URL, 'cep' );

		boot_sequence.forEach( (request)=>{
			socket.send( request );
		});

	} // on_websocket_open


	function on_websocket_close (event, socket)  {
		//...document.querySelector( '.debug_console .prompt' ).classList.add( 'disabled' );
		self.debugConsole.print( 'Connection lost', 'cep' );

	} // on_websocket_close


	function on_websocket_message (event, socket) {
		// handle response
		const request = JSON.parse( event.data );

		self.debugConsole.print( request, 'response' );
	/*
		if (boot_sequence.length > 0) {
			socket.send( boot_sequence[0] );
			boot_sequence.shift();
		}
	*/

	} // on_websocket_message


	function on_websocket_error (event, socket) {
		self.debugConsole.print( 'Connection error', 'cep' );

	} // on_websocket_error


	function on_console_send (request) {
		//console.log( 'on_console_send(): request:', request );

		if (request.connect) {
			console.log( 'on_console_send: Connecting to', WS_URL );
			self.webSocketClient.connect( WS_URL );
		} else if (request.disconnect) {
			console.log( 'on_console_send: Disconnecting' );
			self.webSocketClient.disconnect();
		} else {
			self.webSocketClient.send( request );
		}

	} // on_console_send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit

	this.init = async function () {
		console.log( 'Application.init' );

		function delay (ms) {
			return new Promise( done => setTimeout(done, ms) );
		}

		//await delay(500);
		show_status( 'Connecting' );
		//await delay(1500);

		self.debugConsole = await new DebugConsole({
			getUrl      : ()=>WS_URL,
			isConnected : ()=>{ return self.webSocketClient.isConnected(); },
			send        : on_console_send,
		});
		//...self.debugConsole.toggleConsole();
		self.debugConsole.elements.input.focus();

		boot_sequence.forEach( (request)=>{
			self.debugConsole.history.add( self.debugConsole.requestToText(request) );
		});

		self.webSocketClient = await new WebSocketClient({
			url    : WS_URL,
			events : {
				onOpen    : on_websocket_open,
				onClose   : on_websocket_close,
				onMessage : on_websocket_message,
				onError   : on_websocket_error,
			},
			debugConsole: self.debugConsole,
		});

		//...const prefers_dark_scheme = window.matchMedia( '(prefers-color-scheme:dark)' );
		//...document.body.classList.toggle( 'dark_mode', prefers_dark_scheme.matches );

	}; // init


	return self.init().then( ()=>self );   // const app = await new Application()

}; // Application



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

addEventListener( 'load', async ()=>{
	show_status( 'Initializing' );

	await new Application();

	document.querySelectorAll( '.noscript' ).forEach( (element)=>{
		element.parentNode.removeChild( element );
	});

	document.querySelector( 'html' ).classList.remove( 'init' );
});


//EOF
