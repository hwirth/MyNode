// input.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../config.js';


export const ShellInput = function (cep, terminal, shell) {
	const self = this;

	const EXTRA_LINES = 1;   // When adjusting textarea size (rows), make it bigger
	const MIN_LINES   = 0;   // When adjusting textarea size (rows), make it at least this

	const SHORTHAND_COMMANDS = {
		'nick'  : 'chat\n\tnick:*',
		'who'   : 'session\n\twho',
	};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.hasFocus = function () {
		return shell.elements.input === document.activeElement;

	}; // hasFocus


	this.focusPrompt = function (position = 0) {
		const pos1  = -1;
		const end   = +1;
		const input = shell.elements.input;

		self.adjustTextarea();
		input.focus();

		if (position == pos1) input.selectionEnd = input.selectionStart = 0;
		if (position == end ) input.selectionEnd = input.selectionStart = input.value.length;

	} // focusPrompt


	this.adjustTextarea = function () {
		const bang         = shell.elements.input.value.charAt( 0 );
		const has_newlines = (shell.elements.input.value.indexOf('\n') >= 0);
		const is_request   = has_newlines || (bang == '.');
		const is_local     = (bang == '/');
		shell.elements.input.classList.toggle( 'request', is_request );
		shell.elements.input.classList.toggle( 'local'  , is_local   );

		const lines = shell.elements.input.value.split('\n');
		const nr_lines = (lines.length > 0) ? lines.length : 1;
		shell.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

		const cssvar_height = cep.dom.getCSSVariable( '--terminal-line-height' );

		const scale = parseFloat( cssvar_height || 1 );
		shell.elements.input.style.height = scale * (shell.elements.input.rows + 1) + 'em';

	}; // adjustTextarea


	this.clearInput = function () {
		self.elements.input.value = '';
		self.scrollDown();

	} // clearInput


// ENTER BUTTON //////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onEnterClick = async function (event) {

		// Replace chat commands with actual ones
		let text = shell.elements.input.value.trim();

		if ((text.trim() == '') && (event.button === 0)) {
			if (shell.output.isScrolledUp()) {
				shell.output.scrollDown();
			} else {
				shell.output.print( '&nbsp;', 'mark' );
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
			text = shell.elements.input.value = shell.parsers.parseShortRequest( text );
			//...? self.focusPrompt();
			//...? return;
		}

		if (!perform_local( text )) {
			await remote_command( text );
		}

		shell.history.add( text );
		shell.elements.input.value = '';

		self.focusPrompt();

		return;

// LOCAL COMMAND /////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function perform_local (command) {
			if (command.charAt(0) != '/') return false;

			shell.output.print( command, 'request' );

			const token     = command.split(' ')[0].slice(1);
			const parameter = command.slice( token.length + 2 );
			const show_file = shell.output.showFile;

			switch (token) {
				case 'connect': {
					cep.connection.connect( parameter || SETTINGS.WEBSOCKET.URL );//...! Remove constant
					break;
				}
				case 'disconnect': {
					cep.connection.disconnect();
					break;
				}
				case 'version' :  shell.output.printVersion();   break;
				case 'clear'   :  shell.output.clearScreen();    break;
				case 'help'    :  show_file( '/cep/terminal/txt/help.txt'  , parameter );  break;
				case 'issue'   :  show_file( '/cep/terminal/txt/issue.txt' , parameter );  break;
				case 'readme'  :  show_file( '/docs/README'                , parameter );  break;
				case 'todo'    :  show_file( '/docs/TODO'                  , parameter );  break;
				case 'manual'  :  show_file( '/docs/MyNode.html'           , parameter );  break;
				case 'diary'   :  show_file( '/docs/dev_diary.html'        , parameter );  break;
				case 'test': {
					for ( let i=0 ; i<5 ; ++i ) terminal.applets.status.show( 'Test message ' + i );
					break;
				}
				case 'string'  : {
					// Send raw string to the server, trying to crash it
					//...shell.output.print( 'Sending string: <q>' + parameter + '</q>', 'string' );
					cep.connection.send( parameter );
					break;
				}
				default: {
					terminal.elements.btnCEP.innerText = 'Error';
					shell.output.print( 'Unrecognized command', 'cep' );
				}
			}

			return true;

		} // perform_local


// SEND REQUEST //////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function send_json (request) {
			if (SETTINGS.AUTO_APPEND_TAGS) request.tag = ++shell.requestId;
			cep.connection.send( request );
		}

		async function remote_command (text) {
			const request
			= (text.indexOf('\n') >= 0)
			? shell.parsers.textToRequest( text )
			: {chat: { say: text }}
			;

			const max_attempts = 10;
			let nr_attempts = 0;

			if (!cep.connection.isConnected()) {
				//...? shell.output.print( 'Connecting to ' + SETTINGS.WEBSOCKET.URL, 'cep' );
				try { await cep.connection.connect(); }
				catch {
					shell.output.print( 'Could not connect', 'cep error' )
					return;
				}
			}

			if (cep.connection.isConnected()) {
				//...terminal.animatePing( /*transmit*/true );
				send_json( request );
			} else {
				shell.output.print( request, 'request' );
				shell.output.print( 'Not connected', 'cep error' )
			}

		} // remote_command

	}; // onEnterClick

}; // ShellInput


//EOF
