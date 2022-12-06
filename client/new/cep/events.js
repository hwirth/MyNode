// events.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from './config.js';


export const Events = function (owner, known_events, event_callbacks = {}) {
	const self = this;
	self.templateName = 'Events';

	this.listeners;   // Dict of arrays of registered event handlers


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const owner_prefix
	= (owner.templateName) ? owner.templateName + '.' : ''
	+ (owner.name        ) ? owhner.name + '.' : ''
	;

	this.add = function (event_name, event_handler) {
		if (DEBUG.EVENTS) console.log( 'Events.add:', owner_prefix + event_name );

		if (known_events.indexOf(event_name) < 0) {
			throw new Error( 'Events.add: Unknown event: ' + owner_prefix + event_name );
		}

		const already_registered = self.listeners[event_name].indexOf( event_handler ) >= 0;
		if (already_registered) {
			throw new Error( 'Events.add: Already registered: ' + owner_prefix + event_name );
		} else {
			self.listeners[event_name].push( event_handler );
		}

	}; // add


	this.remove = function (event_name, event_handler) {
		if (DEBUG.EVENTS) console.log( 'Events.remove:', owner_prefix + event_name );

		if (typeof self.listeners[event_name] == 'undefined') {
			throw new Error( 'Events.remove: Unknown event: ' + owner_prefix + event_name );
		}

		const found_index = self.listeners[event_name].indexOf( event_handler );
		if (found_index < 0) {
			throw new Error( 'Events.remove: Not registered: ' + owner_prefix + event_name );
		} else {
			self.listeners[event_name].splice( found_index, 1 );
		}

	}; // remove


	this.emit = function (event_name, event) {
		if (DEBUG.EVENTS) console.log( 'Events.emit:', owner_prefix + event_name );
		self.listeners[event_name].forEach( callback => callback(event) );

	}; // emit


	this.callback = function (event_name, event) {
		if (DEBUG.EVENTS) console.log( 'Events.callback:', owner_prefix + event_name );

		if (!self.listeners[event_name]) {
			throw new Error( 'Events.callLast: Unknown event: ' + owner_prefix + event_name );
		}

		const callback = self.listeners[event_name].slice(-1)[0];
		return callback ? callback( event ) : null;

	}; // callback


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Events.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'Events.init' );

		self.listeners = {};
		known_events.forEach( (event_name)=>{
			self.listeners[event_name] = [];
			if (event_callbacks[event_name]) {
				self.listeners[event_name].push( event_callbacks[event_name] );
			}
		});

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const events = await new Events()

}; // Events


//EOF
