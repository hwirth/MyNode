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

	this.talkingTo;


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
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.update = function (users_online, full_name = null) {
		const user_list  = self.elements.navWho;

		if (users_online !== true) user_list.innerHTML = '';
		if (users_online === null) return;

		if (!full_name) {
			const current_username = terminal.applets.mainMenu.elements.btnCEP.innerText;
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
						//disabled  : true,
						innerText : 'Private chat',
						dataset   : {command:'pm'},
					}),
					NEW({
						tagName   : 'button',
						disabled  : true,
						innerText : 'User info',
						dataset   : {command:'info'},
					}),
					NEW({
						tagName   : 'button',
						disabled  : true,
						innerText : 'Ban',
						dataset   : {command:'ban'},
					}),
					NEW({
						tagName   : 'button',
						disabled  : true,
						innerText : 'Kick',
						dataset   : {command:'kick'},
					}),
					NEW({
						tagName   : 'button',
						disabled  : true,
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
									nick: user_record.nickName,
									//...? addr: address,
								},
							}),
							NEW({ tagName:'div', className:'items', children:user_menu }),
						],
					}),
				);
			});
		}

		user_list.querySelectorAll( ':is([data-user],[data-room])' ).forEach( (button)=>{
			const is_self = (full_name.indexOf(button.innerText) >= 0);
			button.classList.toggle( 'self', is_self );
			if (self.talkingTo) {
				const data = button.dataset;
				const talk = self.talkingTo;
				const is_room = data.room && (data.room == talk.room);
				const is_user = data.user && (data.user == talk.user) && (data.nick == talk.nick);
				button.classList.toggle( 'active', !!is_user || !!is_room );
			}
		});

	}; // update


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_navusers_click (event) {
		if (event.target.tagName != 'BUTTON') return;

		if (!event.target.dataset.user && !event.target.dataset.room) {
			const nav = event.target.closest( 'nav.menu' );
			if (nav) {
				const button = nav.querySelector( 'button' );
				if (button) button.click();
			}
			terminal.focusRecentTask();
			return;
		}

		self.talkingTo
		= (event.target.dataset.room)
		? { room: event.target.dataset.room }
		: { user: event.target.dataset.user, nick:event.target.dataset.nick }
		;

		const channel_selector = 'button:is([data-room],[data-user])';
		self.elements.navWho.querySelectorAll( channel_selector ).forEach( (button)=>{
			button.classList.toggle( 'active', button === event.target );
		});

		terminal.focusRecentTask();

	} // on_navusers_click


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'UserList.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'UserList.init' );

		self.talkingTo = { room: 'public' };

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements

		self.elements.navWho.addEventListener( 'click', on_navusers_click );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const user_list = await new UserList()

}; // UserList


//EOF
