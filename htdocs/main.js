// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { WebSocketClient } from './websocket_client.js';
import { DebugConsole    } from './debug_console.js';

export const DEBUG = {
	WEBSOCKET: true,
};

const WS_URL = 'wss://spielwiese.central-dogma.at:1337';


export const Application = function () {
	const self = this;

	this.webSocketClient;
	this.debugConsole;


	const boot_sequence = [
	/*
		{
			session: {
				login: {
					username : 'hmw',
					password : 'DiuGP333',
				},
			},
		},
		{
			session: {
				status: {},
			},
		},
	*/
	/*
		{
			session: {
				kick: {
					username: 'hmw',
				},
			},
		},
	*/
	/*
		{
			session: {
				status: {
					persistent: {},
				},
			},
		},
	*/

	];



	function on_websocket_open (event, socket)  {
		self.debugConsole.print( 'Connection to ' + WS_URL + ' established', 'success' );

		if (boot_sequence.length > 0) socket.send( boot_sequence[0] );
		boot_sequence.shift();

	} // on_websocket_open


	function on_websocket_close (event, socket)  {
		document.querySelector( '.debug_console .prompt' ).classList.add( 'disabled' );
		self.debugConsole.print( 'Connection terminated', 'error' );

	} // on_websocket_close


	function on_websocket_message (event, socket) {
		// handle response
		const request = JSON.parse( event.data );

		self.debugConsole.print( request, 'response' );

		if (boot_sequence.length > 0) {
			socket.send( boot_sequence[0] );
			boot_sequence.shift();
		}

	} // on_websocket_message


	function on_websocket_error (event, socket) {
		splash_status( 'Error while connecting to<br>' + event.target.url );

	} // on_websocket_error


	function on_console_send (request) {
		//self.debugConsole.print( request, 'request' );
		self.webSocketClient.send( request );

	} // on_debug_message


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	function create_markup () {
		return (`
<header>
	<h1>
		<a href="/" title="Go to the home page"><img src="spielwiese.png" alt="Site icon"></a>
		spielwiese
		<small>research group</small>
	</h1>
</header>

<nav class="path_menu">
	<a href="#">Home</a>
</nav>

<nav class="main_menu">
	<a href="//spielwiese.central-dogma.at:443/">Apache</a>
	<a href="//spielwiese.central-dogma.at:1337/">Node</a>
</nav>

<article>
	<h2>Heading</h2>
	<p>Some text...</p>
</article>

<footer>
	<span>spielwiese.central-dogma.at</span>
	<span>copy(l)eft 2022</span>
	<span><a href="mailto:spielwiese.hmw@gmx.net">spielwiese.hmw@gmx.net</a></span>
</footer>

<button
	style="position:absolute;bottom:2px;left:2px;z-index:999;"
	onclick="document.body.classList.toggle('dark_mode')"
	title="Toggle between light and dark mode"
>D/L Mode</button>
		`);

	} // create_markup


	this.init = async function () {
		console.log( 'Application.init' );
		splash_status( 'Connecting...' );

		document.body.innerHTML = create_markup();

		self.debugConsole = await new DebugConsole({
			send: on_console_send,
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

	}; // init


	// Initialize the object asynchronously
	// Makes sure, a reference to this instance is returned to  const app = await new Application();
	return self.init().then( ()=>self );

}; // Application



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

addEventListener( 'load', async ()=>{
	//document.querySelector( 'div.noscript p').innerText = 'Initializing...';
	splash_status( 'Initializing...' );

	const prefers_dark_scheme = window.matchMedia( '(prefers-color-scheme:dark)' );
	document.body.classList.toggle( 'dark_mode', prefers_dark_scheme.matches );

	console.log( 'body.onLoad: new Application' );
	await new Application();

	document.querySelectorAll( '.noscript' ).forEach( (element)=>{
		element.parentNode.removeChild( element );
	});

	console.log( 'body.onLoad: Application initialized' );
	document.body.classList.remove( 'initializing' );
});


//EOF