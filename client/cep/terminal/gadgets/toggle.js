// toggle.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG    } from '../../config.js';
import { SETTINGS } from '../config.js';


export function Toggle (cep, terminal, parameters) {
	const self = this;

	this.name;
	this.enabled;
	this.button;
	this.blink;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggle = function (new_state = null) {
		if (new_state === null) new_state = !self.enabled;
		self.enabled = new_state;

		self.button.classList.toggle( 'enabled', new_state );

		self.blink.forEach( (element)=>{
			element.classList.add( new_state ? 'blinkEnabled' : 'blinkDisabled' );
		});

		setTimeout( ()=>{
			self.blink.forEach( (element)=>{
				element.classList.remove( new_state ? 'blinkEnabled' : 'blinkDisabled' );
			});
		}, SETTINGS.TIMEOUT.BUTTON_BLINK);

		if (parameters.target) parameters.target.classList.toggle( self.name, new_state );

		terminal.events.emit( 'toggle', self );

	}; // toggle


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onClick = function (event) {
		self.toggle();

	}; // onClick


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Toggle.exit' );
		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) console.log( 'Toggle.init' );

		self.name     = parameters.name;
		self.blink    = parameters.blink    || [];
		self.enabled  = parameters.preset   || false;
		self.shortcut = parameters.shortcut || null;

		if (parameters.button) {
			self.button = parameters.button;
		} else {
			self.button = cep.dom.newElement({
				tagName   : 'button',
				innerHTML : parameters.caption || parameters.name,
			});
			parameters.menu.appendChild( self.button );
		}

		self.button.classList.add( self.name );
		self.button.classList.toggle( 'enabled', self.enabled );
		self.button.addEventListener( 'click', self.onClick );
		if (parameters.shortcut) self.button.title = 'Alt+' + parameters.shortcut.toUpperCase();
		if (parameters.title) self.button.title = title;
		if (parameters.target) parameters.target.classList.toggle( self.name, self.enabled );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // Toggle


//EOF
