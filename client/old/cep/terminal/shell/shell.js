// shell.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS       } from '../../config.js';
import { PRESETS, DEBUG } from '../../config.js';
import { Parsers        } from './parsers.js';
import { ShellOutput    } from './output.js';
import { ShellInput     } from './input.js';
import { History        } from './history.js';

const CEP_VERSION = 'v0.4.1α';   // Keyboard shortcuts will be appended in  self.init()


export const CEPShell = function (terminal, callback, BUTTON_SCRIPTS) {
	const self = this;

	// Properties
	this.version;     // Terminal will append toggle codes
	this.requestId;   // Tag for requests, incremented in ShellInput-send_json and automatically added to the JSON

	// Imported from DebugConsole
	this.elements;    // DOM elements
	this.toggles;     // Toggle buttons
	this.dom;         // DOM actions (animate ping, etc);
	this.bit;         // The bit. It says "yes" or "no"
	this.status;      // Message in footer toolbar

	// Objects
	this.output;      // Top section of the screen
	this.input;       // A <textarea> that is moving around, pretending to be a shell prompt
	this.parsers;     // Converts short formats into JSON, etc.
	this.history;     // Command history like in your shell with cursor-up


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const relay = 'IS_RELAY';

	// Parsers
	this.executeButtonScript = relay;
	this.parseButtonScript   = relay;
	this.requestToText       = relay;
	this.textToRequest       = relay;
	this.parseShortRequest   = relay;

	// Output
	this.printVersion   = relay;
	this.clearScreen    = relay;
	this.scrollDown     = relay;
	this.isScrolledUp   = relay;
	this.scrollPageUp   = relay;
	this.scrollPageDown = relay;
	this.deleteToMarker = relay;
	this.showFile       = relay;
	this.print          = relay;

	// Input
	this.focusPrompt    = relay;
	this.adjustTextarea = relay;
	this.clearInput     = relay;
	this.onEnterClick   = relay;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function () {
		console.log( 'CEPShell.init' );

		self.version  = CEP_VERSION;
		self.requestId = 0;

		self.elements = terminal.elements;
		self.dom      = terminal.dom;
		self.toggles  = terminal.toggles;
		self.bit      = terminal.bit;
		self.status   = terminal.status;

		self.parsers = new Parsers    ( self, BUTTON_SCRIPTS );
		self.output  = new ShellOutput( self );
		self.input   = new ShellInput ( self, callback       );

		self.history = new History( terminal.elements.input, {
			onInputChanged: ()=>{
				self.input.adjustTextarea();
				self.output.scrollDown();
			},
		});

		const modules = ['parsers', 'output', 'input'];

		// Check, if every method of our modules is registered
		modules.forEach( (module)=>{
			Object.keys( self[module] ).forEach( (method)=>{
				const registered = (self[method] == relay);
				if (!registered) throw new Error( 'Unregistered relay: ' + module + '.' +  method );
			});
		});

		// Check if every registered relay exists in one of the modules
		// Store a reference to the real method in the according relay property
		Object.keys( self )
		.filter( key => self[key] == relay )
		.forEach( (relay)=>{
			const found = modules.reduce( (prev, module)=>{
				const exists = (typeof self[module][relay] == 'function');
				if (exists) self[relay] = self[module][relay];
				return prev || exists;
			}, false);

			if (!found) throw new Error( 'Registered relay not found: ' + relay );
		});

	}; // init

	self.init();

}; // CEPShell


//EOF
