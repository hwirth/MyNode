// terminal.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS as CEP_SETTINGS, DEBUG } from '../config.js';

import { SETTINGS  } from './config.js';
import { Audio     } from './audio.js';
import { Events    } from '../events.js';
import { MainMenu  } from './gadgets/main_menu.js';
import { LoginMenu } from './gadgets/login_menu.js';
import { StatusBar } from './gadgets/status.js';
import { CEPShell  } from './shell/shell.js';


export const DebugTerminal = function (cep) {
	const self = this;
	self.templateName = 'DebugTerminal';

	this.audio        // Beep and speech synthesis. Currently houses the Bit too.
	this.events;      // Events we can emit
	this.elements;    // DOM elements mainly querySelector'ed from RESSOURCE
	this.toggles;     // Created in  main_menu.js
	this.shortcuts;   // Currently registered keyboard shortcuts
	this.applets;     // The actual tools and features: Main menu, status bar, shell, editor, ...

	this.fontNames;   // List of names extracted from the CSS file


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const EMITS_EVENTS = ['toggle'];

	const RESSOURCE = {
		html: (`
			<cep-terminal>
				<header class="toolbar">
					<div></div>
					<div class="location"><span><abbr>CEP</abbr> Debug Terminal</span></div>
					<div></div>
				</header>
				<footer class="toolbar">
					<div></div>
					<div class="status"></div>
					<div></div>
				</footer>
			</cep-terminal>
		`),
		elements: {
			terminal      : 'CONTAINER',
			header        : ':scope > header',
			footer        : ':scope > footer',
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
		self.audio.beep();
	}
	this.keyboardShortcuts = [
		  { event:'keydown', key:'+', modifiers:'alt', action:()=>{ self.changeFontSize(+1);     },
		},{ event:'keydown', key:'-', modifiers:'alt', action:()=>{ self.changeFontSize(-1);     },
		},{ event:'keydown', key:'.', modifiers:'alt', action:()=>{ self.nextFont(+1);           },
		},{ event:'keydown', key:',', modifiers:'alt', action:()=>{ self.nextFont(-1);           },
		},{ event:'keydown', key:'e', modifiers:'alt', action:()=>{ shortcut_exec('disconnect'); },
		},{ event:'keydown', key:'w', modifiers:'alt', action:()=>{ shortcut_exec('login');      },
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskTitle;   // Extracted from RESSOURCE .location


// GADGETS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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


// APPLETS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.installApplet = async function (name, template, show_applet = false) {
		if (self.applets[name]) await self.applets[name].exit();

		const instance_nr
		= (name.slice(-1) == ')')
		? name.slice( name.indexOf('(') )
		: ''
		;

		const applet = self.applets[name] = await new template( cep, self, {
			events : {
				show  : self.showApplet,
				hide  : self.hideApplet,
				close : self.closeApplet,
			},
		});

		if (applet.taskName) {
			const NEW = cep.dom.newElement;

			const context_menu = applet.contextMenu();
			const menu_entries = [];
			Object.entries( context_menu ).forEach( ([name, definition])=>{
				menu_entries.push( NEW({
					tagName   : 'button',
					innerHTML : definition.caption,
					events    : {click: definition.action},
				}) );
			});

			const task_name = applet.taskName || applet.taskTitle || applet.templateName;
			applet.taskEntry = NEW({
				tagName   : 'nav',
				className : 'task menu',
				dataset   : {name: name},
				children  : [
					NEW({
						tagName   : 'button',
						innerText : task_name + instance_nr,
					}),
					NEW({
						tagName   : 'div',
						className : 'items',
						children  : menu_entries,
					}),
				],
			});

			applet.taskTitle = task_name + instance_nr;

			self.elements.bottomLeft.appendChild( applet.taskEntry );
		}

		if (show_applet) self.showApplet( applet );

	}; // installApplet


	this.showApplet = function (applet) {
		Object.values( self.applets ).forEach( (unmount_applet)=>{
			if (unmount_applet === applet) return;
			if (unmount_applet.taskName) unmount_applet.containers.forEach( (container)=>{
				const is_mounted = container.element.parentNode === self.elements[container.parent];
				if (is_mounted) self.elements[container.parent].removeChild( container.element );
				if (unmount_applet.taskEntry) unmount_applet.taskEntry.classList.remove( 'enabled' );
			});
		});

		applet.containers.forEach( (container)=>{
			const is_mounted = container.element.parentNode === self.elements[container.parent];
			if (!is_mounted) self.elements[container.parent].appendChild( container.element );
		});

		if (applet.taskEntry) {
			self.elements.location.innerHTML = applet.taskTitle;
			applet.taskEntry.classList.add( 'enabled' );
		}

	}; // showApplet


	this.hideApplet = function (applet) {
		applet.containers.forEach( (container)=>{
			const is_mounted = container.element.parentNode === self.elements[container.parent];
			if (is_mounted) self.elements[container.parent].removeChild( container.element );
		});

		self.elements.location.innerHTML = self.taskTitle;

	}; // hideApplet


	this.closeApplet = function (applet) {
		self.hideApplet( applet );

		if (applet.taskEntry) self.elements.bottomLeft.removeChild( applet.taskEntry );

		const applet_name = applet.taskEntry.dataset.name;
		delete self.applets[ applet_name ];

		return applet.exit();

	}; // closeApplet


// TERMINAL //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleVisibility = function (make_visible = null) {
		if (make_visible === null) {
			make_visible = self.elements.terminal.classList.contains( 'hidden' )
		}

		self.elements.terminal.classList.toggle( 'hidden', !make_visible );

		if (make_visible) {
			cep.connection.events.add( 'login', self.getCredentials );
		} else {
			cep.connection.events.remove( 'login', self.getCredentials );
		}

	}; // toggleVisibility


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DOM ACTIONS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

this.updateWhoList = function () {};//...

	this.animatePing = function (transmit = false) {
		if (!SETTINGS.ANIMATE_TRANSMISSION) return;
		if (!self.toggles.animate.enabled) return;

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
		self.applets.status.show( 'Font ' + self.fontNames[index] + ' was selected' );

	}; // nextFont


	this.changeFontSize = function (delta_px) {
		const css_size     = CEP.dom.getCSSVariable( '--font-size', terminal.elements.terminal );
		const current_size = parseInt( css_size.slice(0, -2), 10 );
		const new_size     = Math.min( 100, Math.max( 3, current_size + delta_px ));

		terminal.elements.terminal.style.setProperty( '--font-size', new_size+'px' );

		if (DEBUG.FONTS) console.log( 'DebugConsole.changeFontSize:', new_size );

	}; // changeFontSize


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_keyboard_event (event) {
		if ((event.type == 'keydown') && DEBUG.KEYBOARD_EVENTS) {
			console.log( 'KEYDOWN:', 'key:', event.key, 'code:', event.code );
		}

		if( (event.type == 'keydown')
		//..done in beep &&  (self.toggles.beep.enabled)
		//...&&  !((event.key == 'Enter') && event.target.closest('.login.menu'))
		) {
			self.audio.beep();
		}

		self.keyboardShortcuts.forEach( (shortcut)=>{
			const is_key = (event.key == shortcut.key) || (event.code == shortcut.code);
			const is_event = (shortcut.event.split( ',' )).indexOf( event.type ) >= 0;

			if (is_event && is_key && modifiers( shortcut )) {
				event.stopPropagation();
				event.preventDefault();

				shortcut.action( event );
			}
		});

		function modifiers (shortcut) {
			const modifiers = shortcut.modifiers ? shortcut.modifiers.split(',') : [];
			const requires = {
				shift : modifiers.indexOf( 'shift' ) >= 0,
				ctrl  : modifiers.indexOf( 'ctrl'  ) >= 0,
				alt   : modifiers.indexOf( 'alt'   ) >= 0,
			};

			const key_matches
			=  (event.shiftKey == requires.shift)
			&& (event.ctrlKey == requires.ctrl)
			&& (event.altKey == requires.alt)
			;

			return key_matches;
		}

	} // on_keyboard_event


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROTOCOL
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getCredentials = function (websocket_url) {
		console.log( 'DebugTerminal.getCredentials:', websocket_url );

		return new Promise( (proceed, abort)=>{
			//... Await dialog
			let user_name = self.applets.loginMenu.elements.userName.value.trim();
			let nick_name = self.applets.loginMenu.elements.nickName.value.trim();
			let password  = self.applets.loginMenu.elements.passWord.value.trim();
			let factor2   = self.applets.loginMenu.elements.factor2 .value.trim();

			if (!user_name && !nick_name) return null;   // Connect only

			const request = { session: { login: { username: user_name }}};
			if (user_name.toLowerCase() != 'guest') request.session.login.password = password;
			if (nick_name                         ) request.chat = { nick: nick_name };

			proceed( request );
		});

	}; // getCredentials


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsOpen = function (event) {
		self.animatePing( /*transmit*/true );

		const url = event.target.url.replace( 'wss://', '' ).replace( 'ws://', '' ).split(':')[0];

		self.elements.terminal.classList.add( 'connected' );
		self.applets.mainMenu.elements.btnCEP.innerText = 'Connected';

		self.applets.loginMenu.elements.btnNode.innerText = url;
		self.applets.loginMenu.elements.btnNode.title = event.target.url;

	}; // onWsConnect


	this.onWsClose = function () {
		self.animatePing( /*transmit*/true );

		self.elements.terminal.classList.remove( 'connected' );
		self.applets.mainMenu.elements.btnCEP.innerText = 'Offline';

		self.applets.loginMenu.elements.btnNode.innerText = 'MyNode';
		self.applets.loginMenu.elements.btnNode.title = 'Not connected';

		//...self.elements.navWho.innerHTML = '';

	}; // onWsClose


	this.onWsError = function () {
		self.animatePing( /*transmit*/true );

		self.onWsClose();
		self.applets.mainMenu.elements.btnCEP.innerText = 'Error';

	}; // onWsError


	this.onWsSend = function () {
		self.animatePing( /*transmit*/true );

	}; // onWsSend


	this.onWsMessage = function (message) {
		self.animatePing( /*transmit*/true );

		if (message.broadcast && message.broadcast.reload) {
			Object.keys( message.broadcast.reload ).forEach( (file_name)=>{
				if (file_name.charAt(0) != '/') file_name = '/' + file_name;
				file_name = file_name.replace( 'client/', '' ).replace( CEP.baseDir + '/', '' );
				self.applets.status.show(
					'The file <a href="'
					+ file_name
					+ '">'
					+ file_name.replaceAll( '/', '/<wbr>' )
					+ '</a> was updated.'
				);
			});
		}

	}; // onWsMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'DebugTerminal.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'DebugTerminal.init' );

		await Promise.all([
			cep.dom.loadCSS( 'cep/terminal/variables.css' ),
			cep.dom.loadCSS( 'cep/terminal/terminal.css' ),
		]);

		const container = cep.dom.elementFromHTML( RESSOURCE.html );
		self.elements = {
			html     : document.documentElement,
			...cep.dom.gatherElements( container, RESSOURCE.elements ),
		},

		document.body.appendChild( container );

		self.taskTitle = self.elements.location.innerHTML;

		self.fontNames = extract_css_font_names();
		function extract_css_font_names () {
			const result = [];
			let font_name = null;
			let i = 0;
			while (font_name = CEP.dom.getCSSVariable( '--font' + i )) {
				result.push( font_name );
				++i;
			}
			return result;
		}
		//self.setFont();

		self.audio   = await new Audio( cep, self );
		self.bit     = self.audio.bit;   //... still needs to be created before shell. Move to shell entirely
		self.events  = await new Events( self, EMITS_EVENTS, {toggle: self.onToggle} );

		self.toggles = {};
		self.applets = {};                                // true/false: Whether to activate (show)
		await self.installApplet( 'mainMenu' , MainMenu , true  );   // Creates our toggles, must be first
		await self.installApplet( 'loginMenu', LoginMenu, true  );
		await self.installApplet( 'status',    StatusBar, true  );
		await self.installApplet( 'shell',     CEPShell , true );


		// MAIN MENU ENTRY
		add_menu_entry( 'shell', 'CEP-Shell', CEPShell );
		function add_menu_entry (name, caption, template) {
			self.applets.mainMenu.elements.itemsMain.appendChild( cep.dom.newElement({
				tagName   : 'button',
				innerText : caption,
				events    : { click:()=>add_task(name, template) },
			}) );

			function add_task (name, template) {
				let attempt_nr = 1;
				while (name_exists()) ++attempt_nr;

				self.installApplet( name, template, /*show_applet*/true );

				function name_exists () {
					if (!self.applets[name]) return false;
					if (!self.applets[name + '(' + attempt_nr + ')']) {
						name = name + '(' + attempt_nr + ')';
						return false;
					}
					return true;
				}
			}
		}


		if (cep.GET.has( 'name' )) {
			self.applets.loginMenu.elements.userName.value = 'root';
			self.applets.loginMenu.elements.passWord.value = '12345';
			self.applets.loginMenu.elements.nickName.value = cep.GET.get( 'name' );
		}

		// KEYBOARD
		['keydown', 'keypress', 'keyup'].forEach(
			event => self.elements.terminal.addEventListener( event, on_keyboard_event, {passive: false} )
		);
		// BUTTON BEEP
		self.elements.terminal.addEventListener( 'click', (event)=>{
			if (event.target.tagName == 'BUTTON') self.audio.beep();
		});

		cep.connection.events.add( 'open'   , self.onWsOpen    );
		cep.connection.events.add( 'close'  , self.onWsClose   );
		cep.connection.events.add( 'error'  , self.onWsError   );
		cep.connection.events.add( 'send'   , self.onWsSend    );
		cep.connection.events.add( 'message', self.onWsMessage );
		cep.connection.events.add( 'ping'   , self.animatePing );

		self.events.add( 'toggle', (toggle)=>{
			if (toggle.name == 'ping') {
				CEP_SETTINGS.WEBSOCKET.HIDE_PING = toggle.enabled;
			}
			self.bit.say( toggle.enabled );
		})
if (self.applets.shell)//...!
		CEP_SETTINGS.WEBSOCKET.HIDE_PING = self.applets.shell.toggles.ping.enabled;

	/*//...!
		if (cep.connection.isConnected) {
			self.elements.terminal.classList.add( 'connected' );
		}
	*/

		self.toggleVisibility( true );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const terminal = await new DebugTerminal()

}; // DebugTerminal


//EOF
