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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
	'root'       : BANG_REQUEST + 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\nchat\n\tnick: ',
	'user'       : BANG_REQUEST + 'session\n\tlogin\n\t\tusername: user\n\t\tpassword: pass2\nchat\n\tnick: ',
	'guest'      : BANG_REQUEST + 'session\n\tlogin\n\t\tusername: guest\nchat\n\tnick: ',
	'logout'     : BANG_REQUEST + 'session\n\tlogout',
	'who'        : BANG_REQUEST + 'session\n\twho',
	'status'     : BANG_REQUEST + 'session\n\tstatus',
	'MCP'        : BANG_REQUEST + 'mcp\n\tstatus',
	'token'      : BANG_REQUEST + 'mcp\n\ttoken',
	'kroot'      : BANG_REQUEST + 'session\n\tkick\n\t\tusername: root',
	'kuser'      : BANG_REQUEST + 'session\n\tkick\n\t\tusername: user',
	'reset'      : BANG_REQUEST + 'mcp\n\trestart\n\t\ttoken: ',
	'clear'      : BANG_CEP + 'clear',
	'help'       : BANG_CEP + 'help',
	'connect'    : BANG_CEP + 'connect ' + SETTINGS.WEBSOCKET.URL,
	'disconnect' : BANG_CEP + 'disconnect',
};

const BUTTON_DECORATE_CLASSNAME = ['login', 'logout', 'who', 'token', 'clear', 'help', 'connect', 'disconnect'];

const TUTORIAL_SCRIPT = [
	BANG_CEP     + 'connect ' + SETTINGS.WEBSOCKET.URL,
	BANG_REQUEST + 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\nchat\n\tnick: ',
	//...BANG_REQUEST + 'session\n\twho\nmcp\n\tstatus',
];

const HTML_TERMINAL = (`
<form class="terminal">
	<header class="toolbar">
		<nav class="path">
			<span title="MyNode Client Endpoint">CEP</span><span title="Chat/JSON Debugger">Local</span>
		</nav>
		<nav class="toggles">
			<button class="debug" title="Toggle debug mode">Debug</button>
			<div class="items">
				<button class="cep"       title="Display local replies">CEP</button>
				<button class="string"    title="Display raw strings">String</button>
				<button class="notice"    title="Display notices">Notice</button>
				<button class="broadcast" title="Display broadcasts">Broadcast</button>
				<button class="update"    title="Display updates">Update</button>
				<button class="request"   title="Display requests">Request</button>
				<button class="response"  title="Display responses">Response</button>
			</div>
		</nav>
		<nav>
			<button class="toggles" title="Toggles">Toggles</button>
			<div class="items">
				<button class="animations" title="Toggle animations [Alt]+[A]">Animate</button>
				<button class="fancy"      title="Toggle fancy styling [Alt]+[F]">Fancy</button>
				<button class="key_beep"   title="Toggle keyboard beep [Alt]+[K]">Beep</button>
				<button class="sam"        title="Toggle Software Automatic Mouth [Alt]+[M]">TTS</button>
			</div>
		</nav>
	</header>
	<main class="chat shell last">
		<output></output>
		<textarea autocomplete="off"></textarea>
	</main>
	<footer class="toolbar">
		<nav>
			<span class="connection warning">OFFLINE</span>
		</nav>
		<nav>
			<span class="time"></span>
		</nav>
		<nav class="commands">
			<button class="submit" title="Execute command/send chat text">Enter</button>
			<div class="items">
				<input type="text"     name="username" placeholder="Username" autocomplete="username">
				<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname">
				<input type="password" name="password" placeholder="Password" autocomplete="password">
				<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
			</div>
		</nav>
		<nav>
			<button class="close" title="Minimize terminal">Exit</button>
		</nav>
	</footer>
</form>
`).split('\n').map( line => line.trim() ).join(''); // HTML_TERMINAL


const HTML_YOUTUBE = (`
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
`); // HTML_YOUTUBE


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// IMPLEMENTATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
		action    : ()=>{ self.toggles.animations.toggle(); },
	},{
		event     : 'keydown',
		key       : 'c',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.compressed.toggle(); },
	},{
		event     : 'keydown',
		key       : 'd',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.debug.toggle(); },
	},{
		event     : 'keydown',
		key       : 'f',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.fancy.toggle(); },
	},{
		event     : 'keydown',
		key       : 'k',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.keyBeep.toggle(); },
	},{
		event     : 'keydown',
		key       : 'm',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.sam.toggle(); },
	},{
		event     : 'keydown',
		key       : 'o',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.overflow.toggle(); },
	},{
		event     : 'keydown',
		key       : 's',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.separators.toggle(); },
	},{
		event     : 'keydown',
		key       : 't',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.terminal.toggle(); },
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
	},{
		event     : 'keydown',
		key       : 'Home',
		modifiers : ['shift'],
		action    : ()=>{ self.clearScreen(); },
	}];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function focus_prompt (position = 0) {
		const pos1  = -1;
		const end   = +1;
		const input = self.elements.input;

		adjust_textarea();
		input.focus();

		if (position == pos1) input.selectionEnd = input.selectionStart = 0;
		if (position == end ) input.selectionEnd = input.selectionStart = input.value.length;

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


	function show_file (file_name, show_cep_version = false) {
		fetch( file_name ).then( (response)=>{
			if (! response.ok) {
				throw new Error( 'HTTP error, status = ' + response.status );
			}
			return response.text();   // returns a Promise

		}).then( (new_text)=>{
			self.print(
				((show_cep_version) ? 'CEP-' + CEP_VERSION + '\n' : '')
				+ new_text.split( '//EOF' )[0].trim()
				,
				'cep',
			);
		});

	} // show_file


	function sam_speak (text) {
		if (!self.audioContext) return;
		if (!self.toggles.sam.enabled) return;

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
				if (self.toggles.sam.enabled) {
					if (part != '') await self.sam.speak( parts[index] );
					setTimeout( done, 150 );
				} else {
					done();
				}
			});

		}, Promise.resolve());

	} // sam_speak


	function sam_read (message) {
		const text = (typeof message == 'string') ? message : JSON.stringify( message, null, ' ' );
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 ';
		const allowed = char => chars.indexOf(char.toLowerCase()) >= 0;
		sam_speak(
			text
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

	} // sam_read


	let nr_active_sounds = 0;

	function beep () {
		if( !SETTINGS.KEYBOARD_BEEP
		||  !self.audioContext
		||  !self.toggles.keyBeep.enabled
		||  (nr_active_sounds > 5)
		) {
			return;
		}

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
		const v = 0.1;
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

			--nr_active_sounds
		}

	} // beep


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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CLOCK
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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

		update_clock();
		long_wait();

	} // start_clock


	this.onSocketOpen = function () {
		self.elements.connection.classList = 'connection success';
		self.elements.connection.innerText = 'Connected';
		self.elements.title = SETTINGS.WEBSOCKET.URL;

		self.elements.terminal.classList.add( 'connected' );

	}; // onSocketConnect


	this.onSocketClose = function () {
		self.elements.connection.classList = 'connection warning';
		self.elements.connection.innerText = 'Offline';
		self.elements.title = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketClose


	this.onSocketError = function () {
		self.onSocketClose();
		self.elements.connection.classList = 'connection error';
		self.elements.connection.innerText = 'Error';
		self.elements.title = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketError


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// KEYBOARD EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_input_change () {
		adjust_textarea();
		scroll_down();

	} // on_input_change


	function on_keydown (event) {//... Move to  on_keyboard_event
		if ((event.keyCode == 13) && (!event.ctrlKey && !event.altKey)) {
			const chat_mode    = !self.toggles.debug.enabled;
			if (chat_mode ^ event.shiftKey) {   // xor
				// Execute command with any modifyer+Return
				event.preventDefault();
				self.elements.send.click();
			}

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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MOUSE EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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


	function on_script_button_click (event) {
		event.preventDefault();
		self.elements.input.value = parse_button_script( BUTTON_SCRIPTS[event.target.className] );

		adjust_textarea();
		scroll_down();

	} // on_script_button_click


	function on_click (event) {
console.log( event.target );
		if (event.target.tagName == 'BUTTON') beep();

		if      (event.target === self.elements.output) focus_prompt( -1 )//... Expand eats this
		else if (event.target === self.elements.input ) focus_prompt(  0 )
		else if (event.target === self.elements.shell ) focus_prompt( +1 )
		;

		if (event.target.parentNode === self.elements.output) {
			event.target.classList.toggle( 'expand' );
		}
		else if (event.target === self.elements.asRoot ) fill( 'root'  , '12345' )
		else if (event.target === self.elements.asUser ) fill( 'user'  , 'pass2' )
		else if (event.target === self.elements.asGuest) fill( 'guest' , '' )
		;

		function fill (username, password) {
			self.elements.userName.value = username;
			self.elements.passWord.value = password;
			self.elements.nickName.focus();
		}

	} // on_dblclick


	function on_dblclick (event) {
		if (event.target.tagName == 'BODY') return self.toggles.terminal.toggle();

		const shift = event.shiftKey;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;

		const connected        = true;//...callback.isConnected();
		const commands_clicked = event.target.closest('.terminal .commands');
		const button_clicked   = event.target.tagName == 'BUTTON';

		if (commands_clicked && button_clicked) {
			// Command menu button was clicked
			event.preventDefault();
			const previous_value = self.elements.input.value;
			self.elements.input.value = parse_button_script( BUTTON_SCRIPTS[event.target.className] );
			self.elements.send.click();

		} else if (connected && (!shift && !ctrl && !alt)) {
			// Output area was clicked
			if (TUTORIAL_SCRIPT.length == 0) {
				self.elements.input.value = '.help';
				self.elements.send.click();
			} else {
				const current_value = self.elements.input.value;
				const next_script = TUTORIAL_SCRIPT[0];
				const user_edited
				=  (current_value.length != next_script.length)
				&& (current_value.slice(0, next_script.length) == next_script)
				;
				const new_value = TUTORIAL_SCRIPT.shift();
				if (!user_edited) self.elements.input.value = new_value;
				self.elements.send.click();
				self.elements.input.value = TUTORIAL_SCRIPT[0] || '.help';
			}
			focus_prompt();
		} else {
			focus_prompt();
		}

	} // on_dblclick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SEND BUTTON
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function on_send_click (event) {

		function perform_local (command) {
			if (command.charAt(0) != BANG_CEP) return false;

			self.print( command, 'request' );

			const token     = command.split(' ')[0].slice(1);
			const parameter = command.slice( token.length + 1 );

			switch (token) {
			case 'connect':
				callback.connect( parameter || SETTINGS.WEBSOCKET.URL );
				break;
			case 'disconnect':
				self.elements.connection.classList = 'connection warning';
				self.elements.connection.innerText = 'Offline';//... Needs callback
				self.elements.title = '';
				callback.disconnect();
				break;
			case 'clear'  :  self.clearScreen();                                 break;
			case 'help'   :  show_file( 'help.txt', /*show_cep_version*/true );  break;
			case 'issue'  :  show_file( 'issue.txt' );                           break;
			case 'readme' :  show_file( 'README'   );                            break;
			case 'music':
				document.body.innerHTML += HTML_YOUTUBE;
				break;
			default:
				self.elements.connection.classList = 'connection error';
				self.elements.connection.innerText = 'Error';
				self.elements.title = 'Unknown command in perform_local()';
				self.print( 'Unrecognized command', 'cep' );
				throw new Error( 'DebugConsole-on_send_click-perform_local: Unrecognized command' );
			}

			return true;
		}

		function send_json (text) {
			const request = (text.indexOf('\n') >= 0) ? text_to_request(text) : {chat: { say: text }};
			if (SETTINGS.AUTO_APPEND_TAGS) request.tag = ++self.requestId;
			callback.send( request );
		}

		async function remote_command () {
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

		const text = self.elements.input.value.trim();
		if (!perform_local( text )) await remote_command();

		self.history.add( text );
		self.elements.input.value = '';

		focus_prompt();

	} // on_send_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PRINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.clearScreen = function () {
		self.elements.output.innerHTML = '';

	} // clearScreen


	this.print = function (message, class_name = null) {

		// Decorate tokens with HTML
		const class_names = [
			'slash'    , 'period'  , 'colon'   , 'semi'     , 'curlyO' ,
			'bracketO' , 'parensO' , 'parensC' , 'bracketC' , 'curlyC' ,
			'true'     , 'false'   , 'null'
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
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;'  )
		.replaceAll( '&lt;', '###lt###' )
		.replaceAll( '&gt;', '###gt###' )
		.replaceAll( '&amp;', '###amp###' )
		;

		tokens.forEach( (token, index)=>{
			const html = '<code class="' + class_names[index] + '">' + token + '</code>';
			message_html = message_html.replaceAll( token, html );
		});

		message_html = message_html
		.replaceAll( '###amp###', '&amp;' )
		.replaceAll( '###gt###', '&gt;' )
		.replaceAll( '###lt###', '&lt;' )
		.replaceAll('\\n', '\n')   // '\\n' for .readme
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

			//...if (!self.elements.terminal.classList.contains('no') || (success == 'yes')) {
			//...	self.elements.terminal.classList.add( success );
			//...}

			setTimeout( ()=>{
				self.elements.terminal.classList.remove( 'yes' );
				self.elements.terminal.classList.remove( 'no' );
				self.elements.terminal.classList.add( success );
				sam_speak( success );
				setTimeout( ()=>{
					self.elements.terminal.classList.remove( 'yes' );
					self.elements.terminal.classList.remove( 'no' );
				}, SETTINGS.TIMEOUT.BIT_ANSWER_COLOR);
			}, SETTINGS.TIMEOUT.BIT_ANSWER_SOUND * (message.response.request-1) );
		}

		if (message.broadcast && (typeof message.broadcast.success != 'undefined')) {
			sam_speak( message.broadcast.success ? 'yes' : 'no' );
		}

	}; // print


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TOGGLES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_toggles() {
		const terminal = self.elements.terminal;
		const output   = self.elements.output;

		return [
			{ name: 'terminal'   , preset: PRESETS.TOGGLE.TERMINAL      , target: terminal },
			{ name: 'debug'      , preset: PRESETS.FILTER.DEBUG         , target: output   },
			{ name: 'cep'        , preset: PRESETS.FILTER.CEP           , target: output   },
			{ name: 'string'     , preset: PRESETS.FILTER.STRING        , target: output   },
			{ name: 'notice'     , preset: PRESETS.FILTER.NOTICE        , target: output   },
			{ name: 'broadcast'  , preset: PRESETS.FILTER.BROADCAST     , target: output   },
			{ name: 'update'     , preset: PRESETS.FILTER.UPDATE        , target: output   },
			{ name: 'request'    , preset: PRESETS.FILTER.REQUEST       , target: output   },
			{ name: 'response'   , preset: PRESETS.FILTER.RESPONSE      , target: output   },
			{ name: 'compressed' , preset: PRESETS.TOGGLE.COMPRESSED    , target: output   },
			{ name: 'separators' , preset: PRESETS.TOGGLE.SEPARATORS    , target: output   },
			{ name: 'overflow'   , preset: PRESETS.TOGGLE.OVERFLOW      , target: output   },
			{ name: 'keyBeep'    , preset: PRESETS.TOGGLE.KEYBOARD_BEEP , target: terminal },
			{ name: 'animations' , preset: PRESETS.TOGGLE.ANIMATIONS    , target: terminal },
			{ name: 'fancy'      , preset: PRESETS.TOGGLE.FANCY         , target: terminal },
			{ name: 'sam'        , preset: PRESETS.TOGGLE.SAM           , target: terminal },

		].map( (toggle)=>{
			const element = self.elements[toggle.name];
			const target  = toggle.target;

			toggle = {
				enabled : toggle.preset,
				...toggle,
				enable  : ()     =>{ flip( true  ); },
				disable : ()     =>{ flip( false ); },
				toggle  : (state)=>{ flip( state ); },
			};

			function update_dom () {
				const is_terminal = (toggle.name == 'terminal');
				if (!is_terminal && element) element.classList.toggle( 'enabled', toggle.enabled );
				target.classList.toggle( is_terminal ? 'enabled' : toggle.name, toggle.enabled );
				scroll_down();
			}

			function flip (new_state = null) {
				console.log( 'flip:', toggle, typeof new_state );
				const just_toggle = (new_state === null) || (typeof new_state == 'event');
				toggle.enabled = just_toggle ? !toggle.enabled : new_state;
				update_dom();
			}

			if (element && element.tagName == 'BUTTON') {
				element.addEventListener( 'click', ()=>{
					flip();
					focus_prompt();
				});
			}

			update_dom();

			return toggle;

		}).reduce( (prev, next)=>{
			return {...prev, [next.name]: next};

		}, /*initialValue*/{} );

	} // create_toggles


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugConsole.init' );

		document.body.innerHTML += HTML_TERMINAL.trim();

		const container = document.querySelector( '.terminal' );
		self.elements = {
			html         : document.querySelector( 'html' ),
			terminal     : container,
			shell        : container.querySelector( '.shell'            ),
			connection   : container.querySelector( '.connection'       ),
			commands     : container.querySelector( '.commands .items'  ),
			toggles      : container.querySelector( '.commands .items'  ),
			output       : container.querySelector( 'output'            ),
			input        : container.querySelector( 'textarea'          ),
			// Login form
			userName     : container.querySelector( '[placeholder=Username]'   ),
			nickName     : container.querySelector( '[placeholder=Nickname]'   ),
			passWord     : container.querySelector( '[placeholder=Password]'   ),
			secondFactor : container.querySelector( '[placeholder="Factor 2"]' ),
			// Additional menu buttons are addeded to .elements later under "Login form"
			close        : container.querySelector( '.close'            ),
			send         : container.querySelector( '.submit'           ),
			// Filter
			debug        : container.querySelector( 'button.debug'      ),
			string       : container.querySelector( 'button.string'     ),
			cep          : container.querySelector( 'button.cep'        ),
			notice       : container.querySelector( 'button.notice'     ),
			update       : container.querySelector( 'button.update'     ),
			broadcast    : container.querySelector( 'button.broadcast'  ),
			request      : container.querySelector( 'button.request'    ),
			response     : container.querySelector( 'button.response'   ),
			// Modes
			animations   : container.querySelector( 'button.animations' ),
			fancy        : container.querySelector( 'button.fancy'      ),
			keyBeep      : container.querySelector( 'button.key_beep'   ),
			sam          : container.querySelector( 'button.sam'        ),
		};

console.groupCollapsed( 'DebugConsole.elements{}' );
console.dir( self.elements );
console.groupEnd();

		self.history = new History( self.elements.input, {
			onInputChanged: ()=>{
				adjust_textarea();
				scroll_down();
			},
		});

		// Toggles
		self.toggles = create_toggles();

console.groupCollapsed( 'DebugConsole.toggles{}' );
console.dir( self.toggles );
console.groupEnd();


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


		// Button: "Enter"
		self.requestId = 0;
		self.elements.send.addEventListener( 'click', on_send_click );


		// Button: "Exit"
		self.elements.close.addEventListener( 'click', ()=>self.toggles.terminal.toggle() );


		// Keyboard
		addEventListener('keydown', beep );
		addEventListener('keydown', (event)=>{//...? Where is chat/json? unify
			const enabled = (self.elements.input.value.charAt(0) == '.');
			self.elements.input.classList.toggle( 'local', enabled )
		});
        	self.elements.input.addEventListener( 'keydown', on_keydown );
		['keydown', 'keypress', 'keyup' ].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);


		// Login form
		self.elements.login   = container.querySelector( 'button.login' );
		self.elements.asRoot  = container.querySelector( 'button.root'  );
		self.elements.asUser  = container.querySelector( 'button.user'  );
		self.elements.asGuest = container.querySelector( 'button.guest' );

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


		// CLICK and DOUBLE CLICK
		addEventListener( 'click'    , on_click    );
		addEventListener( 'dblclick' , on_dblclick );


		// Clock
		start_clock();


		// Prompt
		const toggles    = shortcut => (shortcut.modifiers.length == 1) && (shortcut.modifiers[0] == 'alt');
		const characters = toggle => toggle.key
		const shortcuts  = KEYBOARD_SHORTCUTS.filter( toggles ).map( characters ).join('');

		CEP_VERSION += '^' + shortcuts;   // For .help
		show_file( 'issue.txt' );

		if (self.elements.terminal.classList.contains( 'enabled' )) setTimeout( focus_prompt, 100 );

		function get (search) {
			return search.split(' ').reduce( (prev, term)=>{
				return prev || (location.href.indexOf( term ) >= 0);
			}, false);
		}


		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
