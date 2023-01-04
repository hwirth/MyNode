// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as Helpers from './helpers.js';
import { CONNECTION_STATE } from './websocket.js';

export const MyNodeSession = function (cep) {
	const self = this;

	this.login;
	this.whoData;

	this.userName;
	this.nickName;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsMessage = function (message) {
		if (message.who) {
			self.whoData = message.who;
			console.log(
				'WhoData.onMessage: message.who:',
				JSON.stringify( self.whoData, null, '\t' ),
			);
		}

		Helpers.wrapArray( message.response ).filter( r => r.success ).forEach( (response)=>{
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

		console.log(
			'WhoData.onMessage',
			self.userName,
			self.nickName,
			JSON.stringify( self.whoData, null, '\t' ),
		);

	}; // onWsMessage


	this.onWsStateChange   = function (new_state) {
		switch (new_state) {
			case CONNECTION_STATE.OFFLINE:
			case CONNECTION_STATE.CONNECTING:
			case CONNECTION_STATE.CONNECTED:
			case CONNECTION_STATE.ERROR:
		}

		self.whoData = self.userName = self.nickName = null;

	}; // onWsStateChange


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'WhoAmI.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'WhoAmI.init' );

		self.users = self.userName = self.nickName = null;

		cep.connection.events.add( 'statechange', self.onWsStateChange );
		cep.connection.events.add( 'message'    , self.onWsMessage     );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const session = await new MyNodeSession()

}; // MyNodeSession


//EOF
