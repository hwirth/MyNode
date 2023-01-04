// control.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fs   = require( 'fs' );
const exec = require( 'child_process' ).exec;

const { SETTINGS          } = require( '../server/config.js' );
const { DEBUG, COLORS     } = require( '../server/debug.js' );
const Helpers = require( '../server/helpers.js' );

const { RESPONSE, REASONS, STATUS, STRINGS } = require( './constants.js' );



module.exports = function ServerControl (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;

	this.fsWatchers;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// GRANT ACCESS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let current_access_token = null;

	function create_new_access_token () {
		const new_token = String( Math.floor( Math.random() * 900 ) + 100 );
		const formatted_token = new_token.split('').join(' ');

		setTimeout( ()=>{
			// Delay output for nicer log filegue
			console.log( COLORS.MCP + 'MCP .' + '='.repeat(14) + '.' );
			console.log( COLORS.MCP + 'MCP | TOKEN:', COLORS.TOKEN + formatted_token, COLORS.MCP + '|' );
			console.log( COLORS.MCP + "MCP '" + '='.repeat(14) + "'" + COLORS.DEFAULT );
		});

		current_access_token = new_token;

		return new_token;

	} // create_new_access_token


	function verify_token (provided_token, client, login_request = false) {
		return (
			(login_request || client.inGroup( 'admin', 'dev' ))
			&& (provided_token == current_access_token)
		);

	} // verify_token


	this.verifyToken = verify_token;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WATCH FILES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function start_watch_files () {
		self.fsWatchers = {};

		SETTINGS.WATCH_FILES.forEach( (dir)=>{
			const path = SETTINGS.BASE_DIR + dir;
			const watcher = fs.watch( path, watch_dir );
			self.fsWatchers[path] = watcher;

			function watch_dir (event, file_name) {
				if (!file_name || (file_name.charAt(0) == '.')) return;

				const path = dir + '/' + file_name;
				if (path.slice(0,7) == 'client/') {
					callback.broadcast({
						type   : 'reload/client',
						source : 'server/watch',
						reload : path.slice(7),
					});
				} else {
					callback.broadcast({
						type   : 'reload/server',
						source : 'server/watch',
						reload : path,
					});
				}
			}
		});

		if (DEBUG.FILE_WATCHER) DEBUG.log(
			COLORS.FILE_WATCHER, 'ServerControl-start_watch_files:', Object.keys( self.fsWatchers ),
		);

	} // start_watch_files


	function stop_watch_files () {
		const closed = [];

		if (SETTINGS.WATCH_FILES) {
			Object.entries( self.fsWatchers ).forEach( ([path, watcher])=>{
				self.fsWatchers[path].close();
				closed.push( path );
			});
		}

		if (DEBUG.FILE_WATCHER) DEBUG.log(
			COLORS.FILE_WATCHER, 'ServerControl-stop_watch_files:', closed,
		);

	} // stop_watch_files


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// ACCESS VARIABLE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function access_variable (target, path, value) {
		const target_name = (typeof target == 'string') ? target : 'OBJECT';

		switch (target) {
			case 'node'    : target = callback.getServerInstance();  break;
			case 'SETTINGS': target = SETTINGS; break;
			case 'DEBUG'   : target = DEBUG   ; break;
			case 'RESPONSE': target = RESPONSE; break;
			case 'REASONS' : target = REASONS ; break;
			case 'STRINGS' : target = STRINGS ; break;
		}
		if (!target) throw new Error( 'Variable undefined' );
		if (!path) return target;
		return property( target, path.split('.'), value );

		function property (target, path, value) {
			const set_value = (typeof value != 'undefined');
			return walk( target, path, target_name );

			function walk (target, path, traversed) {
				if (path.length == 0) return target;
				const key = path[0];

				if (typeof target[key] == 'undefined') {
					throw new Error( 'Property not found: ' + traversed + '.' + key );
				}

				if (set_value && (path.length == 1)) return target[key] = value;
				return walk( target[key], path.slice(1), traversed + '.' + key );
			}
		}

	} // access_variable


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (!persistent.serverStartTime) persistent.serverStartTime = Date.now() - process.uptime();

	function get_uptime (formatted = false) {
		const milliseconds = process.uptime() * 1000;

		if (formatted) {
			let seconds = Math.floor( milliseconds / 1000 );
			let minutes = Math.floor( seconds      / 60   );   seconds -= 60 * minutes;
			let hours   = Math.floor( minutes      / 60   );   minutes -= 60 * hours;
			let days    = Math.floor( hours        / 24   );   hours   -= 24 * days;
			let weeks   = Math.floor( days         / 7    );   days    -=  7 * weeks;
			let years   = Math.floor( weeks        / 52   );   weeks   -= 52 * years;  //...
			let millis  = Math.floor( milliseconds % 1000 );

			function leading (value, digits) {
				const string = String( value );
				const zeros  = '0'.repeat( digits - string.length );
				return zeros + string;
			}

			let result = (
				  (years   ? years      + 'y' : '')
				+ (weeks   ? weeks      + 'w' : '')
				+ (days    ? days       + 'd,' : '')
				+ leading( hours  , 2 ) + 'h'
				+ leading( minutes, 2 ) + 'm'
				+ leading( seconds, 2 ) + '.'
				+ leading( millis , 3 ) + 's'
			);

			while ((result.charAt(0) === '0') && !isNaN( result.charAt(1) )) {
				result = result.slice(1);
			}

			return result;

		} else {
			return milliseconds;
		}

	} // get_uptime


	function get_memory_info () {
		const memory_usage = process.memoryUsage();
		return Object.entries( memory_usage ).reduce( (previous, [key, value]) => {
			const formatted = Math.floor(value / 1024**2 * 100) / 100 + ' MiB';
			return { ...previous, [key]: formatted }
		}, {});

	} // get_memory_info


	async function get_source_info () {
		const entries = await new Promise( (resolve, reject)=>{
			const command = SETTINGS.BASE_DIR + 'functions.sh';
			console.log( COLORS.EXEC + 'EXEC' + COLORS.RESET + ':', command );
			exec( command, (error, stdout, stderr)=>{
				if (error !== null) {
					reject( error );
				} else {
					resolve( stdout.trim().replace( /\t/g, ' ' ).split('\n') );
				}
			});
		})

		const result = {};
		entries.forEach( (entry)=>{
			const key = entry.split( ':', 1 )[0];
			if (!result[key]) result[key] = [];

			const rest = entry.slice( key.length + 1 );
			result[key].push( rest );
		});
		return result;

	} // get_source_info


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

// HELP //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'help', 'Help on available protocols' );
RULE( 'connecting,guest,user,mod,admin,dev,owner: {server:{help:*}}' );

	this.request.help = function (client, parameter) {
		if (typeof parameter == 'object') {
			if (Object.keys(parameter).length == 0) {
				parameter = '';
			} else {
				return { failure: REASONS.INVALID_REQUEST };
			}
		}

		const meta  = callback.getMeta();

		if (parameter == '*') return { command:'all', result:meta };
		//...if (parameter == '*') parameter = '';

		const parts = parameter.split('.').filter( part => part != '' );

		if (parts.length == 0) {
			return { result: Object.keys(meta.help) };
		} else {
			const entry  = access_variable( meta.help, parameter );
			if (typeof entry == 'undefined') {
				return { failure: 'Undefined entry'  };
			}
			const result = (typeof entry == 'string') ? entry : Object.keys( entry );
			return { result: {[parameter]:result} };

		}

		return { failure: REASONS.INVALID_REQUEST };

	}; // help



// GLOBAL ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'global', 'Read or write global variables' );
HELP( 'global.get', 'Read a global variable' );
HELP( 'global.set', 'Write a new value to a global variable' );

RULE( 'admin,dev,owner: {server:{global:{get:string}}}' );
RULE( 'admin,dev,owner: {server:{global:{set:string,value:string}}}' );

	this.request.global = function (client, parameter) {
		if (!parameter.get && !parameter.set) {
			return { failure: REASONS.INVALID_REQUEST };
		}

		if (parameter == 'all') {
			const result = JSON.stringify(callback.getServerInstance(), (key, value)=>{
				if ((typeof value == 'string') || (typeof value == 'number')) ;
				if (value instanceof Function) return '[function]';
				if (key == 'httpServer') return;
				if (key == 'wsServer') return;
				if (key == 'fsWatchers') return;
				if (key.charAt(0) == '_') return;
				return value
			}, '\t' );
			return { command:'all', result:result };
		}

		let value;
		let operation;
		if (parameter.get) {
			operation = 'get';
			parameter = parameter.get;
			if (typeof parameter != 'string') {
				return { command:'get', failure: REASONS.INVALID_REQUEST + '(1)' };
			}
		} else  {
			operation = 'set';
			value = parameter.value;
			parameter = parameter.set;
			if (typeof parameter != 'string') {
				return { command:'set', failure: REASONS.INVALID_REQUEST + '(2)' };
			}
		}

		const parts  = parameter.split('.').filter( part => part != '' );
		if (parts.length < 1) {
			return { failure: REASONS.INVALID_REQUEST + '(3)' };
		}
		const target = parts[0];
		const path   = parts.slice(1).join('.');
		let entry;
		try {
			entry = access_variable( target, path, value );

		} catch (error) {
			return { command:operation, failure: error.message.replace('object', target) };
		}

		if (typeof entry == 'undefined') {
			return { command:operation, failure: 'Undefined entry' };
		}

		function formatted_array (entry) {
			if ((typeof entry == 'string') || (typeof entry == 'number')) {
				return entry;
			} else {
				return typeof entry;
			}
		}
		const result
		= (entry instanceof Array  ) ? entry.map( formatted_array )
		: (typeof entry == 'object') ? Object.keys( entry )
		: entry
		;

		return {
			command : operation,
			result  : {
				path  : parameter,
				type  : typeof result,
				value : result,
			},
		};

	}; // global


// TOKEN /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'token', 'Request a token for TFA' );
RULE( 'admin,dev,owner: {server:{token:empty}}' );

	this.request.token = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.token>', client );

		if (!client.inGroup( 'admin', 'dev' )) {
			return { failure:REASONS.INSUFFICIENT_PERMS };
		}

		create_new_access_token();

		return { result: REASONS.TOKEN_ISSUED };

	}; // token


// STATUS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'status', 'Server status report. Secondary parameters can be used in parallel' );

RULE( 'admin,dev,owner: {server:{status:empty}}' );
RULE( 'admin,dev,owner: {server:{status:*}}'     );

	this.request.status = async function (client, parameter) {
		let response = null;

		if (!client.login) {
			DEBUG.log( COLORS.ERROR, '<server.status.persistent>', client );
			return { failure:REASONS.INSUFFICIENT_PERMS };

		} else if (parameter.persistent || (parameter.persistent === null)) {
			DEBUG.log( COLORS.COMMAND, '<server.status.persistent>', client );
			if (client.inGroup( 'admin', 'dev' )) {
				return { result:callback.getAllPersistentData() };
			} else {
				return { failure:REASONS.INSUFFICIENT_PERMS };
			}

		} else if (Object.keys(parameter).length > 0) {
			DEBUG.log( COLORS.COMMAND, '<server.status.persistent>', client );

			let add_persistent, add_uptime, add_memory, add_settings, add_debug, add_source, add_access;
			const requested_all = (Object.keys( parameter ).indexOf('all') >= 0);
			function has (key) {
				return (requested_all) || (Object.keys( parameter ).indexOf(key) >= 0);
			}
			if (has('persistent')) add_persistent = persistent;
			if (has('uptime'    )) add_uptime     = get_uptime( /*formatted*/true );
			if (has('memory'    )) add_memory     = get_memory_info();
			if (has('settings'  )) add_settings   = SETTINGS;
			if (has('debug'     )) add_debug      = DEBUG;
			if (has('source'    )) add_source     = await get_source_info();
			if (has('access'    )) add_access     = {
				rules : callback.getMeta().rules,
			};

			return {
				result: {
					upTime   : add_uptime,
					memory   : add_memory,
					settings : add_settings,
					debug    : add_debug,
					source   : add_source,
					access   : add_access,
				},
			};

		} else {
			return {
				result: {
					upTime   : get_uptime( /*formatted*/true ),
					memory   : get_memory_info(),
				},
			};
		}

	}; // status


// RESET /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'reset', 'Reset protocol data' );
RULE( 'admin,dev,owner: {server:{reset:empty}}' );

	this.request.reset = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.reset>', client );

		callback.reset();

		return {
			result    : REASONS.PERSISTENCE_RESET,
			broadcast : {
				type: 'server/reset',
				note: 'Client objects may require reinstantiation'
			},
		};

	}; // reset


// RESTART ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'restart', 'Restart the server' );
//RULE( 'admin,dev,owner: {server:{restart:empty}}'  );
RULE( 'admin,dev,owner: {server:{restart:number}}' );

	this.request.restart = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.restart>', client );

		const provided_token = String( parameter.token || null );

		if (false&& !verify_token( provided_token, client )) {
			return { failure:REASONS.INSUFFICIENT_PERMS };
		}

		const delay = Helpers.isNumeric(parameter) ? parameter : 0;
		setTimeout( ()=>callback.triggerExit(), delay );

		return { result:'Restarting in ' + delay + 'ms' };

	}; // restart


// SHELL /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'shell', 'Call a shell program' );
RULE( 'admin,dev,owner: {server:{shell:*}}' );

	this.request.shell = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.shell>', client );

		const provided_token = String( parameter.token || null );

		if (!verify_token( provided_token, client )) {
			return { failure:REASONS.INSUFFICIENT_PERMS };
		}

		return { failure:REASONS.INSUFFICIENT_PERMS };

		//callback.triggerExit();

		send_cookie();
		async function send_cookie () {
			const exec = require( 'child_process' ).exec;
			const command = '/usr/games/fortune';//SETTINGS.BASE_DIR + 'functions.sh';
			console.log( COLORS.EXEC + 'EXEC' + COLORS.RESET + ':', command );

			const fortune_cookie = await new Promise( (resolve, reject)=>{
				exec( command, (error, stdout, stderr)=>{
					if (error !== null) {
						reject( error );
					} else {
						resolve( stdout.trim().replace( /\t/g, ' ' ).split('\n') );
					}
				});
			});

			console.log( 'COOKIE:', fortune_cookie );
			const banner = fortune_cookie[0];
			client.send({ notice: { fortune: '<q>'+banner+'</q>' }} );
		}

	}; // shell


// CRASH TEST ////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'crashSync' , 'Crash the server synchronously'  );
HELP( 'crashAsync', 'Crash the server asynchronously' );
HELP( 'crashSafe' , 'Crash the server safely'         );

RULE( 'dev,owner: {server:{crashSync:empty}}'  );
RULE( 'dev,owner: {server:{crashAsync:empty}}' );
RULE( 'dev,owner: {server:{crashSafe:empty}}'  );

	//...? How to automatically recover from application errors like this:

	const TEST_URL = 'https://rss.orf.at/news.xml';

	// Mistake in application code: Uses a Promise, doesn't catch
	this.request.crashSync = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.crashSync>', client );

		fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashSync


	// Mistake in application code: Uses a Promise, doesn't await
	this.request.crashAsync = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.crashAsync>', client );

		fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashAsync


	// This will get caught properly:
	this.request.crashSafe = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<server.crashSafe>', client );

		await fetch( TEST_URL ).then( response => UNDEFINED_FUNCTION );

	} // crashAsync


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onMessage = function (...parameters) {
		if (DEBUG.MCP) DEBUG.log(
			COLORS.MCP,
			'MASTER CONTROL:',
			...parameters.map( (parameter)=>{
				switch (typeof parameter) {
					case 'object' : return '\n' + Object.keys( parameter );  break;
					default       : return '\n' + parameter;                 break;
				}
			}),
		);

	} // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'ServerManager.exit' );
		stop_watch_files();
		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'ServerManager.reset' );
		if (Object.keys( persistent ).length == 0) ;

		create_new_access_token();

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'ServerManager.init' );
		self.reset();
		start_watch_files ();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const manager = await new ServerManager();

}; // ServerManager


//EOF
