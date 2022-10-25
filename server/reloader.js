// reloader.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const util      = require( 'util' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const glob      = require( 'glob' );
const reRequire = require( 're-require-module' ).reRequire;

const { DEBUG, COLORS, color_log } = require( './debug.js' );

const APP_PATH = '../application';

const { Protocols } = require( APP_PATH + '/protocols.js' );


module.exports = function AppReloader (web_socket, callbacks) {
	const self = this;

	this.loadedModules;
	this.fileTimes;
	this.protocols;
	this.persistentData;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HOT CODE RELOAD
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function get_file_times () {
		const mtimes = [];
		const stat_requests = [];

		await new Promise( (done)=>{
			glob( APP_PATH + '/**/*.js', (error, matches)=>{
				if (error) color_log(
					COLORS.ERROR,
					'AppReloader-get_file_times:',
					error,
				);

				matches.forEach( (file_name)=>{
					stat_requests.push(
						fs.promises.stat( file_name ).then( (stats)=>{
							mtimes[file_name] = stats.mtimeMs;
						})
					);
				});

				done();
			});
		});

		await Promise.all( stat_requests );

		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-get_file_times: File times:',
			mtimes,
		);

		return mtimes;

	} // get_file_times


	function find_changed_files () {
		const new_file_times = get_file_times();

		return Object.keys( self.fileTimes ).find( (file_name)=>{
			if (! self.loadedModules[ file_name ]) return true;

			const file_time   = self.fileTimes[ file_name ];
			const module_time = self.loadedModules[ file_name ].mtime;
			return (file_time != module_time);
		});

	} // find_changed_files


	async function re_require_modules (socket) {
		const load_requests     = [];
		const report_file_names = {};

		const changed_files = find_changed_files();

		if (changed_files) {
			Object.keys( self.fileTimes ).forEach( (file_name)=>{
				self.loadedModules[file_name] = {
					mtime: self.fileTimes[file_name],
				};

				load_requests.push(
					new Promise( (done)=>{
						if (changed_files.indexOf( file_name ) >= 0) {
							if (DEBUG.RELOADER_REQUIRE) color_log(
								COLORS.REQUIRE,
								'AppReloader-re_require_modules:',
								file_name,
							);

							report_file_names[ file_name.replace('../','') ] = {};
						}

						try {
							reRequire( path.resolve( file_name ) );

						} catch (error) {
							color_log(
								COLORS.ERROR,
								file_name,
								'could not be loaded',
							);

							const stringified_error = JSON.stringify(
								error,
								Object.getOwnPropertyNames( error ),
							).replace( /\\n/g, '<br>' );  //... Don't send HTML

							report_file_names[ file_name.replace('../','') ] = {
								error: stringified_error,
							};
						}

						done();
					})
				);
			});
		}

		await Promise.all( load_requests );

		if (socket && Object.keys( report_file_names ).length) {
			socket.send( JSON.stringify({ require: report_file_names }, null, '\t') );
		}

		return load_requests.length;

	/*
		Object.keys( self.fileTimes ).forEach( (file_name)=>{
			const module = self.loadedModules[file_name];

			if (update_needed || (module == undefined)) {
				self.loadedModules[file_name] = {
					mtime: self.fileTimes[file_name],
				};

				load_requests.push(
					new Promise( (done)=>{
						if (DEBUG.RELOADER_REQUIRE) color_log(
							COLORS.REQUIRE,
							'AppReloader-re_require_modules:',
							file_name,
						);

						try {
							report_file_names[ file_name.replace('../','') ] = {};
							reRequire( path.resolve( file_name ) );

						} catch (error) {
							color_log(
								COLORS.ERROR,
								file_name,
								'could not be loaded',
							);

							const stringified_error = JSON.stringify(
								error,
								Object.getOwnPropertyNames( error ),
							).replace( /\\n/g, '<br>' );  //... Don't send HTML

							report_file_names[ file_name.replace('../','') ] = {
								error: stringified_error,
							};
						}

						done();
					})
				);
			} else {
				if (DEBUG.RELOADER_UP_TO_DATE) color_log(
					COLORS.UP_TO_DATE,
					'UP-TO-DATE:',
					file_name
				);
			}

		});

		await Promise.all( load_requests );

		if (socket && Object.keys( report_file_names ).length) {
			socket.send( JSON.stringify({ require: report_file_names }, null, '\t') );
		}

		return load_requests.length;
	*/

	} // re_require_modules


	async function update_modules (socket) {

		self.fileTimes = await get_file_times();
		const nr_reloaded_files = await re_require_modules( socket );

		if (nr_reloaded_files === 0) return;

		// Rerequire protocols module
		const MAIN_MODULE = {
			url            : APP_PATH + '/protocols.js',
			persistentData : self.persistentData,
			callbacks      : { triggerExit : callbacks.triggerExit },
		};

		//...color_log( COLORS.REQUIRE, 'AppReloader-update_modules:', '    ' + MAIN_MODULE.url );

		console.time( 'Init time' );
		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--init' + '-'.repeat(53) );

		self.protocols = await new reRequire( MAIN_MODULE.url ).Protocols(
			MAIN_MODULE.persistentData,
			MAIN_MODULE.callbacks,
		).catch( (error)=>{
			color_log( COLORS.ERROR, 'AppReloader-update_modules:', '.catch:', error );
		});

		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--/init' + '-'.repeat(52) );
		console.timeEnd( 'Init time' );

	} // update_modules


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.RELOADER, 'AppReloader.onConnect:', client_address );
		await update_modules( socket );
		self.protocols.onConnect( socket, client_address );

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		if (DEBUG.DISCONNECT) color_log( COLORS.RELOADER, 'AppReloader.onDisconnect:', client_address );
		await update_modules( socket );
		self.protocols.onDisconnect( socket, client_address );

	}; // onDisconnect


	this.onMessage = async function (socket, client_address, json_string) {
		let message = null;

		try {
			message = JSON.parse( String(json_string) );
		} catch (error) {
			color_log( COLORS.RELOADER, 'AppReloader.onMessage:', 'JSON.parse() failed.' );
		}

		if (DEBUG.RELOADER_MESSAGE) color_log( COLORS.RELOADER, 'AppReloader.onMessage:', message );

		if (message) {
			await update_modules( socket );
			self.protocols.onMessage( socket, client_address, message );
		}

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'AppReloader.exit' );

		return self.protocols.exit();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'AppReloader.init' );

		return new Promise( async (done)=>{
			self.loadedModules = {};
			self.persistentData = {};
			await update_modules();
			done();
		});

	}; // init


	return self.init().then( ()=>self );   // const reloader = new AppReloader()

}; // AppReloader


//EOF
