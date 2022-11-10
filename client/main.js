// client: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from './config.js';
import { WebSocketClient } from './websocket.js';
import { DebugConsole    } from './debug_console.js';


const Application = function () {
	const app = self = this;

	this.webSocketClient;
	this.debugConsole;

	const boot_sequence = false && [
		{
			session: {
				login: {
					username : 'root',
					password : '12345',
				},
			},
		},

	]; // boot_sequence


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function connect_to_websocket (ws_url = SETTINGS.WS_URL) {
		if (self.webSocketClient) {
			await disconnect_from_websocket( self.webSocketClient );
		}

		self.webSocketClient = await new WebSocketClient({
			url    : ws_url,
			events : {
				onOpen    : on_websocket_open,
				onClose   : on_websocket_close,
				onMessage : on_websocket_message,
				onError   : on_websocket_error,
			},
			debugConsole: self.debugConsole,
		});

	} // connect_to_websocket


	function disconnect_from_websocket (websocket) {
		return self.webSocketClient.exit().then( ()=>self.webSocketClient = null );

	} // disconnect_from_websocket


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_websocket_open (event, socket)  {
		self.debugConsole.print( 'Connected to ' + SETTINGS.WS_URL, 'cep' );
		self.debugConsole.onSocketOpen();

		if (boot_sequence) boot_sequence.forEach( (request)=>{
			socket.send( request );
		});

	} // on_websocket_open


	function on_websocket_close (event, socket)  {
		self.debugConsole.print( 'Connection lost', 'cep' );
		self.debugConsole.onSocketClose();

	} // on_websocket_close


	function on_websocket_message (event, socket) {
		// handle response
		const message = JSON.parse( event.data );

		if (message.response && message.response.sender && message.response.chat) {
			self.debugConsole.print({
				[message.response.sender]: message.response.chat,
			}, 'chat');
		} else {
			self.debugConsole.print( message, 'response' );
		}

	/*
		if (boot_sequence.length > 0) {
			socket.send( boot_sequence[0] );
			boot_sequence.shift();
		}
	*/

	} // on_websocket_message


	function on_websocket_error (event, socket) {
		self.debugConsole.print( 'Connection error', 'cep' );
		self.debugConsole.onSocketError();

	} // on_websocket_error


	function on_console_send (request) {
		console.log( 'on_console_send(): request:', request );

		self.webSocketClient.send( request );

	} // on_console_send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'Application.init' );

		document.body.innerHTML += (`
<footer class="main_menu">
	<a href="//spielwiese.central-dogma.at:443/" title="Load this page via Apache">Apache</a>
	<a href="//spielwiese.central-dogma.at:1337/" title="Load this page directly from Node">Node</a>
</footer>
		`);

		self.webSocketClient = null;

		self.debugConsole = await new DebugConsole({
			getWebSocketClient : ()=>{ return self.webSocketClient; },
			connect     : connect_to_websocket,
			disconnect  : disconnect_from_websocket,
			send        : on_console_send,
			isConnected : ()=>{ return self.webSocketClient && self.webSocketClient.isConnected(); },
		});

		if (boot_sequence) boot_sequence.forEach( (request)=>{
			self.debugConsole.history.add( self.debugConsole.requestToText(request) );
		});

		connect_to_websocket();

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

	function delay (ms) { return new Promise( done => setTimeout(done, ms) ); }

	//await delay(500);
	show_status( 'Connecting' );
	//await delay(1500);

	await new Application().catch( e => console.log(e) );

	document.querySelectorAll( '.noscript' ).forEach( (element)=>{
		element.parentNode.removeChild( element );
	});

	document.querySelector( 'html' ).classList.remove( 'init' );
});


//EOF
