// input.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS       } from '../cep/config.js';
import { PRESETS, DEBUG } from '../cep/config.js';
import { GET            } from '../cep/helpers.js';
import { StatusBar      } from './status.js';
import { DomActions     } from './dom_actions.js';
import { Audio          } from './audio.js';
import { History        } from './history.js';
import { create_toggles } from './toggles.js';
import { handle_message } from './handle_message.js'


export const InputPrompt = function (terminal, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INPUT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.focusPrompt = function (position = 0) {
		const pos1  = -1;
		const end   = +1;
		const input = self.elements.input;

		self.adjustTextarea();
		input.focus();

		if (position == pos1) input.selectionEnd = input.selectionStart = 0;
		if (position == end ) input.selectionEnd = input.selectionStart = input.value.length;

	} // focusPrompt


	this.adjustTextarea = function () {
		const bang = self.elements.input.value.charAt( 0 );
		const has_newlines = (self.elements.input.value.indexOf('\n') >= 0);
		const is_request = has_newlines || (bang == '/') || (bang == '.');
		self.elements.input.classList.toggle( 'request', is_request );

		const lines = self.elements.input.value.split('\n');
		const nr_lines = (lines.length > 0) ? lines.length : 1;
		self.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

		const cssvar_height
		= getComputedStyle( document.documentElement )
		.getPropertyValue( '--terminal-line-height' )
		;

		const scale = parseFloat( cssvar_height || 1 );
		self.elements.input.style.height = scale * (self.elements.input.rows + 1) + 'em';

	}; // adjustTextarea


// PARSERS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.parseButtonScript = function (script_name) {
		let script   = BUTTON_SCRIPTS.find( script => script.name == script_name ).script;
		const username = self.elements.userName.value;
		const nickname = self.elements.nickName.value;
		if (nickname && !username) self.elements.userName.value = 'guest';
		const second_factor = self.elements.factor2.value || 'null';
		script = script.replaceAll( '\n%N', (self.elements.nickName.value) ? '\nchat\n\tnick: %n' : '' );
		const result = (
			script
			.replaceAll( '%u', username )
			.replaceAll( '%n', nickname )
			.replaceAll( '%p', self.elements.passWord.value || 'null' )
			.replaceAll( '%t', second_factor )
			.split('\n')
			.filter( line => line.indexOf('password: null') < 0 )
			.filter( line => line.indexOf('factor2: null') < 0 )
			.join('\n')
		);

		return result;

	}; // parseButtonScript


	this.requestToText = function (request, indentation = '') {
		let text = '';

		Object.keys( request ).forEach( (key)=>{
			if ((typeof request[key] == 'object') && (request[key] !== null)) {
				text
				+= indentation + key + '\n'
				+  self.requestToText( request[key], indentation + '\t' )
				;
			} else {
				if (typeof request[key] == 'undefined') {
					text += indentation + key + '\n';
				} else {
					text += indentation + key + ': ' + request[key] + '\n';
				}
			}
		});

		if (indentation === '') {
			text = text.trim();
		}

		return text;

	}; // requestToText


	this.textToRequest = function (text, id = null) {
		const lines = text.split( '\n' );

		function find_indentation (text) {
			var i;
			for ( i = 0 ; (i < text.length) && (text.charAt(i) == '\t') ; ++i );
			return i;
		}

		const result = {};
		const stack = [result];
		let current_indentation = 0;

		const request = parse_line( 0 );

		if (id) {
			const new_request = { tag: id };
			Object.keys( request ).forEach( key => new_request[key] = request[key] );
			return new_request;
		} else {
			return request;
		}


		function parse_line (index, current_indentation = 0) {
			// Line does not exist: End of text, end recursion:
			if (typeof lines[index] == 'undefined') return result;

			const line_indentation = find_indentation( lines[index] );
			if (line_indentation < current_indentation) {
				const difference = current_indentation - line_indentation;
				for (let i = 0; i < difference; ++i) {
					stack.pop();
					--current_indentation;
				}
			}

			// Add entry to current parent
			const parent = stack[ stack.length - 1 ];
			const parts = lines[index].split( ':', 2 );   // Get key and value
			if (parts.length == 2) {
				// Actually has key and value
				const key = lines[index].split( ':', 1 )[0].trim();

				const colon_pos = lines[index].indexOf( ':' );
				let value = lines[index].slice( colon_pos + 1 ).trim();
				switch (value) {
					case 'true'  : value = true;   break;
					case 'false' : value = false;  break;
					case 'null'  : value = null;   break;
				}

				function isNumeric (string) {
					return !isNaN(parseFloat(string)) && isFinite(string);
				}
				if (isNumeric( value )) {
					value = parseFloat(value);
				}

				parent[key] = value;

			} else if (parts.length == 1) {
				// Is a sub-object
				const key = lines[index].trim();
				parent[key] = {};
				stack.push( parent[key] );
				//...? Expects next line with increased indentation
				++current_indentation;

			} else {
				console.log( 'textToRequest: parts.length == 0' );
			}

			return parse_line( index + 1, current_indentation );
		}

	}; // textToRequest


	function parse_short_request (text) {
		const parts = text.slice(1).split('.')
		let result = '';
		let indentation = 0;

		while (parts.length > 0) {
			const part = parts.shift();

			if (part === '') {
				if (--indentation < 0) throw new Error( 'Malformed short request' );

			} else {
				const pos_comma = part.indexOf( ',' );
				if (pos_comma >= 0) {
					part.split( ',' ).forEach( (sub_part)=>{
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  sub_part.replace( '=', ':' )
						;
					});

				} else {
					const pos_equals = part.indexOf( '=' );
					if (pos_equals >= 0) {
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  part.replace( '=', ':' )
						;
					} else {
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  part
						;
						++indentation;
					}
				}
			}
		}

		return result.trim();

	} // parse_short_request


// ENTER BUTTON //////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function on_enter_click (event) {

		// Replace chat commands with actual ones
		let text = self.elements.input.value.trim();

		if ((text.trim() == '') && (event.button === 0)) {
			if (self.isScrolledUp()) self.scrollDown(); else self.print( '&nbsp;', 'mark' );
			return;
		}

		if (text.charAt(0) == '/') {
			const tokens  = text.slice(1).split(' ');
			const command = SHORTHAND_COMMANDS[ tokens.shift() ];
			const rest    = tokens.join(' ');
			if (command) text = command.replace( '*', rest );
		}

		if (text.charAt(0) == '.') {
			text = self.elements.input.value = parse_short_request( text );
			//...? self.focusPrompt();
			//...? return;
		}

		if (!perform_local( text )) {
			await remote_command( text );
		}

		self.history.add( text );
		self.elements.input.value = '';

		self.focusPrompt();

		return;


// LOCAL COMMAND /////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function perform_local (command) {
			if (command.charAt(0) != '/') return false;

			self.print( command, 'request' );

			const token     = command.split(' ')[0].slice(1);
			const parameter = command.slice( token.length + 2 );

			switch (token) {
				case 'connect': {
					callback.connect( parameter || SETTINGS.WEBSOCKET.URL );
					break;
				}
				case 'disconnect': {
					self.elements.connection.classList = 'connection warning';
					self.elements.btnCEP.innerText = 'Offline';//... Needs callback
					self.elements.title = '';
					callback.disconnect();
					break;
				}
				case 'version' :  print_version();     break;
				case 'clear'   :  self.clearScreen();  break;
				case 'help'    :  show_file( 'terminal/help.txt'  , parameter );  break;
				case 'issue'   :  show_file( 'terminal/issue.txt' , parameter );  break;
				case 'readme'  :  show_file( 'README'             , parameter );  break;
				case 'todo'    :  show_file( 'TODO'               , parameter );  break;
				case 'manual'  :  show_file( 'MyNode.html'        , parameter );  break;
				case 'diary'   :  show_file( 'dev_diary.html'     , parameter );  break;
				case 'test': {
					for ( let i=0 ; i<5 ; ++i ) self.status.show( 'Test message ' + i );
					break;
				}
				case 'string'  : {
					// Send raw string to the server, trying to crash it
					self.print( 'Sending string: <q>' + parameter + '</q>', 'string' );
					callback.send( parameter );
					break;
				}
				default: {
					self.elements.connection.classList = 'connection error';
					self.elements.btnCEP.innerText = 'Error';
					self.elements.title = 'Unknown command in perform_local()';
					self.print( 'Unrecognized command', 'cep' );
				}
			}

			return true;

		} // perform_local


// SEND REQUEST //////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function send_json (text) {
			const request = (text.indexOf('\n') >= 0) ? self.textToRequest(text) : {chat: { say: text }};
			if (SETTINGS.AUTO_APPEND_TAGS) request.tag = ++self.requestId;
			callback.send( request );
		}

		async function remote_command (text) {
			const max_attempts = 10;
			let nr_attempts = 0;

			if (!callback.isConnected()) {
				self.print( 'Connecting to ' + SETTINGS.WEBSOCKET.URL, 'cep' );

				await callback.connect();  //...! Doesn't wait for onConnect yet
				while ((nr_attempts++ < max_attempts) && !callback.isConnected()) {
					await new Promise( (done)=>{
						setTimeout( done, SETTINGS.TIMEOUT.RECONNECT );
					});
				}
			}

			if (nr_attempts == max_attempts) self.print( 'Aborting auto-connect', 'cep' );

			if (callback.isConnected()) {
				self.dom.animatePing( /*transmit*/true );
				send_json( text );

			} else {
				await new Promise( (done)=>{
					setTimeout( ()=>{
						if (callback.isConnected()) {
							send_json( text );
						} else {
							self.print( 'Not connected', 'error' );
						}
						done();

					}, SETTINGS.TIMEOUT.RECONNECT);
				});
			}

		} // remote_command

	} // on_enter_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'Input.init' );
		return Promise.resolve();

	}; // init

	self.init().then( ()=>self );   // const input = await new InputPrompt();

}; // InputPrompt


//EOF
