// input.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../config.js';

// access_variable()
import { DEBUG    as CEP_DEBUG     } from '../../config.js';
import { SETTINGS as CEP_SETTINGS  } from '../../config.js';
import { SETTINGS as TERM_SETTINGS } from '../config.js';
import { PRESETS  as TERM_PRESETS  } from '../config.js';


export const ShellInput = function (cep, terminal, shell) {
	const self = this;

	const EXTRA_LINES = 1;   // When adjusting textarea size (rows), make it bigger
	const MIN_LINES   = 0;   // When adjusting textarea size (rows), make it at least this

	const SHORTHAND_COMMANDS = {
		'nick'  : 'chat\n\tnick:*',
		'who'   : 'session\n\twho',
	};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// ACCESS VARIABLE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function access_variable (command) {
		try {
			const parts = command.split( ' ' );
			const operation   = parts[0].slice(1);
			const string_path = parts[1];
			const value       = parts[2];

			if( (operation == 'get') && (parts.length == 2)
			||  (operation == 'set') && (parts.length == 3)
			) {
				const path = string_path.split('.');
				const var_name = path.shift();
				let target = null;
				switch (var_name) {
					case 'CEP_DEBUG'    : target = CEP_DEBUG    ; break;
					case 'CEP_SETTINGS' : target = CEP_SETTINGS ; break;
					case 'TERM_SETTINGS': target = TERM_SETTINGS; break;
					case 'TERM_PRESETS' : target = TERM_PRESETS ; break;
					default: throw new Error( 'Invalid path' );
				}
				const result = property( target, path, value );
				shell.output.print( operation + ' ' + string_path + ' ' + result, 'cep' );

			} else {
				throw new Error( 'Invalid number of arguments' );
			}
		}
		catch (error) {
			console.log( error );
			shell.output.print( error.message, 'error' );
		}

		return;

		function property (target, path, value) {
			const set_value = (typeof value != 'undefined');
			return walk( target, path, 'object' );

			function walk (target, path, traversed) {
				if (path.length == 0) return target;
				const key = path[0];

				if (typeof target[key] == 'undefined') {
					throw new Error( 'Property not found: ' + traversed + '.' + key );
				}

				if (set_value && (path.length == 1)) return target[key] = value;
				return walk( target[key], path.slice(1), traversed + '.' + key );
			}
		}

	} // access_variable


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
		shell.history.add( text );

		if ((text.trim() == '') && (event.button === 0)) {
			if (shell.output.isScrolledUp()) {
				shell.output.scrollDown();
			} else {
				shell.output.print( '&nbsp;', 'mark' );
				shell.output.print( '&nbsp;', 'mark', 1 );
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
		}

		if (!perform_local( text )) await remote_command( text );

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
					cep.connection.connect( parameter || SETTINGS.WEBSOCKET.URL );
					break;
				}
				case 'disconnect': {
					cep.connection.disconnect();
					break;
				}
				case 'version' :  shell.output.printVersion();  break;
				case 'clear'   :  shell.output.clearScreen();   break;
				case 'toggles' :  show_toggles();               break;
				case 'get'     :  // fall through
				case 'set'     :  access_variable( command );   break;
				case 'help'    :  show_file( '/cep/terminal/txt/help.txt'  , parameter );  break;
				case 'issue'   :  show_file( '/cep/terminal/txt/issue.txt' , parameter );  break;
				case 'readme'  :  show_file( '/docs/README'                , parameter );  break;
				case 'todo'    :  show_file( '/docs/TODO'                  , parameter );  break;
				case 'manual'  :  show_file( '/docs/MyNode.html'           , parameter );  break;
				case 'diary'   :  show_file( '/docs/dev_diary.html'        , parameter );  break;
				case 'test': {
					for ( let i=0 ; i<5 ; ++i ) {
						terminal.applets.status.show( 'Test message ' + i );
					}
					break;
				}
				case 'string'  : {
					// Send raw string to the server, trying to crash it //... Doesn't crash tho!?
					//...shell.output.print( 'Sending string: <q>' + parameter + '</q>', 'string' );
					cep.connection.send( parameter );
					break;
				}
				default: {
					shell.output.print( 'Unrecognized command', 'cep' );
				}
			}

			return true;

			function show_toggles () {
				const toggles = {...terminal.toggles, ...shell.toggles};
				const has_shortcut = ([name, toggle]) => toggle.shortcut;
				const to_list = ([name, toggle])=>{
					return (
						'Alt + '
						+ toggle.shortcut.toUpperCase()
						+ ': '
						+ name
					);
				}
				const text = (
					Object.entries( toggles )
					.filter( has_shortcut )
					.map( to_list )
					.sort()
					.join('\n')
				);
				shell.output.print( text, 'cep' );
			}

		} // perform_local


// SEND REQUEST //////////////////////////////////////////////////////////////////////////////////////////////////119:/
		async function remote_command (text) {

			function chat_message () {
				const list   = terminal.applets.userList.elements.navWho;
				const target = list.querySelector( 'button.active' );
				const room   = target.dataset.room;
				const user   = target.dataset.user;

				if (room) {
					return {chat:{say:{room:room, message:text}}};
				} else {
					return {chat:{say:{user:user, message:text}}};
				}
			}

			const request
			= (text.indexOf('\n') >= 0)
			? shell.parsers.textToRequest( text )
			: chat_message()
			;

			const max_attempts = 10;
			let nr_attempts = 0;

			if (!cep.connection.isConnected()) {
				await cep.connection.connect().catch( error =>{
					console.log(
						'%cERROR:', 'color:red',
						'ShellInput-remote_command:',
						error.message,
						text,
					);
					shell.output.print( 'Error: ' + error.message, 'cep error' );
					return;
				});
			}

			if (cep.connection.isConnected()) {
				send_json( request );
			} else {
				shell.output.print( request, 'request' );
				shell.output.print( 'Auto-connect failed', 'cep error' )
			}

			function send_json (request) {
				cep.connection.taggedRequest( request );
			}

		} // remote_command

	}; // onEnterClick

}; // ShellInput


//EOF
