// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const EXTRA_LINES = 4;

export const History = function () {
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

		return self.entries[ self.currentEntry ];

	}; // goBack

	this.forward = function () {
		++self.currentEntry;

		if (self.currentEntry >= self.entries.length) {
			self.currentEntry = 0;
		}

		return self.entries[ self.currentEntry ];

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


export const DebugConsole = function (callbacks) {
	const self = this;

	this.history;

	this.requestToText = request_to_text;
	this.textToRequest = text_to_request;


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


	function text_to_request (text) {
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

		return parse_line( 0 );

	} // text_to_request


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.print = function (message, class_name) {
		const new_element = document.createElement( 'pre' );
		new_element.className = class_name;
		new_element.innerHTML
		= (typeof message == 'string')
		? message
		: request_to_text( message )
		;

		self.elements.console.insertBefore( new_element, self.elements.prompt );
		self.elements.console.scrollBy(0, 99999);

	}; // print


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	function create_markup () {
		return (`
<div class="prompt">
	<textarea class="input" rows="${EXTRA_LINES}"></textarea>
	<div><button class="submit" title="Shortcut: [Shift]+[Enter]">Execute</button></div>
</div>
		`);

	} // create_markup


	this.init = async function () {
		console.log( 'DebugConsole.init' );

		const new_element = document.createElement( 'div' );
		new_element.className = 'debug_console';
		new_element.innerHTML = create_markup();
		document.body.appendChild( new_element );

		self.history = new History();

		self.elements = {
			console : new_element,
			prompt  : new_element.querySelector( '.prompt' ),
			input   : new_element.querySelector( '.input' ),
			send    : new_element.querySelector( '.submit' ),
		};


		function adjust_textarea_height () {
			const lines = self.elements.input.value.split('\n');
			const nr_lines = (lines.length > 0) ? lines.length : 1;
			self.elements.input.rows = nr_lines + EXTRA_LINES;
        	}


		let accept_click = null;
		self.elements.console.addEventListener( 'dblclick', (event)=>{
			if( event.target.classList.contains('request')
			||  event.target.classList.contains('response')
			) {
				event.preventDefault();
				self.elements.input.value = event.target.innerText;
				adjust_textarea_height();
				self.elements.input.focus();
			}
		});
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


		self.elements.input.addEventListener( 'mousemove', ()=>{
			self.elements.input.focus();
		});
		self.elements.input.addEventListener( 'keyup', adjust_textarea_height );
        	self.elements.input.addEventListener( 'keydown', (event)=>{
			adjust_textarea_height();

			if (event.keyCode == 13 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				// Execute command with any modifyer+Enter
				event.preventDefault();
				self.elements.send.click();
				self.elements.input.select();

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


		self.elements.send.addEventListener( 'click', ()=>{
			const text = self.elements.input.value.trim();
			if (! text) {
				event.preventDefault();
				self.elements.input.focus();
				return;
			}
			self.history.add( text );
			callbacks.send( text_to_request(text) );
		});


		addEventListener( 'keydown', (event)=>{
			const shift = event.shiftKey;
			const ctrl = event.ctrlKey;
			const alt = event.altKey;

			// Open/close console with # key
			const number    =  ctrl && !shift && !alt && (event.key == '#');
			const backquote = !ctrl && !shift && !alt && (event.code == 'Backquote');
			if (number || backquote) {
				event.preventDefault();
				self.elements.console.classList.toggle( 'active' );
				if (self.elements.console.classList.contains( 'active' )) {
					self.elements.input.select();
				} else {
					self.elements.input.blur();
				}
			}

			const up   = ctrl && !shift && !alt && (event.key == 'ArrowUp');
			const down = ctrl && !shift && !alt && (event.key == 'ArrowDown');
			if (up) {
				self.elements.input.value = self.history.back();
			}
			if (down) {
				self.elements.input.value = self.history.forward();
			}
		});

		return Promise.resolve();

	}; // init


	// Initialize the object asynchronously
	// Makes sure, a reference to this instance is returned to  const app = await new Application();
	self.init().then( ()=>self );

}; // DebugConsole


//EOF
