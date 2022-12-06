// main_menu.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG   } from '../../config.js';
import { PRESETS } from '../config.js';
import { Toggle  } from './toggle.js';


export const MainMenu = function (cep, terminal) {
	const self = this;

	this.containers;
	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		{
			parent: 'bottomLeft',
			html: (`
				<nav class="main menu">
					<button class="connection">Offline</button>
					<div class="main items">
						<!-- button>CEP-Shell</button>
						<button>Files</button>
						<button>Server</button>
						<button>Clients</button>
						<button>Users</button -->
						<nav class="toggles menu">
							<button>Toggles</button>
							<div class="items"></div>
						</nav>
					</div>
				</nav>
			`),
			elements: {
				btnCEP        : '.connection',
				btnToggles    : '.toggles > button',
				itemsMain     : '.main.items',
				itemsToggles  : '.toggles > .items',
			},
		},
	];


	function create_toggles_definition() {
		// Buttons not in HTML_TERMINAL will be added by  create_toggles() .
		// Atm. only Alt+Key works with toggles
		const BLINK = [self.elements.btnCEP, self.elements.btnToggles];
		const HTML = terminal.elements.html;
		const TERM = terminal.elements.terminal;
		const T = PRESETS.TOGGLE;
		const F = PRESETS.FILTER;
		const M = self.elements.itemsToggles;
		return {
// Classname  InitialValue    PutClassOn   BlinkThese   KeyboardAlt+  innerHTML
//...! light   : { preset:null     , target:HTML, blink:BLINK, shortcut:'l', caption:'Light Mode', menu:M },
animate : { preset:T.ANIMATE, target:TERM, blink:BLINK, shortcut:'a', caption:'Animations', menu:M },
beep    : { preset:T.BEEP   , target:TERM, blink:BLINK, shortcut:'b', caption:'Beep'      , menu:M },
fancy   : { preset:T.FANCY  , target:TERM, blink:BLINK, shortcut:'f', caption:'Fancy'     , menu:M },
bit     : { preset:T.SPEECH , target:TERM, blink:BLINK, shortcut:'i', caption:'Bit'       , menu:M },
speech  : { preset:T.SPEECH , target:TERM, blink:BLINK, shortcut:'o', caption:'Speech'    , menu:M },
status  : { preset:T.STATUS , target:TERM, blink:BLINK, shortcut:'z', caption:'Status Bar', menu:M },
		};

	} // create_toggles_definition


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.show  = function () { terminal.showApplet ( self ); }; // show
	this.hide  = function () { terminal.hideApplet ( self ); }; // hide
	this.close = function () { terminal.closeApplet( self ); }; // close


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'MainMenu.exit' );
		self.hide();
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'MainMenu.init' );

		self.containers = [];
		self.elements = {};
		terminal.createGadgets( self, RESSOURCE );   // Populates self.containers and self.elements

		Object.entries( create_toggles_definition() ).forEach( ([name, definition])=>{
			terminal.toggles[name] = new Toggle( cep, terminal, {
				name : name,
				...definition,
			});
			terminal.keyboardShortcuts.push({
				event     : 'keydown',
				key       : definition.shortcut,
				modifiers : 'alt',
				action    : ()=>{ terminal.toggles[name].toggle(); },
			});
		});


		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const terminal = await new DebugTerminal()

}; // MainMenu


//EOF
