// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const EXTRA_LINES = 0;
const MIN_LINES = 0;

const BANGS = [':', '>', '!'];
const BANG = BANGS[0];

const BUTTON_SCRIPTS = {
	'stat'    : BANG + 'session\n\tstatus',
	'hmw'     : BANG + 'session\n\tlogin\n\t\tusername: hmw\n\t\tpassword: pass1',
	'sec'     : BANG + 'session\n\tlogin\n\t\tusername: sec\n\t\tpassword: pass2',
	'logout'  : BANG + 'session\n\tlogout',
	'/w'      : BANG + 'session\n\twho',
	'/k hmw'  : BANG + 'session\n\tkick\n\t\tusername: hmw',
	'/k sec'  : BANG + 'session\n\tkick\n\t\tusername: sec',
	'mcp'     : BANG + 'mcp\n\tstatus',
	'restart' : BANG + 'mcp\n\trestart',
	/*
	'status'     : 'session\n\tstatus',
	'login hmw'  : 'session\n\tlogin\n\t\tusername: hmw\n\t\tpassword: pass1',
	'login sec'  : 'session\n\tlogin\n\t\tusername: sec\n\t\tpassword: pass2',
	'logout'     : 'session\n\tlogout',
	'who'        : 'session\n\twho',
	'kick hmw'   : 'session\n\tkick\n\t\tusername: hmw',
	'kick sec'   : 'session\n\tkick\n\t\tusername: sec',
	'mcp status' : 'mcp\n\tstatus',
	'persistent' : 'mcp\n\tstatus\n\t\tpersistent',
	'restart'    : 'mcp\n\trestart',
	*/
};

const SPEED_SCRIPT = [
	BANG + 'session\n\tlogin\n\t\tusername: hmw\n\t\tpassword: pass1',
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
		const message_html = (typeof message == 'string')
		? message
		: request_to_text( message )
		;

		if (message.MCP) class_name = 'mcp'; //...new_element.classList.add( 'mcp' );

		const new_element = document.createElement( 'pre' );
		new_element.className = class_name;
		new_element.innerHTML = message_html;

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
			const has_bang = cmd => BANGS.filter( bang => text.charAt(0) == bang ).length > 0;
			if (has_bang) text = text.slice(1).trim();

console.log( 'TX', text );

			if (!text) {
				event.preventDefault();
				self.elements.input.focus();
				return;
			}

			if (!has_bang) {
				callback.send( text_to_request(text, ++self.requestId) );
				return;
			}


			// PARSE MACROS

// :session login username: sec password: pass2
			const command_syntax = [
				{
					syntax: 'session login username: * password: *',
					create: (username, password)=>{ return {
						session: {
							login: {
								username: username,
								password: password,
							}
						},
					}},
				},
			];

			const request = command_syntax.find( (request, index)=>{
				const syntax     = request.syntax.split(' ');
				const parameters = [];
				let synthesized  = '';
				text.split(' ').forEach( (word, index)=>{
					if (syntax[index] == '*') parameters.push( word );
					synthesized += ' ' + word;
				});
				synthesized = synthesized.trim();

				const translate = (index, ...params) => command_syntax[index].create(...params);
				const translated = translate( index, ...parameters );

				console.log( text );
				console.log( synthesized );

				if (text == synthesized) {
					translated.tag = ++self.requestId;
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


		// DOUBLE CLICK

		self.elements.input.value = SPEED_SCRIPT[0];
		adjust_textarea();

		function next_script_entry (shift = true) {
			if (!callback.isConnected()) return 'connect: ' + callback.getUrl();
			const script = (shift) ? SPEED_SCRIPT.shift() : SPEED_SCRIPT[0] ;
			return (SPEED_SCRIPT.length > 0) ? script : 'END OF LINE.' ;

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
