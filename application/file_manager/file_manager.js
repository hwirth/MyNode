// file_manager.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fs = require('fs');

const fetch     = require( 'node-fetch' );
const DomParser = require( 'dom-parser' );
const RssParser = require( 'rss-parser' );

const { SETTINGS        } = require( '../../server/config.js' );
const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


module.exports = function FileManager (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;


	function get_directory (dir) {
		return new Promise( (resolve, reject) => {
			fs.readdir( dir, (error, files) => {
				if (error) {
					reject( error );
				} else {
					const requests = promise_stats( files );
					Promise.all( requests ).then( (results) => {
						resolve( results );
					});
				}
			});

			function promise_stats (files) {
				return files.map( (file) => {
					return new Promise( (resolve, reject) => {
						fs.stat( `${dir}/${file}`, (error, stats) => {
							if (error) {
								reject( error );
							} else {
								resolve({
									name     : file,
									size     : stats.size,
									created  : stats.birthtime,
									modified : stats.mtime,
								});
							}
						});
					});
				});

			} // make_promises
		});
	/*
		return new Promise( (resolve, reject) => {
			fs.readdir( dir, (err, files) => {
				if (err) {
					reject( err );
				} else {
					const promises = files.map( (file) => {
						return new Promise( (resolve, reject) => {
							fs.stat( `${dir}/${file}`, (err, stats) => {
								if (err) {
									reject(err);
								} else {
									resolve({
										name     : file,
										size     : stats.size,
										created  : stats.birthtime,
										modified : stats.mtime,
									});
								}
							});
						});
					});
					Promise.all(promises).then((results) => {
						resolve(results);
					});
				}
			});
		});
	*/

	} // get_directory


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

// LIST //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'list', 'Show files in a directory' );
RULE( 'dev,owner: {files:{list:string}}' );

	this.request.list = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<files.list>', client );

		try {
			const result = await get_directory( SETTINGS.BASE_DIR )
			return { result: result };
		}
		catch (error) {
			return { failure: error };
		}




	}; // request.list


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'FileManager.exit' );
		return Promise.resolve();

	}; // exit


	this.reset = function (force = false) {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'FileManager.reset' );
	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'FileManager.init' );
		self.reset();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const files = await new FileManager();

}; // FileManager


//EOF
