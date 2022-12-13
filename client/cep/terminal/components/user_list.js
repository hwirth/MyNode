// user_list.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
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
				navWho : 'CONTAINER',
			},
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_navusers_click (event) {
		if (event.target.tagName != 'BUTTON') return;

		if (!event.target.dataset.user && !event.target.dataset.room) {
			//...? terminal.currentShell()??, .focusTopApplet()
			return;
		}

		const channel_selector = 'button:is([data-room],[data-user])';
		self.elements.navWho.querySelectorAll( channel_selector ).forEach( (button)=>{
			button.classList.toggle( 'active', button === event.target );
		});

	} // on_navusers_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.update = function (users_online, full_name = null) {
		const user_list  = self.elements.navWho;

		if (users_online !== true) user_list.innerHTML = '';
		if (users_online === null) return;

		if (!full_name) {
			const current_username = terminal.applets.mainMenu.elements.btnCEP.innerText; //...! Facility for that
			full_name = current_username.split(':')[1] || '';
		}

		const NEW = cep.dom.newElement;

		if (user_list.querySelectorAll( 'button' ).length == 0) {
			user_list.appendChild(
				NEW({
					tagName   : 'nav',
					className : 'menu',
					children  : [
						NEW({
							tagName   : 'button',
							className : 'active room',
							innerText : 'Public Room',
							dataset   : {room: 'public'},
						}),
						NEW({
							tagName   : 'div',
							className : 'items',
							children  : [
								NEW({
									tagName   : 'button',
									className : 'disabled',
									innerText : 'Talk to everybody',
								}),
							],
						}),
					],
				}),
			);
		}

		if (users_online !== true) {
			Object.keys( users_online ).forEach( (address)=>{
				const user_record = users_online[address];
				const text = (
					(typeof user_record == 'string')
					? user_record
					: user_record.nickName || user_record.userName
				).trim();


				const user_menu = [
					NEW({
						tagName   : 'button',
						className : 'disabled',
						innerText : 'Private chat',
						dataset   : {command:'pm'},
					}),
					NEW({
						tagName   : 'button',
						className : 'disabled',
						innerText : 'User info',
						dataset   : {command:'info'},
					}),
					NEW({
						tagName   : 'button',
						className : 'disabled',
						innerText : 'Ban',
						dataset   : {command:'ban'},
					}),
					NEW({
						tagName   : 'button',
						className : 'disabled',
						innerText : 'Kick',
						dataset   : {command:'kick'},
					}),
					NEW({
						tagName   : 'button',
						className : 'disabled',
						innerText : 'Block IP',
						dataset   : {command:'block'},
					}),
				];
				user_list.appendChild(
					NEW({
						tagName   : 'nav',
						className : 'menu',
						children  : [
							NEW({
								tagName   : 'button',
								innerText : text,
								dataset   : {
									user: user_record.userName,
							/*
									nick: user_record.nickName,
									addr: address,
							*/
								},
							}),
							NEW({ tagName:'div', className:'items', children:user_menu }),
						],
					}),
				);
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

	}; // update


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'UserList.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'UserList.init' );

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements

		self.elements.navWho.addEventListener( 'click', on_navusers_click );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const user_list = await new UserList()

}; // UserList


//EOF
