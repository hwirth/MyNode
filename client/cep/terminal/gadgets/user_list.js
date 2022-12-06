// user_list.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from '../../config.js';


export const UserList = function (cep, terminal) {
	const self = this;

	this.containers;
	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		{
			parent: 'topRight',
			html: (`
<nav class="who_list">
	<button class="enabled">Public Chat</button>
</nav>
			`),
			elements: {
				navUsers : 'CONTAINER',
			},
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.show  = function () { terminal.showApplet ( self ); }; // show
	this.hide  = function () { terminal.hideApplet ( self ); }; // hide
	this.close = function () { terminal.closeApplet( self ); }; // close

	this.update = function (users_online, full_name = null) {
		const user_list  = self.elements.navUsers;

		if (users_online !== true) user_list.innerHTML = '';
		if (users_online === null) return;

		if (!full_name) full_name = terminal.applets.mainMenu.elements.btnCEP.innerText;

if (user_list.querySelectorAll( 'button' ).length == 0) for(let i = 0; i < 1; ++i) {
const button = document.createElement( 'button' );
button.className = 'enabled room';
button.innerText = 'Public Room';
user_list.appendChild( button );
}

		if (users_online !== true) {
			Object.keys( users_online ).forEach( (address)=>{
				const user_record = users_online[address];
				const button      = document.createElement( 'button' );
				const text = (
					(typeof user_record == 'string')
					? user_record
					: user_record.nickName || user_record.userName

				).trim();
				button.innerText = text;
				user_list.appendChild( button );
			});
		}

		user_list.querySelectorAll( 'button' ).forEach( (button)=>{
			const is_self = (full_name.indexOf(button.innerText) >= 0);
			button.classList.toggle( 'self', is_self );
		});


for(let i = 0; i < 0; ++i) {
const button = document.createElement( 'button' );
button.className = '';
button.innerText = 'dummyuser';
list.appendChild( button );
}

	}; // updateWhoList


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'LoginMenu.exit' );
		self.hide();
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'LoginMenu.init' );

		self.containers = [];
		self.elements = {};
		terminal.createGadgets( self, RESSOURCE );   // Populates self.containers and self.elements

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const user_list = await new UserList()

}; // UserList


//EOF
