// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

// This is a node module or something. It installs itself under window.SamJs and cannot be imported normally
// I think a bundler would change that, but this is from the /dist folder!? I also added a volume option to it.
import * as DUMMY_SamJs from './samjs.js';

import { SETTINGS, GET  } from './config.js';
import { PRESETS, DEBUG } from './config.js';
import { History        } from './history.js';


export const DebugConsole = function (callback) {
	const self = this;

	this.history;
	this.audioContext;
	this.toggles;

	this.requestId;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (DEBUG.WINDOW_APP) window.CEP = this;

	this.reloadCSS = function  () {
		self.status( 'Styles reloaded', /*clear*/true );
		const head = document.querySelector('head');
		const remove_link = head.querySelector( '[rel=stylesheet]' );
		const new_link = document.createElement( 'link' );
		new_link.rel  = 'stylesheet';
		new_link.href = 'spielwiese.css?' + Date.now();
		new_link.type = 'text/css';
		head.appendChild( new_link );
		setTimeout( ()=>remove_link.parentNode.removeChild(remove_link), 1000 );

	}; // reloadCSS


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let CEP_VERSION = 'v0.3.1α';   // Keyboard shortcuts will be appended in  self.init()

	const EXTRA_LINES = 0;   // When adjusting textarea size (rows), make it bigger
	const MIN_LINES   = 0;   // When adjusting textarea size (rows), make it at least this

	const BUTTON_SCRIPTS = [
{ menu:'send' , name:'login'  , script:'session\n\tlogin\n\t\tusername: %u\n\t\tpassword: %p\n\t\tfactor2: %t\n%N' },
{ menu:'send' , name:'root'   , script: 'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\n%N' },
{ menu:'send' , name:'user'   , script: 'session\n\tlogin\n\t\tusername: user\n\t\tpassword: pass2\n%N' },
{ menu:'send' , name:'guest'  , script: 'session\n\tlogin\n\t\tusername: guest\n%N' },
{ menu:'send' , name:'logout' , script: 'session\n\tlogout' },
{ menu:'send' , name:'connect'    , script: '/connect ' + SETTINGS.WEBSOCKET.URL },
{ menu:'send' , name:'disconnect' , script: '/disconnect' },
{ menu:'chat' , name:'who'    , script: 'session\n\twho' },
{ menu:'chat' , name:'status' , script: 'session\n\tstatus' },
{ menu:'chat' , name:'MCP'    , script: 'mcp\n\tstatus' },
{ menu:'chat' , name:'token'  , script: 'mcp\n\ttoken' },
{ menu:'chat' , name:'kroot'  , script: 'session\n\tkick\n\t\tusername: root' },
{ menu:'chat' , name:'kuser'  , script: 'session\n\tkick\n\t\tusername: user' },
{ menu:'chat' , name:'reset'  , script: 'mcp\n\trestart\n\t\ttoken: ' },
{ menu:'chat' , name:'news'   , script: 'chat\n\tnews' },
{ menu:'chat' , name:'help'   , script: '/help' },
{ menu:'chat' , name:'clear'  , script: '/clear' },
	];

	const SHORTHAND_COMMANDS = {
		'nick'  : 'chat\n\tnick:*',
		'who'   : 'session\n\twho',
	};

	const HTML_TERMINAL = (`
<div class="terminal">
	<main class="chat shell"><!-- //...? Must be first in DOM to allow popup menus in header -->
		<output class="last"></output>
		<textarea autocomplete="off"></textarea>
	</main>
	<header class="toolbar">
		<nav class="tasks"><button class="cep enabled" title="Remote Site">MyNonde</button></nav>
		<nav><span class="time"></span></nav>
		<nav class="filter">
			<button>Filter</button>
			<div class="items"></div>
		</nav>
		<nav class="toggles">
			<button>Toggle</button>
			<div class="items"></div>
		</nav>
	</header>
	<footer class="toolbar">
		<nav><button class="connection warning">OFFLINE</button></nav>
		<nav><span class="status"></span></nav>
		<nav class="send">
			<button class="submit" title="Execute command/send chat text">Enter</button>
			<form class="items">
				<input type="text"     name="username" placeholder="Username" autocomplete="username">
				<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname" Xautofocus>
				<input type="password" name="password" placeholder="Password" autocomplete="password">
				<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
			</form>
		</nav>
		<nav class="chat">
			<button class="debug" title="Toggle chat/debug mode. Shortcut: Alt+D">Chat</button>
			<div class="items"></div>
		</nav>
		<nav><button class="close" title="Minimize terminal">Exit</button></nav>
	</footer>
</div>
	`); // HTML_TERMINAL

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

	const KEYBOARD_SHORTCUTS = [{   // key: Keep in sync with toggles. Atm. only Alt+Key works with toggles.
		event     : 'keydown',
		key       : 'a',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.animate.toggle(); },
	},{
		event     : 'keydown',
		key       : 'c',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.compact.toggle(); },
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
		key       : 'l',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.last.toggle(); },
	},{
		event     : 'keydown',
		key       : 'm',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.tts.toggle(); },
	},{
		event     : 'keydown',
		key       : 'v',
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
		key       : 'x',
		modifiers : ['alt'],
		action    : ()=>{ self.elements.login.click(); self.elements.enter.click(); },
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
		modifiers : ['ctrl'],
		action    : ()=>{ self.clearInput(); },
	},{
		event     : 'keydown',
		key       : 'Home',
		modifiers : ['shift', 'ctrl'],
		action    : ()=>{ self.clearScreen(); },
	}];


	function gather_dom_elements (container) {
		return {
			html         : document.querySelector( 'html' ),
			terminal     : container,
			shell        : container.querySelector( '.shell'           ),
			buttonCEP    : container.querySelector( 'button.cep'       ),
			connection   : container.querySelector( '.connection'      ),
			status       : container.querySelector( '.status'          ),
			time         : container.querySelector( '.time'            ),
			send         : container.querySelector( '.send .items'     ),
			chat         : container.querySelector( '.chat .items'     ),
			toggles      : container.querySelector( '.toggles .items'  ),
			btnToggles   : container.querySelector( '.toggles button'  ),
			filter       : container.querySelector( '.filter .items'   ),
			debug        : container.querySelector( '.debug .items'    ),
			output       : container.querySelector( 'output'           ),
			input        : container.querySelector( 'textarea'         ),
			// Login form
			userName     : container.querySelector( '[name=username]' ),
			nickName     : container.querySelector( '[name=nickname]' ),
			passWord     : container.querySelector( '[name=password]' ),
			factor2      : container.querySelector( '[name=factor2]'  ),
			// Additional menu buttons are addeded to .elements later under "Login form"
			enter        : container.querySelector( '.submit' ),
			close        : container.querySelector( '.close'  ),//...! => exit
			// Filter
			debug        : container.querySelector( 'button.debug'     ),
		};

	} // gather_dom_elements


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TOGGLES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_toggles() {
		const terminal = self.elements.terminal;
		const output   = self.elements.output;
		const shell    = self.elements.shell;

		const T = PRESETS.TOGGLE;
		const F = PRESETS.FILTER;

		return [                                                    // shortcut: Sync with KbdSC
{ name:'terminal'   , preset:T.TERMINAL   , target:terminal , menu:null      , shortcut:'T',  caption:null         },
{ name:'debug'      , preset:F.CHAT       , target:shell    , menu:null      , shortcut:'D',  caption:'Chat'       },
{ name:'cep'        , preset:F.CEP        , target:output   , menu:'filter'  , shortcut:null, caption:'CEP'        },
{ name:'string'     , preset:F.STRING     , target:output   , menu:'filter'  , shortcut:null, caption:'String'     },
{ name:'notice'     , preset:F.NOTICE     , target:output   , menu:'filter'  , shortcut:null, caption:'Notice'     },
{ name:'broadcast'  , preset:F.BROADCAST  , target:output   , menu:'filter'  , shortcut:null, caption:'Broadcast'  },
{ name:'update'     , preset:F.UPDATE     , target:output   , menu:'filter'  , shortcut:null, caption:'Update'     },
{ name:'request'    , preset:F.REQUEST    , target:output   , menu:'filter'  , shortcut:null, caption:'Request'    },
{ name:'response'   , preset:F.RESPONSE   , target:output   , menu:'filter'  , shortcut:null, caption:'Response'   },
{ name:'compact'    , preset:T.COMPACT    , target:output   , menu:'toggles' , shortcut:'C',  caption:'Compact'    },
{ name:'overflow'   , preset:T.OVERFLOW   , target:output   , menu:'toggles' , shortcut:'V',  caption:'Overflow'   },
{ name:'separators' , preset:T.SEPARATORS , target:output   , menu:'toggles' , shortcut:'S',  caption:'Separators' },
{ name:'last'       , preset:T.LAST       , target:output   , menu:'toggles' , shortcut:'L',  caption:'Show Last'  },
{ name:'keyBeep'    , preset:T.KEY_BEEP   , target:terminal , menu:'toggles' , shortcut:'K',  caption:'Key Beep'   },
{ name:'animate'    , preset:T.ANIMATE    , target:terminal , menu:'toggles' , shortcut:'A',  caption:'Animations' },
{ name:'fancy'      , preset:T.FANCY      , target:terminal , menu:'toggles' , shortcut:'F',  caption:'Fancy'      },
{ name:'tts'        , preset:T.TTS        , target:terminal , menu:'toggles' , shortcut:'M',  caption:'Speech'     },

		].map( (toggle)=>{
			const target = toggle.target;
			const menu   = self.elements[toggle.menu];
			let element  = self.elements[toggle.name];

			// Some toggles may have been placed in the HTML manually
			// We might have forgotten to add the element or the menu to self.elements
			if (!element && menu) {
				element = document.createElement( 'button' );
				element.innerText = toggle.caption || toggle.name;
				if (toggle.shortcut) {
					element.title = 'Shortcut: Alt+' + toggle.shortcut;
				} else {
					if (toggle.menu == 'debug') element.title = 'Show while in Debug mode';
				}
				menu.appendChild( element );
			}

			toggle = {
				enabled : toggle.preset,
				...toggle,
				enable  : ()     =>{ flip( true  ); },
				disable : ()     =>{ flip( false ); },
				toggle  : (state)=>{ flip( state ); },
			};

			delete toggle.target;
			delete toggle.menu;
			delete toggle.shortcut;

			function update_dom () {
				const is_terminal = (toggle.name == 'terminal');
				if (!is_terminal && element) element.classList.toggle( 'enabled', toggle.enabled );
				target.classList.toggle( is_terminal ? 'enabled' : toggle.name, toggle.enabled );
				scroll_down();
				if (is_terminal && toggle.enabled) focus_prompt();
			}

			function flip (new_state = null) {
				//...console.log( 'flip:', toggle, typeof new_state );
				const just_toggle = (new_state === null) || (typeof new_state == 'event');
				toggle.enabled = just_toggle ? !toggle.enabled : new_state;
				update_dom();
				 if (toggle.name == 'terminal') {
					self.elements.html.classList.toggle( 'animate', !toggle.enabled );
				}

				self.bit.say( toggle.enabled );//..., /*delay*/0, (toggle.name == 'tts') );
				self.elements.btnToggles.classList.add( 'blink' );
				setTimeout( ()=>self.elements.btnToggles.classList.remove('blink'), 500 );
			}

			if (element.tagName == 'BUTTON') {   //...? Do we still have non-buttons?
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

	} // adjust_textarea


	function scroll_down () {
		self.elements.output.scrollBy(0, 99999);

	} // scroll_down


	function animate_ping (transmit = false) {
		self.elements.buttonCEP.classList.add( transmit ? 'transmit' : 'ping' );
		self.elements.connection.classList.add( transmit ? 'transmit' : 'ping' );
		setTimeout( ()=>{
			self.elements.buttonCEP.classList.remove( transmit ? 'transmit' : 'ping' );
			self.elements.connection.classList.remove( transmit ? 'transmit' : 'ping' );
		}, SETTINGS.TIMEOUT.PING_CSS);

	} // animate_ping


	async function show_file (file_name, extract_body = false) {
		const file_contents = await fetch( file_name ).then( (response)=>{
			if (! response.ok) throw new Error( 'HTTP error, status = ' + response.status );
			return response.text();   // returns a Promise
		});

		const file_extension = file_name.split('.').pop();

		switch (file_extension) {
			case 'html': {
				const iframe = document.createElement( 'iframe' );
				iframe.className = 'cep htmlfile expand';
				iframe.src = file_name + '?included';
				iframe.setAttribute( 'frameborder', '0' );
				iframe.setAttribute( 'scrolling', 'no' );
				iframe.addEventListener( 'load', ()=>{
					iframe.style.height = (
						iframe
						.contentWindow
						.document
						.documentElement
						.scrollHeight
						+ 'px'
					);
					//scroll_down();
				});
				self.elements.output.appendChild( iframe );
				break;
			}
			case 'txt': // fall through
			default: {
				self.print(
					file_contents.split( '//EOF' )[0].trim(),
					'cep textfile expand',
				);
			}
		}

	} // show_file


// BEEP //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let nr_active_sounds = 0;
	let last_beep_time = 0;

	async function beep () {
		const elapsed_time = Date.now() - last_beep_time;

		if( !SETTINGS.KEY_BEEP
		//...||  !self.audioContext
		||  !self.toggles.keyBeep.enabled
		||  (nr_active_sounds > 25)
		||  (elapsed_time < SETTINGS.TIMEOUT.BEEP_IGNORE)
		) {
			return;
		}

if (!self.audioContext) await new Promise( (done)=>setTimeout(done) );   //...?

		last_beep_time = Date.now();

		const context = self.audioContext;

		let square_wave = context.createOscillator();
		let envelope = context.createGain();
		let volume = context.createGain();
		let destination = context.destination;

		square_wave.type = "square";
		square_wave.frequency.value = 440 * 4;
		square_wave.detune.value = 0;
		envelope.gain.value = 0.0;
		volume.gain.value = 0.025 * SETTINGS.MAIN_VOLUME;

		square_wave
		.connect(envelope)
		.connect(volume)
		.connect(destination)
		;

//...? Timeout makes sure, WebAudio does not glitch on the very first beep
//...? The envelope seems not to work as intended, context still "waking up"??
//...? Setting v < 0.2 makes the first sound played "louder" even with the timeout
const delay = (last_beep_time == 0) ? 100 : 0;
setTimeout( ()=>{
		// Envelope
		const t0 = context.currentTime + 0.1;   //...? Also needed to prevent the glitch
		const v = 0.1;
		var t1;
		envelope.gain.setValueAtTime         ( 0.0, t1 = t0 );
		envelope.gain.linearRampToValueAtTime( 1.0, t1 = t0 + v * 0.01 );
		envelope.gain.linearRampToValueAtTime( 0.1, t1 = t0 + v * 0.50 );
		envelope.gain.linearRampToValueAtTime( 0.0, t1 = t0 + v * 1.00 );

		//...square_wave.addEventListener('ended', on_ended);
		square_wave.onended = on_ended;
		square_wave.start();
		square_wave.stop(t1);

		++nr_active_sounds;
}, delay);
		function on_ended (event) {
			square_wave.disconnect( envelope );
			envelope.disconnect( volume );
			volume.disconnect( context.destination );

			--nr_active_sounds
		}

	} // beep


// SAM / BIT /////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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


	function sam_speak (text, ignore_toggle) {
		if (!self.audioContext) return;

		if (!self.toggles.tts.enabled && !ignore_toggle) return;

		if (!self.sam || SETTINGS.SAM_ALWAYS_NEW) {
			self.sam = new SamJs({
				singmode : !false,   //false
				pitch    : 35,       //64 Lower = higher voice
				speed    : 72,       //72
				mouth    : 128,      //128
				throat   : 128,      //128
				volume   : PRESETS.VOLUME.SAM * SETTINGS.MAIN_VOLUME,
				//1 I added volume to sam.js, but it's not too pretty
			});
		}

		text
		.split( 'PAUSE' )
		.reduce( async (prev, next, index, parts)=>{
			await prev;
			const part = parts[index].trim();
			return new Promise( async (done)=>{
				if (self.toggles.tts.enabled || ignore_toggle) {
					if (part != '') await self.sam.speak( parts[index] );
					setTimeout( done, 150 );
				} else {
					done();
				}
			});

		}, Promise.resolve());

	} // sam_speak


	this.bit = {
		say: function ( state, delay = 0, ignore_toggle = false ) {
			const success = state ? 'yes' : 'no';

			// We might receive several responses, when we sent several requersts, so we...
			setTimeout( ()=>{
				self.elements.terminal.classList.remove( 'yes' );
				self.elements.terminal.classList.remove( 'no' );
				self.elements.terminal.classList.add( success );

				sam_speak( success, ignore_toggle );

				setTimeout( ()=>{
					self.elements.terminal.classList.remove( success );
				}, SETTINGS.TIMEOUT.BIT_ANSWER_COLOR);

			// .. delay TTS accordingly:
			}, SETTINGS.TIMEOUT.BIT_ANSWER_SOUND * delay);
		}

	}; // bit


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONVERT USER INPUT <--> JSON
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CLOCK
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const start_time = new Date();

	function start_clock () {
		let recent_second = current_second();
		update_clock();
		long_wait();
		return;

		function current_second () {
			return Math.floor( Date.now() / 1000 );
		}

		function long_wait () {
			const remaining_ms = 1000 - Date.now() % 1000;
			setTimeout( narrow_wait, remaining_ms - 50 );
		}

		function narrow_wait () {
			if (current_second() == recent_second) {
				setTimeout( narrow_wait );
			} else {
				update_clock();
				//...recent_second = current_second();
				//...long_wait();
				setInterval( update_clock, 1000 );
			}
		}

		function update_clock () {
			self.elements.time.innerText = Intl.DateTimeFormat(
				navigator.language, {
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
				},
			).format(new Date());
		}

	} // start_clock


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// KEYBOARD EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_input_change () {
		adjust_textarea();
		scroll_down();

	} // on_input_change


	function on_keydown (event) {//... Move to  on_keyboard_event?
		const shift = event.shiftKey;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;
		const key = event.key;

		if ((key != 'Shift') && (key != 'Control') && (key != 'Alt') && (key != 'Meta')) beep();

	 	if ((event.keyCode == 13) && !event.shiftKey && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			self.elements.enter.click();

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


	function on_keyup () {
		const bang = self.elements.input.value.charAt(0);
		const is_local_command = (self.elements.input.value.charAt(0) == '.');
		self.elements.input.classList.toggle( 'local', (bang == '.') );
		self.elements.input.classList.toggle( 'cep', (bang == '/') );

	} // on_keyup


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

	function parse_button_script (script_name) {
		let script   = BUTTON_SCRIPTS.find( script => script.name == script_name ).script;
		const username = self.elements.userName.value;
		const nickname = self.elements.nickName.value;
		if (nickname && !username) self.elements.userName.value = 'guest';
		const second_factor = self.elements.factor2.value || 'null';
		script = script.replaceAll( '\n%N', (self.elements.nickName.value) ? '\nchat\n\tnick: %n' : '' );
		return (
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

	} // parse_button_script


	function on_script_button_click (event) {
		event.preventDefault();
		self.elements.input.value = parse_button_script( event.target.className );

		adjust_textarea();
		scroll_down();

	} // on_script_button_click


	function on_click (event) {
		if (event.target.tagName == 'BUTTON') beep();

		if      (event.target === self.elements.output) focus_prompt( -1 )//... Expand eats this
		else if (event.target === self.elements.input ) focus_prompt(  0 )
		else if (event.target === self.elements.shell ) focus_prompt( +1 )
		;

		if (event.target.parentNode === self.elements.output) {
			// Toggle .compact
			const last_element    = self.elements.output.querySelector( ':scope > :last-child' );
			const clicked_element = event.target.closest( 'pre' );
			if (clicked_element === last_element) {
				// Don't .compact, instead toggle "uncollapse last message"
				self.toggles.last.toggle();
			} else {
				event.target.classList.toggle( 'expand' );     // Force it to expand
				event.target.classList.toggle( 'unexpand' );   //...Keep track of user-clicked expands
			}
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
		const commands_clicked = event.target.closest('.terminal .send' )
			|| event.target.closest( '.terminal .chat');
		const button_clicked   = event.target.tagName == 'BUTTON';

		if (commands_clicked && button_clicked) {
			// Command menu button was clicked
			event.preventDefault();
			self.elements.input.value = parse_button_script( event.target.className );
			self.elements.enter.click();

		} else {
			focus_prompt();
		}

	} // on_dblclick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SEND BUTTON
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function on_enter_click (event) {

		// Replace chat commands with actual ones
		let text = self.elements.input.value.trim();

		if (text.trim() == '') {
			if (event.button === 0) self.print( '', 'mark' );
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
			//...? focus_prompt();
			//...? return;
		}

		if (!perform_local( text )) {
			await remote_command( text );
		}

		self.history.add( text );
		self.elements.input.value = '';

		focus_prompt();

		return;

// LOCAL COMMANDS ////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function perform_local (command) {
			if (command.charAt(0) != '/') return false;

			function show_version() { self.print( 'CEP-' + CEP_VERSION, 'cep' ); }

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
			case 'version' :  show_version();                 break;
			case 'clear'   :  self.clearScreen();             break;
			case 'help'    :  show_file( 'help.txt'       );  break;
			case 'issue'   :  show_file( 'issue.txt'      );  break;
			case 'readme'  :  show_file( 'README'         );  break;
			case 'diary'   :  show_file( 'dev_diary.html' );  break;
			case 'music':
				document.body.innerHTML += HTML_YOUTUBE;
				break;
			default:
				self.elements.connection.classList = 'connection error';
				self.elements.connection.innerText = 'Error';
				self.elements.title = 'Unknown command in perform_local()';
				self.print( 'Unrecognized command', 'cep' );
				throw new Error( 'DebugConsole-on_enter_click-perform_local: Unrecognized command' );
			}

			return true;
		}

// REMOTE REQUEST ////////////////////////////////////////////////////////////////////////////////////////////////119:/
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
				animate_ping( /*transmit*/true );
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
		}

// SHORT REMOTE //////////////////////////////////////////////////////////////////////////////////////////////////119:/

		// session.who
		// chat.nick=name
		// session.login.username=test,password=thing,sub:thing=1.fail
		// session.login.username=test,password=thing,sub.thing=1..session.status
		// session.login.username=test,password=thing,sub.thing=1..session.status

		function parse_short_request (text) {
			const parts = text.slice(1).split('.')
			let result = '';
			let indentation = 0;

			while (parts.length > 0) {
				const part = parts.shift();

				if (part === '') {
					--indentation;
					if (indentation < 0) throw new Error( 'Malformed short request' );

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
		}

	} // on_enter_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PRINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.print = function (message, class_name = null) {

		function highlight () {
			// Decorate tokens with HTML
			const class_names = [
		/*
				'slash'    , 'period'  , 'colon'   , 'semi'     , 'curlyO' ,
				'bracketO' , 'parensO' , 'parensC' , 'bracketC' , 'curlyC' ,
		*/
				'true'     , 'false'   , 'null'
			];
			const tokens = [
		/*
				'/', '.', ':', ';', '{',
				'[', '(', ')', ']', '}',
		*/
				'true', 'false', 'null',
			];

			const replace_href = (word)=>{
				//...! Ignores tab-prefixed "words":
				if ((word.slice(0,7) == 'http://') || (word.slice(0,8) == 'https://')) {
					const pos_tab = Math.min(
						(word + ' ').indexOf( ' ' ),
						(word + '\t').indexOf( '\t' ),
						(word + '\n').indexOf( '\n' ),
					);
					const href = word.slice(0, pos_tab);
					const rest = word.slice(pos_tab);
					return '<a target="_blank" href="' + href + '">' + href + '</a>' + rest;
				} else {
					return word;
				}
			};

			let message_html = (
				(typeof message == 'string')
				? message
				: self.requestToText( message )
			)
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;'  )
			.replaceAll('\\n', '\n')   // '\\n' for .readme
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
			.split(' ').map( replace_href ).join(' ')
			.split('\n').map( replace_href).join('\n')
			;

			return message_html;
		}


		// Let user scroll up   //... Make optional
		const o = self.elements.output;
		const do_scroll = (o.scrollHeight - o.scrollTop == o.clientHeight);

		let print_message = null;
		if (message.html) {
			print_message = message.html.replaceAll( '<a href', '<a target="_blank" href' );
			class_name = 'html';

		} else {
			print_message
			= (typeof message == 'string')
			? message
			: highlight( JSON.stringify(message, null, '\t') )
			;
		}

		// Create DOM element
		const new_element = document.createElement( 'pre' );
		if (class_name) new_element.className = class_name;
		new_element.innerHTML = print_message;
		self.elements.output.appendChild( new_element );

		['response', 'broadcast'].forEach( (category)=>{
			if (message[category] && message[category].type) {
				new_element.dataset.type = message[category].type;
			}
		});

		if (false || do_scroll) scroll_down();//...


		// Visualize/sonifiy success/failure
		if (message.broadcast && (typeof message.broadcast.success != 'undefined')) {
			self.bit.say( message.broadcast.success );
		}

		if (message.response && (typeof message.response.success != 'undefined')) {
			// We might receive several responses, when we sent several requersts,
			// so we tell the bit to stack its answers:
			self.bit.say( message.response.success, message.response.request - 1 );
		}

	}; // print


	this.clearScreen = function () {
		self.elements.output.innerHTML = '';

	} // clearScreen


	this.clearInput = function () {
		self.elements.input.value = '';
		scroll_down();

	} // clearInput


// STATUS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let status_messages = [];
	let status_timeout = null;

	this.status = function (html, clear = false) {
		if (clear) return self.status( html );

		if (html === null) {
			clearTimeout( status_timeout );
			status_timeout = null;
			status_messages = [];
			self.elements.status.classList.add( 'fade_out' );
			setTimeout( ()=>{
				self.elements.status.innerHTML = '';
				self.elements.status.classList.remove( 'fade_out' );
			}, SETTINGS.TIMEOUT.STATUS_FADE);
			return;
		}

		status_messages.push( html );
		if (status_timeout === null) next();

		function next () {
			if (status_messages.length == 0) {
				status_timeout = null;
				setTimeout( ()=>{
					if (status_timeout === null) self.status( null );
				}, 1000)
			} else {
				self.elements.status.classList.add( 'fade_out' );

				status_timeout = setTimeout( ()=>{
					self.elements.status.classList.remove( 'fade_out' );
					self.elements.status.innerHTML =
					( status_messages.shift()
					).replaceAll(
						'<a href',
						'<a target="_blank" href',
					);

					setTimeout( next, SETTINGS.TIMEOUT.STATUS_SHOW );

				}, SETTINGS.TIMEOUT.STATUS_FADE );
			}
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onSocketOpen = function () {
		self.elements.connection.classList = 'connection connected';
		self.elements.connection.innerText = 'Connected';
		self.elements.title = SETTINGS.WEBSOCKET.URL;

		self.elements.terminal.classList.add( 'connected' );

	}; // onSocketConnect


	this.onSocketClose = function () {
		self.elements.connection.classList = 'connection';
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


// RECEIVE ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onReceive = function (message) {
		if (!message.update || !message.update.ping) animate_ping( /*transmit*/true );

		// See  WebSocketClient.send()
		try   { message = JSON.parse( event.data ); }
		catch { /* Assume string */ }

		if (message.update) {
			switch (message.update.type) {
				case 'ping': {
					if (!DEBUG.HIDE_MESSAGES.PING) print_message();
					callback.send( {session:{ pong: message.update.pong }} );
					animate_ping();
					return;
				}
				case 'servername': {
					self.elements.buttonCEP.innerText = message.update.name;
					return;
				}
				case 'chat': {
					if (!DEBUG.HIDE_MESSAGES.CHAT) print_message();
					const sender = message.update.nickName || message.update.userName;
					self.print( {[sender]: message.update.chat}, 'chat' );
					return;
				}
				case 'html': {
					print_message();
					self.print({ html: message.update.html });
					return;
				}
				case 'reload': {
					switch (message.update.file) {
						case 'spielwiese.css': {
							self.reloadCSS();
							print_message();
							return;
						}
						case 'debug_console.js':  // fall through
						case 'main.js': {
							location.reload();
							return;
						}
					}
					break;
				}
			}

			self.print( message, 'update error' );
			return;

		} else {
			const category = Object.keys( message )[0];
			switch (category) {
				case 'broadcast': {
					if (message.broadcast.type == 'rss') {
						Object.values(message.broadcast.items).forEach( (entry, index)=>{
							self.status(
								'<a href="'
								+ entry.link
								+ '">'
								+ message.broadcast.feed
								+ ': '
								+ entry.title
								+ '</a>'
							);
						});
					}
					break;
				}
				case 'response': {
					const response = message.response;
					const result   = message.response.result;
					switch (response.command) {
						case 'session.login': {
							if (response.result != 'Already logged in') {
								self.elements.connection.classList.add( 'attached' );
								self.elements.connection.innerText
								= result.login.nickName || result.login.userName;
							}
							break;
						}
						case 'chat.nick': {
							if (response.success) {
								self.elements.connection.innerText = result;
							}
							break;
						}
						case 'session.logout': {
							self.elements.connection.classList.remove( 'attached' );
							self.elements.connection.innerText = 'Connected';
							break;
						}
					}
					break;
				}
			}

			print_message();
		}

		function print_message () {
			let class_name = 'response';
			if      (typeof message == 'string')              class_name = 'string expand'
			else if (typeof message.cep       != 'undefined') class_name = 'cep expand'
			else if (typeof message.notice    != 'undefined') class_name = 'notice expand'
			else if (typeof message.broadcast != 'undefined') class_name = 'broadcast'
			else if (typeof message.update    != 'undefined') class_name = 'update'
			;

			self.print( message, class_name );
		}

	}; // onReceive


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
		self.elements = gather_dom_elements( container );

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
		//...self.elements.terminal.addEventListener( 'submit', event => event.preventDefault() );


		// Resume audio context after page load
		function activate_audio () {
			self.audioContext = new(window.AudioContext || window.webkitAudioContext)();
			if (self.audioContext.state == 'suspended') self.audioContext.resume();
			removeEventListener( 'keydown', activate_audio );
			removeEventListener( 'mouseup', activate_audio );
		}
		addEventListener( 'keydown', activate_audio );
		addEventListener( 'mouseup', activate_audio );


		// Keyboard
        	self.elements.input.addEventListener( 'keydown' , on_keydown );
        	self.elements.input.addEventListener( 'keyup'   , on_keyup   );
		['keydown', 'keypress', 'keyup'].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);


		// MAIN MENU Create macro buttons
		BUTTON_SCRIPTS.forEach( (script)=>{
			const new_button = document.createElement( 'button' );
			new_button.className = script.name;
			new_button.innerText = script.name.charAt(0).toUpperCase() + script.name.slice(1);
			new_button.title     = 'Double click to execute immediately';
			new_button.addEventListener( 'click', on_script_button_click );

			self.elements[script.menu].appendChild( new_button );
		});


		// CLICK and DOUBLE CLICK
		function set_html_animate () {
			self.elements.html.classList.remove( 'animate' );
			self.elements.terminal.removeEventListener( 'click', set_html_animate );
		}
		self.elements.terminal.addEventListener( 'click'    , set_html_animate );
		self.elements.terminal.addEventListener( 'click'    , on_click    );
		self.elements.terminal.addEventListener( 'dblclick' , on_dblclick );

		// Open terminal from main screen
		addEventListener( 'dblclick', (event)=>{
			if (!event.target.closest( '.terminal' )) {
				self.toggles.terminal.toggle();
			}
		});


		// BUTTON: "CEP"
		self.elements.buttonCEP.addEventListener( 'click', ()=>self.reloadCSS() );


		// Status bar
		self.elements.status.addEventListener( 'click', ()=>self.status( null ) );


		// BUTTON: "Enter"
		self.requestId = 0;
		self.elements.enter.addEventListener( 'click', on_enter_click );


		// BUTTON: "Exit"
		self.elements.close.addEventListener( 'click', ()=>self.toggles.terminal.toggle() );



		// LOGIN FORM
		self.elements.login   = container.querySelector( 'button.login' );
		self.elements.asRoot  = container.querySelector( 'button.root'  );
		self.elements.asUser  = container.querySelector( 'button.user'  );
		self.elements.asGuest = container.querySelector( 'button.guest' );

		self.elements.terminal.querySelectorAll( '.send input' ).forEach( (input)=>{
			input.addEventListener( 'input'  , ()=>self.elements.login.click() );
			input.addEventListener( 'change' , ()=>self.elements.login.click() );
		});
		self.elements.send.addEventListener( 'keydown', (event)=>{
			if (event.keyCode == 13) self.elements.enter.click();
		});


		// CLOCK
		start_clock();


		// PROMPT
		self.elements.input.addEventListener( 'keyup'  , adjust_textarea );
		self.elements.input.addEventListener( 'input'  , on_input_change );
		self.elements.input.addEventListener( 'change' , on_input_change );

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

		function init_prompt () {
			// Find shortcuts and add list of keys to CEP_VERSION
			const toggles    = sc => (sc.modifiers.length == 1) && (sc.modifiers[0] == 'alt');
			const characters = toggle => toggle.key
			const shortcuts  = KEYBOARD_SHORTCUTS.filter( toggles ).map( characters ).join('');

			CEP_VERSION += '^' + shortcuts;   // For .help

			if (!GET.has('login')) show_file( 'issue.txt' );

			if (GET.has('username')) self.elements.userName.value = GET.get('username');
			if (GET.has('nickname')) self.elements.nickName.value = GET.get('nickname');
			if (GET.has('password')) self.elements.passWord.value = GET.get('password');

			if (GET.has('login')) setTimeout( ()=>{
				self.elements.login.click();
				self.elements.enter.click();
			}, 0);

			if (self.elements.terminal.classList.contains( 'enabled' )) {
				setTimeout( focus_prompt, 100 );
			} else {
				setTimeout( ()=>{
					document.querySelector( 'form [name=nickname]' ).focus();
				}, 100);
			}

			self.status( 'Ready.' );
		}

		init_prompt();

		if (!true) setTimeout( ()=>{   //...
			self.elements.nickName.focus();
			console.log( 'login' );
		}, 200 );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
