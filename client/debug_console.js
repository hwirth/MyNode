// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as DUMMY_SamJs from './samjs.js';

import { SETTINGS, DEBUG } from './config.js';
import { History         } from './history.js';


const CEP_VERSION = 'v0.0.0α';

const EXTRA_LINES = 0;
const MIN_LINES = 0;

const BANGS = ['>', ':', '!', '.', ';', '/'];

const BANG_REQUEST = '';//'>';

const BUTTON_SCRIPTS = {
	'stat'    : BANG_REQUEST + 'session\n\tstatus',
	'root'    : BANG_REQUEST + 'session\n\tlogin\n\t\tusername:root\n\t\tpassword: 12345',
	'user'    : BANG_REQUEST + 'session\n\tlogin\n\t\tusername:user\n\t\tpassword: pass2',
	'out'     : BANG_REQUEST + 'session\n\tlogout',
	'who'     : BANG_REQUEST + 'session\n\twho',
	'kroot'   : BANG_REQUEST + 'session\n\tkick\n\t\tusername: root',
	'kuser'   : BANG_REQUEST + 'session\n\tkick\n\t\tusername: user',
	'MCP'     : BANG_REQUEST + 'mcp\n\tstatus',
	'rst'     : BANG_REQUEST + 'mcp\n\trestart',
};

const TUTORIAL_SCRIPT = [
	BANG_REQUEST + 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345',
	BANG_REQUEST + 'session\n\tstatus',
	BANG_REQUEST + 'mcp\n\tinspect',
	BANG_REQUEST + 'mcp\n\tinspect: reloader.persistentData',
	BANG_REQUEST + 'mcp\n\tstatus',
];


export const DebugConsole = function (callback) {
	const self = this;

	this.history;
	this.audioContext;
	this.toggles;

	this.requestToText = request_to_text;
	this.textToRequest = text_to_request;

	this.requestId;

	const KEYBOARD_SHORTCUTS = [{
		event     : 'keydown',
		key       : 'a',
		modifiers : ['alt'],
		action    : ()=>{ self.toggle( 'animations' ); },
	},{
		event     : 'keydown',
		key       : 'c',
		modifiers : ['alt'],
		action    : ()=>{ self.elements.output.classList.toggle('compressed'); scroll_down(); },
	},{
		event     : 'keydown',
		key       : 'd',
		modifiers : ['alt'],
		action    : ()=>{ self.toggle( 'terminal' ); },
	},{
		event     : 'keydown',
		key       : 'k',
		modifiers : ['alt'],
		action    : ()=>{ self.toggle( 'keyBeep' ); },
	},{
		event     : 'keydown',
		key       : 'm',
		modifiers : ['alt'],
		action    : ()=>{ self.toggle( 'sam' ); },
	},{
		event     : 'keydown',
		key       : 'o',
		modifiers : ['alt'],
		action    : ()=>{ self.elements.terminal.classList.toggle( 'overflow' ); }
	},{
		event     : 'keydown',
		key       : 's',
		modifiers : ['alt'],
		action    : ()=>{ self.elements.output.classList.toggle('separators'); scroll_down(); },
	},{
		event     : 'keydown',
		key       : '#',
		modifiers : ['ctrl'],
		action    : ()=>{ self.toggle( 'terminal' ); },
	},{
		event     : 'keydown',
		key       : 'ArrowUp',
		modifiers : ['cursorPos1'],
		action    : ()=>{ self.history.back(); },
	},{
		event     : 'keydown',
		key       : 'ArrowDown',
		modifiers : ['cursorEnd'],
		action    : ()=>{ self.history.forward(); },
	}];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function scroll_down () {
		self.elements.output.scrollBy(0, 99999);

	} // scroll_down


	function sam_speak (text) {
		if (!self.audioContext) return;
		if (!self.toggles.sam) return;

		if (!self.sam) {
			self.sam = new SamJs({
				singmode : !false,   //false
				pitch    : 50,       //64
				speed    : 72,       //72
				mouth    : 128,      //128
				throat   : 128,      //128
				volume   : 0.1,      //1 I added a volume option to sam.js, but it's not all to pretty
			});
		}

		text
		.split( 'PAUSE' )
		.reduce( async (prev, next, index, parts)=>{
			await prev;
			const part = parts[index].trim();
			return new Promise( async (done)=>{
				if (self.toggles.sam) {
					if (part != '') await self.sam.speak( parts[index] );
					setTimeout( done, 150 );
				} else {
					done();
				}
			});
		}, Promise.resolve());
	}


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
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function adjust_textarea () {
		//...const is_request = (self.elements.input.value.charAt(0) == '>');
		const is_request = (self.elements.input.value.indexOf('\n') >= 0);
		self.elements.input.classList.toggle( 'request', is_request );

		const lines = self.elements.input.value.split('\n');
		const nr_lines = (lines.length > 0) ? lines.length : 1;
		self.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

		self.elements.input.style.height = (self.elements.input.rows + 1) + 'em';

	} // adjust_textarea


	function next_script_entry (shift = true) {
		if (!callback.isConnected()) return 'connect: ' + callback.getURL();
		const script = (shift) ? TUTORIAL_SCRIPT.shift() : TUTORIAL_SCRIPT[0] ;
		return (TUTORIAL_SCRIPT.length > 0) ? script : 'END OF LINE.' ;

	} // next_script_entry


	let accept_click = null;//... still needed?

	function focus_prompt (clear_accept = true) {
		adjust_textarea();
		self.elements.input.focus();

		if (clear_accept) accept_click = null;

	} // focus_prompt


	function on_script_button_click (event) {
		event.preventDefault();
		self.elements.input.value = BUTTON_SCRIPTS[event.target.className];

		adjust_textarea();
		scroll_down();

	} // on_script_button_click


	function on_click (event) {
		if (event.target === self.elements.terminal) focus_prompt();

	} // on_dblclick


	function on_dblclick (event) {
		if (event.target.tagName == 'BODY') return self.toggle( 'terminal' );
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
			//self.elements.input.value = '';
			//focus_prompt();

			return;

		} else if (connected && (!shift && !ctrl && !alt)) {
			// TUTORIAL SCRIPT

			self.elements.input.value = next_script_entry();
			self.elements.send.click();
			self.elements.input.value = next_script_entry( false );

			focus_prompt();

			return;

		}

	} // on_dblclick


	function on_keydown (event) {
		if (['Shift', 'Ctrl', 'Alt'].indexOf(event.key) == 0) {
			adjust_textarea();
		}

		if (event.keyCode == 13 && (!event.shiftKey && !event.ctrlKey && !event.altKey)) {
			// Execute command with any modifyer+Return
			event.preventDefault();
			self.elements.send.click();
		} else if (event.keyCode == 13 && (event.shiftKey || event.ctrlKey || event.altKey)) {
			//  Enter newline
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

	} // on_keydown


	function on_keyboard_event (event) {
		const shift = event.shiftKey;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;

		if ((event.type == 'keydown') && DEBUG.KEYBOARD_EVENTS) {
			console.log( 'KEYDOWN:', 'key:', event.key, 'code:', event.code );
		}

		const input = self.elements.input;
		const cursor_pos1 = (input.value.length == 0) || (input.selectionStart == 0);
		const cursor_end  = (input.value.length == 0) || (input.selectionStart == input.value.length);

		KEYBOARD_SHORTCUTS.forEach( (shortcut)=>{
			const is_key = (event.key == shortcut.key) || (event.code == shortcut.code);
			const is_event = (shortcut.event.split(',')).indexOf( event.type ) >= 0;

			if (is_event && is_key && modifiers(shortcut)) {
				event.stopPropagation();
				event.preventDefault();

				shortcut.action( event );
			}
		});

		function modifiers (shortcut) {
			const modifiers = shortcut.modifiers;
			const requires = {
				shift      : modifiers.indexOf( 'shift'      ) >= 0,
				ctrl       : modifiers.indexOf( 'ctrl'       ) >= 0,
				alt        : modifiers.indexOf( 'alt'        ) >= 0,
				cursorPos1 : modifiers.indexOf( 'cursorPos1' ) >= 0,
				cursorEnd  : modifiers.indexOf( 'cursorEnd'  ) >= 0,
			};

			const ignore_pos1end = true/*
			=  !requires.cursorPos1 && !requires.cursorEnd
			|| input.value.length == 0
			;*/

			const key_matches
			=  (event.shiftKey == requires.shift)
			&& (event.ctrlKey == requires.ctrl)
			&& (event.altKey == requires.alt)
			&& (ignore_pos1end || (cursor_pos1 == requires.cursorPos1))
			&& (ignore_pos1end || (cursor_end == requires.cursorEnd))
			;

			return key_matches;
		}

	} // on_keyboard_event


	let nr_active_sounds = 0;

	function on_keydown_beep (event) {
		if (!SETTINGS.KBD_BEEP) return;
		if (!self.audioContext) return;
		if (!self.toggles.keyBeep) return;

		// Chromium crashes after I type fast for a few seconds
		// Limiting number of sounds does not help:
		if (nr_active_sounds > 5) return;

		const context = self.audioContext;

		let square_wave = context.createOscillator();
		let envelope = context.createGain();
		let volume = context.createGain();
		let destination = context.destination;

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
		const t0 = context.currentTime;
		const v = 0.2;
		var t1;
		envelope.gain.setValueAtTime         (0.0, t1 = t0);
		envelope.gain.linearRampToValueAtTime(1.0, t1 = t0 + v * 0.01);
		envelope.gain.linearRampToValueAtTime(0.1, t1 = t0 + v * 0.10);
		envelope.gain.linearRampToValueAtTime(0.0, t1 = t0 + v * 1.00);

		//square_wave.addEventListener('ended', on_ended);
		square_wave.onended = on_ended;
		square_wave.start();
		square_wave.stop(t1);

		++nr_active_sounds;

		function on_ended(event) {
			square_wave.disconnect(envelope);
			envelope.disconnect(volume);
			volume.disconnect(context.destination);
		/*
			context
			= square_wave
			= envelope
			= volume
			= destination
			= null
			;
		*/
			--nr_active_sounds
		}

	} // on_keydown_beep


	function on_send_click (event) {
		const text = self.elements.input.value.trim();

		const command
		= (text.indexOf('\n') >= 0)
		? text_to_request( text )
		: {
			chat: {
				say: text,
			},
		};

		command.tag = ++self.requestId;
		callback.send( command );

		self.history.add( text );

		self.elements.input.value = '';
		focus_prompt();

	} // on_send_click


	const start_time = new Date();
	function start_clock () {

		function get_formatted_time () {
			return Intl.DateTimeFormat( navigator.language, {
				weekday : 'short',
				year    : 'numeric',
				month   : 'short',
				day     : 'numeric',
				hour    : '2-digit',
				minute  : '2-digit',
				second  : '2-digit',
				//fractionalSecondDigits: '3',
				timeZoneName: ['short', 'shortOffset', 'shortGeneric'][0],
				hour12  : false,

			}).format(new Date());
			//...new Date().toUTCString();
		}

		function current_second () {
			return Math.floor( Date.now() / 1000 );
		}

		function update_clock () {
			if (!true) {
				const elapsed = new Date() - start_time;
				const s180 = Math.floor(elapsed / 1000) % 180;
				const percent = Math.floor(s180 / 1.8)
				document.querySelector( '.time').innerText = percent;
			} else {
				document.querySelector( '.time').innerText = get_formatted_time();
				return current_second();
			}
		}

		let recent_second = 0;
		function narrow_wait () {
			if (current_second() != recent_second) {
				recent_second = update_clock();
				long_wait();
			} else {
				setTimeout( narrow_wait );
			}
		}

		function long_wait () {
			const remaining_ms = 1000 - Date.now() % 1000;
			setTimeout( narrow_wait, remaining_ms - 50 );
		}

		long_wait();

	} // on_clock_interval


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggle = function (item) {
		switch (item) {
			case 'animations': {
				const is_enabled = self.elements.html.classList.toggle( 'animate' );
				self.elements.animations.classList.toggle( 'enabled', is_enabled );
				break;
			}
			case 'keyBeep': {
				self.toggles.keyBeep = !self.toggles.keyBeep;
				self.elements.keyBeep.classList.toggle( 'enabled', self.toggles.keyBeep );
				break;
			}
			case 'sam': {
				self.toggles.sam = !self.toggles.sam;
				self.elements.sam.classList.toggle( 'enabled', self.toggles.sam );
				break;
			}
			case 'terminal': {
				const is_enabled = self.elements.terminal.classList.toggle( 'active' );
				if (is_enabled) focus_prompt();
				break;
			}
			default: {
				console.log( 'DebugConsole.toggle: Unknown item:', item );
				throw new Error( 'DebugConsole.toggle: Unknown item' );
			}
		}

	}; // toggle


	this.toggleConsole = function (event) {
		self.elements.terminal.classList.toggle( 'active' );
		if (self.elements.terminal.classList.contains( 'active' )) {
			focus_prompt();
		} else {
			self.elements.input.blur();
		}

	}; // toggle


	this.print = function (message, class_name) {
		let t = -1;
		const class_names = [
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
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')//...
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split(tokens[++t]).join('<code class="' + class_names[t] + '">' + tokens[t] + '</code>')
		.split('\n')
		.map( line => '<div>' + line + '</div>' )
		.join('')
		;

		if (message.MCP) class_name = 'mcp'; //...new_element.classList.add( 'mcp' );

		const new_element = document.createElement( 'pre' );
		new_element.className = class_name;
		new_element.innerHTML = message_html;

		//self.elements.terminal.insertBefore( new_element, self.elements.prompt );
		self.elements.output.appendChild( new_element );
		scroll_down();

		const allowed = 'abcdefghijklmnopqrstuvwxyz012345678 ';
		sam_speak(
			JSON.stringify( message )
			.trim()
			.replace( /: /g , ' ' )
			.replace( /,/g  , ' ' )
			.replace( /\n/g , 'PAUSE'   )
			.replace( /\./g , ' dot '   )
			.replace( /:/g  , ' colon ' )
			.split('')
			.filter( char => allowed.indexOf(char.toLowerCase()) >= 0)
			.join('')
		);

	}; // print


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugConsole.init' );

		self.toggles = {
			animations : true,
			keyBeep    : true,
			sam        : true,
		};

		document.body.innerHTML = (`
<main class="terminal">
	<form class="menu">
		<section class="buttons">
		</section>
		<section class="toggles">
			<button class="key_beep enabled"   title="Keyboard beep [Alt]+[K]">Kbd</button>
			<button class="sam enabled"        title="Software Automatic Mouth [Alt]+[M]">SAM</button>
			<button class="animations enabled" title="Animations [Alt]+[A]">Anim</button>
		</section>
	</form>
	<section class="output"></section>
	<textarea class="input"></textarea>
	<form class="status">
		<section>
			<button class="submit" title="Shortcut: [Enter]">Run</button>
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

		const container = document.querySelector( '.terminal' );
		self.elements = {
			html       : document.querySelector( 'html' ),
			terminal   : container,
			menu       : container.querySelector( 'form.menu'   ),
			output     : container.querySelector( '.output'     ),
			prompt     : container.querySelector( '.prompt'     ),
			input      : container.querySelector( '.input'      ),
			status     : container.querySelector( 'form.status' ),
			buttons    : container.querySelector( '.buttons'    ),
			send       : container.querySelector( '.submit'     ),
			keyBeep    : container.querySelector( '.key_beep'   ),
			sam        : container.querySelector( '.sam'        ),
			animations : container.querySelector( '.animations' ),
		};

		self.history = new History( self.elements.input, {
			onInputChanged: ()=>{
				adjust_textarea();
				scroll_down();
			},
		});


		function activate_audio () {
			self.audioContext = new(window.AudioContext || window.webkitAudioContext)();
			if (self.audioContext.state == 'suspended') self.audioContext.resume();
			removeEventListener( 'keyup', activate_audio );
			removeEventListener( 'mouseup', activate_audio );
		}
		addEventListener( 'keypress', activate_audio );
		addEventListener( 'mouseup', activate_audio );


		// Disable <form> submission
		self.elements.terminal.querySelectorAll( 'form' ).forEach( (form)=>{
			form.addEventListener( 'submit', event => event.preventDefault() );
		});


		// Create buttons
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


		// Button: SEND
		self.requestId = 0;
		self.elements.send.addEventListener( 'click', on_send_click );


		// Buttons: Toggles
		self.elements.sam       .addEventListener( 'click', ()=>self.toggle('sam')        );
		self.elements.animations.addEventListener( 'click', ()=>self.toggle('animations') );
		self.elements.keyBeep   .addEventListener( 'click', ()=>self.toggle('keyBeep')    );


		// REFOCUS PROMPT
		self.elements.terminal.addEventListener( 'mouseup'   , focus_prompt );
		self.elements.terminal.addEventListener( 'mousemove' , ()=>focus_prompt(false) );
		self.elements.input.addEventListener( 'change'    , adjust_textarea );
		self.elements.input.addEventListener( 'input'     , adjust_textarea );
		self.elements.input.addEventListener( 'keyup'     , adjust_textarea );


		// CLICK, DOUBLE CLICK
		//...self.elements.input.value = TUTORIAL_SCRIPT[0];
		//addEventListener( 'click', on_click );
		addEventListener( 'dblclick', on_dblclick );


		// KEYBOARD
		addEventListener('keydown', on_keydown_beep );
		['keydown', 'keypress', 'keyup' ].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);
        	self.elements.input.addEventListener( 'keydown', on_keydown );


	/*
		function on_input_change () {
			adjust_textarea();
			scroll_down();
		}
		self.elements.input.addEventListener( 'input', on_input_change );
		self.elements.input.addEventListener( 'chante', on_input_change );
	*/


		// CLOCK
		start_clock();

		self.print( 'CEP-' + CEP_VERSION + '^acdos READY.\n', 'cep' );
		self.print( 'connect: ' + callback.getURL(), 'request' );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
