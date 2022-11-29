// terminal.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS       } from '../config.js';
import { PRESETS, DEBUG } from '../config.js';
import { GET            } from '../helpers.js';
import { StatusBar      } from './status.js';
import { DomActions     } from './dom_actions.js';
import { Audio          } from './audio.js';
import { create_toggles } from './toggles.js';
import { handle_message } from './handle_message.js'
import { CEPShell       } from './shell/shell.js';


export const DebugConsole = function (callback) {
	const self = this;

	if (DEBUG.WINDOW_APP) window.CEP = this;

	// Sub-objects
	this.dom;         // DomActions() - Activate CSS animations, populate listWHo, ...
	this.toggles;     // Options that can be toggled, connected to their buttons in the Toggle menu
	this.audio;       // Sound effects (Keyboard beep and speech synthesis)
	this.bit;         // The bit. It can say "yes" or "now" and glow green or red accordingly
	this.status;      // Text shown in the footer toolbar. When nothing to show, displays the time.

	// Properties
	this.elements;    // Quick access to buttons, menus, etc. Will be queryRequest'ed from HTML_TERMINAL
	                  // and extended when buttons and toggles are created
	this.fontNames;   // Available fonts, extracted from CSS variables


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const HTML_TERMINAL = (`
<div class="terminal loading">
	<main class="chat shell"><!-- //...? Must be first in DOM to allow popup menus in header -->
		<output></output>
		<textarea autocomplete="off"></textarea>
	</main><!-- main needs to be before header in the DOM for position:absolute in dropdowns to work -->

	<header class="toolbar">
		<nav class="node auth">
			<button title="MyNode Server">MyNode</button>
			<form class="items">
				<input type="text"     name="username" placeholder="Username" autocomplete="username">
				<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname" Xautofocus>
				<input type="password" name="password" placeholder="Password" autocomplete="password">
				<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
			</form>
		</nav>
		<nav class="list who" title="List of connected users"></nav>
	</header>

	<footer class="toolbar">
		<nav class="connection">
			<button title="Connection state, or your user/nick name">OFFLINE</button>
			<div class="items">
				<nav class="filter">
					<button>Filter</button>
					<div class="items"></div>
				</nav>
				<nav class="toggles">
					<button>Toggle</button>
					<div class="items"></div>
				</nav>
			</div>
		</nav>
		<nav class="status">
			<span class="time"></span>
		</nav>
		<nav class="list toggle_state" title="Toggle states, shown as Alt+Key shortcuts"></nav>
		<nav title="Clears input/screen. Shortcuts: Ctrl+Home, Ctrl+Shift+Home">
			<button class="clear" title="Clears input/screen. Shortcuts: Ctrl+Home, Ctrl+Shift+Home">Clear</button>
		</nav>
		<nav class="main" title="Clears input/screen. Shortcuts: Ctrl+Home, Ctrl+Shift+Home">
			<button class="enter" title="Execute command/send chat text. Keyboard: Enter">Enter</button>
			<div class="items">
				<button class="help">Help</button>
				<button class="close" title="Minimize terminal. Shortcut: Alt+T">Exit</button>
			</div>
		</nav>
	</footer>
</div>
	`); // HTML_TERMINAL


	const ELEMENT_SELECTORS = {
		html        : 'html',
		terminal    : true,  // Points to the container itself
		shell       : '.shell',
		output      : '.shell output',
		input       : '.shell textarea',
	// Gadgets
		navCEP      : '.connection',
		navWho      : 'nav.who',
		navStatus   : 'nav.status',
		toggleState : '.toggle_state',
	// Menu items
		authItems   : '.auth .items',
		mainItems   : '.main .items',
		filterItems : '.filter .items',
		toggleItems : '.toggles .items',
	// Buttons
		btnCEP      : '.connection button',
		btnNode     : 'nav.node button',
		btnFilter   : '.filter button',
		btnToggles  : '.toggles button',
		//... These buttons have "simple names", so they can be used in BUTTON_SCRIPTS with less effort
		help        : 'button.help',
		btnClear    : 'button.clear',
		btnEnter    : 'button.enter',
		btnClose    : 'button.close',
	// Login form
		userName    : '[name=username]',
 		nickName    : '[name=nickname]',
		passWord    : '[name=password]',
		factor2     : '[name=factor2]',
		login       : 'button.login',
		logout      : 'button.logout',
		disconnect  : 'button.disconnect',
		asGuest     : 'button.asGuest',
		asUser      : 'button.asUser',
		asRoot      : 'button.asRoot',

	}; // ELEMENT_SELECTORS


	// KEYBOARD SHORTCUTS
	function shortcut_exec (command_button) {
		[command_button, 'btnEnter'].forEach( button => self.elements[button].click() );
	}
	const KEYBOARD_SHORTCUTS = [
  { event:'keydown', key:'+'         , modifiers:['alt']           , action:()=>{ self.dom.changeFontSize(+1); },
},{ event:'keydown', key:'-'         , modifiers:['alt']           , action:()=>{ self.dom.changeFontSize(-1); },
},{ event:'keydown', key:'.'         , modifiers:['alt']           , action:()=>{ self.dom.nextFont(+1)        },
},{ event:'keydown', key:','         , modifiers:['alt']           , action:()=>{ self.dom.nextFont(-1)        },
},{ event:'keydown', key:'ArrowUp'   , modifiers:['cursorPos1']    , action:()=>{ self.history.back();         },
},{ event:'keydown', key:'ArrowDown' , modifiers:['cursorEnd']     , action:()=>{ self.history.forward();      },
},{ event:'keydown', key:'Home'      , modifiers:['ctrl']          , action:()=>{ self.shell.clearInput();     },
},{ event:'keydown', key:'Home'      , modifiers:['shift', 'ctrl'] , action:()=>{ self.shell.clearScreen();    },
},{ event:'keydown', key:'PageUp'    , modifiers:['shift']         , action:()=>{ self.shell.scrollPageUp();   },
},{ event:'keydown', key:'PageDown'  , modifiers:['shift']         , action:()=>{ self.shell.scrollPageDown(); },
},{ event:'keydown', key:'Delete'    , modifiers:['shift', 'ctrl'] , action:()=>{ self.shell.deleteToMarker(); },
// Toggles
},{ event:'keydown', key:'a', modifiers:['alt'], action:()=>{ self.toggles.animate   .toggle(); },
},{ event:'keydown', key:'b', modifiers:['alt'], action:()=>{ self.toggles.bit       .toggle(); },
},{ event:'keydown', key:'c', modifiers:['alt'], action:()=>{ self.toggles.compact   .toggle(); },
},{ event:'keydown', key:'e', modifiers:['alt'], action:()=>{ shortcut_exec( 'disconnect' );    },
},{ event:'keydown', key:'f', modifiers:['alt'], action:()=>{ self.toggles.fancy     .toggle(); },
},{ event:'keydown', key:'k', modifiers:['alt'], action:()=>{ self.toggles.keyBeep   .toggle(); },
},{ event:'keydown', key:'l', modifiers:['alt'], action:()=>{ self.toggles.light     .toggle(); },
},{ event:'keydown', key:'m', modifiers:['alt'], action:()=>{ self.toggles.tts       .toggle(); },
},{ event:'keydown', key:'p', modifiers:['alt'], action:()=>{ self.toggles.ping      .toggle(); },
},{ event:'keydown', key:'q', modifiers:['alt'], action:()=>{ self.toggles.terminal  .toggle(); },
},{ event:'keydown', key:'r', modifiers:['alt'], action:()=>{ self.toggles.scroll    .toggle(); },
},{ event:'keydown', key:'s', modifiers:['alt'], action:()=>{ self.toggles.separators.toggle(); },
},{ event:'keydown', key:'v', modifiers:['alt'], action:()=>{ self.toggles.overflow  .toggle(); },
},{ event:'keydown', key:'w', modifiers:['alt'], action:()=>{ shortcut_exec( 'login' );         },
},{ event:'keydown', key:'x', modifiers:['alt'], action:()=>{ self.toggles.stripes   .toggle(); },
},{ event:'keydown', key:'y', modifiers:['alt'], action:()=>{ self.toggles.last      .toggle(); },
},
	];


	const BUTTON_SCRIPTS = [
// New buttons added to the DOM, order of entries affects positioning in menus
// Menus' .items can be pre-populated with buttons in TERMINAL_HTML
// Highlight buttons: Set special color in layout.css:/* SPECIAL COLOR */
// self.elements[menu] - Where to place the button, name is assigned to its class list
{ menu:'authItems' , name:'login'      , script:'session\n\tlogin\n\t\tusername: %u\n\t\tpassword: %p\n\t\tfactor2: %t\n%N\n' },
{ menu:'authItems' , name:'connect'    , script:'/connect ' + SETTINGS.WEBSOCKET.URL },
{ menu:'authItems' , name:'guest'      , script:'session\n\tlogin\n\t\tusername: guest\n%N' },
{ menu:'authItems' , name:'logout'     , script:'session\n\tlogout' },
{ menu:'authItems' , name:'disconnect' , script:'/disconnect' },
{ menu:'authItems' , name:'user'       , script:'session\n\tlogin\n\t\tusername: user\n\t\tpassword: pass2\n%N' },
{ menu:'authItems' , name:'root'       , script:'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\n%N' },
{ menu:'mainItems' , name:'manual'     , script:'/manual' },
{ menu:'mainItems' , name:'RSS'        , script:'rss\n\treset\n\ttoggle:all\n\tupdate' },
{ menu:'mainItems' , name:'kroot'      , script:'session\n\tkick\n\t\tusername: root' },
{ menu:'mainItems' , name:'kuser'      , script:'session\n\tkick\n\t\tusername: user' },
{ menu:'mainItems' , name:'who'        , script:'session\n\twho' },
{ menu:'mainItems' , name:'token'      , script:'server\n\ttoken' },
{ menu:'mainItems' , name:'restart'    , script:'server\n\trestart\n\t\ttoken: ' },
{ menu:'mainItems' , name:'reset'      , script:'server\n\trestart\n\t\ttoken: ' },
{ menu:'mainItems' , name:'vStat'      , script:'server\n\tstatus' },
{ menu:'mainItems' , name:'nStat'      , script:'session\n\tstatus' },
{ menu:'mainItems' , name:'help'       , script:'/help' },
	]; // BUTTON_SCRIPTS


	function create_toggles_definition() {
		// Buttons not in HTML_TERMINAL will be added by  create_toggles() .
		// Atm. only Alt+Key works with toggles

		const tH = document.documentElement;
		const tT = self.elements.terminal;
		const tO = self.elements.output;

		const T = PRESETS.TOGGLE;
		const F = PRESETS.FILTER;

		return [   //... Sync with keyboard shortcuts
{ name:'terminal'   , preset:T.TERMINAL   , target:tT , menu:null          , shortcut:'Q',  caption:null         },
{ name:'ping'       , preset:F.PING       , target:tT , menu:'filterItems' , shortcut:'P',  caption:'Ping'       },
{ name:'cep'        , preset:F.CEP        , target:tO , menu:'filterItems' , shortcut:null, caption:'CEP'        },
{ name:'string'     , preset:F.STRING     , target:tO , menu:'filterItems' , shortcut:null, caption:'String'     },
{ name:'notice'     , preset:F.NOTICE     , target:tO , menu:'filterItems' , shortcut:null, caption:'Notice'     },
{ name:'broadcast'  , preset:F.BROADCAST  , target:tO , menu:'filterItems' , shortcut:null, caption:'Broadcast'  },
{ name:'update'     , preset:F.UPDATE     , target:tO , menu:'filterItems' , shortcut:null, caption:'Update'     },
{ name:'request'    , preset:F.REQUEST    , target:tO , menu:'filterItems' , shortcut:null, caption:'Request'    },
{ name:'response'   , preset:F.RESPONSE   , target:tO , menu:'filterItems' , shortcut:null, caption:'Response'   },
{ name:'last'       , preset:T.LAST       , target:tO , menu:'toggleItems' , shortcut:'Y',  caption:'Show Last'  },
{ name:'compact'    , preset:T.COMPACT    , target:tO , menu:'toggleItems' , shortcut:'C',  caption:'Compact'    },
{ name:'overflow'   , preset:T.OVERFLOW   , target:tO , menu:'toggleItems' , shortcut:'V',  caption:'Overflow'   },
{ name:'separators' , preset:T.SEPARATORS , target:tO , menu:'toggleItems' , shortcut:'S',  caption:'Separators' },
{ name:'stripes'    , preset:T.STRIPES    , target:tO , menu:'toggleItems' , shortcut:'X',  caption:'Stripes'    },
{ name:'scroll'     , preset:T.SCROLL     , target:tO , menu:'toggleItems' , shortcut:'R',  caption:'AutoScroll' },
{ name:'light'      , preset:T.LIGHT      , target:tH , menu:'toggleItems' , shortcut:'L',  caption:'Light Mode' },
{ name:'fancy'      , preset:T.FANCY      , target:tT , menu:'toggleItems' , shortcut:'F',  caption:'Fancy'      },
{ name:'animate'    , preset:T.ANIMATE    , target:tT , menu:'toggleItems' , shortcut:'A',  caption:'Animations' },
{ name:'keyBeep'    , preset:T.KEY_BEEP   , target:tT , menu:'toggleItems' , shortcut:'K',  caption:'Key Beep'   },
{ name:'tts'        , preset:T.TTS        , target:tT , menu:'toggleItems' , shortcut:'M',  caption:'Speech'     },
{ name:'bit'        , preset:T.BIT        , target:tT , menu:'toggleItems' , shortcut:'B',  caption:'Bit'        },
		];

	} // create_toggles_definition


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// KEYBOARD EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_input_change () {
		self.shell.adjustTextarea();
		self.shell.scrollDown();

	} // on_input_change


	function on_keydown (event) {//... Move to  on_keyboard_event?
		const shift = event.shiftKey;
		const ctrl  = event.ctrlKey;
		const alt   = event.altKey;
		const key   = event.key;

		if ((key != 'Shift') && (key != 'Control') && (key != 'Alt') && (key != 'Meta')) {
			self.audio.beep();
		}

	 	if (event.keyCode == 13) {
			if (!shift && !ctrl && !alt) {
				event.preventDefault();
				self.elements.btnEnter.click();
			}
			else if (shift || !ctrl || !alt) {
				const text = self.elements.input.value;
				if (text.charAt( 0 ) == '.') {
					self.elements.input.value = self.shell.parsers.parseShortRequest( text );
					self.adjustTextarea();
					return;
				}
			}
	 	}
	 	else if (event.keyCode == 9 || event.which == 9) {
			// Insert TAB character instead of leaving the textarea
			event.preventDefault();

			const input           = self.elements.input;
			const selection_start = input.selectionStart;
			const before          = input.value.substring( 0, input.selectionStart );
			const after           = input.value.substring( input.selectionEnd );

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
		self.elements.input.value = self.shell.parsers.parseButtonScript( event.target.className );
		self.shell.adjustTextarea();
		self.shell.scrollDown();

	} // on_script_button_click


	function on_click (event) {
		if (event.target.tagName == 'BUTTON') self.audio.beep();

		const iframe = event.target.querySelector( 'iframe' )
		if (iframe) {
			self.elements.output.scrollTop = event.target.offsetTop - 15;
		}

		if (event.target.closest('.toggle_state')) {
			self.elements.btnCEP.focus();
			setTimeout( ()=>self.elements.btnToggles.focus() );
		}

		const closest_pre = event.target.closest( 'pre' );
		if (event.ctrlKey && closest_pre) {
			closest_pre.parentNode.removeChild( closest_pre );
		}

		if      (event.target === self.elements.output) self.shell.focusPrompt( -1 )//... Expand eats this
		else if (event.target === self.elements.input ) self.shell.focusPrompt(  0 )
		else if (event.target === self.elements.shell ) self.shell.focusPrompt( +1 )
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
			self.elements.input.value = self.shell.parsers.parseButtonScript( command );
			self.elements.btnEnter.click();

		} else {
			self.shell.focusPrompt();
		}

	} // on_dblclick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onSocketOpen = function () {
		self.elements.navCEP.classList = 'connection connected';
		self.elements.btnCEP.innerText = 'Connected';
		self.elements.title = SETTINGS.WEBSOCKET.URL;

		self.elements.terminal.classList.add( 'connected' );

	}; // onSocketConnect


	this.onSocketClose = function () {
		self.elements.navCEP.classList = 'connection';
		self.elements.btnCEP.innerText = 'Offline';
		self.elements.title = '';

		self.elements.btnNode.innerText = 'MyNode';
		self.elements.navWho.innerHTML = '';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketClose


	this.onSocketError = function () {
		self.onSocketClose();
		self.elements.navCEP.classList = 'connection error';
		self.elements.btnCEP.innerText = 'Error';
		self.elements.title = '';

		self.elements.btnNode.innerText = 'MyNode';

		self.elements.terminal.classList.remove( 'connected' );

	}; // onSocketError


	this.onReceive = function (message) {
		handle_message( self, message, callback );

	}; // onReceive


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		self.status.exit();
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugConsole.init' );

// DOM ///////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function gather_dom_elements (container) {
			// Additional script and toggle buttons are created later on,
			// so this function will be called again to update   self.elements .
			return Object.entries( ELEMENT_SELECTORS ).map( ([key, value])=>{
				switch (key) {
					case 'html'     : return [key, document.documentElement];
					case 'terminal' : return [key, container];
					default         : return [key, container.querySelector( value ) ];
				}
			}).reduce( (prev, next)=>{
				return { ...prev, [next[0]]: next[1] };
			}, {});

		} // gather_dom_elements


		// Add main element to body
		const parser        = new DOMParser();
		const temp_document = await parser.parseFromString( HTML_TERMINAL, 'text/html' );
		const container     = temp_document.querySelector( '.terminal' );

		document.body.appendChild( container );

		self.elements = gather_dom_elements( container );   // We'll gather more later

		// Load CSS files
		function add_css_link (file_name) {
			const selector = 'link[href="' + file_name + '"]';
			const old_link = document.querySelector( selector );
			if (old_link) old_link.parentNode.removeChild( old_link );

			const new_link = document.createElement( 'link' );
			new_link.rel  = 'stylesheet';
			new_link.href = file_name;
			new_link.type = 'text/css';
			document.querySelector( 'head' ).appendChild( new_link );

			return new_link;
		}
		const main_css_file = new Promise( (done)=>{
			const new_link = add_css_link( SETTINGS.CSS_FILE_NAME );
			new_link.addEventListener( 'load', ()=>setTimeout(
				()=>{
					self.elements.terminal.classList.remove( 'loading' );
					self.elements.terminal.classList.remove( 'ping' );
					done();
				}
			));
		});
		const vars_css_file = new Promise( (done)=>{
			const new_link = add_css_link( SETTINGS.CSS_VARS_NAME );
			new_link.addEventListener( 'load', done );
		});

		await Promise.all( [main_css_file, vars_css_file] );

// OBJECTS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		function extract_css_font_names () {
			const result = [];
			const style = getComputedStyle( self.elements.terminal );
			let font_name = null;
			let i = 0;
			while (font_name = style.getPropertyValue( '--font' + i )) {
				result.push( font_name );
				++i;
			}
			return result;
		}

		self.audio     = await new Audio( self );
		self.bit       = self.audio.bit;   //... still needs to be created before shell. Move to shell entirely
		self.dom       = new DomActions( self );
		self.shell     = new CEPShell( self, callback, BUTTON_SCRIPTS );
		self.fontNames = extract_css_font_names();
		self.toggles   = create_toggles( self, create_toggles_definition() );
		self.status    = new StatusBar( self.elements.navStatus )

		// MAIN MENU Create macro buttons
		BUTTON_SCRIPTS.forEach( (script)=>{
			const caption = script.caption || script.name.charAt(0).toUpperCase() + script.name.slice(1);
			const existing   = self.elements[script.name];
			const new_button =  existing || document.createElement( 'button' );
			new_button.dataset.command = script.name;
			new_button.className       = script.name;
			new_button.innerText       = caption;
			new_button.title           = new_button.title || 'Click shows command, double click executes';
			new_button.addEventListener( 'click', on_script_button_click );

			if (!existing) self.elements[script.menu].appendChild( new_button );
		});

		self.elements = gather_dom_elements( container );   // Also gather newly created buttons

// EVENTS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		// KEYBOARD
        	self.elements.input.addEventListener( 'keydown' , on_keydown );
        	self.elements.input.addEventListener( 'keyup'   , on_keyup   );
		['keydown', 'keypress', 'keyup'].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);

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

		// BUTTON: "Clear"
		self.elements.btnClear.addEventListener( 'click'    , self.shell.clearInput  );
		self.elements.btnClear.addEventListener( 'dblclick' , self.shell.clearScreen );

		// BUTTON: "Enter"
		self.requestId = 0;
		self.elements.btnEnter.addEventListener( 'click', self.shell.onEnterClick );

		// BUTTON: "Exit"
		self.elements.btnClose.addEventListener( 'click', ()=>self.toggles.terminal.toggle() );

		// LOGIN FORM
		self.elements.terminal.querySelectorAll( 'input' ).forEach( (input)=>{
			input.addEventListener( 'input'  , ()=>self.elements.login.click() );
			input.addEventListener( 'change' , ()=>self.elements.login.click() );
			input.addEventListener( 'keyup'  , async(event)=>{
				if (event.key == 'Enter') {
					const dblclick_event = document.createEvent( 'MouseEvents' );
					dblclick_event.initEvent( 'dblclick', true, true );
					self.elements.login.dispatchEvent( dblclick_event );
				}
			});
		});

		// Disable <form> submission
		self.elements.terminal.querySelectorAll( 'form' ).forEach( (form)=>{
			form.addEventListener( 'submit', event => event.preventDefault() );
		});

		// PROMPT
		self.elements.input.addEventListener( 'keyup'  , self.adjustTextarea );
		self.elements.input.addEventListener( 'input'  , on_input_change );
		self.elements.input.addEventListener( 'change' , on_input_change );

		let mouse_moved = true;   // Detect actual clicks, not text selection
		self.elements.output.addEventListener( 'blur',      ()=>mouse_moved = false );
		self.elements.output.addEventListener( 'mousedown', ()=>mouse_moved = false );
		self.elements.output.addEventListener( 'mousemove', ()=>mouse_moved = true  );
		self.elements.output.addEventListener( 'mouseup', (event)=>{
			if (event.button != 0) return;
			if (!mouse_moved) {
				self.shell.focusPrompt();
			}
		});

// PROMPT ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		async function init_prompt () {
			self.dom.setFont();

			// Find shortcuts and add list of keys to CEP_VERSION
			const toggles    = sc => (sc.modifiers.length == 1) && (sc.modifiers[0] == 'alt');
			const characters = toggle => toggle.key
			const shortcuts  = KEYBOARD_SHORTCUTS.filter( toggles ).map( characters ).join('');

			self.shell.version += '^[' + shortcuts.split('').sort().join('') + '] ';
			self.shell.printVersion('');
			await self.shell.showFile( '/cep/terminal/txt/issue.txt' );

			if (GET.has('username')) self.elements.userName.value = GET.get('username');
			if (GET.has('nickname')) self.elements.nickName.value = GET.get('nickname');
			if (GET.has('password')) self.elements.passWord.value = GET.get('password');

			if (GET.has('login')) setTimeout( ()=>{
				self.elements.login.click();
				self.elements.btnEnter.click();
			}, 0);

			if (self.elements.terminal.classList.contains( 'enabled' )) {
				setTimeout( self.shell.focusPrompt, 100 );
			} else {
				setTimeout( ()=>{
					document.querySelector( 'form [name=nickname]' ).focus();//...? not effective
				}, 100);
			}
		}

		init_prompt();

		const c = console;
		c.groupCollapsed( 'DebugConsole.elements' );  c.dir( self.elements );         c.groupEnd();
		c.groupCollapsed( 'DebugConsole.toggles' );   c.dir( self.toggles );          c.groupEnd();
		c.groupCollapsed( 'KEYBOARD_SHORTCUTS' );     c.table( KEYBOARD_SHORTCUTS );  c.groupEnd();

		return Promise.resolve();

	}; // init

	self.init().catch( watchdog/*//...main only?*/ ).then( ()=>self );
	// const terminal = await new DebugConsole();

}; // DebugConsole


//EOF
