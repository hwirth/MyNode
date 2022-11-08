// reloader.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const util      = require( 'util' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const glob      = require( 'glob' );

const { SETTINGS      } = require( './config.js' );
const { DEBUG, COLORS } = require( './debug.js' );
const { color_log     } = require( './debug.js' );

const EMPTY = {};


module.exports = function AppReloader (callback) {
	const self = this;

	this.isAppReloader

	this.fileTimes;
	this.router;
	this.persistent;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HOT CODE RELOAD
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function get_file_times () {
		const mtimes = [];
		const stat_requests = [];

		await new Promise( (done)=>{

			const g = glob( SETTINGS.APP_PATH + '/**/*.js', (error, matches)=>{
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


	function invalidate_require_cache () {
		const app_path = path.resolve( SETTINGS.APP_PATH );
		Object.keys( require.cache ).forEach( (key)=>{
			if (key.slice(0, app_path.length) == app_path) {
				delete require.cache[key];
			}
		});

	} // invalidate_require_cache


	function some_modules_updated (socket) {
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

			invalidate_require_cache();

			// Trigger force reloading all files
			const app_path = path.resolve( SETTINGS.APP_PATH );
			Object.keys( require.cache ).forEach( (key)=>{
				if (key.slice(0, app_path.length) == app_path) {
					delete require.cache[key];
				}
			});
		}

		if (socket && Object.keys( file_name_report ).length) {
			socket.send( JSON.stringify({ 'MODULE RELOAD': file_name_report }, null, '\t') );
		}

		const nr_reloaded_files = Object.keys( file_name_report ).length;

		if (DEBUG.RELOADER) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			'nr_reloaded_files:',
			nr_reloaded_files,
		);

		return nr_reloaded_files;

	} // some_modules_updated


	async function reload_modules (socket) {
		if (DEBUG.RELOADER_TIMES) console.time( '| (re)load time' );

		self.fileTimes.current = await get_file_times();

		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			self.fileTimes.current,
		);


		// Re-require modules
		const reload_required = some_modules_updated( socket );

		if (DEBUG.RELOADER_TIMES) color_log(
			COLORS.RELOADER,
			'AppReloader-reload_modules:',
			'reload_required:',
			reload_required,
		);

		if (!reload_required) {
			if (DEBUG.RELOADER_TIMES) console.timeEnd( '| (re)load time' );
			return;
		}

		// Re-instantiate  Router
		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--init' + '-'.repeat(47) );

		function show_error (error, ...parameters) {
			color_log( COLORS.ERROR, '- ERROR ' + '-'.repeat(51) );
			color_log( COLORS.ERROR, ...parameters );
			color_log( COLORS.ERROR, 'Error:', error );
			color_log( COLORS.ERROR, '- /ERROR ' + '-'.repeat(50) );
		}

		try {
			// Reload and reinstantiate main module
			const router = {
				url        : SETTINGS.MAIN_MODULE,
				persistent : self.persistent,
				callbacks  : {
					triggerExit : callback.triggerExit,
					broadcast   : (...params)=>{ self.router.protocols.session.broadcast(...params); },
					reset       : self.reset,
				},
			};

			self.router = await new require( router.url ).Router(
				router.persistent,
				router.callbacks,
			);

		} catch (error) {
			invalidate_require_cache();

			if (socket) {
				const report = error.stack.replace( new RegExp(SETTINGS.BASE_DIR, 'g'), '' );
				const message = { 'MODULE ERROR 1': report };

				try {
					self.router.protocols.session.broadcast( message );

				} catch (error) {
					try {
						const clients = self.persistent.session.clients;
						Object.keys( clients ).forEach( (address)=>{
							const client = clients[address];
							client.send({ 'FATAL SYSTEM FAILURE': report });
						});

					} catch (error) {
						color_log( COLORS.ERROR, '-'.repeat(59) );
						color_log( COLORS.ERROR, 'CANNOT REPORT ERROR:', message );
						color_log( COLORS.ERROR, '-'.repeat(59) );
						console.log( error );
					}
				}

			} else {
				show_error( error, 'AppReloader-reload_modules:',
					COLORS.STRONG + 'try' + COLORS.DEFAULT + ' await new require().Router()',
				);
			}
		}

		if (DEBUG.INSTANCES) color_log( COLORS.DEFAULT, '--/init' + '-'.repeat(46) );

		if (DEBUG.RELOADER_TIMES) console.timeEnd( '| (re)load time' );

	} // reload_modules


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		await reload_modules( socket );
		self.router.onConnect( socket, client_address );

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		await reload_modules( socket );
		self.router.onDisconnect( socket, client_address );

	}; // onDisconnect


	this.onMessage = async function (socket, client_address, json_string) {
		let message = null;

		//try {
			message = JSON.parse( String(json_string) );
		//} catch (error) {
		//	color_log( COLORS.RELOADER, 'AppReloader.onMessage:', 'JSON.parse() failed.' );
		//}

		if (DEBUG.RELOADER_MESSAGE) color_log( COLORS.RELOADER, 'AppReloader.onMessage:', message );

		if (message) {
			try {
				await reload_modules( socket );
				await self.router.onMessage( socket, client_address, message );

			} catch (error) {
				color_log( COLORS.ERROR, 'ERROR:', 'Reloader.onMessage: reload_modules:', error );
				const report = error.stack.replace( new RegExp(SETTINGS.BASE_DIR, 'g'), '' );
				socket.send( JSON.stringify({ 'MODULE ERROR 2': report }) );
			}
		}

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'AppReloader.exit' );

		if (self.router) {
			return self.router.exit().then( ()=>{
				console.log( '.' + '-'.repeat(78) );
				console.log( '| APPLICATIONS UNLOADED' );
				console.log( "'" + '-'.repeat(78) );
			});
		}

		return Promise.resolve();

	}; // exit


	this.reset = async function () {
		self.persistent = {};
		self.fileTimes = { previous: {}, current: {} };

		await reload_modules();

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'AppReloader.init' );

		return new Promise( async (done)=>{
			await self.reset();
			done();
		});

	}; // init


	return self.init().then( ()=>self );   // const reloader = await new AppReloader()

}; // AppReloader


//EOF
