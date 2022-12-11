// file_manager.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fetch     = require( 'node-fetch' );
const DomParser = require( 'dom-parser' );
const RssParser = require( 'rss-parser' );

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


module.exports = function FileManager (persistent, callback) {
	const self = this;

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	//this.request = {};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'RssServer.exit' );
		return Promise.resolve();

	}; // exit


	this.reset = function (force = false) {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'RSSServer.reset' );
	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'RSSServer.init' );
		self.reset();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // FileManager


//EOF
