// input.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../cep/config.js';


export const ShellInput = function (terminal, callback) {
	const self = this;

	const EXTRA_LINES = 1;   // When adjusting textarea size (rows), make it bigger
	const MIN_LINES   = 0;   // When adjusting textarea size (rows), make it at least this

	const SHORTHAND_COMMANDS = {
		'nick'  : 'chat\n\tnick:*',
		'who'   : 'session\n\twho',
	};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INPUT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.focusPrompt = function (position = 0) {
		const pos1  = -1;
		const end   = +1;
		const input = terminal.elements.input;

		self.adjustTextarea();
		input.focus();

		if (position == pos1) input.selectionEnd = input.selectionStart = 0;
		if (position == end ) input.selectionEnd = input.selectionStart = input.value.length;

	} // focusPrompt


	this.adjustTextarea = function () {
		const bang = terminal.elements.input.value.charAt( 0 );
		const has_newlines = (terminal.elements.input.value.indexOf('\n') >= 0);
		const is_request = has_newlines || (bang == '/') || (bang == '.');
		terminal.elements.input.classList.toggle( 'request', is_request );

		const lines = terminal.elements.input.value.split('\n');
		const nr_lines = (lines.length > 0) ? lines.length : 1;
		terminal.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

		const cssvar_height
		= getComputedStyle( document.documentElement )
		.getPropertyValue( '--terminal-line-height' )
		;

		const scale = parseFloat( cssvar_height || 1 );
		terminal.elements.input.style.height = scale * (terminal.elements.input.rows + 1) + 'em';

	}; // adjustTextarea


	this.clearInput = function () {
		self.elements.input.value = '';
		self.scrollDown();

	} // clearInput


// ENTER BUTTON //////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onEnterClick = async function (event) {

		// Replace chat commands with actual ones
		let text = terminal.elements.input.value.trim();

		if ((text.trim() == '') && (event.button === 0)) {
			if (terminal.output.isScrolledUp()) {
				terminal.output.scrollDown();
			} else {
				terminal.output.print( '&nbsp;', 'mark' );
			}
			return;
		}

		if (text.charAt(0) == '/') {
			const tokens  = text.slice(1).split(' ');
			const command = SHORTHAND_COMMANDS[ tokens.shift() ];
			const rest    = tokens.join(' ');
			if (command) text = command.replace( '*', rest );
		}

		if (text.charAt(0) == '.') {
			text = terminal.elements.input.value = terminal.parsers.parseShortRequest( text );
			//...? self.focusPrompt();
			//...? return;
		}

		if (!perform_local( text )) {
			await remote_command( text );
		}

		terminal.history.add( text );
		terminal.elements.input.value = '';

		self.focusPrompt();

		return;


// LOCAL COMMAND /////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function perform_local (command) {
			if (command.charAt(0) != '/') return false;

			terminal.output.print( command, 'request' );

			const token     = command.split(' ')[0].slice(1);
			const parameter = command.slice( token.length + 2 );
			const show_file = terminal.output.showFile;

			switch (token) {
				case 'connect': {
					callback.connect( parameter || SETTINGS.WEBSOCKET.URL );
					break;
				}
				case 'disconnect': {
					terminal.elements.navCEP.classList = 'connection warning';
					terminal.elements.btnCEP.innerText = 'Offline';//... Needs callback
					terminal.elements.title = '';
					callback.disconnect();
					break;
				}
				case 'version' :  terminal.output.printVersion();                 break;
				case 'clear'   :  terminal.output.clearScreen();                  break;
				case 'help'    :  show_file( 'terminal/help.txt'  , parameter );  break;
				case 'issue'   :  show_file( 'terminal/issue.txt' , parameter );  break;
				case 'readme'  :  show_file( 'README'             , parameter );  break;
				case 'todo'    :  show_file( 'TODO'               , parameter );  break;
				case 'manual'  :  show_file( 'MyNode.html'        , parameter );  break;
				case 'diary'   :  show_file( 'dev_diary.html'     , parameter );  break;
				case 'test': {
					for ( let i=0 ; i<5 ; ++i ) terminal.status.show.show( 'Test message ' + i );
					break;
				}
				case 'string'  : {
					// Send raw string to the server, trying to crash it
					terminal.output.print( 'Sending string: <q>' + parameter + '</q>', 'string' );
					callback.send( parameter );
					break;
				}
				default: {
					terminal.elements.navCEP.classList = 'connection error';
					terminal.elements.btnCEP.innerText = 'Error';
					terminal.elements.title = 'Unknown command in perform_local()';
					terminal.output.print( 'Unrecognized command', 'cep' );
				}
			}

			return true;

		} // perform_local


// SEND REQUEST //////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function send_json (text) {
			const request
			= (text.indexOf('\n') >= 0)
			? terminal.parsers.textToRequest( text )
			: {chat: { say: text }}
			;
			if (SETTINGS.AUTO_APPEND_TAGS) request.tag = ++terminal.requestId;
			callback.send( request );
		}

		async function remote_command (text) {
			const max_attempts = 10;
			let nr_attempts = 0;

			if (!callback.isConnected()) {
				terminal.output.print( 'Connecting to ' + SETTINGS.WEBSOCKET.URL, 'cep' );

				await callback.connect();  //...! Doesn't wait for onConnect yet
				while ((nr_attempts++ < max_attempts) && !callback.isConnected()) {
					await new Promise( (done)=>{
						setTimeout( done, SETTINGS.TIMEOUT.RECONNECT );
					});
				}
			}

			if (nr_attempts == max_attempts) terminal.output.print( 'Aborting auto-connect', 'cep' );

			if (callback.isConnected()) {
				terminal.dom.animatePing( /*transmit*/true );
				send_json( text );

			} else {
				await new Promise( (done)=>{
					setTimeout( ()=>{
						if (callback.isConnected()) {
							send_json( text );
						} else {
							terminal.output.print( 'Not connected', 'error' );
						}
						done();

					}, SETTINGS.TIMEOUT.RECONNECT);
				});
			}

		} // remote_command

	}; // onEnterClick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function () {
		console.log( 'Input.init' );

	}; // init

	self.init();

}; // ShellInput


//EOF
