// shell.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG             } from '../../config.js';
import { SETTINGS, PRESETS } from '../config.js';
import { Toggle            } from '../toggle.js';
import { handle_message    } from './handle_message.js'
import { ShellInput        } from './input.js';
import { ShellOutput       } from './output.js';
import { Parsers           } from './parsers.js';
import { History           } from './history.js';

const PROGRAM_NAME = 'CEP-Shell';
const PROGRAM_VERSION = '0.5.2α';


export const CEPShell = function (cep, terminal) {
	const self = this;
	this.templateName = 'CEPShell';

	this.version = PROGRAM_VERSION;

	this.containers;
	this.elements;
	this.history;
	this.toggles;

	this.requestId;
	this.buttonScripts;

	this.tagData;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		// Containers will be removed and re-inserted by the UI.
		// If a mount location needs more than one element, they need to be separate containers:
		{	parent   : 'terminal',
			html     : (`
				<main class="shell">
					<output></output>
					<output></output>
					<textarea></textarea>
				</main>
			`),
			elements : {
				main    : 'CONTAINER',
				output  : 'output',
				output1 : 'output:nth-of-type(2)',
				input   : 'textarea',
			},
		},{
			parent   : 'bottomRight',
			html     : '<div class="toggle_states"></div>',
			elements : { toggleState: 'CONTAINER' },
		},{
			parent   : 'bottomRight',
			html     : '<button class="clear">Clear</button>',
			elements : { btnClear: 'CONTAINER' },
		},{
			parent   : 'bottomRight',
			html     : (`
				<nav class="shell menu">
					<button class="enter">Enter</button>
					<div class="items">
						<nav class="toggles menu">
							<button>Toggles</button>
							<div class="items"></div>
						</nav>
						<nav class="filters menu">
							<button>Filter</button>
							<div class="items"></div>
						</nav>
						<nav class="mode menu">
							<button>Mode</button>
							<div class="items">
								<nav class="defcon menu">
									<button>Defcon</button>
									<div class="items"></div>
								</nav>
								<nav class="add menu">
									<button>Add</button>
									<div class="items"></div>
								</nav>
								<nav class="del menu">
									<button>Del</button>
									<div class="items"></div>
								</nav>
							</div>
						</nav>
						<nav class="debug menu">
							<button>Debug</button>
							<div class="items"></div>
						</nav>
					</div>
				</nav>
			`),
			elements : {
				menuShell    : 'CONTAINER',
				menuFilter   : '.menu.filters',
				menuToggles  : '.menu.toggles',
				itemsFilter  : '.menu.filters > .items',
				itemsToggles : '.menu.toggles > .items',
				itemsMode    : '.menu.mode    > .items',
				itemsDefcon  : '.menu.defcon  > .items',
				itemsAdd     : '.menu.add     > .items',
				itemsDel     : '.menu.del     > .items',
				itemsDebug   : '.menu.debug   > .items',
				btnEnter     : '.enter',
				btnFilters   : '.menu.filters > button',
				btnToggles   : '.menu.toggles > button',
				btnDebug     : '.menu.debug   > button',
			},
		},
	];


	function create_toggles_definition() {
		// When  .init()  creates the toggles, entries are added to  self.keyboardShortcuts
		const pT   = PRESETS.TOGGLE;
		const pF   = PRESETS.FILTER;
		const tO   = self.elements.output;
		const tM   = self.elements.main;
		const tT   = terminal.elements.terminal;
		const bF   = [self.elements.btnEnter, self.elements.btnFilters];
		const bT   = [self.elements.btnEnter, self.elements.btnToggles];
		const mF   = self.elements.itemsFilter;
		const mT   = self.elements.itemsToggles;
		const btnF = self.elements.btnFilters;
		return {
// Classname  InitialValue          PutClassOn BlinkThese ButtonIn KeyboardAlt+   innerHTML
ping      : { preset:pF.PING      , target:tO, blink:bF, menu:mF, shortcut:'p',  caption:'Ping'       },
cep       : { preset:pF.CEP       , target:tO, blink:bF, menu:mF, shortcut:null, caption:'CEP'        },
error     : { preset:pF.ERROR     , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Error'      },
chat      : { preset:pF.CHAT      , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Chat'       },
string    : { preset:pF.STRING    , target:tO, blink:bF, menu:mF, shortcut:null, caption:'String'     },
notice    : { preset:pF.NOTICE    , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Notice'     },
broadcast : { preset:pF.BROADCAST , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Broadcast'  },
update    : { preset:pF.UPDATE    , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Update'     },
request   : { preset:pF.REQUEST   , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Request'    },
response  : { preset:pF.RESPONSE  , target:tO, blink:bF, menu:mF, shortcut:null, caption:'Response'   },
filter    : { preset:pT.FILTER    , target:tO, blink:bF, menu:mF, shortcut:'d',  caption:'Filter'    , button:btnF },
last      : { preset:pT.LAST      , target:tO, blink:bT, menu:mT, shortcut:'y',  caption:'Show Last'  },
compact   : { preset:pT.COMPACT   , target:tO, blink:bT, menu:mT, shortcut:'c',  caption:'Compact'    },
overflow  : { preset:pT.OVERFLOW  , target:tO, blink:bT, menu:mT, shortcut:'v',  caption:'Overflow'   },
separators: { preset:pT.SEPARATORS, target:tO, blink:bT, menu:mT, shortcut:'s',  caption:'Separators' },
stripes   : { preset:pT.STRIPES   , target:tO, blink:bT, menu:mT, shortcut:'x',  caption:'Stripes'    },
scroll    : { preset:pT.SCROLL    , target:tO, blink:bT, menu:mT, shortcut:'r',  caption:'AutoScroll' },
split     : { preset:pT.SPLIT     , target:tM, blink:bT, menu:mT, shortcut:'h',  caption:'Split'      },
		};

	} // create_toggles_definition


	function create_scriptbutton_definition () {
		const AUTH   = terminal.applets.loginMenu.elements.itemsLogin;
		const MODE   = self.elements.itemsMode;
		const DEFCON = self.elements.itemsDefcon;
		const ADD    = self.elements.itemsAdd;
		const DEL    = self.elements.itemsDel;
		const DEBUG  = self.elements.itemsDebug;
		return {
// Classname MakeButtonIn LetItEnterThis
connect   : { menu:AUTH  , script:'/connect ' + SETTINGS.WEBSOCKET.URL },
disconnect: { menu:AUTH  , script:'/disconnect' },
login     : { menu:AUTH  , script:'session\n\tlogin\n\t\tusername: %u\n\t\tpassword: %p\n\t\tfactor2: %t\n%N\n' },
logout    : { menu:AUTH  , script:'session\n\tlogout' },
guest     : { menu:AUTH  , script:'session\n\tlogin\n\t\tusername: guest\n%N' },
user      : { menu:AUTH  , script:'session\n\tlogin\n\t\tusername: user\n\t\tpassword: pass2\n%N' },
root      : { menu:AUTH  , script:'session\n\tlogin\n\t\tusername: root\n\t\tpassword: 12345\n%N' },
help      : { menu:DEBUG , script:'/help'   },
manual    : { menu:DEBUG , script:'/manual' },
restart   : { menu:DEBUG , script:'server\n\trestart\n\t\ttoken: ' },
reset     : { menu:DEBUG , script:'server\n\trestart\n\t\ttoken: ' },
token     : { menu:DEBUG , script:'server\n\ttoken'   },
who       : { menu:DEBUG , script:'session\n\twho'    },
vStat     : { menu:DEBUG , script:'server\n\tstatus'  },
nStat     : { menu:DEBUG , script:'session\n\tstatus' },
kroot     : { menu:DEBUG , script:'session\n\tkick\n\t\tusername: root'  },
kuser     : { menu:DEBUG , script:'session\n\tkick\n\t\tusername: user'  },
RSS       : { menu:DEBUG , script:'rss\n\treset\n\ttoggle:all\n\tupdate' },
msgOutOn  : { menu:DEBUG , script:'server\n\tdebug\n\t\tMESSAGE_OUT:true'  },
msgOutOff : { menu:DEBUG , script:'server\n\tdebug\n\t\tMESSAGE_OUT:false' },
TEST      : { menu:DEBUG , script:'unknown\n\tproto\nserver\n\ttoken' },
defcon3   : { menu:DEFCON, script:'chat\n\tmode\n\t\tset:fancy,red' },
defcon2   : { menu:DEFCON, script:'chat\n\tmode\n\t\tset:fancy,uv' },
defcon1   : { menu:DEFCON, script:'chat\n\tmode\n\t\tset:fancy,green' },
defcon0   : { menu:DEFCON, script:'chat\n\tmode\n\t\tset:fancy,normal' },
addFancy  : { menu:ADD   , script:'chat\n\tmode\n\t\tadd:fancy' },
addBlink  : { menu:ADD   , script:'chat\n\tmode\n\t\tadd:gridblink' },
addMCP    : { menu:ADD   , script:'chat\n\tmode\n\t\tadd:mcp' },
delFancy  : { menu:DEL   , script:'chat\n\tmode\n\t\tdel:fancy' },
delBlink  : { menu:DEL   , script:'chat\n\tmode\n\t\tdel:gridblink' },
delMCP    : { menu:DEL   , script:'chat\n\tmode\n\t\tdel:mcp' },
		};

	} // create_scriptbutton_defninition


	// KEYBOARD SHORTCUTS
	function shortcut_exec (command_button) {
		[command_button, 'btnEnter'].forEach( button => self.elements[button].click() );
	}
	this.keyboardShortcuts = [
  { event:'keydown', key:'+'        , modifiers:'alt'       , action:()=>{ terminal.changeFontSize(+1);    },
},{ event:'keydown', key:'-'        , modifiers:'alt'       , action:()=>{ terminal.changeFontSize(-1);    },
},{ event:'keydown', key:'.'        , modifiers:'alt'       , action:()=>{ terminal.nextFont(+1)           },
},{ event:'keydown', key:','        , modifiers:'alt'       , action:()=>{ terminal.nextFont(-1)           },
},{ event:'keydown', key:'ArrowUp'  , modifiers:'cursorPos1', action:()=>{ self.history.back();            },
},{ event:'keydown', key:'ArrowDown', modifiers:'cursorEnd' , action:()=>{ self.history.forward();         },
},{ event:'keydown', key:'Home'     , modifiers:'ctrl'      , action:()=>{ self.output.clearInput();       },
},{ event:'keydown', key:'Home'     , modifiers:'shift,ctrl', action:()=>{ self.output.deleteToMarker();   },
},{ event:'keydown', key:'PageUp'   , modifiers:'shift'     , action:()=>{ self.output.scrollPageUp();     },
},{ event:'keydown', key:'PageDown' , modifiers:'shift'     , action:()=>{ self.output.scrollPageDown();   },
},{ event:'keydown', key:'Delete'   , modifiers:'shift,ctrl', action:()=>{ self.output.clearScreen();      },
},{ event:'keydown', key:'Enter'    , modifiers:null        , action:()=>{ self.elements.btnEnter.click(); },
},{ event:'keydown', key:'e'        , modifiers:'alt'       , action:()=>{ login_exec('disconnect');       },
},{ event:'keydown', key:'w'        , modifiers:'alt'       , action:()=>{ login_exec('login');            },
},
	];
	function login_exec (button_name) {
		terminal.applets.loginMenu.elements[button_name].click();
		self.elements.btnEnter.click();
	}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskName      = 'Shell';
	this.taskMainClass = 'shell';
	this.focusItem;
	this.taskEntry;   // Will be created by  DebugTerminal.installApplet()


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_keydown (event) {//... Move to  on_keyboard_event ?
		const shift = event.shiftKey;
		const ctrl  = event.ctrlKey;
		const alt   = event.altKey;
		const key   = event.key;


	 	if (event.keyCode == 13) {
			if (shift && !ctrl && !alt) {
				// Insert newline
				event.preventDefault();

				const input           = self.elements.input;
				const selection_start = input.selectionStart;
				const before          = input.value.substring( 0, input.selectionStart );
				const after           = input.value.substring( input.selectionEnd );

				input.value        = before + '\n' + after;
				input.selectionEnd = selection_start + 1;
			}
			else if (!shift || ctrl || !alt) {
				// Tranform dotJSON --> tabJSON
				event.preventDefault();
				const text = self.elements.input.value;
				if (text.charAt( 0 ) == '.') {
					self.elements.input.value = self.parsers.parseShortRequest( text );
					self.input.adjustTextarea();
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

			input.value        = before + '\t' + after;
			input.selectionEnd = selection_start + 1;
		}

	} // on_keydown


	function on_keyboard_event (event) {
		if ((event.type == 'keydown') && DEBUG.KEYBOARD_EVENTS) {
			console.log( 'KEYDOWN:', 'key:', event.key, 'code:', event.code );
		}

		const input = self.elements.input;
		const cursor_pos1 = (input.value.length == 0) || (input.selectionStart == 0);
		const cursor_end  = (input.value.length == 0) || (input.selectionStart == input.value.length);

		self.keyboardShortcuts.forEach( (shortcut)=>{
			const is_key = (event.key == shortcut.key) || (event.code == shortcut.code);
			const is_event = (shortcut.event.split( ',' )).indexOf( event.type ) >= 0;

			if (is_event && is_key && modifiers( shortcut )) {
				event.stopPropagation();
				event.preventDefault();
				terminal.audio.beep();
				shortcut.action( event );
			}
		});

		function modifiers (shortcut) {
			const modifiers = shortcut.modifiers ? shortcut.modifiers.split(',') : [];
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


// MOUSE /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_output_click (event) {
		const TE = terminal.applets.loginMenu.elements;
		const SE = self.elements;

		const output = event.target.closest( 'output' );

		const iframe = event.target.querySelector( 'iframe' )
		if (iframe) {
			output.scrollTop = event.target.offsetTop - 15;
		}

		const closest_pre = event.target.closest( 'pre' );
		if (event.ctrlKey && closest_pre) {
			closest_pre.parentNode.removeChild( closest_pre );
		}

		//...! Does no longer work:
		if      (event.target === TE.root ) fill( 'root'  , '12345' )
		else if (event.target === TE.user ) fill( 'user'  , 'pass2' )
		else if (event.target === TE.guest) fill( 'guest' , '' )
		;

		function fill (username, password) {
			TE.userName.value = username;
			TE.passWord.value = password;
			TE.elements.nickName.focus();
		}

	} // on_click


	function on_output_dblclick (event) {
		if (event.target.tagName == 'BODY') return terminal.toggles.terminal.toggle();

		const output = event.target.closest( 'output' );

		// Toggle .compact
		const last_element    = output.querySelector( ':scope > :last-child' );
		const clicked_element = event.target.closest( 'pre' );
		if (clicked_element === last_element) {
			// Don't .compact, instead toggle "uncollapse last message"
			self.toggles.last.toggle();
		}

		event.target.classList.toggle( 'expand' );     // Force it to expand
		event.target.classList.toggle( 'unexpand' );   //...Keep track of user-clicked expands

	} // on_output_dblclick


// BUTTON SCRIPTS ////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_scriptbutton_click (event) {
		// Single click: Show command as multiline request in input
		if (!event.target.dataset.script) return;

		event.preventDefault();

		const name = event.target.dataset.script;
		const script = self.buttonScripts[name];

		self.elements.input.value = self.parsers.parseButtonScript( script );
		self.input.adjustTextarea();
		self.output.scrollDown();

	} // on_scriptbutton_click


	function on_scriptbutton_dblclick (event) {
		if (!event.target.dataset.script) return;

		if (cep.connection.isConnected()) {
			on_scriptbutton_click( event );
			self.elements.btnEnter.click();
		} else {
			cep.connection.connect();
			self.elements.input.value = '';
			self.input.focusPrompt();
		}

		//...? self.input.focusPrompt();

	} // on_scriptbutton_dblclick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TOGGLE STATES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.updateToggleStates = function () {
		const all_toggles  = {...terminal.toggles, ...self.toggles};
		const has_shortcut = toggle => toggle.shortcut !== null;
		const shortcuts    = Object.values( all_toggles ).filter( has_shortcut );

		const nr_first    = Math.floor( Object.keys( shortcuts ).length / 2 );
		const first_half  = (dummy, index) => index <  nr_first;
		const second_half = (dummy, index) => index >= nr_first;

		self.elements.toggleState.innerHTML
		= '<span>'
		+  create_part( shortcuts, first_half )
		+ '</span><span>'
		+ create_part( shortcuts, second_half );
		+ '</span>'
		;

		function create_part (toggles, half) {
			const alphabetically = (a, b) => (a.shortcut > b.shortcut) ? +1 : -1;
			const to_character   = (toggle, index) => (
				toggle.enabled
				? '<b>' + toggle.shortcut.toLowerCase() + '</b>'
				: toggle.shortcut.toLowerCase()
			);
			return (
				Object.values( shortcuts )
				.sort( alphabetically )
				.filter( half )
				.map( to_character )   // Uppercase for enabled toggles
				.join('')
			);
		}

	}; // updateToggleStates


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsOpen  = function (event) {
		self.output.print( 'Connected to ' + event.target.url, 'cep' );

	}; // onWsOpen


	this.onWsClose = function () {
		self.output.print( 'Connection closed', 'cep' );

	}; // onWsClose


	this.onWsError = function () {
		self.output.print( 'Connection error', 'cep' );

	}; // onWsError


	this.onWsRetry = function () {
		self.output.print( 'Reconnecting to ' + event.target.url, 'cep' );

	}; // onWsRetry


	this.onCepReload = function () {
		self.output.print( 'The client was updated and will reload', 'cep' );

	}; // onCepReload


	this.onWsSend = function (message) {
		if (typeof message == 'string') {
			self.output.print( 'Sending string: <q>' + message + '</q>', 'string' );
		} else {
			const extra_class =  (message.session && message.session.pong) ? ' ping' : '';
			const html = (
				self.parsers.requestToText( message )
				.replaceAll( '&', '&amp;' )
				.replaceAll( '<', '&lt;' )
			);
			self.output.print( html, 'request' + extra_class );
		}

	}; // onWsSend


	this.onWsMessage = function (message) {
		handle_message( cep, terminal, self, message );

	}; // onWsMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'CEPShell.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'CEPShell.init' );

		// PLUGIN INIT
		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements
		self.focusItem = self.elements.input;

		// OWN PROPERTIES
		self.requestId = 0;
		self.tagData   = {};

		// SUB-OBJECTS
		self.parsers = new Parsers    ( cep, terminal, self );
		self.output  = new ShellOutput( cep, terminal, self );
		self.input   = new ShellInput ( cep, terminal, self );
		self.history = new History    ( self.elements.input, {
			onInputChanged: ()=>{
				self.input.adjustTextarea();
				self.output.scrollDown();
			},
		});

		// TOGGLES
		const output_toggles = ['last','compact','overflow','separators','stripes','scroll'];
		self.toggles = {};
		Object.entries( create_toggles_definition() ).forEach( ([name, definition])=>{
			self.toggles[name] = new Toggle( cep, terminal, {
				...definition,
				name : name,
			});
			self.keyboardShortcuts.push({
				event     : 'keydown',
				key       : definition.shortcut,
				modifiers : 'alt',
				action    : ()=>{ self.toggles[name].toggle(); },
			});
			if (output_toggles.indexOf(name) >= 0) update_outputs( name );
		});
		terminal.events.add( 'toggle', (toggle)=>{
			const scrollers = ['compact','separators','overflow'];
			if (scrollers.indexOf(toggle.name) >= 0) {
				self.output.scrollDown();
			}
			const class_name = output_toggles.find( t => t == toggle.name );
			if (class_name) update_outputs( toggle.name );
		});
		function update_outputs (toggle_name) {
			const toggle = self.toggles[toggle_name];
			self.elements.output1.classList.toggle( toggle_name, toggle.enabled );
		}

		// TOGGLE STATES
		self.updateToggleStates();
		terminal.events.add( 'toggle', self.updateToggleStates );

		// SCRIPT BUTTONS
		self.buttonScripts = {};
		Object.entries( create_scriptbutton_definition() ).forEach( ([name, definition])=>{
			self.buttonScripts[name] = definition.script;

			const existing = definition.menu.querySelector( 'button.' + name );
			const button = (existing) ? existing : make_button();

			//... Dirty: Exception for login menu: Can not be truly reloaded in the future like this
			//... Looks like this would actually work, but it still smells weird to do it here
			//... instead of having a facility in  DebugTerminal()  for it
			const already_installed = definition.menu.querySelector( '[data-script="' + name + '"]' );
			if (!already_installed) {
				button.addEventListener( 'click'   , on_scriptbutton_click    );
				button.addEventListener( 'dblclick', on_scriptbutton_dblclick );
			}

			if (!existing) definition.menu.appendChild( button );
			button.dataset.script = name;

			function make_button () {
				return cep.dom.newElement({
					tagName   : 'button',
					className : name,
					innerHTML : definition.caption || name,
				});
			}
		});


		// Events

		// MAIN ELEMENT
		self.elements.main.addEventListener( 'click', (event)=>{
			if (event.target === self.elements.main) self.input.focusPrompt();
		});
		// KEYBOARD
		['keydown', 'keypress', 'keyup'].forEach(
			event => self.elements.main.addEventListener( event, on_keyboard_event, {passive: false} )
		);
		// INPUT
        	self.elements.input .addEventListener( 'keydown', on_keydown );
        	//...self.elements.input .addEventListener( 'keyup'  , on_keyup   );

		// OUTPUT - MOUSE
		self.elements.output .addEventListener( 'click'   , on_output_click    );
		self.elements.output .addEventListener( 'dblclick', on_output_dblclick );
		self.elements.output1.addEventListener( 'click'   , on_output_click    );
		self.elements.output1.addEventListener( 'dblclick', on_output_dblclick );

		// BUTTON: "Clear"
		self.elements.btnClear.addEventListener( 'click'   , self.output.clearInput     );
		self.elements.btnClear.addEventListener( 'dblclick', self.output.deleteToMarker );

		// BUTTON: "Enter"
		self.elements.btnEnter.addEventListener( 'click', self.input.onEnterClick );

		// BUTTON: "Exit"
		//...self.elements.btnClose.addEventListener( 'click', ()=>self.toggles.terminal.toggle() );

		// TOGGLE_STATE
		self.elements.toggleState.addEventListener( 'click', ()=>{
			const TE = terminal.applets.mainMenu.elements;
			TE.btnCEP.focus();
			setTimeout( ()=>TE.btnToggles.focus() );
		});

		// PROMPT
		self.elements.input.addEventListener( 'keyup' , self.input.adjustTextarea );
		self.elements.input.addEventListener( 'input' , on_input_change           );
		self.elements.input.addEventListener( 'change', on_input_change           );
		function on_input_change () {
			self.input.adjustTextarea();
			self.output.scrollDown();
		}

		// Re-focus prompt
		let mouse_moved = true;   // Detect actual clicks, not text selection
		self.elements.output .addEventListener( 'blur',      ()=>mouse_moved = false );
		self.elements.output .addEventListener( 'mousedown', ()=>mouse_moved = false );
		self.elements.output .addEventListener( 'mousemove', ()=>mouse_moved = true  );
		self.elements.output .addEventListener( 'mouseup', (event)=>{
			if (event.button != 0) return;
			if (!mouse_moved) self.input.focusPrompt();
		});
		self.elements.output1.addEventListener( 'blur',      ()=>mouse_moved = false );
		self.elements.output1.addEventListener( 'mousedown', ()=>mouse_moved = false );
		self.elements.output1.addEventListener( 'mousemove', ()=>mouse_moved = true  );
		self.elements.output1.addEventListener( 'mouseup', (event)=>{
			if (event.button != 0) return;
			if (!mouse_moved) self.input.focusPrompt();
		});

		// SNIFF WEBSOCKET TRAFFIC
		cep.connection.events.add( 'open'   , self.onWsOpen    );
		cep.connection.events.add( 'close'  , self.onWsClose   );
		cep.connection.events.add( 'error'  , self.onWsError   );
		cep.connection.events.add( 'retry'  , self.onWsRetry   );
		cep.connection.events.add( 'send'   , self.onWsSend    );
		cep.connection.events.add( 'message', self.onWsMessage );

		cep.events.add( 'reload/client', self.onCepReload );


// PROMPT ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
		self.output.printVersion();

		let welcome = '';
		if (!cep.GET.has( 'terminal' )) {
			welcome += 'Guest Login: Choose a nick(!)name in the "MyNode" menu, press Return<br>';
		}
		welcome += 'Enter /help for more information';
		self.output.print( welcome, 'expand' );

		const login_menu = terminal.applets.loginMenu;
		if (cep.GET.has('username')) login_menu.elements.userName.value = cep.GET.get('username');
		if (cep.GET.has('nickname')) login_menu.elements.nickName.value = cep.GET.get('nickname');
		if (cep.GET.has('password')) login_menu.elements.passWord.value = cep.GET.get('password');
	/*
		if (cep.GET.has('login')) setTimeout( ()=>{
			login_menu.elements.login.click();
			self.elements.btnEnter.click();
		}, 0);
	*/
		if (!terminal.elements.terminal.classList.contains( 'hidden' )) {
			setTimeout( self.output.focusPrompt, 100 );
		}

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const terminal = await new DebugTerminal()

}; // CEPShell


//EOF
