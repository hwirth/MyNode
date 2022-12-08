// editor.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG             } from '../../config.js';
import { SETTINGS, PRESETS } from '../config.js';
import { Toggle            } from '../gadgets/toggle.js';

const PROGRAM_NAME = 'Editor';
const PROGRAM_VERSION = '0.0.1p';


export const Editor = function (cep, terminal) {
	const self = this;
	this.templateName = 'Editor';

	this.version = PROGRAM_VERSION;

	this.containers;
	this.elements;
	this.toggles;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		// Containers will be removed and re-inserted by the UI.
		// If a mount location needs more than one element, they need to be separate containers:
		{	parent   : 'terminal',
			html     : (`
				<main class="editor">
					<textarea autocomplete="off" autocorrect="off" cols="120"></textarea>
				</main>
			`),
			elements : {
				main  : 'CONTAINER',
				input : 'textarea',
			},
		},{
			parent   : 'bottomRight',
			html     : '<div class="toggle_states">none</div>',
			elements : { toggleState: 'CONTAINER' },
		},{
			parent   : 'bottomRight',
			html     : (`
				<nav class="edit menu">
					<button class="enter">Edit</button>
					<div class="items">
						<nav class="toggles menu">
							<button>Toggles</button>
							<div class="items"></div>
						</nav>
						<nav class="filters menu">
							<button>Filter</button>
							<div class="items"></div>
						</nav>
						<nav class="debug menu">
							<button>Debug</button>
							<div class="items"></div>
						</nav>
					</div>
				</nav>
			`),
			elements : {
				menuEdit : 'CONTAINER',
				btnEdit  : '.enter',
			},
		},
	];


	function create_toggles_definition() {
		// When  .init()  creates the toggles, entries are added to  self.keyboardShortcuts
		const pT   = PRESETS.TOGGLE;
		const pF   = PRESETS.FILTER;
		const tO   = self.elements.output;
		const tT   = terminal.elements.terminal;
		const bF   = [self.elements.btnEdit, self.elements.btnFilters];
		const bT   = [self.elements.btnEdit, self.elements.btnToggles];
		const mF   = self.elements.itemsFilter;
		const mT   = self.elements.itemsToggles;
		const btnF = self.elements.btnFilters;
		return {
// Classname  InitialValue          PutClassOn BlinkThese ButtonIn KeyboardAlt+   innerHTML
/*
ping      : { preset:pF.PING      , target:tO, blink:bF, menu:mF, shortcut:'p',  caption:'Ping'       },
cep       : { preset:pF.CEP       , target:tO, blink:bF, menu:mF, shortcut:null, caption:'CEP'        },
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
*/
		};

	} // create_toggles_definition


	// KEYBOARD SHORTCUTS
	function shortcut_exec (command_button) {
		[command_button, 'btnEdit'].forEach( button => self.elements[button].click() );
	}
	this.keyboardShortcuts = [
/*
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
},{ event:'keydown', key:'Enter'    , modifiers:null        , action:()=>{ self.elements.btnEdit.click(); },
},
*/
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskName      = PROGRAM_NAME;
	this.taskMainClass = 'editor';

	this.taskEntry;   // Will be created by  DebugTerminal.installApplet()

	this.show  = function () { terminal.showApplet ( self ); }; // show
	this.hide  = function () { terminal.hideApplet ( self ); }; // hide
	this.close = function () { terminal.closeApplet( self ); }; // close

	this.contextMenu = function () {
		return {
			show  : { caption:'Show' , action:self.show  },
			hide  : { caption:'Hide' , action:self.hide  },
			close : { caption:'Close', action:self.close },
		};

	}; // contextMenu


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_keydown (event) {//... Move to  on_keyboard_event ?
		const shift = event.shiftKey;
		const ctrl  = event.ctrlKey;
		const alt   = event.altKey;
		const key   = event.key;

	 	if (event.keyCode == 9 || event.which == 9) {//...? which??
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TOGGLE STATES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.updateToggleStates = function () {
return
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

	this.onCepReload = function () {}; // onCepReload

	this.onWsOpen  = function () {}; // onWsOpen
	this.onWsClose = function () {}; // onWsClose
	this.onWsError = function () {}; // onWsError
	this.onWsRetry = function () {}; // onWsRetry

	this.onWsMessage = function (message) {
	}; // onWsMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Editor.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'Editor.init' );

		self.containers = [];
		self.elements = {};
		terminal.createGadgets( self, RESSOURCE );   // Populates self.containers and self.elements

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
		});

		self.updateToggleStates();
		terminal.events.add( 'toggle', self.updateToggleStates );

		// KEYBOARD
		self.elements.input.addEventListener( 'keydown', on_keydown );
		['keydown', 'keypress', 'keyup'].forEach(
			event => self.elements.main.addEventListener( event, on_keyboard_event, {passive: false} )
		);

		//...cep.events.add( 'reload/client', self.onCepReload );

function remove (element) { element.parentElement.removeChild( element ); }
const parser = new DOMParser();
const new_document = parser.parseFromString( document.documentElement.outerHTML, 'text/html' );
new_document.body.querySelectorAll(':scope > :not(.boot)' ).forEach( remove );
self.elements.input.value = '<!DOCTYPE html>' + new_document.documentElement.outerHTML;

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const editor = await new Editor()

}; // Editor


//EOF
