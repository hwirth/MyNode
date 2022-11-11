// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

// This is a node module or something. It installs itself under window.SamJs and cannot be imported normally
// I think a bundler would change that, but this is from the /dist folder!? I also added a volume option
import * as DUMMY_SamJs from './samjs.js';

import { SETTINGS, PRESETS, DEBUG } from './config.js';
import { History                  } from './history.js';


let CEP_VERSION = 'v0.2.2α';   // Keyboard shortcuts will be appended in  self.init()

const EXTRA_LINES = 0;
const MIN_LINES = 0;

const BANGS = ['>', ':', '!', '.', ';', '/'];

const BANG_REQUEST = '';//'>';//... Now multline == JSON request
const BANG_CEP     = '.';

const BUTTON_SCRIPTS = {
	'login'      : BANG_REQUEST //+ 'session\n\tlogin\n\t\tusername:%u\n\t\tpassword:%p\n\t\tsecondFactor:%t\n\tstatus',
		+ (`
session
	login
		username: %u
		password: %p
		secondFactor: %t
%N
		`).trim(),
	'as root'    : BANG_REQUEST //...+ 'session\n\tlogin\n\t\tusername:root\n\t\tpassword: 12345\n\tstatus',
		+ (`
session
	login
		username: root
		password: 12345
	status
		`).trim(),
	'as guest'    : BANG_REQUEST //...+ 'session\n\tlogin\n\t\tusername:user\n\t\tpassword: pass2\n\tstatus',
		+ (`
session
	login
		username: guest
		`).trim(),
	'logout'     : BANG_REQUEST + 'session\n\tlogout',
	'status'     : BANG_REQUEST + 'session\n\tstatus',
	'who'        : BANG_REQUEST + 'session\n\twho',
	'kroot'      : BANG_REQUEST + 'session\n\tkick\n\t\tusername: root',
	'kuser'      : BANG_REQUEST + 'session\n\tkick\n\t\tusername: user',
	'MCP'        : BANG_REQUEST + 'mcp\n\tstatus',
	'reset'      : BANG_REQUEST + 'mcp\n\trestart\n\t\ttoken: ',
	'token'      : BANG_REQUEST + 'mcp\n\ttoken',
	'clear'      : BANG_CEP + 'clear',
	'help'       : BANG_CEP + 'help',
	'connect'    : BANG_CEP + 'connect: ' + SETTINGS.WS_URL,
	'disconnect' : BANG_CEP + 'disconnect',
};

const BUTTON_DECORATE_CLASSNAME = ['login', 'logout', 'who', 'token', 'clear', 'help', 'connect', 'disconnect'];

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
		key       : 'f',
		modifiers : ['alt'],
		action    : ()=>{ self.toggle( 'fancy' ); },
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

	function focus_prompt (clear_accept = true) {
		adjust_textarea();
		self.elements.input.focus();

	} // focus_prompt


	function adjust_textarea () {
		const is_request = (self.elements.input.value.indexOf('\n') >= 0);
		self.elements.input.classList.toggle( 'request', is_request );

		const lines = self.elements.input.value.split('\n');
		const nr_lines = (lines.length > 0) ? lines.length : 1;
		self.elements.input.rows = Math.max( MIN_LINES, nr_lines + EXTRA_LINES );

		self.elements.input.style.height = (self.elements.input.rows + 1) + 'em';

	} // adjust_textarea


	function scroll_down () {
		self.elements.output.scrollBy(0, 99999);

	} // scroll_down


	function show_file (file_name) {
		fetch( file_name ).then( (response)=>{
			if (! response.ok) {
				throw new Error( 'HTTP error, status = ' + response.status );
			}
			return response.text();   // returns a Promise

		}).then( (new_text)=>{
			self.print(
				'CEP-' + CEP_VERSION + '\n'
				+ new_text.split( '//EOF' )[0].trim()
				,
				'cep',
			);
		});

	} // show_file


	function next_script_entry (shift = true) {
		if (!callback.isConnected()) return 'connect: ' + SETTINGS.WS_URL;
		const script = (shift) ? TUTORIAL_SCRIPT.shift() : TUTORIAL_SCRIPT[0] ;
		return (TUTORIAL_SCRIPT.length > 0) ? script : 'END OF LINE.' ;

	} // next_script_entry


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
				volume   : 0.1,      //1 I added a volume option to sam.js, but it's not all too pretty
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

	} // sam_speak


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONVERT USER INPUT <--> JSON
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function request_to_text (request, indentation = '') {
		let text = '';

		Object.keys( request ).forEach( (key)=>{
			if ((typeof request[key] == 'object') && (request[key] !== null)) {
				text
				+= indentation + key + '\n'
				+  request_to_text( request[key], indentation + '\t' )
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
			let i = 0;
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
				console.log( 'text_to_request: parts.length == 0' );
			}

			return parse_line( index + 1, current_indentation );
		}

	} // text_to_request


	function parse_button_script (script) {
		const username = self.elements.userName.value;
		const nickname = self.elements.nickName.value;
		if (nickname && !username) self.elements.userName.value = 'guest';
		const second_factor = self.elements.secondFactor.value || 'null';
		script = script.replaceAll( '\n%N', (self.elements.nickName.value) ? '\nchat\n\tnick: %n' : '' );
		return (
			script
			.replaceAll( '%u', username )
			.replaceAll( '%n', nickname )
			.replaceAll( '%p', self.elements.passWord.value || 'null' )
			.replaceAll( '%t', second_factor )
			.split('\n')
			.filter( line => line.indexOf('password: null') < 0 )
			.filter( line => line.indexOf('secondFactor: null') < 0 )
			.join('\n')
		);

	} // parse_button_script


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_script_button_click (event) {
		event.preventDefault();
		self.elements.input.value = parse_button_script( BUTTON_SCRIPTS[event.target.className] );

		adjust_textarea();
		scroll_down();

	} // on_script_button_click


	function on_input_change () {
		adjust_textarea();
		scroll_down();

	} // on_input_change


	function on_click (event) {
		//...if (event.target === self.elements.terminal) focus_prompt();

	} // on_dblclick


	function on_dblclick (event) {
		if (event.target.tagName == 'BODY') return self.toggle( 'terminal' );

		const shift = event.shiftKey;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;

		const connected        = callback.isConnected();
		const commands_clicked = event.target.closest('.terminal .commands');
		const button_clicked   = event.target.tagName == 'BUTTON';

		if (commands_clicked && button_clicked) {
			// MACROS
			event.preventDefault();
			const previous_value = self.elements.input.value;
			self.elements.input.value = parse_button_script( BUTTON_SCRIPTS[event.target.className] );
			self.elements.send.click();

		} else if (connected && (!shift && !ctrl && !alt)) {
			// TUTORIAL SCRIPT
			self.elements.input.value = next_script_entry();
			self.elements.send.click();
			self.elements.input.value = next_script_entry( false );
			focus_prompt();

		} else {
			focus_prompt();
		}

	} // on_dblclick


	function on_keydown (event) {//... Move to  on_keyboard_event
		if ((event.keyCode == 13) && (!event.shiftKey && !event.ctrlKey && !event.altKey)) {
			//... Do nothing, let user enter newline

		} else if ((event.keyCode == 13) && (event.shiftKey || event.ctrlKey || event.altKey)) {
			// Execute command with any modifyer+Return
			event.preventDefault();
			self.elements.send.click();

		} else if (event.keyCode == 9 || event.which == 9) {
			// Insert TAB character instead of leaving the textarea
			event.preventDefault();

			const input           = self.elements.input;
			const selection_start = input.selectionStart;
			const before          = input.value.substring( 0, input.selectionStart );
			const after           = input.value.substring( input.selectionEnd )

			input.value           = before + '\t' + after;
			input.selectionEnd    = selection_start + EXTRA_LINES + 1;
		}

	} // on_keydown


	function on_keyboard_event (event) {
		if ((event.type == 'keydown') && DEBUG.KEYBOARD_EVENTS) {
			console.log( 'KEYDOWN:', 'key:', event.key, 'code:', event.code );
		}

		const input = self.elements.input;
		const cursor_pos1 = (input.value.length == 0) || (input.selectionStart == 0);
		const cursor_end  = (input.value.length == 0) || (input.selectionStart == input.value.length);

		KEYBOARD_SHORTCUTS.forEach( (shortcut)=>{
			const is_key = (event.key == shortcut.key) || (event.code == shortcut.code);
			const is_event = (shortcut.event.split( ',' )).indexOf( event.type ) >= 0;

			if (is_event && is_key && modifiers( shortcut )) {
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

			const ignore_pos1end
			=  !requires.cursorPos1 && !requires.cursorEnd
			|| (input.value.length == 0)
			;

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
		if (!SETTINGS.KEYBOARD_BEEP) return;
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
		envelope.gain.setValueAtTime         ( 0.0, t1 = t0 );
		envelope.gain.linearRampToValueAtTime( 1.0, t1 = t0 + v * 0.01 );
		envelope.gain.linearRampToValueAtTime( 0.1, t1 = t0 + v * 0.10 );
		envelope.gain.linearRampToValueAtTime( 0.0, t1 = t0 + v * 1.00 );

		//square_wave.addEventListener('ended', on_ended);
		square_wave.onended = on_ended;
		square_wave.start();
		square_wave.stop(t1);

		++nr_active_sounds;

		function on_ended (event) {
			square_wave.disconnect( envelope );
			envelope.disconnect( volume );
			volume.disconnect( context.destination );
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


	async function on_send_click (event) {

// LOCAL COMMAND /////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function perform_local (command) {
			if (command.charAt(0) != BANG_CEP) return false;

			self.print( command, 'request' );

			const token     = command.split(':')[0].slice(1);
			const parameter = command.slice( token.length + 1 );

			switch (token) {
			case 'connect':
				callback.connect( parameter.slice(2) || SETTINGS.WS_URL );
				break;
			case 'disconnect':
				self.elements.connection.classList = 'connection_status warning';
				self.elements.connection.innerText = 'Offline';//... Needs callback
				self.elements.title = '';
				callback.disconnect();
				break;
			case 'clear'  :  self.elements.output.innerHTML = '';  break;
			case 'help'   :  show_file( 'help.txt' );              break;
			case 'issue'  :  show_file( 'issue.txt' );             break;
			case 'readme' :  show_file( 'README'   );              break;
			case 'music':
				document.body.innerHTML += (`
<footer class="main_menu">
	<a href="//spielwiese.central-dogma.at:443/" title="Load this page via Apache">Apache</a>
	<a href="//spielwiese.central-dogma.at:1337/" title="Load this page directly from Node">Node</a>
</footer>
<iframe
	style="position:absolute; top:0; left:0; z-index:1000; width:100px; height:70px; overflow:hidden;"
	width="560" height="315"
	src="https://www.youtube.com/embed/gXBuEcue9tE"
	title="YouTube video player"
	frameborder="0"
	allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
	allowfullscreen
	autoplay="true"
></iframe>
		`);
				break;
			default:
				self.elements.connection.classList = 'connection_status error';
				self.elements.connection.innerText = 'Error';
				self.elements.title = 'Unknown command in perform_local()';
				self.print( 'Unrecognized command', 'cep' );
				throw new Error( 'DebugConsole-on_send_click-perform_local: Unrecognized command' );
			}

			return true;
		}

// JSON REQUEST //////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function send_json (text) {
			// Multiline command: JSON request

			const request
			= (text.indexOf('\n') >= 0)
			? text_to_request( text )
			: {
				chat: {
					say: text,
				},
			};

			if (SETTINGS.AUTO_APPEND_TAGS) request.tag = ++self.requestId;
			callback.send( request );

		}


		const text = self.elements.input.value.trim();
		const is_local  = perform_local( text );

		if (!is_local) {
			const max_attempts = 10;
			let nr_attempts = 0;

			async function connection_established (Xnr_attempts = 0) {
				if (callback.isConnected()) {
					return Promise.resolve();
				} else if (nr_attempts > max_attempts) {
					return Promise.reject();
				} else {
					self.print( 'Attempt nr. ' + (nr_attempts++) )

					return new Promise( (done)=>{
						setTimeout( async ()=>{
							if (callback.isConnected()) return done();
							await connection_established().catch( (error)=>{
								return connection_established();
							});
							done();
						}, SETTINGS.TIMEOUT.RECONNECT*10 );
					});
				}
			}

			if (!callback.isConnected()) {
				self.print( 'Connecting to ' + SETTINGS.WS_URL, 'cep' );

				await callback.connect();  //...! Doesn't wait for onConnect
				while ((nr_attempts++ < max_attempts) && !callback.isConnected()) {
					await new Promise( (done)=>{
						setTimeout( done, SETTINGS.TIMEOUT.RECONNECT );
					});
				}
			}

			if (nr_attempts == max_attempts) {
				self.print( 'Aborting auto-connect', 'cep' );
			}

			if (callback.isConnected()) {
				send_json( text );
			} else {
				await new Promise( (done)=>{
					setTimeout( ()=>{
						if (callback.isConnected()) {
							send_json( text );
						} else {
							//...self.print( text, 'request' );
							self.print( 'Not connected', 'error' );
						}
						done();
					}, SETTINGS.TIMEOUT.RECONNECT);
				});
			}
		}

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


	this.onSocketOpen = function () {
		self.elements.connection.classList = 'connection_status success';
		self.elements.connection.innerText = 'Connected';
		self.elements.title = SETTINGS.WS_URL;

		self.elements.terminal.classList.add( 'connected' );

	}; // onSocketConnect


	this.onSocketClose = function () {
		self.elements.connection.classList = 'connection_status warning';
		self.elements.connection.innerText = 'Offline';
		self.elements.title = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketClose


	this.onSocketError = function () {
		self.onSocketClose();
		self.elements.connection.classList = 'connection_status error';
		self.elements.connection.innerText = 'Error';
		self.elements.title = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketError


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggle = function (item, new_state = null) {
		switch (item) {
			case 'animations': {
				self.toggles.animations = (new_state !== null) ? new_state : !self.toggles.animations;
				self.elements.animations.classList.toggle( 'enabled', self.toggles.animations );
				self.elements.html.classList.toggle( 'animate', self.toggles.animations );
				break;
			}
			case 'compressed': {
				self.toggles.compressed = (new_state !== null) ? new_state : !self.toggles.compressed;
				//...self.elements.compressed.classList.toggle( 'enabled', self.toggles.compressed );
				self.elements.output.classList.toggle( 'compressed', self.toggles.compressed );
				break;
			}
			case 'fancy': {
				self.toggles.fancy = (new_state !== null) ? new_state : !self.toggles.fancy;
				self.elements.fancy.classList.toggle( 'enabled', self.toggles.fancy );
				self.elements.terminal.classList.toggle( 'fancy', self.toggles.fancy );
				break;
			}
			case 'keyBeep': {
				self.toggles.keyBeep = (new_state !== null) ? new_state : !self.toggles.keyBeep;
				self.elements.keyBeep.classList.toggle( 'enabled', self.toggles.keyBeep );
				break;
			}
			case 'separators': {
				self.toggles.separators = (new_state !== null) ? new_state : !self.toggles.separators;
				//...self.elements.separators.classList.toggle( 'enabled', self.toggles.separators );
				self.elements.output.classList.toggle( 'separators', self.toggles.separators );
				break;
			}
			case 'sam': {
				self.toggles.sam = (new_state !== null) ? new_state : !self.toggles.sam;
				self.elements.sam.classList.toggle( 'enabled', self.toggles.sam );
				break;
			}
			case 'close': // fall through
			case 'terminal': {
				const is_enabled
				= (new_state !== null)
				? new_state
				: self.elements.terminal.classList.toggle( 'active' )
				;
				self.elements.terminal.classList.toggle( 'active', is_enabled );
				if (is_enabled) focus_prompt();
				break;
			}
			default: {
				console.log( 'DebugConsole.toggle: Unknown item:', item );
				throw new Error( 'DebugConsole.toggle: Unknown item' );
			}
		}

	}; // toggle


	this.print = function (message, class_name = null) {
		// Sanitize and colorize
		let t = -1;
		const class_names = [
			'slash', 'period', 'colon', 'semi','curlyO',
			'bracketO', 'parensO', 'parensC', 'bracketC','curlyC',
			'true', 'false', 'null'
		];
		const tokens = [
			'/', '.', ':', ';', '{',
			'[', '(', ')', ']', '}',
			'true', 'false', 'null',
		];

		let message_html = (
			(typeof message == 'string')
			? message
			: request_to_text( message )
		)
		.replaceAll( '&lt;', '###lt###' )
		.replaceAll( '&gt;', '###gt###' )
		.replaceAll( '&amp;', '###amp###' )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;'  )
		//... .replaceAll( ': ', ':\t' )
		;

		tokens.forEach( (token, index)=>{
			const html = '<code class="' + class_names[index] + '">' + token + '</code>';
			message_html = message_html.replaceAll( token, html );
		});

		message_html = message_html
		.replaceAll( '###amp###', '&amp;' )
		.replaceAll( '###gt###', '&gt;' )
		.replaceAll( '###lt###', '&lt;' )
		.split('\n')
		.map( line => '<div>' + line.replaceAll('\\n', '\n') + '</div>' )   // '\\n' for .readme
		.join('')
		;

		// Create DOM element
		const new_element = document.createElement( 'pre' );
		if (class_name) new_element.className = class_name;
		new_element.innerHTML = message_html;

		self.elements.output.appendChild( new_element );
		scroll_down();

		// Visualize/sonifiy success
		if (message.response && (typeof message.response.success != 'undefined')) {
			const success = message.response.success ? 'yes' : 'no';

			if (!self.elements.terminal.classList.contains('no') || (success == 'yes')) {
				self.elements.terminal.classList.add( success );
			}
			setTimeout( ()=>{
				self.elements.terminal.classList.remove( 'yes' );
				self.elements.terminal.classList.remove( 'no' );
			}, SETTINGS.TIMEOUT.BIT_ANSWER_COLOR);

			setTimeout( ()=>{
				sam_speak( success );
			}, SETTINGS.TIMEOUT.BIT_ANSWER_SOUND * (message.response.request-1) );
		}

		if (message.broadcast && (typeof message.broadcast.success != 'undefined')) {
			sam_speak( message.broadcast.success ? 'yes' : 'no' );
		}
	/*
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 ';
		const allowed = char => chars.indexOf(char.toLowerCase()) >= 0;
		sam_speak(
			JSON.stringify( message, null, '\t' )
			.trim()
			.replace( /: /g , ' '           )
			.replace( /,/g  , ' '           )
			.replace( /\t/g , ' '           )
			.replace( /\n/g , 'PAUSE PAUSE' )
			.replace( /=/g  , ' equals '    )
			.replace( /\//g , ' slash '     )
			.replace( /\\/g , ' backslash ' )
			.replace( /\./g , ' dot '       )
			.replace( /:/g  , ' colon '     )
			.split('')
			.filter( allowed )
			.join('')
		);
	*/

	}; // print


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugConsole.init' );

		document.body.innerHTML += (`
<form class="Xactive terminal">
	<nav class="controls">
		<section class="toggles">
			<button class="animations" title="Animations [Alt]+[A]">A</button>
			<button class="fancy"      title="Fancy styling [Alt]+[F]">F</button>
			<button class="key_beep"   title="Keyboard beep [Alt]+[K]">K</button>
			<button class="sam"        title="Software Automatic Mouth [Alt]+[M]">SAM</button>
		</section>
		<section>
			<button class="close"      title="Minimize terminal [Alt]+[D]">Exit</button>
		</section>
	</nav>
	<output></output>
	<textarea></textarea>
	<nav class="status">
		<section>
			<span class="connection warning">OFFLINE</span>
			<span class="time">12:23:02.2</span>
		</section>
		<section class="main_menu">
			<section class="commands">
				<!-- h2 class="cep">CEP</h2 -->
				<input type="text" placeholder="Username">
				<input type="text" placeholder="Nickname">
				<input type="password" placeholder="Password">
				<input type="password" placeholder="Factor 2">
			</section>
			<button class="submit" title="Shortcut: [Return]. [Shift]+[Return] inserts a newline">Enter</button>
		</section>
	</nav>
</form>
		`).trim();

		const container = document.querySelector( '.terminal' );
		self.elements = {
			html         : document.querySelector( 'html' ),
			terminal     : container,
			connection   : container.querySelector( '.connection' ),
			controls     : container.querySelector( '.controls'   ),
			commands     : container.querySelector( '.commands'   ),
			output       : container.querySelector( 'output'      ),
			input        : container.querySelector( 'textarea'    ),
			userName     : container.querySelector( '[placeholder=Username]'   ),
			nickName     : container.querySelector( '[placeholder=Nickname]'   ),
			passWord     : container.querySelector( '[placeholder=Password]'   ),
			secondFactor : container.querySelector( '[placeholder="Factor 2"]' ),
			close        : container.querySelector( '.close'      ),
			send         : container.querySelector( '.submit'     ),
			animations   : container.querySelector( '.animations' ),
			connection   : container.querySelector( '.connection' ),
			fancy        : container.querySelector( '.fancy'      ),
			keyBeep      : container.querySelector( '.key_beep'   ),
			sam          : container.querySelector( '.sam'        ),
			status       : container.querySelector( '.status'     ),
		};

		self.history = new History( self.elements.input, {
			onInputChanged: ()=>{
				adjust_textarea();
				scroll_down();
			},
		});


		// Disable <form> submission
		self.elements.terminal.addEventListener( 'submit', event => event.preventDefault() );


		// Resume audio context after page load
		function activate_audio () {
			self.audioContext = new(window.AudioContext || window.webkitAudioContext)();
			if (self.audioContext.state == 'suspended') self.audioContext.resume();
			removeEventListener( 'keyup', activate_audio );
			removeEventListener( 'mouseup', activate_audio );
		}
		addEventListener( 'keypress', activate_audio );
		addEventListener( 'mouseup', activate_audio );


		// MAIN MENU Create macro buttons
		Object.keys( BUTTON_SCRIPTS ).forEach( (key, index)=>{
			const name = key.charAt(0).toUpperCase() + key.slice(1);
			const new_button = document.createElement( 'button' );

			//...if (BUTTON_DECORATE_CLASSNAME.indexOf(key) >= 0)
			new_button.className = key;

			const hue = Math.floor(360 / Object.keys(BUTTON_SCRIPTS).length * index);
			const css = 'hue-rotate(' + hue + 'deg)';

			//new_button.className    = key;
			new_button.innerText    = name;
			new_button.title        = 'Double click to execute immediately';
			//...new_button.style.filter = css;
			new_button.addEventListener( 'click', on_script_button_click );
			self.elements.commands.appendChild( new_button );
		});


		// Button: Send
		self.requestId = 0;
		self.elements.send.addEventListener( 'click', on_send_click );


		// Buttons: Toggles
		self.toggles = {
			animations : PRESETS.ANIMATIONS,
			compressed : PRESETS.COMPRESSED,
			fancy      : PRESETS.FANCY,
			keyBeep    : PRESETS.KEYBOARD_BEEP,
			separators : PRESETS.SEPARATORS,
			sam        : PRESETS.SAM,
			close      : PRESETS.TERMINAL,
		};
		Object.keys( self.toggles ).forEach( (key)=>{
			if (self.elements[key]) {
				self.elements[key].addEventListener( 'click', ()=>self.toggle( key ) );
			}
			self.toggle( key, self.toggles[key] );
		});


		// Keyboard
		addEventListener('keydown', on_keydown_beep );
		addEventListener('keydown', (event)=>{//...? Where is chat/json? unify
			const enabled = (self.elements.input.value.charAt(0) == '.');
			self.elements.input.classList.toggle( 'local', enabled )
		});
        	self.elements.input.addEventListener( 'keydown', on_keydown );
		['keydown', 'keypress', 'keyup' ].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);


		// Login form
		self.elements.login = self.elements.terminal.querySelector( '.login' );
		self.elements.terminal.querySelectorAll( '.commands input' ).forEach( (input)=>{
			input.addEventListener( 'input'  , ()=>self.elements.login.click() );
			input.addEventListener( 'change' , ()=>self.elements.login.click() );
		});
		self.elements.commands.addEventListener( 'keydown', (event)=>{
			if (event.keyCode == 13) self.elements.send.click();
		});


		// Re-focus prompt
		self.elements.input.addEventListener( 'keyup'     , adjust_textarea );
		self.elements.input.addEventListener( 'input'     , on_input_change );
		self.elements.input.addEventListener( 'change'    , on_input_change );

		self.elements.terminal.addEventListener( 'click', (event)=>{
			if( (event.target === self.elements.terminal)
			//...? no effect:   ||  (event.target === self.elements.output)
			||  (event.target === self.elements.input)
			){
				focus_prompt();
			}
		});

		let mouse_moved = true;
		self.elements.output.addEventListener( 'mousedown', ()=>mouse_moved = false );
		self.elements.output.addEventListener( 'mousemove', ()=>mouse_moved = true );
		self.elements.output.addEventListener( 'blur',      ()=>mouse_moved = false );
		self.elements.output.addEventListener( 'mouseup', (event)=>{
			if (event.button != 0) return;
			if (!mouse_moved) {
				focus_prompt();
			}
		});


		// Double click
		addEventListener( 'dblclick', on_dblclick );


		// Clock
		start_clock();


		// Prompt
		const toggles    = shortcut => (shortcut.modifiers.length == 1) && (shortcut.modifiers[0] == 'alt');
		const characters = toggle => toggle.key
		const shortcuts  = KEYBOARD_SHORTCUTS.filter( toggles ).map( characters ).join('');

		CEP_VERSION += '^' + shortcuts;   // For .help
		//...self.print( 'CEP-' + CEP_VERSION + ' ready.\n', 'cep' );
		show_file( 'issue.txt' );
		//...self.elements.terminal.querySelector( 'h2.cep' ).innerText = 'CEP-' + CEP_VERSION;

		if (self.elements.terminal.classList.contains( 'active' )) setTimeout( focus_prompt, 100 );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
