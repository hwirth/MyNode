// client: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as DUMMY_SamJs from './samjs.js';


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
			},
		},
	/*
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_websocket_open (event, socket)  {
		self.debugConsole.print( 'Connected to ' + WS_URL, 'cep' );

		boot_sequence.forEach( (request)=>{
			socket.send( request );
		});

	} // on_websocket_open


	function on_websocket_close (event, socket)  {
		//...document.querySelector( '.terminal .prompt' ).classList.add( 'disabled' );
		self.debugConsole.print( 'Connection lost', 'cep' );

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


	function on_console_print (message, class_name) {
		if (['response', 'chat'].indexOf(class_name) < 0) return;
		//if (!message.response) return;

		const text = JSON.stringify( message , null, '\t' );
		//if (typeof text != 'string') return;

		const allowed = 'abcdefghijklmnopqrstuvwxyz012345678 ';
		sam_speak(
			text
			.trim()
			.replace( /: /g , ' ' )
			.replace( /,/g  , ' ' )
			.replace( /\n/g , 'PAUSE'  )
			.replace( /\./g , ' dot '  )
			.replace( /:/g  , ' colon' )
			.split('')
			.filter( char => allowed.indexOf(char.toLowerCase()) >= 0)
			.join('')
		);
	}


	this.sam = new SamJs({
		singmode : !false,   //false
		pitch    : 50,      //64
		speed    : 72,      //72
		mouth    : 128,     //128
		throat   : 128,     //128
		volume   : 0.1,     //1 I added a volume option to sam.js, but it's not all to pretty

	});

	function sam_speak (text, options = {}) {
		if (self.audioContext.state == 'suspended') {
			self.audioContext.resume();

			if (self.audioContext.state == 'suspended') {
				setTimeout( ()=>sam_speak(text, options), 100 );
				return;
			}
		}

		/*
		   * @param {Boolean} [options.singmode] Default false.
		   * @param {Number}  [options.pitch]    Default 64.
		   * @param {Number}  [options.speed]    Default 72.
		   * @param {Number}  [options.mouth]    Default 128.
		   * @param {Number}  [options.throat]   Default 128.
		*/


		text.split( 'PAUSE' ).reduce( async (prev, next, index, parts)=>{
			await prev;
			const part = parts[index].trim();
			return new Promise( async (done)=>{
				if (part != '') await self.sam.speak( parts[index] );
				setTimeout( done, 150 );
			});
		});
	}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit

	this.init = async function () {
		console.log( 'Application.init' );

		document.body.innerHTML = (`
<main class="terminal">
	<section class="output"></section>
	<textarea class="input"></textarea>
	<form class="controls">
		<section class="buttons">
			<button class="submit" title="Shortcut: [Shift]+[Enter]">Run</button>
		</section>
		<section class="status">
			<span class="time">12:23:02.2</span>
			<span class="connection_status warning">OFFLINE</span>
		</section>
	</form>
</main>

<footer class="main_menu">
	<a href="//spielwiese.central-dogma.at:443/" title="Load this page via Apache">Apache</a>
	<a href="//spielwiese.central-dogma.at:1337/" title="Load this page directly from Node">Node</a>
</footer>
		`).trim();

		self.debugConsole = await new DebugConsole({
			getURL      : ()=>WS_URL,
			isConnected : ()=>{ return self.webSocketClient.isConnected(); },
			send        : on_console_send,
			onPrint     : on_console_print,
			speak       : sam_speak,
		});
		//...self.debugConsole.toggleConsole();
		self.debugConsole.elements.input.focus();

		self.audioContext = self.debugConsole.audioContext;

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

	function delay (ms) { return new Promise( done => setTimeout(done, ms) ); }

	//await delay(500);
	show_status( 'Connecting' );
	//await delay(1500);

	await new Application();

	document.querySelectorAll( '.noscript' ).forEach( (element)=>{
		element.parentNode.removeChild( element );
	});

	document.querySelector( 'html' ).classList.remove( 'init' );
});


//EOF
