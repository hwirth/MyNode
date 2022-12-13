// node_menu.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from '../../config.js';
import * as Helpers from '../../helpers.js';


export const NodeMenu = function (cep, terminal) {
	const self = this;

	this.containers;
	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		{
			parent: 'topLeft',
			html: (`
<nav class="node menu">
	<button class="connection">MyNode</button>
	<div class="items">
		<nav class="login menu">
			<button>Connect</button>
			<form class="items Xlogin">
				<input type="text"     name="username" placeholder="Username" autocomplete="username">
				<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname" Xautofocus>
				<input type="password" name="password" placeholder="Password" autocomplete="password">
				<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
				<button class="login">Login</button>
				<button class="connect">Connect</button>
				<button class="guest">Guest</button>
				<button class="logout">Logout</button>
				<button class="disconnect">Disconnect</button>
				<button class="user">User</button>
				<button class="root">Root</button>
			</form>
		</nav>
		<nav class="request menu">
			<button data-script=".access.meta">Request</button>
			<div class="items"></div>
		</nav>
	</div>
</nav>

			`),
			elements: {
				menuNode     : 'CONTAINER',
				menuRequest  : '.menu.request',
				itemsLogin   : '.menu.login .items',
				itemsRequest : '.menu.request .items',
				btnNode      : 'button.connection',
				userName     : '[name=username]',
				nickName     : '[name=nickname]',
				passWord     : '[name=password]',
				factor2      : '[name=factor2]',
				login        : 'button.login',
				logout       : 'button.logout',
				connect      : 'button.connect',
				disconnect   : 'button.disconnect',
				guest        : 'button.guest',
				user         : 'button.user',
				root         : 'button.root',
			},
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.updateRequestItems = function (definition = []) {
		const entries = definition.reduce( (collect, entry)=>{
			const parts = entry.split( '.' );
			const protocol = parts.shift();
			const command  = parts.join( '.' );
			if (!collect[protocol]) collect[protocol] = [];
			collect[protocol].push( command );
			return collect;
		}, {} );

		const list_element = self.elements.itemsRequest;
		list_element.innerHTML = '';

		const NEW = cep.dom.newElement;
		Object.entries( entries ).forEach( ([protocol, commands])=>{
			const button = NEW({
				tagName   : 'button',
				innerText : Helpers.capitalize(protocol),
			});
			const items  = NEW({ tagName:'div'   , className:'items' });
			const nav    = NEW({ tagName:'nav'   , className : 'menu', children:[button, items] });
			commands.forEach( (command)=>{
				command = command.replaceAll( ':empty', '' );
				const script = '.' + protocol + '.' + command;
				items.appendChild(
					NEW({
						tagName   : 'button',
						innerText : command,
						dataset   : { script: script },
					}),
				);
			});
			nav.appendChild( button );
			nav.appendChild( items );
			list_element.appendChild( nav );
		});

	}; // updateRequestItems


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'NodeMenu.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'NodeMenu.init' );

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements

		cep.dom.disableFormSubmit( self.elements.menuNode );

		self.elements.menuRequest.addEventListener( 'click'   , on_request_button_mouseevent );
		self.elements.menuRequest.addEventListener( 'dblclick', on_request_button_mouseevent );
		function on_request_button_mouseevent (event) {
			const shell = terminal.applets.shell;
			const script = event.target.dataset.script;
			if (script) {
				shell.elements.input.value = shell.parsers.parseShortRequest(
					script.replaceAll( ':', ': ' ),
				);
				if ((event.type == 'dblclick') || (script == '.access.meta')) {
					terminal.applets.shell.elements.btnEnter.click();
				} else {
					terminal.applets.shell.input.focusPrompt();
				}
			}
		}

		function click_login () {
			const click_event = document.createEvent( 'MouseEvents' );
			click_event.initEvent( 'click', true, true );
			self.elements.login.dispatchEvent( click_event );
		}

		// LOGIN FORM
		self.elements.menuNode.querySelectorAll( 'input' ).forEach( (input)=>{
			input.addEventListener( 'input'  , self.elements.login.click );
			input.addEventListener( 'change' , self.elements.login.click );
			input.addEventListener( 'keyup'  , async(event)=>{
				if (event.key == 'Enter') {
					const dblclick_event = document.createEvent( 'MouseEvents' );
					dblclick_event.initEvent( 'dblclick', true, true );
					self.elements.login.dispatchEvent( dblclick_event );
				}
			});
		});

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const menu = await new NodeMenu()

}; // NodeMenu


//EOF
