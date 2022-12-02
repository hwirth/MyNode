// terminal.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG, log_event } from '../config.js';
import { UserInterface } from './user_interface.js';


export const DebugTerminal = function (cep) {
	const self = this;

	this.ui;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROTOCOL
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getCredentials = function (websocket_url) {
		console.log( 'DebugTerminal.getCredentials:', websocket_url );

		return new Promise( (proceed, abort)=>{
			//... Await dialog
			const nick_name = ''//...self.elements.textNickName.value.trim();

			if (nick_name) {
				proceed({
					session : { login: {username:'root', password:'12345'} },
					chat    : { nick: nick_name },
				});
			} else {
				proceed({ session:{login:{username:'root', password:'12345'}} });
			}
		});

	}; // getCredentials


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEBSOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsOpen = function () {
	}; // onWsOpen

	this.onWsClose = function () {
	}; // onWsClose

	this.onWsError = function () {
	}; // onWsError

	this.onWsRetry = function () {
	}; // onWsRetry

	this.onWsReload = function () {
	}; // onWsReload

	this.onWsSend = function () {
	}; // onWsSend

	this.onWsMessage = function (message) {
	}; // onWsOpen


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleVisibility = function (new_visibility = null) {
		if (new_visibility === null) {
			new_visibility = self.ui.elements.terminal.classList.contains( 'hidden' )
		}

		self.ui.elements.terminal.classList.toggle( 'hidden', !new_visibility );

		if (new_visibility) {
			cep.connection.events.add( 'login', self.getCredentials );
		} else {
			cep.connection.events.remove( 'login', self.getCredentials );
		}

	}; // toggleVisibility


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		console.log( 'DebugTerminal.exit' );
		cep.events.remove( 'login', self.getCredentials );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'DebugTerminal.init' );

		self.ui = await new UserInterface();

		//...? getCredentials : self.getCredentials,

		// Sniff websocket traffic
		cep.connection.events.add( 'login'  , self.getCredentials );
		cep.connection.events.add( 'open'   , self.onWsOpen       );
		cep.connection.events.add( 'close'  , self.onWsClose      );
		cep.connection.events.add( 'error'  , self.onWsError      );
		cep.connection.events.add( 'retry'  , self.onWsRetry      );
		cep.connection.events.add( 'send'   , self.onWsSend       );
		cep.connection.events.add( 'message', self.onWsMessage    );
		cep.events.add( 'reload', self.onWsReload );

		//...self.toggleVisibility( true );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const terminal = await new DebugTerminal()

}; // DebugTerminal


//EOF
