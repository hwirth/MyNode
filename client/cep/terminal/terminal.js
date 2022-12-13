// terminal.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS as CEP_SETTINGS, DEBUG } from '../config.js';

import { SETTINGS, FUN_MODES } from './config.js';
import { Audio     } from './audio.js';
import { Events    } from '../events.js';
import { MainMenu  } from './components/main_menu.js';
import { NodeMenu  } from './components/node_menu.js';
import { UserList  } from './components/user_list.js';
import { StatusBar } from './components/status.js';
import { CEPShell  } from './shell/shell.js';
import { Settings  } from './applets/settings.js';
import { Editor    } from './editor/editor.js';

const PROGRAM_NAME = 'MyNode Debug Terminal';
const PROGRAM_VERSION = '0.2.1α';

DEBUG.TERMINAL = {
	APPLETS: !false,
};


export const DebugTerminal = function (cep) {
	const self = this;
	self.templateName = 'DebugTerminal';
	this.version = PROGRAM_VERSION;

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
			<cep-terminal tabindex="0">
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
	this.keyboardShortcuts = [
		  { event:'keydown', key:'+', modifiers:'alt' , action:()=>{ self.changeFontSize(+1);     },
		},{ event:'keydown', key:'-', modifiers:'alt' , action:()=>{ self.changeFontSize(-1);     },
		},{ event:'keydown', key:'.', modifiers:'alt' , action:()=>{ self.nextFont(+1);           },
		},{ event:'keydown', key:',', modifiers:'alt' , action:()=>{ self.nextFont(-1);           },
		},{ event:'keydown', key:'1', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 1 );       },
		},{ event:'keydown', key:'2', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 2 );       },
		},{ event:'keydown', key:'3', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 3 );       },
		},{ event:'keydown', key:'4', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 4 );       },
		},{ event:'keydown', key:'5', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 5 );       },
		},{ event:'keydown', key:'6', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 6 );       },
		},{ event:'keydown', key:'7', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 7 );       },
		},{ event:'keydown', key:'8', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 8 );       },
		},{ event:'keydown', key:'9', modifiers:'ctrl', action:()=>{ self.focusTaskNr( 9 );       },
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskTitle;   // Extracted from RESSOURCE .location


// COMPONENTS ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.createComponents = function (applet, components) {
		components.forEach( (component)=>{
			const content = cep.dom.elementFromHTML( component.html );
			applet.containers.push({
				parent  : component.parent,
				element : content,
			});
			applet.elements = {
				...applet.elements,
				...cep.dom.gatherElements( content, component.elements ),
				parent    : self.elements[component.parent],
				container : content,
			};
		});

	}; // createComponents


// MODULES ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function task_debug_log (caption) {
		if (DEBUG.TERMINAL.APPLETS) {
			const recent
			= (self.recentTaskApplet)
			? (self.recentTaskApplet.taskTitle || self.recentTaskApplet)
			: self.recentTaskApplet
			;
			console.log( 'DebugTerminal.recentTaskApplet:', recent, caption );
		}

	} // task_debug_log


	function add_task_menu_entries (entries) {
		entries.forEach( (entry)=>{
			const { name, caption, template, show } = entry;

			self.applets.mainMenu.elements.itemsMain.appendChild(
				cep.dom.newElement({
					tagName   : 'button',
					innerText : caption,
					events    : { click:()=>add_task(entry) },
				}),
			);
		});

		function add_task (entry) {
			let { name, template } = entry;

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

	} // add_task_menu_entries


	this.installModule = function (parameters) {
		const { name, template } = parameters;

		self.modules[name] = template;

	}; // installModule


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

			const context_menu = {
				show  : { caption: 'Show' , action: ()=>self.showApplet (applet) },
				hide  : { caption: 'Hide' , action: ()=>self.hideApplet (applet) },
				close : { caption: 'Close', action: ()=>self.closeApplet(applet) },
			};
			const menu_entries = [];
			Object.entries( context_menu ).forEach( ([name, definition])=>{
				menu_entries.push( NEW({
					tagName   : 'button',
					className : name,
					innerHTML : definition.caption,
					events    : {click: definition.action},
				}) );
			});

			// Storing the context menu element inside the applet instance
			const task_name = applet.taskName || applet.taskTitle || applet.templateName;
			applet.taskEntry = NEW({
				tagName   : 'nav',
				className : 'task menu',
				dataset   : {name: name},
				children  : [
					NEW({
						tagName   : 'button',
						innerText : task_name + instance_nr,
						events    : {
							click: ()=>self.showApplet( applet ),
						},
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

			if (applet.focusItem) {
				applet.focusItem.addEventListener( 'focus', ()=>self.focusApplet(applet) );
				applet.focusItem.addEventListener( 'blur' , ()=>self.blurApplet (applet) );
			}
		}

		if (show_applet) self.showApplet( applet );
		task_debug_log( 'DebugTerminal.installApplet', show_applet, name );

	}; // installApplet


	this.focusTaskNr = function (task_number) {
		const selector = ':scope > nav.task:nth-child(' + (task_number) + ') button';
		const tasks = self.elements.bottomLeft.querySelectorAll( ':scope > nav.task' );
		const button = tasks[task_number - 1].querySelector( 'button' );
		if (button) button.click();

	}; // focusApplet


	this.showApplet = function (applet) {
		Object.values( self.applets ).forEach( (unmount_applet)=>{
			if (unmount_applet === applet) return;
			if (unmount_applet.taskName) unmount_applet.containers.forEach( (container)=>{
				const is_mounted = container.element.parentNode === self.elements[container.parent];
				if (is_mounted) self.elements[container.parent].removeChild( container.element );
				if (unmount_applet.taskEntry) unmount_applet.taskEntry.classList.remove( 'active' );
			});
		});

		applet.containers.forEach( (container)=>{
			const is_mounted = container.element.parentNode === self.elements[container.parent];
			if (!is_mounted) self.elements[container.parent].appendChild( container.element );
		});

		if (applet.taskEntry) {
			self.elements.location.innerHTML = applet.taskTitle;
			if (applet.taskEntry) applet.taskEntry.classList.add( 'active' );
			self.recentTaskApplet = applet;
			task_debug_log( 'DebugTerminal.showApplet' );
		}

		if (applet.focusItem) {
			applet.focusItem.focus();
		} else {
			self.elements.terminal.focus();
		}

	}; // showApplet


	this.hideApplet = function (applet) {
		applet.containers.forEach( (container)=>{
			const is_mounted = container.element.parentNode === self.elements[container.parent];
			if (is_mounted) self.elements[container.parent].removeChild( container.element );
			if (applet.taskEntry) {
				self.recentTaskApplet = null;//...? Stack
				task_debug_log( 'DebugTerminal.closeApplet' );
			}
		});

		self.elements.location.innerHTML = self.taskTitle;

	}; // hideApplet


	this.closeApplet = function (applet) {
		self.hideApplet( applet );

		if (applet.taskEntry) {
			self.elements.bottomLeft.removeChild( applet.taskEntry );
			if (applet === self.recentTaskApplet) {
				self.recentTaskApplet = null;
				task_debug_log( 'DebugTerminal.closeApplet' );
			}
		}

		const applet_name = applet.taskEntry.dataset.name;
		delete self.applets[ applet_name ];

		return applet.exit();

	}; // closeApplet


	this.focusApplet = function (applet) {
		if (applet.taskEntry) {
			self.showApplet( applet );
			self.recentTask = applet;
		}

	}; // focusApplet


	this.blurApplet = function (applet) {
		task_debug_log( 'DebugTerminal.blurApplet' );
		if (applet.taskEntry) {
			applet.taskEntry.classList.remove( 'active' );
		}

	}; // blurApplet


	this.focusRecentTask = function () {
		task_debug_log( 'DebugTerminal.focusRecent' );

		if (self.recentTaskApplet) {
			self.focusApplet( self.recentTaskApplet );
		}

	}; // focusRecentTask


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


	this.updateBrowserURL = function (target_toggle) {
		if (!self.toggles.save.enabled && (target_toggle.name != 'save')) return;

		//... don't work with button text
		//...! Current shell!
		const shell_toggles = (self.applets.shell) ? self.applets.shell.toggles : {};
		const all_toggles   = {...self.toggles, ...shell_toggles, terminal: {
			name:'terminal', preset:true, enabled:true,
		}};
		const key_order = ['animate','fancy','light','split','terminal','login','save'];
		const order = (toggle_a, toggle_b) => {
			const a = key_order.indexOf( toggle_a.name );
			const b = key_order.indexOf( toggle_b.name );
			if (a < 0) return +1;
			if (b < 0) return -1;
			return Math.sign( a - b );
		};
		const sorted = Object.values( all_toggles ).sort( order );
		const toggles = sorted.reduce( (prev, toggle)=>{
			const parameter = '&' + toggle.name;
			const show = toggle.enabled != (toggle.preset ^ cep.GET.has(toggle.name));
			return prev + (show ? parameter : '');
		}, '');
		const base_url = (location.href + '?').split('?',1)[0];
		const old_nick = cep.GET.get( 'name' );
		const new_nick = self.applets.mainMenu.elements.btnCEP.innerText.split(':')[1];
		const use_nick = new_nick || old_nick;
		const new_url  = '/?' + (use_nick ? 'name='+use_nick : '') + toggles;

		window.history.pushState(
			'It says put "object or string" here, but I don\'t see any effect in my browser',
			'It says put "title" here, but I don\'t see any effect in my browser',
			new_url,
		);

	}; // updateBrowserURL


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DOM ACTIONS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
		const css_size     = cep.dom.getCSSVariable( '--font-size', self.elements.terminal );
		const current_size = parseInt( css_size.slice(0, -2), 10 );
		const new_size     = Math.min( 100, Math.max( 3, current_size + delta_px ));

		self.elements.terminal.style.setProperty( '--font-size', new_size+'px' );

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
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const socket_state = {
		serverName : null,
		userName   : null,
	};

	this.onWsStateChange = function (new_state = cep.connection.state) {
		const ws_url    = cep.connection.webSocketURL;
		const short_url = ws_url.replace( 'wss://', '' ).replace( 'ws://', '' ).split(':')[0];
		const node_name = socket_state.nodeName || short_url;
		const user_name = socket_state.userName;

		const text = {
			offline       : { node:'MyNode' , cep:'Offline'   , title:'Not connected'               },
			connecting    : { node:node_name, cep:'Connecting', title:'Attempting to connect'       },
			connected     : { node:node_name, cep:'Connected' , title:'Connected but not logged in' },
			authenticated : { node:node_name, cep:user_name   , title:'Authenticated with node'     },
		};

		self.applets.nodeMenu.elements.btnNode.innerText = text[new_state].node;
		self.applets.mainMenu.elements.btnCEP .innerText = text[new_state].cep;
		self.applets.mainMenu.elements.btnCEP .title     = text[new_state].title;

		const connected     = (new_state == 'connected') || (new_state == 'authenticated');
		const authenticated = (new_state == 'authenticated');
		self.elements.terminal.classList.toggle( 'connected'    , connected     );
		self.elements.terminal.classList.toggle( 'authenticated', authenticated );

		self.applets.nodeMenu.elements.btnNode.title = (connected) ? ws_url : '';

	} // onWsStateChange


	this.onWsLogin = function (event) {
		cep.connection.send( {access:{meta:{}}} );

	}; // onWsLogin


	this.onWsClose = function (event) {
		self.applets.nodeMenu.updateRequestItems();

	}; // onWsClose


	this.onWsSend = function (event) { self.animatePing( /*transmit*/true );  }; // onWsSend


	this.onWsMessage = function (message) {
		self.animatePing( /*transmit*/true );

		if (message.who) self.applets.userList.update( message.who);

		if (message.response)  {
			const response = message.response;
			const responses = (response instanceof Array) ? response : [response];
			responses.forEach( on_response );
		}

		if (message.broadcast) {
			const broadcast = message.broadcast;
			const broadcasts = (broadcast instanceof Array) ? broadcast : [broadcast];
			broadcasts.forEach( on_broadcast );
		}

	}; // onWsMessage


	function on_response (response) {
		if (!response.success) return;

		switch (response.command) {
			case 'session.login': {
				const user_name = response.result.login.userName;
				const nick_name = response.result.login.nickName;
				socket_state.userName = user_name + (nick_name ? ':'+nick_name : '');
				self.onWsStateChange();
				break;
			}
			case 'chat.nick': {
				const user_name = response.result.userName;
				const nick_name = response.result.nickName;
				socket_state.userName = user_name + ':' + nick_name;
				self.onWsStateChange();
				break;
			}
			case 'session.logout': {
				socket_state.userName = null;
				self.onWsStateChange();
				break;
			}
		}

	} // on_response


	function on_broadcast (broadcast) {
		if (broadcast.reload) {
			const reload = broadcast.reload;
			const file_names = (typeof reload == 'string') ? [reload] : reload;
			file_names.forEach( (file_name)=>{
				if (file_name.charAt(0) != '/') file_name = '/' + file_name;
				file_name = file_name.replace( 'client/', '' ).replace( cep.baseDir + '/', '' );
				self.applets.status.show(
					'The file <a href="'
					+ file_name
					+ '">'
					+ file_name.replaceAll( '/', '/<wbr>' )
					+ '</a> was updated.'
				);
			});
			return;
		}

		switch (broadcast.type) {
			case 'server/name': {
				socket_state.nodeName = broadcast.name;
				self.onWsStateChange();
				break;
			}
			case 'chat/mode/set': {
				FUN_MODES.forEach( (class_name)=>{
					self.elements.terminal.classList.toggle(
						class_name,
						broadcast.mode.indexOf(class_name) >= 0,
					);
				});
				break;
			}
			case 'chat/mode/add': {
				if (FUN_MODES.indexOf(broadcast.mode) >= 0) {
					self.elements.terminal.classList.add( broadcast.mode );
				}
				break;
			}
			case 'chat/mode/del': {
				if (FUN_MODES.indexOf(broadcast.mode) >= 0) {
					self.elements.terminal.classList.remove( broadcast.mode );
				}
				break;
			}
		}

	} // on_broadcast


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROTOCOL
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getCredentials = function (websocket_url) {
		console.log( 'DebugTerminal.getCredentials:', websocket_url );

		return new Promise( (proceed, abort)=>{
			if (!self.toggles.login.enabled) proceed();

			//... Await dialog
			let user_name = self.applets.nodeMenu.elements.userName.value.trim();
			let nick_name = self.applets.nodeMenu.elements.nickName.value.trim();
			let password  = self.applets.nodeMenu.elements.passWord.value.trim();
			let factor2   = self.applets.nodeMenu.elements.factor2 .value.trim();

			if (!user_name && !nick_name) return null;   // Connect only

			const request = { session: { login: { username: user_name }}};
			if (user_name.toLowerCase() != 'guest') request.session.login.password = password;
			if (nick_name                         ) request.chat = { nick: nick_name };

			proceed( request );
		});

	}; // getCredentials


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
			cep.dom.loadCSS( 'cep/terminal/css/variables.css' ),
			cep.dom.loadCSS( 'cep/terminal/css/terminal.css' ),
		]);

		const container = cep.dom.elementFromHTML( RESSOURCE.html );
		self.elements = {
			html     : document.documentElement,
			...cep.dom.gatherElements( container, RESSOURCE.elements ),
		},

		document.body.appendChild( container );

		self.taskTitle        = self.elements.location.innerHTML;
		self.recentTaskApplet = null;

		self.fontNames = extract_css_font_names();
		function extract_css_font_names () {
			const result = [];
			let font_name = null;
			let i = 0;
			while (font_name = cep.dom.getCSSVariable( '--font' + i )) {
				result.push( font_name );
				++i;
			}
			return result;
		}
		//self.setFont();

		self.audio   = await new Audio( cep, self );
		self.bit     = self.audio.bit;   //... still needs to be created before shell. Move to shell entirely
		self.events  = await new Events( self, EMITS_EVENTS, {toggle: self.onToggle} );

		// Instantiate applets
		self.toggles = {};
		self.applets = {};                                // true/false: Whether to activate (show)
		await self.installApplet( 'mainMenu', MainMenu , true  );   // Creates our toggles, must be first
		await self.installApplet( 'nodeMenu', NodeMenu , true  );
		await self.installApplet( 'userList', UserList , true  );
		await self.installApplet( 'status'  , StatusBar, true  );
		//await self.installApplet( 'editor'  , Editor   , false );
		//await self.installApplet( 'settings', Settings , false );
		await self.installApplet( 'shell'   , CEPShell , true  );
		add_task_menu_entries([
			{ name:'settings', caption:'Settings', template:Settings, show:false },
			{ name:'editor'  , caption:'Editor'  , template:Editor  , show:false },
			{ name:'shell'   , caption:'Shell'   , template:CEPShell, show:true  },
		]);

		// GET PARAMETER
		if (cep.GET.has( 'name' )) {
			self.applets.nodeMenu.elements.userName.value = 'root';
			self.applets.nodeMenu.elements.passWord.value = '12345';
			self.applets.nodeMenu.elements.nickName.value = cep.GET.get( 'name' );
		}

		// KEYBOARD
		['keydown', 'keypress', 'keyup'].forEach(
			event => self.elements.terminal.addEventListener( event, on_keyboard_event, {passive: false} )
		);
		// BUTTON BEEP
		self.elements.terminal.addEventListener( 'click', (event)=>{
			if (event.target.tagName == 'BUTTON') self.audio.beep();
		});

		// WEB SOCKET
		cep.connection.events.add( 'send'       , self.onWsSend        );
		cep.connection.events.add( 'message'    , self.onWsMessage     );
		cep.connection.events.add( 'statechange', self.onWsStateChange );
		cep.connection.events.add( 'login'      , self.onWsLogin       );
		cep.connection.events.add( 'logout'     , self.onWsLogin       );
		cep.connection.events.add( 'close'      , self.onWsClose       );
		cep.connection.events.add( 'ping'       , self.animatePing     );

		// TOGGLES
		self.events.add( 'toggle', (toggle)=>{
			switch (toggle.name) {
				case 'ping': {
					CEP_SETTINGS.WEBSOCKET.HIDE_PING = toggle.enabled;
					break;
				}
				case 'light': {
					self.elements.html.classList.toggle( 'light', toggle.enabled );
					self.elements.html.classList.toggle( 'dark', !toggle.enabled );
					break;
				}
			}
			self.updateBrowserURL( toggle );
			self.bit.say( toggle.enabled );
		})
		//...? updateBrowserURL();

		// LIGHT MODE
	/*
		if (cep.GET.has( 'light' )) {
			self.toggles.light.toggle( true );
		} else if (cep.GET.has( 'dark' )) {
			self.toggles.light.toggle( false );
		} else {
			const prefers_light = window.matchMedia( '(prefers-color-scheme:light)' ).matches;
			self.toggles.light.toggle( prefers_light );
		}
	*/

if (self.applets.shell)//...!
		CEP_SETTINGS.WEBSOCKET.HIDE_PING = self.applets.shell.toggles.ping.enabled;

	/*//...!
		if (cep.connection.isConnected) {
			self.elements.terminal.classList.add( 'connected' );
		}
	*/

		if (self.toggles.bit.enabled) {
			self.toggles.bit.toggle( false );
			setTimeout( ()=>self.toggles.bit.toggle(true), 333 );
		}

		self.toggleVisibility( true );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const terminal = await new DebugTerminal()

}; // DebugTerminal


//EOF
