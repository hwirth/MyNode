// test.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from '../../config.js';

import { SETTINGS as CEP_SETTINGS  } from '../../config.js';
import { DEBUG    as CEP_DEBUG     } from '../../config.js';
import { SETTINGS as TERM_SETTINGS } from '../config.js';
import { PRESETS  as TERM_PRESETS  } from '../config.js';

CEP.install({
	name     : 'test',
	template : Test,
	show     : false,
});

function Test (cep, terminal) {
	const self = this;
	this.templateName = 'Test';

	this.containers;
	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		// Containers will be removed and re-inserted by the UI.
		// If a mount location needs more than one element, they need to be separate containers:
		{
			parent   : 'terminal',
			html     : (`
				<main tabindex="0">
					hi.
				</main>
			`),
			elements : {
				main : 'CONTAINER',
			},
		},{
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskName      = 'Test';
	this.taskMainClass = 'test';
	this.focusItem;
	this.taskEntry;   // Will be created by  DebugTerminal.installApplet()


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Test.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'Test.init' );

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements
		self.focusItem = self.elements.main;

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const settings = await new Settings()

}; // Test


CEP.install( 'test', 'TestApp', Test );


//EOF
