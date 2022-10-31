// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const EXTRA_LINES = 0;
const MIN_LINES = 0;

const BANGS = ['>', ':', '!', '.', ';', '/'];

const BANG_REQUEST = '';//'>';

const BUTTON_SCRIPTS = {
	'stat'    : BANG_REQUEST + 'session status',
	'root'    : BANG_REQUEST + 'session login username: root password: 12345',
	'user'    : BANG_REQUEST + 'session login username: user password: pass2',
	'out'     : BANG_REQUEST + 'session logout',
	'who'     : BANG_REQUEST + 'session who',
	'kroot'   : BANG_REQUEST + 'session kick username: root',
	'kuser'   : BANG_REQUEST + 'session kick username: sec',
	'MCP'     : BANG_REQUEST + 'mcp status',
	'rst'     : BANG_REQUEST + 'mcp restart',
};

const TUTORIAL_SCRIPT = [
	BANG_REQUEST + 'session login username: root password: 12345',
	BANG_REQUEST + 'session status',
	BANG_REQUEST + 'mcp inspect',
	BANG_REQUEST + 'mcp inspect: reloader.persistentData',
	BANG_REQUEST + 'mcp status',
];


export const History = function (callback) {
	const self = this;

	this.entries;
	this.currentEntry;

	this.add = function (new_entry) {
		const existing_index = self.entries.indexOf( new_entry );
		if (existing_index >= 0) {
			self.entries.splice( existing_index, 1 );
		}

		self.entries.push( new_entry );
		self.currentEntry = self.entries.length - 1;

	}; // add

	this.back = function () {
		--self.currentEntry;

		if (self.currentEntry < 0) {
			self.currentEntry = self.entries.length - 1;
		}

		callback.back();

		return self.entries[self.currentEntry];

	}; // goBack

	this.forward = function () {
		++self.currentEntry;

		if (self.currentEntry >= self.entries.length) {
			self.currentEntry = 0;
		}

		callback.forward();

		return self.entries[self.currentEntry];

	}; // goForward


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		self.entries = [];
		self.currentEntry = -1;

	}; // init


	self.init();

}; // History


export const DebugConsole = function (callback) {
	const self = this;

	this.history;

	this.requestToText = request_to_text;
	this.textToRequest = text_to_request;

	this.requestId;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function scroll_down () {
		self.elements.output.scrollBy(0, 99999);
	} // scroll_down


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONVERT USER INPUT <--> JSON
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function request_to_text (request, indentation = '') {
		let text = '';

		Object.keys( request ).forEach( (key)=>{
			if( (typeof request[key] == 'object')
			&&  (request[key] !== null)
			) {
				text
				+= indentation
				+  key
				+  '\n'
				+ request_to_text( request[key], indentation + '\t' )
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

	} // request_to_text


	function text_to_request (text, id = null) {
		const lines = text.split( '\n' );

		function find_indentation (text) {
			let indentation = 0;
			for (
				let i = 0
				; (i < text.length) && (text.charAt(i) == '\t')
				; ++i
			) {
				++indentation;
			}

			return indentation;
		}

		const result = {};
		const stack = [result];
		let current_indentation = 0;

		const request = parse_line( 0 )

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
				//... Expects next line with increased indentation
				++current_indentation;

			} else {
				console.log( 'text_to_request: parts.length == 0' );
			}

			return parse_line( index + 1, current_indentation );
		}

	} // text_to_request


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleConsole = function () {
		self.elements.terminal.classList.toggle( 'active' );
		if (self.elements.terminal.classList.contains( 'active' )) {
			self.elements.input.focus();
		} else {
			self.elements.input.blur();
		}

	}; // toggle


	this.toggleOverflow = function () {
		console.log('OOO');
		self.elements.terminal.classList.toggle( 'overflow' );

	}; // toggleOverflow


	this.print = function (message, class_name) {
		let t = -1;
		const cnames = [
			'slash', 'period', 'colon', 'semi','curlyO',
			'bracketO', 'parensO', 'parensC', 'bracketC','curlyC',
			'true', 'false', 'null'
		];
		const tokens = [
			'/', '.', ':', ';', '{',
			'[', '(', ')', ']', '}',
			'true', 'false', 'null'
		];

		const message_html = (
			(typeof message == 'string')
			? message
			: request_to_text( message )
		)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')//...
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split('\n')
		.map( line => '<div>'+line+'</div>' )
		.join('')
		;

		if (message.MCP) class_name = 'mcp'; //...new_element.classList.add( 'mcp' );

		const new_element = document.createElement( 'pre' );
		new_element.className = class_name;
		new_element.innerHTML = message_html;

		//self.elements.terminal.insertBefore( new_element, self.elements.prompt );
		self.elements.output.appendChild( new_element );
		scroll_down();


	}; // print


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugConsole.init' );
/*
		const HTML = (`
			<div class="output" ></div>
			<div class="prompt" >
				<textarea class="input" rows="${EXTRA_LINES}"></textarea>
			</div>
			<div class="buttons">
				<button class="submit" title="Shortcut: [Shift]+[Enter]">Execute</button>
			</div>
		`);

		const new_element = document.createElement( 'div' );
		new_element.className = 'debug_console';
		new_element.innerHTML = HTML;
		document.body.appendChild( new_element );
*/
		const container = document.querySelector( '.terminal' );
		self.elements = {
			terminal : container,
			output   : container.querySelector( '.output'   ),
			prompt   : container.querySelector( '.prompt'   ),
			input    : container.querySelector( '.input'    ),
			controls : container.querySelector( '.controls' ),
			buttons  : container.querySelector( '.buttons'  ),
			send     : container.querySelector( '.submit'   ),
		};

		self.history = new History({
			forward : ()=>{},
			back    : ()=>{},
		});

		self.elements.controls.addEventListener( 'submit', e => e.preventDefault() );


		function adjust_textarea () {
			const is_request = (self.elements.input.value.charAt(0) == '>');
			self.elements.input.classList.toggle( 'request', is_request );

			const lines = self.elements.input.value.split('\n');
			const nr_lines = (lines.length > 0) ? lines.length : 1;
			self.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

			scroll_down();
		}


		// BUTTONS

		Object.keys( BUTTON_SCRIPTS ).forEach( (key)=>{
			const name = key.charAt(0).toUpperCase() + key.slice(1);
			const new_button = document.createElement( 'button' );
			new_button.className = key;
			new_button.innerText = name;
			new_button.title     = 'Double click to execute immediately';
			new_button.addEventListener( 'click', on_script_button_click );
			//...self.elements.buttons.insertBefore( new_button, self.elements.send );
			self.elements.buttons.appendChild( new_button );
		});
		function on_script_button_click (event) {
			event.preventDefault();
			self.elements.input.value = BUTTON_SCRIPTS[event.target.className];
			adjust_textarea();
		}


		// REFOCUS

		let accept_click = null;

		self.elements.terminal.addEventListener( 'mousemove', (event)=>{
			if (event.target.classList.contains( 'debug_console' )) {
				self.elements.input.focus();
				accept_click = null;
			}
		});
		self.elements.terminal.addEventListener( 'mousedown', (event)=>{
			accept_click = event.target.classList.contains( 'debug_console' );
		});
		self.elements.terminal.addEventListener( 'mouseup', (event)=>{
			if (accept_click && event.target.classList.contains( 'debug_console' )) {
				self.elements.input.focus();
				accept_click = null;
			}
		});
		self.elements.input.addEventListener( 'change', adjust_textarea );
		self.elements.input.addEventListener( 'input', adjust_textarea );
		self.elements.input.addEventListener( 'mousemove', ()=>{
			self.elements.input.focus();
		});
		self.elements.input.addEventListener( 'keyup', adjust_textarea );


		// KEYBOARD

        	self.elements.input.addEventListener( 'keydown', (event)=>{


			if (['Shift', 'Ctrl', 'Alt'].indexOf(event.key) == 0) {
				adjust_textarea();
			}

			if (event.keyCode == 13 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				// Execute command with any modifyer+Enter
				event.preventDefault();
				self.elements.send.click();

			} else if (event.keyCode == 9 || event.which == 9) {
				// Insert TAB character instead of leaving the textarea
				event.preventDefault();

				const input = self.elements.input;
				let selection_start = input.selectionStart;

				input.value
				= input.value.substring( 0, input.selectionStart )
				+ '\t'
				+ input.value.substring( input.selectionEnd )
				;

				input.selectionEnd = selection_start + EXTRA_LINES + 1;
			}
        	});



		['keydown', 'keypress', 'keyup' ].forEach( event =>
			addEventListener(
				event, on_keyboard_event, {passive: false},
		));

		function on_keyboard_event (event) {
			const shift = event.shiftKey;
			const ctrl = event.ctrlKey;
			const alt = event.altKey;

			const input = self.elements.input;
			const cursor_pos1 = input.selectionStart == 0;
			const cursor_end  = input.selectionStart == input.value.length -1;

			const KEYBOARD_SHORTCUTS = [{
				event     : 'keydown',
				key       : 'a',
				modifiers : ['alt'],
				action    : ()=>{ self.elements.terminal.classList.toggle('animated'); },
			},{
				event     : 'keydown',
				key       : 'c',
				modifiers : ['alt'],
				action    : ()=>{ self.elements.output.classList.toggle('compressed'); },
			},{
				event     : 'keydown',
				key       : 'd',
				modifiers : ['alt'],
				action    : self.toggleConsole,
			},{
				event     : 'keydown',
				key       : 'o',
				modifiers : ['alt'],
				action    : self.toggleOverflow,
			},{
				event     : 'keydown',
				key       : 's',
				modifiers : ['alt'],
				action    : ()=>{ self.elements.output.classList.toggle('separators'); },
			},{
				event     : 'keydown',
				key       : '#',
				modifiers : ['ctrl'],
				action    : self.toggle,
			},{
				event     : 'keyup,keypress,keydown',
				code      : 'BackQuote',
				modifiers : ['shift','ctrl','alt'],
				action    : self.toggle,
			},{
				event     : 'keydown',
				key       : 'ArrowUp',
				modifiers : ['cursorPos1'],
				action    : ()=>{ self.elements.input.value = self.history.back(); },
			},{
				event     : 'keydown',
				key       : 'ArrowDown',
				modifiers : ['cursorEnd'],
				action    : ()=>{ self.elements.input.value = self.history.forward(); },
			}];

			KEYBOARD_SHORTCUTS.forEach( (shortcut)=>{
				const is_key = (event.key === shortcut.key) || (event.code === shortcut.code);
				const is_event = (shortcut.event.split(',')).indexOf( event.type ) >= 0;

				if (is_event && is_key && modifiers(shortcut)) {
					event.stopPropagation();
					event.preventDefault();

					console.log( 'KBD', is_key, is_event, shortcut );

					shortcut.action( event );
				}
			});

			function modifiers (shortcut) {
				const modifiers = shortcut.modifiers;
				const requires = {
					shift      : modifiers.indexOf('shift') >= 0,
					ctrl       : modifiers.indexOf('ctrl') >= 0,
					alt        : modifiers.indexOf('alt') >= 0,
					cursorPos1 : modifiers.indexOf('cursorPos1') >= 0,
					cursorEnd  : modifiers.indexOf('cursorEnd') >= 0,
				};

				return (
					event.shiftKey == requires.shift
				&&	event.ctrlKey == requires.ctrl
				&&	event.altKey == requires.alt
				);
			}

		} // on_keyboard_event


		// KEYBOARD BEEP

		let nr_active_sounds = 0;
		addEventListener('keydown', (event) => {
return
			// Chromium crashes after I type fast for a few seconds
			// Limiting number of sounds does not help:
			if (nr_active_sounds > 5) return;

			let context = new(window.AudioContext || window.webkitAudioContext)();
			let square_wave = context.createOscillator();
			let envelope = context.createGain();
			let volume = context.createGain();
			let destination = context.destination;
			let t0 = context.currentTime;

			square_wave.type = "square";
			square_wave.frequency.value = 440 * 4;
			square_wave.detune.value = 0;
			envelope.gain.value = 0.0;
			volume.gain.value = 0.05;

			square_wave
			.connect(envelope)
			.connect(volume)
			.connect(destination)
			;

			// Envelope
			var t1;
			const v = 0.5;
			envelope.gain.setValueAtTime         (0.0, t1 = t0);
			envelope.gain.linearRampToValueAtTime(1.0, t1 = t0 + v * 0.01);
			envelope.gain.linearRampToValueAtTime(0.1, t1 = t0 + v * 0.09);
			envelope.gain.linearRampToValueAtTime(0.0, t1 = t0 + v * 0.50);

			//square_wave.addEventListener('ended', on_ended);
			square_wave.onended = on_ended;
			square_wave.start();
			square_wave.stop(t1);

			console.log('beep:', ++nr_active_sounds);

			function on_ended(event) {
//console.log('on_ended:', nr_active_sounds--);
				square_wave.disconnect(envelope);
				envelope.disconnect(volume);
				volume.disconnect(context.destination);

				context
				= square_wave
				= envelope
				= volume
				= destination
				= null
				;
			}
		});



		// SEND

		self.requestId = 0;

		self.elements.send.addEventListener( 'click', ()=>{

			function execute (data) {
				const command
				= (typeof data == 'string')
				? text_to_request(data)
				: data
				;

				command.tag = ++self.requestId;

				callback.send( command );
				self.elements.input.value = '';
				self.elements.input.focus();
			}

			let text = self.elements.input.value;
			let bang = null;
			const has_bang = BANGS.find( bang => text.charAt(0) == bang );
			if (has_bang) {
				bang = text.charAt(0);
				text = text.slice(1).trim();

				execute( text );
				return;
			}


			text = text.replace(/\s\s+/g, ' ').trim();
			//string.replace(/\s\s+/g, ' ');
			//string.replace(/  +/g, ' ');

/*

			// Syntax: 'session login username:* password:*\tadditional parameter:*'
			// matches: session login username:user password:pass additional parameter:text
			//
			//   session
			//     login
			//       username: user
			//       password: pass
			//     additional
			//       parameter: text

			const COMMAND_SYNTAX = [
				'session login username:* password:*',
				'session login username:* password:* \tlogout',
				'session logout',
				'session status',
				'session who',
			];

			function create_json (command, parameters, syntax) {
				const tokens = {
					command : command.split(' '),
					syntax  : syntax.split(' '),
				};

				let indentation = '';
				let result      = '';

				tokens.command.forEach( (token, index) => {
					result += indentaion + token;

					const has_colon = tokens.syntax[index].indexOf('\t') >= 0;
					const has_tab = tokens.syntax[index].indexOf('\t') >= 0;
					if (has_tab) {
					}
				});
				return text_to_command( result );
			}

			const command = text;
			const valid_request = COMMAND_SYNTAX.find( (syntax, index) => {
				const words      = command.split(' ');
				const parameters = [];
				let synthesized  = '';

				syntax
				.replace('\t', ' ')
				.replace('*', ' *')
				.split(' ').forEach( (token, index)=>{
					if (token == '*') {
						parameters.push( words[index] );
						synthesized += ' ' + words[index];
					} else {
						synthesized += ' ' + token;
					}
				});

				synthesized = synthesized.trim();

				if (synthesized == command) {
					const translated = create_json( command, parameters, syntax );
					execute( translated );
					return true;
				} else {
					return false;
				}
			});

			if (! valid_request) {
				self.print( text, 'request' );
				self.print( 'Malformed request', 'cep' );
			}
*/

			// PARSE MACROS
			const COMMAND_SYNTAX = [
				{
					syntax: 'session login username: * password: *',
					create: (username, password)=>{
						return {
							session: {
								login: {
									username: username,
									password: password,
								},
							},
						};
					},
				},
				{
					syntax: 'session logout',
					create: ()=>{
						return {
							session: {
								logout: {},
							},
						};
					},
				},
				{
					syntax: 'session status',
					create: ()=>{
						return {
							session: {
								status: {},
							},
						};
					},
				},
				{
					syntax: 'session who',
					create: ()=>{
						return {
							session: {
								who: {},
							},
						};
					},
				},
				{
					syntax: 'session kick username: *',
					create: (name)=>{
						return {
							session: {
								kick: {
									username: name,
								},
							},
						};
					},
				},
				{
					syntax: 'session kick address: *',
					create: (address)=>{
						return {
							session: {
								kick: {
									address: address,
								},
							},
						};
					},
				},
				{
					syntax: 'mcp status',
					create: ()=>{
						return {
							mcp: {
								status: {},
							},
						};
					},
				},
				{
					syntax: 'mcp inspect',
					create: (param)=>{
						return {
							mcp: {
								inspect: param,
							},
						};
					},
				},
				{
					syntax: 'mcp inspect reloader',
					create: (param)=>{
						return {
							mcp: {
								inspect: {
									reloader: param,
								},
							},
						};
					},
				},
				{
					syntax: 'mcp restart',
					create: ()=>{
						return {
							mcp: {
								restart: {},
							},
						};
					},
				},
			];


			const request = COMMAND_SYNTAX.find( (request, index)=>{
				const syntax = request.syntax.split(' ');

				const parameters = [];
				let synthesized  = '';
				const words = text.split(' ');
				syntax.forEach( (_, index)=>{
					if (syntax[index] == '*') {
						parameters.push( words[index] );
						synthesized += ' ' + words[index];
					} else {
						synthesized += ' ' + syntax[index];
					}
				});
				synthesized = synthesized.trim();


				if (text == synthesized) {
					const translated = COMMAND_SYNTAX[index].create(...parameters)

					console.log( 'X', text );
					console.log( 'S', synthesized );
					console.log( 'T', translated );
					console.log( 'P', parameters );

					execute( translated );
					return true;
				} else {
					return false;
				}
			});

			if (! request) {
				self.print( text, 'request' );
				self.print( 'Malformed request', 'cep' );
			}
		});


		// DOUBLE CLICK

		//self.elements.input.value = TUTORIAL_SCRIPT[0];
		adjust_textarea();

		function next_script_entry (shift = true) {
			if (!callback.isConnected()) return 'connect: ' + callback.getUrl();
			const script = (shift) ? TUTORIAL_SCRIPT.shift() : TUTORIAL_SCRIPT[0] ;
			return (TUTORIAL_SCRIPT.length > 0) ? script : 'END OF LINE.' ;

		} // next_script_entry

		addEventListener( 'dblclick', (event)=>{
			if (!event.target.closest('.terminal')) return;

			const shift = event.shiftKey;
			const ctrl = event.ctrlKey;
			const alt = event.altKey;

			const connected = callback.isConnected();

			if (event.target.tagName == 'BUTTON') {
				// MACROS

				event.preventDefault();
				const previous_value = self.elements.input.value;

				self.elements.input.value = BUTTON_SCRIPTS[event.target.className];
				self.elements.send.click();
				//self.elements.input.value = previous_value;
				self.elements.input.value = '';

				return;

			} else if (connected && (!shift && !ctrl && !alt)) {
				// SCRIPT

				self.elements.input.value = next_script_entry();

				self.elements.send.click();

				self.elements.input.value = next_script_entry( false );

				adjust_textarea();
				self.elements.input.focus();

				return;

			} else if (connected) {
				// CONNECT

				event.preventDefault();

				const tags    = line => line.slice(0, 5) != 'tag: ';
				const success = line => line.slice(0, 9) != 'success: ';
				self.elements.input.value = event.target.innerHTML
					.split('\n').filter( tags ).filter( success ).join('\n')
				;

				adjust_textarea();
				self.elements.input.focus();

				return;
			}
		});



		// CLOCK

		setInterval( ()=>{
			document.querySelector( '.time').innerText = new Date().toUTCString();

		}, 1000);


		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
