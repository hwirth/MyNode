// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const EXTRA_LINES = 0;
const MIN_LINES = 0;

const BANGS = ['>', ':', '!', '.', ';', '/'];
const BANG = BANGS[0];

const BUTTON_SCRIPTS = {
	'stat'    : BANG + 'session\n\tstatus',
	'root'     : BANG + 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: pass1',
	'sec'     : BANG + 'session\n\tlogin\n\t\tusername: sec\n\t\tpassword: pass2',
	'logout'  : BANG + 'session\n\tlogout',
	'/w'      : BANG + 'session\n\twho',
	'/k root'  : BANG + 'session\n\tkick\n\t\tusername: root',
	'/k sec'  : BANG + 'session\n\tkick\n\t\tusername: sec',
	'mcp'     : BANG + 'mcp\n\tstatus',
	'restart' : BANG + 'mcp\n\trestart',
	/*
	'status'     : 'session\n\tstatus',
	'login root'  : 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: pass1',
	'login sec'  : 'session\n\tlogin\n\t\tusername: sec\n\t\tpassword: pass2',
	'logout'     : 'session\n\tlogout',
	'who'        : 'session\n\twho',
	'kick root'   : 'session\n\tkick\n\t\tusername: root',
	'kick sec'   : 'session\n\tkick\n\t\tusername: sec',
	'mcp status' : 'mcp\n\tstatus',
	'persistent' : 'mcp\n\tstatus\n\t\tpersistent',
	'restart'    : 'mcp\n\trestart',
	*/
};

const TUTORIAL_SCRIPT = [
	BANG + 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: pass1',
	BANG + 'session\n\tstatus',
	BANG + 'mcp\n\tinspect',
	BANG + 'mcp\n\tinspect: reloader',
	BANG + 'mcp\n\tinspect: reloader.persistentData',
	BANG + 'mcp\n\tinspect: reloader.persistentData.session',
	BANG + 'mcp\n\tinspect: reloader.persistentData.session.accounts',
	BANG + 'mcp\n\tstatus',
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

	this.toggle = function () {
		self.elements.console.classList.toggle( 'active' );
		if (self.elements.console.classList.contains( 'active' )) {
			self.elements.input.focus();
		} else {
			self.elements.input.blur();
		}

	}; // toggle


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
		//.replace(/&/g, '&amp;')
		//.replace(/</g, '&lt;')
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
		.split(tokens[++t]).join('<code class="' + cnames[t] + '">' + tokens[t] + '</code>')
		.split('\n')
		.map( line => '<div>'+line+'</div>' )
		.join('')
		;
console.log()
console.log(message_html)
console.log()
		if (message.MCP) class_name = 'mcp'; //...new_element.classList.add( 'mcp' );

		const new_element = document.createElement( 'pre' );
		new_element.className = class_name;
		new_element.innerHTML = message_html;
console.log( 'message_html', message_html );
		//self.elements.console.insertBefore( new_element, self.elements.prompt );
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

		self.history = new History({
			forward : ()=>{},
			back    : ()=>{},
		});

		self.elements = {
			console : new_element,
			output  : new_element.querySelector( '.output' ),
			prompt  : new_element.querySelector( '.prompt' ),
			input   : new_element.querySelector( '.input' ),
			buttons : new_element.querySelector( '.buttons' ),
			send    : new_element.querySelector( '.submit' ),
		};


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

		self.elements.console.addEventListener( 'mousemove', (event)=>{
			if (event.target.classList.contains( 'debug_console' )) {
				self.elements.input.focus();
				accept_click = null;
			}
		});
		self.elements.console.addEventListener( 'mousedown', (event)=>{
			accept_click = event.target.classList.contains( 'debug_console' );
		});
		self.elements.console.addEventListener( 'mouseup', (event)=>{
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


		// SEND

		self.requestId = 0;

		self.elements.send.addEventListener( 'click', ()=>{
			let text = self.elements.input.value.trim();
			const has_bang = cmd => BANGS.filter( b => b == bang ).length > 0;
			let bang = null;
			if (has_bang) {
				bang = text.charAt(0);
				text = text.slice(1).trim();
			}

			if (!bang) {
				event.preventDefault();
				self.elements.input.focus();
				return;
			}

			if (bang == '>') {
				callback.send( text_to_request(text, ++self.requestId) );
				return;
			}


			// PARSE MACROS

			const COMMAND_SYNTAX = [
				{
					syntax: 'session login username: * password: *',
					create: (username, password)=>{
						return {
							tag: ++self.requestId,
							session: {
								login: {
									username: username,
									password: password,
								},
							},
						};
					},
				},{
					syntax: 'session logout',
					create: ()=>{
						return {
							tag: ++self.requestId,
							session: {
								logout: {
								}
							},
						};
					},
				},
			];
/*
	.session login username: sec password: pass2
*/
			const request = COMMAND_SYNTAX.find( (request, index)=>{
				const syntax     = request.syntax.split(' ');
				const parameters = [];
				let synthesized  = '';
				text.split(' ').forEach( (word, index)=>{
					if (syntax[index] == '*') {
						parameters.push( word );
						synthesized += ' ' + word;
					} else {
						synthesized += ' ' + syntax[index];
					}
				});
				synthesized = synthesized.trim();

				const translate = (index, ...params) => COMMAND_SYNTAX[index].create(...params);
				const translated = translate( index, ...parameters );

				console.log( 'X', text );
				console.log( 'S', synthesized );
				console.log( 'P', parameters );
				console.log( 'T', translated );

				if (text == synthesized) {
					callback.send( translated );
					return true;
				} else {
					return false;
				}
			});
		});


		// KEYBOARD

        	self.elements.input.addEventListener( 'keydown', (event)=>{


			if (['Shift', 'Ctrl', 'Alt'].indexOf(event.key) == 0) {
				adjust_textarea();
			}

			if (event.keyCode == 13 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				// Execute command with any modifyer+Enter
				event.preventDefault();
				self.elements.send.click();
				self.elements.input.focus();

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

		['keydown', 'keypress', 'keyup'].forEach( (event_name)=>{
			addEventListener( event_name, (event)=>{
				const shift = event.shiftKey;
				const ctrl = event.ctrlKey;
				const alt = event.altKey;

				const input = self.elements.input;
				const cursor_pos1 = input.selectionStart == 0;
				const cursor_end  = input.selectionStart == input.value.length -1;

				[{ // Keyboard event definitions
					event     : 'keyup',
					key       : 'b',
					modifiers : ctrl && !shift && !alt,
					action    : ()=>{ self.elements.output.classList.toggle('separators') },
				},{
					event     : 'keydown',
					key       : 'd',
					modifiers : ctrl && !shift && !alt,
					action    : self.toggle,
				},{
					event     : 'keydown',
					key       : '#',
					modifiers : ctrl && !shift && !alt,
					action    : self.toggle,
				},{
					event     : 'keyup,keypress,keydown',
					code      : 'BackQuote',
					modifiers : !ctrl && !shift && !alt,
					action    : self.toggle,
				},{
					event     : 'keydown',
					key       : 'ArrowUp',
					modifiers : !ctrl && !shift && !alt && cursor_pos1,
					action    : ()=>{ self.elements.input.value = self.history.back(); },
				},{
					event     : 'keydown',
					key       : 'ArrowDown',
					modifiers : !ctrl && !shift && !alt && cursor_end,
					action    : ()=>{ self.elements.input.value = self.history.forward(); },
				}]
				.forEach( (shortcut)=>{
					const is_key = (event.key === shortcut.key) || (event.code === shortcut.code);
					if (is_key && (shortcut.modifiers)) {
						event.stopPropagation();
						event.preventDefault();
					const is_event = (shortcut.event.split(',').indexOf( event_name ) >= 0);
						if (is_event) {
							shortcut.action( event );
						}
					}
				});

			}, {passive: false} );
		});


		// KEYBOARD BEEP

		let nr_active_sounds = 0;
		addEventListener('keydown', (event) => {

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
				console.log('on_ended:', nr_active_sounds--);
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



		// DOUBLE CLICK

		self.elements.input.value = TUTORIAL_SCRIPT[0];
		adjust_textarea();

		function next_script_entry (shift = true) {
			if (!callback.isConnected()) return 'connect: ' + callback.getUrl();
			const script = (shift) ? TUTORIAL_SCRIPT.shift() : TUTORIAL_SCRIPT[0] ;
			return (TUTORIAL_SCRIPT.length > 0) ? script : 'END OF LINE.' ;

		} // next_script_entry

		addEventListener( 'dblclick', (event)=>{
			if (!event.target.closest('.debug_console')) return;

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
				self.elements.input.value = previous_value;

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


		return Promise.resolve();

	}; // init


	// Initialize the object asynchronously
	// Makes sure, a reference to this instance is returned to  const app = await new Application();
	self.init().then( ()=>self );

}; // DebugConsole


//EOF
