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

	if (DEBUG.WINDOW_APP) window.CEP = this;

	this.history;
	this.audioContext;
	this.toggles;

	this.requestId;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let CEP_VERSION = 'v0.3.1α';   // Keyboard shortcuts will be appended in  self.init()

	const EXTRA_LINES = 0;   // When adjusting textarea size (rows), make it bigger
	const MIN_LINES   = 0;   // When adjusting textarea size (rows), make it at least this

	const BUTTON_SCRIPTS = [
// self.elements[menu]
{ menu:'auth' , name:'login',   script:'session\n\tlogin\n\t\tusername: %u\n\t\tpassword: %p\n\t\tfactor2: %t\n%N\n' },
{ menu:'auth' , name:'connect'    , script:'/connect ' + SETTINGS.WEBSOCKET.URL },
{ menu:'auth' , name:'guest'      , script:'session\n\tlogin\n\t\tusername: guest\n%N' },
{ menu:'auth' , name:'logout'     , script:'session\n\tlogout' },
{ menu:'auth' , name:'disconnect' , script:'/disconnect' },
{ menu:'auth' , name:'user'       , script:'session\n\tlogin\n\t\tusername: user\n\t\tpassword: pass2\n%N' },
{ menu:'auth' , name:'root'       , script:'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\n%N' },
{ menu:'main' , name:'restart'    , script:'server\n\trestart\n\t\ttoken: ' },
{ menu:'main' , name:'reset'      , script:'server\n\trestart\n\t\ttoken: ' },
{ menu:'main' , name:'RSS'        , script:'rss\n\treset\n\ttoggle:all\n\tupdate' },
{ menu:'main' , name:'kroot'      , script:'session\n\tkick\n\t\tusername: root' },
{ menu:'main' , name:'kuser'      , script:'session\n\tkick\n\t\tusername: user' },
{ menu:'main' , name:'vStat'      , script:'server\n\tstatus' },
{ menu:'main' , name:'nStat'      , script:'session\n\tstatus' },
{ menu:'main' , name:'token'      , script:'server\n\ttoken' },
{ menu:'main' , name:'who'        , script:'session\n\twho' },
{ menu:'node' , name:'clear'      , script:'/clear' },
{ menu:'node' , name:'help'       , script:'/help' },
{ menu:'node' , name:'manual'     , script:'/manual' },
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
	</main><!-- main needs to be before header in the DOM for position:absolute in dropdowns to work -->

	<header class="toolbar">
		<nav class="node">
			<button title="MyNode Server">MyNode</button>
			<div class="items"></div>
		</nav>
		<nav class="list who" title="List of connected users"></nav>
		<nav class="room" title="Chat text gets sent to this channel"><span>Public Room <q>Spielwiese</q></span></nav>
	</header>

	<footer class="toolbar">
		<nav class="connection">
			<button title="Connection state, or your user/nick name">OFFLINE</button>
			<div class="items"></div>
		</nav>
		<nav class="status">
			<span class="time"></span>
			<span class="extra"></span>
		</nav>
		<nav class="list toggle_state" title="Toggle states, shown as Alt+Key shortcuts"><span></span></nav>
		<nav title="Clears input/screen. Shortcuts: Ctrl+Home, Ctrl+Shift+Home">
			<button class="clear" title="Clears input/screen. Shortcuts: Ctrl+Home, Ctrl+Shift+Home">Clear</button>
		</nav>
		<nav class="auth">
			<button class="enter" title="Execute command/send chat text. Keyboard: Enter">Enter</button>
			<form class="items">
				<nav class="toggles">
					<button class="enabled">Toggle</button>
					<div class="items">
						<button class="close" title="Minimize terminal. Shortcut: Alt+T">Terminal</button>
						<button class="debug" title="Toggle chat/debug mode. Shortcut: Alt+D">Chat Mode</button>
					</div>
				</nav>
				<nav class="filter">
					<button class="enabled">Filter</button>
					<div class="items"></div>
				</nav>
				<nav class="main">
					<button class="token">Token</button>
					<div class="items"></div>
				</nav>
				<input type="text"     name="username" placeholder="Username" autocomplete="username">
				<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname" Xautofocus>
				<input type="password" name="password" placeholder="Password" autocomplete="password">
				<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
			</form>
		</nav>
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


	// KEYBOARD SHORTCUTS
	// Atm. only Alt+Key works with toggles
	//  create_toggles()  adds more entries
	const KEYBOARD_SHORTCUTS = [{
		event     : 'keydown',
		key       : 'l',
		modifiers : ['alt'],
		action    : ()=>{ self.elements.login.click(); self.elements.enter.click(); },
	},{
/**/
		event     : 'keydown',
		key       : 'a',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.animate.toggle(); },
	},{
		event     : 'keydown',
		key       : 'b',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.bit.toggle(); },
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
		key       : 'm',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.tts.toggle(); },
	},{
		event     : 'keydown',
		key       : 'r',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.scroll.toggle(); },
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
		key       : 'v',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.overflow.toggle(); },
	},{
		event     : 'keydown',
		key       : 'y',
		modifiers : ['alt'],
		action    : ()=>{ self.toggles.last.toggle(); },
	},{
/**/
		event     : 'keydown',
		key       : '+',
		modifiers : ['alt'],
		action    : ()=>{ self.changeFontSize(+1); },
	},{
		event     : 'keydown',
		key       : '-',
		modifiers : ['alt'],
		action    : ()=>{ self.changeFontSize(-1); },
	},{
		event     : 'keydown',
		key       : '.',
		modifiers : ['alt'],
		action    : ()=>{ self.nextFont(+1) },
	},{
		event     : 'keydown',
		key       : ',',
		modifiers : ['alt'],
		action    : ()=>{ self.nextFont(-1) },
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
			connection   : container.querySelector( '.connection'        ),
			btnCEP       : container.querySelector( '.connection button' ),
			shell        : container.querySelector( '.shell'             ),
			// Main
			output       : container.querySelector( 'output'             ),
			input        : container.querySelector( 'textarea'           ),
			// Header
			btnNode      : container.querySelector( 'nav.node button'    ),
			who          : container.querySelector( 'button.who'         ),
			whoList      : container.querySelector( 'nav.who'            ),
			filter       : container.querySelector( '.filter .items'     ),
			toggleState  : container.querySelector( '.toggle_state span' ),
			btnFilter    : container.querySelector( '.filter button'     ),
			toggles      : container.querySelector( '.toggles .items'    ),
			btnToggles   : container.querySelector( '.toggles button'    ),
			token        : container.querySelector( 'button.token'       ),
			// Footer
			connection   : container.querySelector( '.connection'        ),
			windows      : container.querySelector( '.list.windows'      ),
			status       : container.querySelector( '.status .extra'     ),
			time         : container.querySelector( '.time'              ),
			chat         : container.querySelector( '.chat .items'       ),
			// Menus
			node         : container.querySelector( '.node .items'       ),
			auth         : container.querySelector( '.auth .items'       ),
			main         : container.querySelector( '.main .items'       ),
			// Clear
			clear        : container.querySelector( 'button.clear'       ),
			// Login form
			userName     : container.querySelector( '[name=username]'    ),
			nickName     : container.querySelector( '[name=nickname]'    ),
			passWord     : container.querySelector( '[name=password]'    ),
			factor2      : container.querySelector( '[name=factor2]'     ),
			// Additional menu buttons are addeded to .elements later under "Login form"
			enter        : container.querySelector( '.enter'             ),
			close        : container.querySelector( '.close'             ),//...! => exit
			// Filter
			debug        : container.querySelector( 'button.debug'       ),
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

		const definition = [   //...! Sync with keyboard shortcuts
{ name:'terminal'   , preset:T.TERMINAL   , target:terminal , menu:null      , shortcut:'T',  caption:null         },
{ name:'debug'      , preset:F.CHAT       , target:shell    , menu:null      , shortcut:'D',  caption:null         },
{ name:'cep'        , preset:F.CEP        , target:output   , menu:'filter'  , shortcut:null, caption:'CEP'        },
{ name:'string'     , preset:F.STRING     , target:output   , menu:'filter'  , shortcut:null, caption:'String'     },
{ name:'notice'     , preset:F.NOTICE     , target:output   , menu:'filter'  , shortcut:null, caption:'Notice'     },
{ name:'broadcast'  , preset:F.BROADCAST  , target:output   , menu:'filter'  , shortcut:null, caption:'Broadcast'  },
{ name:'update'     , preset:F.UPDATE     , target:output   , menu:'filter'  , shortcut:null, caption:'Update'     },
{ name:'request'    , preset:F.REQUEST    , target:output   , menu:'filter'  , shortcut:null, caption:'Request'    },
{ name:'response'   , preset:F.RESPONSE   , target:output   , menu:'filter'  , shortcut:null, caption:'Response'   },
{ name:'last'       , preset:T.LAST       , target:output   , menu:'toggles' , shortcut:'Y',  caption:'Show Last'  },
{ name:'compact'    , preset:T.COMPACT    , target:output   , menu:'toggles' , shortcut:'C',  caption:'Compact'    },
{ name:'overflow'   , preset:T.OVERFLOW   , target:output   , menu:'toggles' , shortcut:'V',  caption:'Overflow'   },
{ name:'separators' , preset:T.SEPARATORS , target:output   , menu:'toggles' , shortcut:'S',  caption:'Separators' },
{ name:'scroll'     , preset:T.SCROLL     , target:output   , menu:'toggles' , shortcut:'R',  caption:'AutoScroll' },
{ name:'fancy'      , preset:T.FANCY      , target:terminal , menu:'toggles' , shortcut:'F',  caption:'Fancy'      },
{ name:'animate'    , preset:T.ANIMATE    , target:terminal , menu:'toggles' , shortcut:'A',  caption:'Animations' },
{ name:'keyBeep'    , preset:T.KEY_BEEP   , target:terminal , menu:'toggles' , shortcut:'K',  caption:'Key Beep'   },
{ name:'tts'        , preset:T.TTS        , target:terminal , menu:'toggles' , shortcut:'M',  caption:'Speech'     },
{ name:'bit'        , preset:T.BIT        , target:terminal , menu:'toggles' , shortcut:'B',  caption:'Bit'        },
		]; // definition

		return definition.map( to_toggles ).reduce( to_dict, /*initialValue*/{} );

		function to_dict (prev, next) {
			return { ...prev, [next.name]: next };
		}

		function to_toggles (toggle) {
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

			if (!true && toggle.shortcut) {
				KEYBOARD_SHORTCUTS.push({
					event     : 'keydown',
					key       : toggle.shortcut,
					modifiers : ['alt'],
					action    : ()=>{ self.toggles[toggle.name].toggle(); },
				});
			}

			toggle = {
				enabled : toggle.preset,
				...toggle,
				enable  : ()     =>{ flip( true  ); },
				disable : ()     =>{ flip( false ); },
				toggle  : (state)=>{ flip( state ); },
			};

			if (element.tagName == 'BUTTON') {   //...? Do we still have non-buttons?
				element.addEventListener( 'click', ()=>{
					flip();
					focus_prompt();
				});
			}

			update_dom();

			return toggle;


			function update_dom () {
				const is_terminal = (toggle.name == 'terminal');
				if (!is_terminal && element) element.classList.toggle( 'enabled', toggle.enabled );
				target.classList.toggle( is_terminal ? 'enabled' : toggle.name, toggle.enabled );

				scroll_down();
				if (is_terminal && toggle.enabled) focus_prompt();
				setTimeout( update_toggle_state );

			} // update_dom


			function flip (new_state = null) {
				//...console.log( 'flip:', toggle, typeof new_state );
				const just_toggle = (new_state === null) || (typeof new_state == 'event');
				toggle.enabled = just_toggle ? !toggle.enabled : new_state;
				update_dom();
				 if (toggle.name == 'terminal') {
					self.elements.html.classList.toggle( 'animate', !toggle.enabled );
				}

				self.bit.say( toggle.enabled );//..., /*delay*/0, (toggle.name == 'tts') );

				let blink_button = self.elements.btnToggles;
				if (toggle.name == 'debug')  blink_button = self.elements.debug;
				if (toggle.menu == 'filter') blink_button = self.elements.btnFilter;

				blink_button.classList.add( 'blink', toggle.enabled ? 'success' : 'error' );
				setTimeout( ()=>{
					blink_button.classList.remove( 'blink', 'success', 'error' );
				}, 350 );
			} // flip

		} // to_toggles

		function update_toggle_state () {
			const has_shortcut = toggle => toggle.shortcut !== null;
			const to_character = toggle => (
				toggle.enabled
				? '<b>' + toggle.shortcut.toLowerCase() + '</b>'
				: toggle.shortcut.toLowerCase()
			);

			self.elements.toggleState.innerHTML = (
				Object.values( self.toggles )
				.sort( (a, b) => a.shortcut > b.shortcut ? +1 : -1 )
				.filter( has_shortcut )   // Only those with a keyboard shortcut
				.sort( (a, b)=>(a.shortcut > b.shortcut) ? +1 : -1 )
				.map( to_character )   // Uppercase for enabled toggles
				.join('')
			);

		} // update_toggle_state

	} // create_toggles


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// AUDIO
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
// DOM
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function animate_ping (transmit = false) {
		self.elements.btnNode   .classList.add( transmit ? 'transmit' : 'ping' );
		self.elements.connection.classList.add( transmit ? 'transmit' : 'ping' );
		setTimeout( ()=>{
			self.elements.btnNode   .classList.remove( transmit ? 'transmit' : 'ping' );
			self.elements.connection.classList.remove( transmit ? 'transmit' : 'ping' );
		}, SETTINGS.TIMEOUT.PING_CSS);

	} // animate_ping


/*
		const cssvar_height
		= getComputedStyle( document.documentElement )
		.getPropertyValue( '--terminal-line-height' )
		;
*/
	const FONT_NAMES = [
		'Terminus',
		'WhiteRabbit',
		'ModeSeven',
		'Digit-V4Wl',
/*
		'CenturyGothic',
		'DIGIT',
		'fa-brands-400',
		'fa-regular-400',
		'fa-solid-900',
		'SETIPERU',
*/
	];

	this.setFont = function (font_index = 0) {
		//...const new_font_name = FONT_NAMES[font_index] || FONT_NAMES[0];
		//...self.elements.terminal.style.setProperty( '--font-family', new_font_name );

		for (let i = 0; i < FONT_NAMES.length; ++i) {
			self.elements.terminal.classList.remove( 'font' + i );
		}

		self.elements.terminal.classList.add( 'font' + font_index );

	} // setFont


	this.nextFont = function (delta = 1) {
		const nr_fonts = FONT_NAMES.length;
		const t        = self.elements.terminal;

		let index = -1;
		for (let i = 0; i < nr_fonts; ++i) {
			const class_name = 'font' + i;
			if (t.classList.contains( class_name )) index = i;
			t.classList.remove( class_name );
		}

		if (index < 0) {
			index = 1;
		} else {
			index = ((index + delta + nr_fonts) % nr_fonts);
		}
		const new_class = 'font' + index;

		t.classList.add( new_class );

		console.log( 'Terminal', new_class, FONT_NAMES[index] );
		self.status( 'Font ' + FONT_NAMES[index] + ' was selected' );

	}; // nextFont


	this.changeFontSize = function (delta_px) {
		const css_size     = getComputedStyle( self.elements.terminal ).getPropertyValue('--font-size');
		const current_size = parseInt( css_size.slice(0, -2), 10 );
		const new_size     = Math.min( 100, Math.max( 3, current_size + delta_px ));

		self.elements.terminal.style.setProperty( '--font-size', new_size+'px' );

		console.log( 'Terminal font size', new_size );

	}; // changeFontSize


	this.reloadCSS = function  () {
		const head        = document.querySelector('head');
		const remove_link = head.querySelector( '[rel=stylesheet]' );
		const new_link    = document.createElement( 'link' );

		new_link.rel  = 'stylesheet';
		new_link.href = 'spielwiese.css?' + Date.now();
		new_link.type = 'text/css';

		head.appendChild( new_link );

		new_link.addEventListener( 'load', ()=>{
			self.status( 'Styles reloaded.', /*clear*/true );
			remove_link.parentNode.removeChild( remove_link );
		});

	}; // reloadCSS


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

	 	} else if ((event.keyCode == 13) && (event.shiftKey || !event.ctrlKey || !event.altKey)) {
			const text = self.elements.input.value;
			if (text.charAt( 0 ) == '.') {
				self.elements.input.value = parse_short_request( text );
				adjust_textarea();
				return;
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
		const in_input    = event.target === input;

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
				inInput    : modifiers.indexOf( 'inInput'    ) >= 0,
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

	function on_script_button_click (event) {
		if (!event.target.dataset.command) return;

		event.preventDefault();
		self.elements.input.value = parse_button_script( event.target.className );
		adjust_textarea();
		scroll_down();

	} // on_script_button_click


	function on_click (event) {
		if (event.target.tagName == 'BUTTON') beep();

		const iframe = event.target.querySelector( 'iframe' )
		if (iframe) {
			self.elements.output.scrollTop = event.target.offsetTop - 15;
		}

		if (event.target.closest('.toggle_state')) {
			self.elements.enter.focus();
			setTimeout( ()=>self.elements.btnToggles.focus() );
		}

		const closest_pre = event.target.closest( 'pre' );
		if (event.ctrlKey && closest_pre) {
			closest_pre.parentNode.removeChild( closest_pre );
		}

		if      (event.target === self.elements.output) focus_prompt( -1 )//... Expand eats this
		else if (event.target === self.elements.input ) focus_prompt(  0 )
		else if (event.target === self.elements.shell ) focus_prompt( +1 )
		;

		if      (event.target === self.elements.asRoot ) fill( 'root'  , '12345' )
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

		if (event.target.parentNode === self.elements.output) {
			// Toggle .compact
			const last_element    = self.elements.output.querySelector( ':scope > :last-child' );
			const clicked_element = event.target.closest( 'pre' );
			if (clicked_element === last_element) {
				// Don't .compact, instead toggle "uncollapse last message"
				self.toggles.last.toggle();
			}

				event.target.classList.toggle( 'expand' );     // Force it to expand
				event.target.classList.toggle( 'unexpand' );   //...Keep track of user-clicked expands

			return;
		}

		const shift = event.shiftKey;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;

		const connected = true;//...callback.isConnected();
		const command   = event.target.dataset.command;

		if (command) {
			// Command menu button was clicked
			event.preventDefault();
			self.elements.input.value = parse_button_script( command );
			self.elements.enter.click();

		} else {
			focus_prompt();
		}

	} // on_dblclick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INPUT
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


// PARSERS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function parse_button_script (script_name) {
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

	} // parse_button_script


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

		if (text.trim() == '') {
			if (event.button === 0) {
				if (is_scrolled_up()) scroll_down(); else self.print( '', 'mark' );
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
				case 'help'    :  show_file( 'help.txt'       , parameter );  break;
				case 'issue'   :  show_file( 'issue.txt'      , parameter );  break;
				case 'readme'  :  show_file( 'README'         , parameter );  break;
				case 'manual'  :  show_file( 'MyNode.html'    , parameter );  break;
				case 'diary'   :  show_file( 'dev_diary.html' , parameter );  break;
				case 'music': {
					document.body.innerHTML += HTML_YOUTUBE;
					break;
				}
				case 'string' : {
					self.print( 'string: <q>' + parameter + '</q>', 'string' );
					callback.send( parameter );
					break;
				}
				default: {
					self.elements.connection.classList = 'connection error';
					self.elements.btnCEP.innerText = 'Error';
					self.elements.title = 'Unknown command in perform_local()';
					self.print( 'Unrecognized command', 'cep' );
					throw new Error(
						'DebugConsole-on_enter_click-perform_local: Unrecognized command'
					);
				}
			}

			return true;

		} // perform_local


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

		} // remote_command

	} // on_enter_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// OUTPUT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function print_version () {
		self.print( 'CEP-' + CEP_VERSION, 'cep' );

	} // print_version


	function scroll_down () {
		if (!self.toggles//...?
		|| self.toggles && self.toggles.scroll.enabled) {
			self.elements.output.scrollBy(0, 99999);
		}

	} // scroll_down


	function is_scrolled_up () {
		const client = self.elements.output.clientHeight;
		const height = self.elements.output.scrollHeight;
		const top    = self.elements.output.scrollTop;
		console.log( 'is_scrolled_up: clientHeight:', client, 'scrollHeight:', height, 'scrollTop:', top );
		return (height - client) - top;

	} // is_scrolled_up


	async function show_file (file_name, id_selector) {
		const file_contents = await fetch( file_name ).then( (response)=>{
			if (! response.ok) throw new Error( 'HTTP error, status = ' + response.status );
			return response.text();   // returns a Promise
		});

		const file_extension = file_name.split('.').pop();

		switch (file_extension) {
			case 'html': {
				self.toggles.debug.disable();
				const initial_scroll_toggle = self.toggles.scroll.enabled;
				const iframe     = document.createElement( 'iframe' );
				iframe.src       = file_name + '?included' + (id_selector ? '#'+id_selector : '');
				iframe.className = 'cep htmlfile expand';
				iframe.setAttribute( 'tabindex'    , '0' );
				iframe.setAttribute( 'frameborder' , '0' );
				iframe.setAttribute( 'scrolling'   , 'yes' );
				iframe.addEventListener( 'load', ()=>{
					iframe.style.height = (
						iframe.contentWindow.document.documentElement.scrollHeight + 'px'
					);
					scroll_down();
					self.toggles.scroll.disable();
				});
				const last_print = self.elements.output.querySelector( ':scope > :last-child' );
				iframe.addEventListener( 'click', (event)=>{
					self.elements.output.scrollTop = last_print.offsetTop - 15;
				});
				self.toggles.scroll.toggle( initial_scroll_toggle );
				last_print.innerHTML += '\n';
				last_print.appendChild( iframe );
				break;
			}
			case 'txt': // fall through
			default: {
				self.print(
					file_contents.split( '//EOF' )[0].trim(),
					'cep textfile expand',
				);
				scroll_down();
			}
		}

	} // show_file


// PRINT /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
		const do_scroll = (o.scrollHeight - o.scrollTop >= o.clientHeight - 1);

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

		scroll_down();


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
		self.elements.output.innerHTML = self.elements.input.value = '';

	} // clearScreen


	this.clearInput = function () {
		self.elements.input.value = '';
		scroll_down();

	} // clearInput


// STATUS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let status_messages = [];
	let status_timeout = null;

	this.status = function (html = '', clear = false) {
		if (clear) {
			status_messages = [];
			clearTimeout( status_timeout );
			return self.status( html );
		}

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
					if (status_timeout === null) {
						self.status( null );
						self.elements.time.classList.remove( 'fade_out' );
					}
				}, 1000)
			} else {
				self.elements.status.classList.add( 'fade_out' );
				self.elements.time  .classList.add( 'fade_out' );

				status_timeout = setTimeout( ()=>{
					self.elements.status.classList.remove( 'fade_out' );
					self.elements.status.innerHTML = clean(
						( status_messages.shift()
						).replaceAll(
							'<a href',
							'<a target="_blank" href',
						)
					);

					setTimeout( next, SETTINGS.TIMEOUT.STATUS_SHOW );

				}, SETTINGS.TIMEOUT.STATUS_FADE );
			}
		}

		const allowed_chars = 'abcdefghijklmnopqrstuvwxyz0123456789 .,;:!?+-"\'*$%&/|\\()[<>]{}ßäöü~#_@€';
		const only_allowed  = char => (allowed_chars.indexOf(char.toLowerCase()) >= 0);
		function clean (html) {
			return (html === null) ? null : (
				html
				.split( '\n' )[0]
				.split( '' )
				.filter( only_allowed )
				.join( '' )
			);
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onSocketOpen = function () {
		self.elements.connection.classList = 'connection connected';
		self.elements.btnCEP.innerText = 'Connected';
		self.elements.title = SETTINGS.WEBSOCKET.URL;

		self.elements.terminal.classList.add( 'connected' );

	}; // onSocketConnect


	this.onSocketClose = function () {
		self.elements.connection.classList = 'connection';
		self.elements.btnCEP.innerText = 'Offline';
		self.elements.title = '';

		self.elements.btnNode.innerText = 'MyNode';
		self.elements.whoList.innerHTML = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketClose


	this.onSocketError = function () {
		self.onSocketClose();
		self.elements.connection.classList = 'connection error';
		self.elements.btnCEP.innerText = 'Error';
		self.elements.title = '';

		self.elements.btnNode.innerText = 'MyNode';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketError


// RECEIVE ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onReceive = function (message) {

		function print_message () {
			let class_name = 'response';
			if      (typeof message == 'string')              class_name = 'string expand'
			else if (typeof message.cep       != 'undefined') class_name = 'cep expand'
			else if (typeof message.notice    != 'undefined') class_name = 'notice'
			else if (typeof message.broadcast != 'undefined') class_name = 'broadcast'
			else if (typeof message.update    != 'undefined') class_name = 'update'
			;

			self.print( message, class_name );

		} // print_message


		function update_who_list (who, full_name = '') {
			const list  = self.elements.whoList;
			list.innerHTML = '';
			if (who === null) return;

			Object.keys( who ).forEach( (address)=>{
				const user_record = who[address];

				const button = document.createElement( 'button' );
				button.innerText
				= (typeof user_record == 'string')
				? user_record
				: user_record.nickName || user_record.userName
				;

				const current_nick = full_name;
				if (button.innerText == current_nick) {
					button.classList.add( 'self' );
				}
				list.appendChild( button );
			});

		} // update_who_list


		if (!message.update || !message.update.ping) animate_ping( /*transmit*/true );

		// See  WebSocketClient.send()
		try   { message = JSON.parse( event.data ); }
		catch { /* Assume string */ }

		const root_key = Object.keys( message )[0];
		switch (root_key) {
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
case 'update': {
	switch (message.update.type) {
		case 'session/ping': {
			if (!DEBUG.HIDE_MESSAGES.PING) print_message();
			callback.send( {session:{ pong: message.update.pong }} );
			animate_ping();
			return;
		}
		case 'server/name': {
			self.elements.btnNode.innerText = message.update.name;
			update_who_list( null ); //{dummy:'Logged out'} );
			return print_message();
		}
		case 'chat/say': {
			if (!DEBUG.HIDE_MESSAGES.CHAT) print_message();
			const sender = message.update.nickName || message.update.userName;
			self.print( {[sender]: message.update.chat}, 'chat' );
			return;
		}
		case 'chat/html': {
			self.print({ html: message.update.html });
			return print_message();
		}
	}

	return self.print( message, 'update error' );
} // update

case 'broadcast': {
	switch (message.broadcast.type) {
		case 'rss': {
			Object.values( message.broadcast.items )
			.forEach( (entry, index)=>{
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
			break;
		}
		case 'error': {
			self.status(
				'<span><span class="warning">Warning</span>: '
				+ message.broadcast.error
				+ '</span>'
				,
				/*clear*/true,
			);
			break;
		}
		case 'reload/server': // fall through
		case 'reload/client': {
			Object.keys( message.broadcast.reload )
			.forEach( (file_name)=>{
				if (message.broadcast.type == 'reload/client') {
					switch (file_name) {
						case 'spielwiese.css': {
							self.reloadCSS();
							return print_message();
						}
						case 'debug_console.js' :  // fall through
						case 'main.js'          :  // fall through
						case 'index.html'       : {
							location.reload();
							return;
						}
					}
				}

				self.status(
					'The file ' + file_name + ' has been updated.',
				);
			});

			return print_message();
			break;
		}
		case 'chat/nick'          : // fall through
		case 'session/connect'    : // fall through
		case 'session/login'      : // fall through
		case 'session/logout'     : // fall through
		case 'session/disconnect' : {
			update_who_list( message.broadcast.who );
			break;
		}
	}

	break;
} // broadcast

case 'response': {
	const response = message.response;
	const result   = message.response.result;

	switch (response.command) {
		case 'session.login': {
			if (response.result != 'Already logged in') {
				self.elements.terminal.classList.add( 'authenticated' );
				self.elements.btnCEP.innerText
				= result.login.nickName || result.login.userName;
			}
			if (response.success) update_who_list( result.who, result.login.userName );
			break;
		}
		case 'session.logout': {
			self.elements.terminal.classList.remove( 'authenticated' );
			self.elements.btnCEP.innerText = 'Connected';
			if (response.success) update_who_list( null ); //{dummy:'Logged out'} );
			break;
		}
		case 'session.who': {
			if (response.success) update_who_list( result );
			break;
		}
		case 'chat.nick': {
			if (response.success) {
				const parts = self.elements.btnCEP.innerText.split(':');
				const new_name = result.userName + ':' + result.nickName;
				self.elements.btnCEP.innerText = new_name;
			}
			break;
		}
	}

	break;
} // response
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		}

		return print_message();

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
console.groupCollapsed( 'KEYBOARD_SHORTCUTS' );
console.table( KEYBOARD_SHORTCUTS );
console.groupEnd();

		// Disable <form> submission
		self.elements.terminal.querySelectorAll( 'form' ).forEach( (form)=>{
			form.addEventListener( 'submit', event => event.preventDefault() );
		});


		// Resume audio context after page load
		function activate_audio () {
			self.audioContext = new(window.AudioContext || window.webkitAudioContext)();
			if (self.audioContext.state == 'suspended') self.audioContext.resume();
			removeEventListener( 'keydown', activate_audio );
			removeEventListener( 'mouseup', activate_audio );
			self.status( 'Audio context resumed.', /*clear*/true );
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
			const existing   = self.elements[script.name];
			const new_button =  existing || document.createElement( 'button' );
			new_button.dataset.command = script.name;
			new_button.className       = script.name;
			new_button.innerText       = script.name.charAt(0).toUpperCase() + script.name.slice(1);
			new_button.title           = new_button.title || 'Double click to execute immediately';
			new_button.addEventListener( 'click', on_script_button_click );

			if (!existing) self.elements[script.menu].appendChild( new_button );
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

		self.elements.terminal.querySelectorAll( '.node input' ).forEach( (input)=>{
			input.addEventListener( 'input'  , ()=>self.elements.login.click() );
			input.addEventListener( 'change' , ()=>self.elements.login.click() );
		});
		self.elements.enter.addEventListener( 'keydown', (event)=>{
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

		async function init_prompt () {
			self.setFont();

			// Find shortcuts and add list of keys to CEP_VERSION
			const toggles    = sc => (sc.modifiers.length == 1) && (sc.modifiers[0] == 'alt');
			const characters = toggle => toggle.key
			const shortcuts  = KEYBOARD_SHORTCUTS.filter( toggles ).map( characters ).join('');

			CEP_VERSION += '^' + shortcuts.split('').sort().join('');   // For .help
			print_version();
			//...if (!GET.has('login')) await show_file( 'issue.txt' );
			await show_file( 'issue.txt' );

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

			if (!self.audioContext || (self.audioContext.state == 'suspended')) {
				self.status( 'User gesture required to activate audio.' );
			}
		}

		init_prompt();

		return Promise.resolve();

	}; // init

	self.init().catch( watchdog ).then( ()=>self );   // const console = await new DebugConsole()

}; // DebugConsole


//EOF
