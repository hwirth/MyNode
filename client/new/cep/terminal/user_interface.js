// user_interface.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS  } from '../config.js';
import { Events    } from '../events.js';
import { MainMenu  } from './gadgets/main_menu.js';
import { LoginMenu } from './gadgets/login_menu.js';
import { StatusBar } from './gadgets/status.js';
import { CEPShell  } from './shell/shell.js';


export const UserInterface = function (cep) {
	const self = this;
	self.templateName = 'UserInterface';

	this.title;       // Extracted from RESSOURCE .location
	this.events;      // Events we can emit
	this.elements;    // DOM elements mainly querySelector'ed from RESSOURCE
	this.toggles;     // Created in  main_menu.js
	this.shortcuts;   // Currently registered keyboard shortcuts
	this.applets;     // The actual tools and features: Main menu, status bar, shell, editor, ...


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const EMITS_EVENTS = ['toggle'];

	const RESSOURCE = {
		html: (`
			<cep-terminal class="Xfancy">
				<header class="toolbar">
					<div></div>
					<div class="location">CEP Debug Terminal</div>
					<div></div>
				</header>
				<main></main>
				<footer class="toolbar">
					<div></div>
					<div class="status">Status</div>
					<div></div>
				</footer>
			</cep-terminal>
		`),
		elements: {
			header        : ':scope > header',
			footer        : ':scope > footer',
			main          : ':scope > main',
			topLeft       : ':scope > header > :first-child',
			topRight      : ':scope > header > :last-child',
			bottomLeft    : ':scope > footer > :first-child',
			bottomRight   : ':scope > footer > :last-child',
			location      : '.location',
			status        : '.status',
		},
	};


	// KEYBOARD SHORTCUTS
	function shortcut_exec (command_button) {
		//...if (!self.applets.shell) return;
		[command_button, 'btnEnter'].forEach( button => self.elements[button].click() );
	}
	const KEYBOARD_SHORTCUTS = [
  { event:'keydown', key:'+', modifiers:['alt'], action:()=>{ self.changeFontSize(+1);     },
},{ event:'keydown', key:'-', modifiers:['alt'], action:()=>{ self.changeFontSize(-1);     },
},{ event:'keydown', key:'.', modifiers:['alt'], action:()=>{ self.nextFont(+1);           },
},{ event:'keydown', key:',', modifiers:['alt'], action:()=>{ self.nextFont(-1);           },
},{ event:'keydown', key:'e', modifiers:['alt'], action:()=>{ shortcut_exec('disconnect'); },
},{ event:'keydown', key:'w', modifiers:['alt'], action:()=>{ shortcut_exec('login');      },
// Toggles
},{ event:'keydown', key:'a', modifiers:['alt'], action:()=>{ self.toggles.animate   .toggle(); },
},{ event:'keydown', key:'b', modifiers:['alt'], action:()=>{ self.toggles.bit       .toggle(); },
},{ event:'keydown', key:'f', modifiers:['alt'], action:()=>{ self.toggles.fancy     .toggle(); },
},{ event:'keydown', key:'k', modifiers:['alt'], action:()=>{ self.toggles.beep      .toggle(); },
},{ event:'keydown', key:'l', modifiers:['alt'], action:()=>{ self.toggles.light     .toggle(); },
},{ event:'keydown', key:'m', modifiers:['alt'], action:()=>{ self.toggles.speech    .toggle(); },
},{ event:'keydown', key:'q', modifiers:['alt'], action:()=>{ self.toggles.terminal  .toggle(); },
},
	];

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DOM ACTIONS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.animatePing = function (transmit = false) {
		if (!SETTINGS.ANIMATE_TRANSMISSION) return;

		self.elements.terminal.classList.add( transmit ? 'transmit' : 'ping' );
		setTimeout( ()=>{
			self.elements.terminal.classList.remove( transmit ? 'transmit' : 'ping' );
		}, SETTINGS.TIMEOUT.PING_CSS);

	}; // animatePing


	this.setFont = function (font_index = 0) {
		//...const new_font_name = terminal.fontNames[font_index] || terminal.fontNames[0];
		//...terminal.elements.terminal.style.setProperty( '--font-family', new_font_name );

		for (let i = 0; i < self.fontNames.length; ++i) {
			self.elements.terminal.classList.toggle( 'font' + i, i == font_index );
		}

		if (DEBUG.FONTS) console.log(
			'DebugConsole.setFont: Font', font_index, self.fontNames[font_index],
		);

	} // setFont


	this.nextFont = function (delta = 1) {
		const nr_fonts = self.fontNames.length;
		const terminal = self.elements.terminal;

		let index = -1;
		for (let i = 0; i < nr_fonts; ++i) {
			const class_name = 'font' + i;
			if (terminal.classList.contains( class_name )) index = i;
			terminal.classList.remove( class_name );
		}

		if (index < 0) {
			index = 1;
		} else {
			index = ((index + delta + nr_fonts) % nr_fonts);
		}

		const new_class = 'font' + index;

		terminal.classList.add( new_class );

		if (DEBUG.FONTS) console.log( 'DebugConsole.nextFont: Font', index, self.fontNames[index] );
		cep.terminal.status.show( 'Font ' + self.fontNames[index] + ' was selected' );

	}; // nextFont


	this.changeFontSize = function (delta_px) {
		const css_size     = getComputedStyle( terminal.elements.terminal ).getPropertyValue('--font-size');
		const current_size = parseInt( css_size.slice(0, -2), 10 );
		const new_size     = Math.min( 100, Math.max( 3, current_size + delta_px ));

		terminal.elements.terminal.style.setProperty( '--font-size', new_size+'px' );

		if (DEBUG.FONTS) console.log( 'DebugConsole.changeFontSize:', new_size );

	}; // changeFontSize


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_toggle (toggle) {
		switch (toggle.name) {
			case 'light': {
				self.elements.html.classList.toggle( 'light', toggle.state );
				self.elements.html.classList.toggle( 'dark', !toggle.state );
				break;
			}
			case 'fancy': // fall through
			case 'animate': {
				self.elements.terminal.classList.toggle( toggle.name, toggle.state );
				break;
			}
			case 'beep': {
				break;
			}
			case 'speech': {
				break;
			}
			case 'terminal': {
				break;
			}
		}
	} // on_toggle


	function on_keyboard_event (event) {
		if ((event.type == 'keydown') && DEBUG.KEYBOARD_EVENTS) {
			console.log( 'KEYDOWN:', 'key:', event.key, 'code:', event.code );
		}

		const input = self.elements.input;
		const cursor_pos1 = (input.value.length == 0) || (input.selectionStart == 0);
		const cursor_end  = (input.value.length == 0) || (input.selectionStart == input.value.length);
		//...const in_input    = event.target === input;

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
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.createGadgets = function (applet, gadgets) {
		gadgets.forEach( (gadget)=>{
			const content = cep.dom.elementFromHTML( gadget.html );
			applet.containers.push({
				parent  : gadget.parent,
				element : content,
			});
			applet.elements = {
				...applet.elements,
				...cep.dom.gatherElements( content, gadget.elements ),
				parent    : self.elements[gadget.parent],
				container : content,
			};
		});

	}; // createGadgets


	this.reloadApplet = async function (name, template) {
		if (self.applets[name]) await self.applets[name].exit();
		self.applets[name] = await new template( cep, self, {
			events: {
				show  : self.showApp,
				hide  : self.hideApp,
				close : self.closeApp,
			},
		});

		self.showApplet( self.applets[name] );

	}; // reloadApplet


	this.showApplet = function (applet) {
		applet.containers.forEach( (container)=>{
			self.elements[container.parent].innerHTML = '';
		});
		applet.containers.forEach( (container)=>{
			self.elements[container.parent].appendChild( container.element );
		});
		self.elements.location.innerHTML = applet.mainTitle;
		if (applet.mainClassName) self.elements.main.classList.add( applet.mainClassName );

	}; // showApplet


	this.hideApplet = function (applet) {
		applet.containers.forEach( (container)=>{
			self.elements[container.parent].innerHTML = '';
		});
		self.elements.main.classList.remove( applet.mainClassName );
		self.elements.location.innerHTML = self.title;

	}; // hideApplet


	this.closeApplet = function (applet) {
		self.hideApplet( applet );
		const applet_name = Object.entries( self.applets ).find( ([name, compare]) => compare === applet );
		delete self.applets[ find(applet) ];
		return applet.exit();

		function find (applet_name) {
			return
		}

	}; // closeApplet


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		console.log( 'UserInterface.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'UserInterface.init' );

		self.events = await new Events( self, EMITS_EVENTS, {
			toggle: self.onToggle,
		});

		await Promise.all([
			cep.dom.loadCSS( 'cep/terminal/variables.css' ),
			cep.dom.loadCSS( 'cep/terminal/terminal.css' ),
		]);

		const container = cep.dom.elementFromHTML( RESSOURCE.html );
		self.elements = cep.dom.gatherElements( container, RESSOURCE.elements );

		self.elements = {
			html     : document.documentElement,
			terminal : container,
			...self.elements,
		},

		document.body.appendChild( container );

		self.title = self.elements.location.innerHTML;
		self.toggles = {};

		self.applets = {};
		self.reloadApplet( 'mainMenu' , MainMenu  );
		self.reloadApplet( 'loginMenu', LoginMenu );
		self.reloadApplet( 'status',    StatusBar );
		self.reloadApplet( 'shell',     CEPShell );

		['keydown', 'keypress', 'keyup'].forEach(
			event => addEventListener( event, on_keyboard_event, {passive: false} )
		);

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const ui = await new UserInterface()

}; // UserInterface


//EOF
