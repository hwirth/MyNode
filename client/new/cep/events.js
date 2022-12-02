// events.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const Events = function (parameters) {
	const self = this;

	this.listeners;   // Dict of arrays of registered event handlers


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.add = function (event_name, event_handler) {
		if (parameters.known.indexOf(event_name) < 0) {
			throw new Error( 'Events.add: Unknown event: ' + event_name );
		}

		const already_registered = self.listeners[event_name].indexOf( event_handler ) >= 0;
		if (already_registered) {
			throw new Error( 'Events.add: Already registered: ' + event_name );
		} else {
			self.listeners[event_name].push( event_handler );
		}

	}; // add


	this.remove = function (event_name, event_handler) {
		if (typeof self.listeners[event_name] == 'undefined') {
			throw new Error( 'Events.remove: Unknown event: ' + event_name );
		}

		const found_index = self.listeners[event_name].indexOf( event_handler );
		if (found_index < 0) {
			throw new Error( 'Events.remove: Not registered: ' + event_name );
		} else {
			self.listeners[event_name].splice( found_index, 1 );
		}

	}; // remove


	this.emit = function (event_name, event) {
		self.listeners[event_name].forEach( callback => callback(event) );

	}; // emit


	this.callback = function (event_name, event) {
		if (!self.listeners[event_name]) {
			throw new Error( 'Events.callLast: Unknown event: ' + event_name );
		}

		const callback = self.listeners[event_name].slice(-1)[0];
		return callback ? callback( event ) : null;

	}; // callback


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		console.log( 'Events.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'Events.init' );

		self.listeners = {};
		parameters.known.forEach( (event_name)=>{
			self.listeners[event_name] = [];
			if (parameters.events[event_name]) {
				self.listeners[event_name].push( parameters.events[event_name] );
			}
		});

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const events = await new Events()

}; // Events


//EOF
