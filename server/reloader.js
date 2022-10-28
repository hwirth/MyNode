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

const { SETTINGS      } = require( './config.js' );
const { DEBUG, COLORS } = require( './debug.js' );
const { color_log     } = require( './debug.js' );

const APP_PATH = '../application';

const { Protocols } = require( APP_PATH + '/protocols.js' );


module.exports = function AppReloader (web_socket, callbacks) {
	const self = this;

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
			'AppReloader-get_file_times:',
			'File times:',
			mtimes,
		);

		return mtimes;

	} // get_file_times


	function re_require_modules (socket) {

		console.time( 'Reload time' );
		const file_name_report = {};   // Response telling user which files were updated

		const changed_files = Object.keys( self.fileTimes.current ).filter( (file_name)=>{
			const new_time = self.fileTimes.current[file_name];
			const old_time = self.fileTimes.previous[file_name];
			return (new_time != old_time);
		});

		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-re_require_modules:',
			'changed_files:',
			changed_files,
		);

		if (changed_files.length > 0) {
			Object.keys( self.fileTimes.current ).forEach( (file_name)=>{

				self.fileTimes.previous[file_name] = self.fileTimes.current[file_name];

				const file_has_changed = (changed_files.indexOf( file_name ) >= 0);

				if (file_has_changed) {
					const index = file_name.replace( '../', '' );
					file_name_report[index] = {};   // Empty: Nicer formatting in DebugConsole
				};

				if (DEBUG.RELOADER) color_log(
					(file_has_changed ? COLORS.REQUIRE : COLORS.UP_TO_DATE),
					'AppReloader-re_require_modules:',
					file_name,
				);

			});

			// Trigger force reloading all files
			const app_path = path.resolve( APP_PATH );
			Object.keys( require.cache ).forEach( (key)=>{
				if (key.slice(0, app_path.length) == app_path) {
					delete require.cache[key];
				}
			});
		}

		if (socket && Object.keys( file_name_report ).length) {
			socket.send( JSON.stringify({ reloader: file_name_report }, null, '\t') );
		}


		const nr_reloaded_files = Object.keys( file_name_report ).length;

		if (DEBUG.RELOADER) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			'nr_reloaded_files:',
			nr_reloaded_files,
		);

		console.timeEnd( 'Reload time' );

		return nr_reloaded_files;

	} // re_require_modules


	async function reload_modules (socket) {
		self.fileTimes.current = await get_file_times();

		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			self.fileTimes.current,
		);


		// Re-require modules
		const reload_required = re_require_modules( socket );
		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			'reload_required:',
			reload_required,
		);

		if (! reload_required) return;

		// Re-instantiate  Protocols
		const MAIN_MODULE = {
			url            : APP_PATH + '/protocols.js',
			persistentData : self.persistentData,
			callbacks      : {
				triggerExit : callbacks.triggerExit,
			},
		};

		console.time( 'Init time' );
		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--init' + '-'.repeat(53) );

		try {
			// Reload and reinstantiate main module
			self.protocols = await new reRequire(
				MAIN_MODULE.url
			).Protocols(
				MAIN_MODULE.persistentData,
				MAIN_MODULE.callbacks,

			).catch( (error)=>{
				color_log( COLORS.ERROR, 'AppReloader-reload_modules:', '.catch:', error );
			});

		} catch (error) {
			color_log( COLORS.ERROR, 'AppReloader-reload_modules:', 'try/catch:' );
			color_log( COLORS.ERROR, 'ERROR', error );
		}

		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--/init' + '-'.repeat(52) );
		console.timeEnd( 'Init time' );

	} // reload_modules


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (DEBUG.CONNECT) color_log( COLORS.RELOADER, 'AppReloader.onConnect:', client_address );
		await reload_modules( socket );
		self.protocols.onConnect( socket, client_address );

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		if (DEBUG.DISCONNECT) color_log( COLORS.RELOADER, 'AppReloader.onDisconnect:', client_address );
		await reload_modules( socket );
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
			await reload_modules( socket );
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
			self.persistentData = {};
			self.fileTimes = { previous: {}, current: {} };

			await reload_modules();

			done();
		});

	}; // init


	return self.init().then( ()=>self );   // const reloader = await new AppReloader()

}; // AppReloader


//EOF
