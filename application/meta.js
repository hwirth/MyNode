// meta.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.setCollectorKey = function (key) {
		self.key = key;
		self.help[key] = {};

	}; // setCollectorKey

	this.addRule = function (rule) {
		if (!self.key) throw new Error( 'MetaData.addRule: Key unset' );
		self.rules.push( rule );
		//...? self.rules.sort();

	}; // addRule


	this.addHelp = function (command, help_text) {
		if (!self.key) throw new Error( 'MetaData.addRule: Key unset' );
		self.help[self.key][command] = help_text;

	}; // addRule


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'Router.init' );
		self.rules = [];
		self.help  = {};
		self.key   = null;

	}; // init


	self.init();

}; // MetaData


//EOF
