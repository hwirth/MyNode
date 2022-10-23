// reloader.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const fs        = require( 'fs' );
const path      = require( 'path' );
const glob      = require( 'glob' );
const reRequire = require( 're-require-module' ).reRequire;

const { DEBUG, COLORS, color_log } = require( './debug.js' );

const APP_PATH = '../application';

const { Protocols } = require( APP_PATH + '/protocols.js' );


module.exports = function AppReloader (web_socket) {
	const self = this;

	this.loadedModules;
	this.fileTimes;
	this.protocols;
	this.persistentData;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HOT RELOAD APP SOURCES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function get_file_times () {
		const mtimes = [];
		const stat_requests = [];

		await new Promise( (done)=>{
			glob( APP_PATH + '/**/*.js', (error, matches)=>{
				if (error) color_log(
					COLORS.ERROR,
					'AppReloader-get_file_times',
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
			'AppReloader-get_file_times: File times: ',
			mtimes,
		);

		return mtimes;

	} // get_file_times


	function re_require_modules () {
		const load_requests = [];
		Object.keys( self.fileTimes ).forEach( (file_name)=>{
			const module = self.loadedModules[file_name];

			if ((module == undefined) || (module.mtime < self.fileTimes[file_name])) {
				self.loadedModules[file_name] = {
					mtime: self.fileTimes[file_name],
				};

				load_requests.push(
					new Promise( (done)=>{
						if (DEBUG.RELOADER_UP_TO_DATE) color_log(
							COLORS.REQUIRE,
							'REQUIRE',
							file_name,
						);

						try {
							reRequire( path.resolve( file_name ) );

						} catch (error) {
							color_log(
								COLORS.ERROR,
								file_name,
								'could not be loaded',
							);
						}

						done();
					})
				);
			} else {
				if (DEBUG.RELOADER_UP_TO_DATE) color_log(
					COLORS.UP_TO_DATE,
					'UP-TO-DATE',
					file_name
				);
			}

		});

		return Promise.all( load_requests ).then( ()=>load_requests.length );

	} // re_require_modules


	async function update_modules () {
		self.fileTimes = await get_file_times();
		const nr_reloaded_files = await re_require_modules();

		if (nr_reloaded_files === 0) return;

		try {
			// Reinstantiate protocols
			self.protocols
			= await new reRequire( APP_PATH + '/protocols.js' )
			.Protocols( self.persistentData )
			;
		} catch (error) {
			color_log( COLORS.ERROR, 'ERROR', error );
		}

	} // update_modules


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = async function (socket, client_address) {
		if (DEBUG.RELOADER) color_log( COLORS.RELOADER, 'AppReloader.onConnect', client_address );
		await update_modules();
		self.protocols.onConnect( socket, client_address );

	}; // onConnect


	this.onDisconnect = async function (socket, client_address) {
		if (DEBUG.RELOADER) color_log( COLORS.RELOADER, 'AppReloader.onDisconnect', client_address );
		await update_modules();
		self.protocols.onDisconnect( socket, client_address );

	}; // onConnect


	this.onMessage = async function (socket, client_address, data) {
		let message = null;

		try {
			message = JSON.parse( String( data ));
		} catch (error) {
			color_log( COLORS.RELOADER, 'AppReloader.onMessage: JSON.parse() failed.' );
		}

		if (DEBUG.RELOADER) color_log( COLORS.RELOADER, 'AppReloader.onMessage:', message );

		if (message) {
			await update_modules();
			self.protocols.onMessage( socket, client_address, message );
		}

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.TRACE_INIT) color_log( COLORS.TRACE_INIT, 'AppReloader.init' );

		return new Promise( async (done)=>{
			self.loadedModules = {};
			self.persistentData = {};
			await update_modules();
			done();
		});

	}; // init


	return self.init().then( ()=>self );

}; // AppReloader


//EOF
