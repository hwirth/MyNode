// meta.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );

const WebSocketClient = require( './client.js' );
const MetaData        = require( './meta.js'   );


module.exports = function MetaData () {
	const self = this;

	this.rules;
	this.help;

	let current_key = null;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.setCollectorKey = function (key) {
		current_key = key;
		self.help[key] = {};

	}; // setCollectorKey

	this.addRule = function (rule) {
		if (!current_key) throw new Error( 'MetaData.addRule: Key unset' );
		self.rules.push( rule );
		//...? self.rules.sort();

	}; // addRule


	this.addHelp = function (command, help_text) {
		if (!current_key) throw new Error( 'MetaData.addRule: Key unset' );
		self.help[current_key][command] = help_text;

	}; // addRule


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'MetaData.init' );
		self.rules  = [];
		self.help   = {};
		current_key = null;

	}; // init


	self.init();

}; // MetaData


//EOF
