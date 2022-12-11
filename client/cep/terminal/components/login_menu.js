// login_menu.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from '../../config.js';


export const LoginMenu = function (cep, terminal) {
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
<nav class="login menu">
	<button class="connection">MyNode</button>
	<form class="items login">
		<input type="text"     name="username" placeholder="Username" autocomplete="username">
		<input type="text"     name="nickname" placeholder="Nickname" autocomplete="nickname" Xautofocus>
		<input type="password" name="password" placeholder="Password" autocomplete="password">
		<input type="password" name="factor2"  placeholder="Factor 2" autocomplete="one-time-code">
		<button class="login">Login</button>
		<button class="logout">Logout</button>
		<button class="guest">Guest</button>
		<button class="user">User</button>
		<button class="root">Root</button>
		<button class="connect">Connect</button>
		<button class="disconnect">Disconnect</button>
	</form>
</nav>
			`),
			elements: {
				menuLogin  : 'CONTAINER',
				itemsLogin : '.items.login',
				btnNode    : 'button.connection',
				userName   : '[name=username]',
				nickName   : '[name=nickname]',
				passWord   : '[name=password]',
				factor2    : '[name=factor2]',
				login      : 'button.login',
				logout     : 'button.logout',
				connect    : 'button.connect',
				disconnect : 'button.disconnect',
				guest      : 'button.guest',
				user       : 'button.user',
				root       : 'button.root',
			},
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'LoginMenu.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'LoginMenu.init' );

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements

		cep.dom.disableFormSubmit( self.elements.menuLogin );

		function click_login () {
			const click_event = document.createEvent( 'MouseEvents' );
			click_event.initEvent( 'click', true, true );
			self.elements.login.dispatchEvent( click_event );
		}

		// LOGIN FORM
		self.elements.menuLogin.querySelectorAll( 'input' ).forEach( (input)=>{
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


	return self.init().then( ()=>self );   // const menu = await new LoginMenu()

}; // LoginMenu


//EOF
