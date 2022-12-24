// whoami.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as Helpers from './helpers.js';


export const WhoAmI = function (cep) {
	const self = this;

	this.address;
	this.userName;
	this.nickName;
	this.whoData;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsMessage = function (message) {
		if (message.who) self.whoData = message.who;
		if (!message.response) return;

		Helpers.wrapArray( message.response ).forEach( (response)=>{
			if (!response.success) return;
			switch (response.command) {
				case 'chat.nick': {
					self.nickName = response.result.nickName;
					break;
				}
				case 'session.login': {
					self.userName = response.result.login.userName;
					self.nickName = response.result.login.nickName;
					break;
				}
				case 'session.logout': {
					self.userName = self.nickName = null;
					break;
				}
			}
		});

	}; // onWsMessage


	this.onWsClose   = function () {
		self.whoData = self.userName = self.nickName = null;
	}; // onWsMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'WhoAmI.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'WhoAmI.init' );
		self.userName = self.nickName = null;
		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const whoami = await new WhoAmI()

}; // WhoAmI


//EOF
