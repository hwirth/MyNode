// router.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { hrtime } = require( 'node:process' );

const { SETTINGS        } = require( '../server/config.js' );
const { REASONS         } = require( './constants.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );

const Helpers         = require( './constants.js' );
const WebSocketClient = require( './client.js' );
const MetaData        = require( './meta.js'   );


module.exports.Router = function (persistent, callback) {
	const self = this;

	this.protocols;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function send_as_json (socket, data) {
		const stringified_json = JSON.stringify( data, null, '\t' );

		if (DEBUG.MESSAGE_OUT) DEBUG.log(
			COLORS.ROUTER,
			'Router-send_as_json:',
			JSON.parse( stringified_json ),   // Re-parsing turns it into a single line
		);

		if (socket.send) socket.send( stringified_json );

	} // send_as_json


	function log_persistent (event_name, caption = '') {
		DEBUG.log(
			COLORS.ROUTER,
			'Router.' + event_name + ':',
			caption + 'persistent:',
			persistent, //.clients,
		);

	} // log_persistent


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onConnect = function (socket, client_address) {
		self.protocols.session.onConnect( socket, client_address );   // Will create new  WebSocketClient()
		if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onConnect' );

	}; // onConnect


	this.onDisconnect = function (socket, client_address) {
		self.protocols.session.onDisconnect( socket, client_address );
		if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onDisconnect' );

	}; // onDisconnect


// ON MESSAGE ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onMessage = async function (socket, client_address, message) {
		// A message can contain multiple commands. We will keep track of failures and sucesses,
		// find the right protocol and pass on the message to the final response handler.
		// JSON format: { <protocol>: { <command>: { <request> }}}
		// Main level keys designate target protocol, second level a command
		// Since keys in objects must be unique, each command can only be used once

		const nano_t0 = hrtime.bigint();
		const date_t0 = Date.now();

//... Improve handled/rejected commands
const handled_commands  = [];
const rejected_commands = [];

		const request_id = {
			tag: message.tag,
			request: null,
		}

		const collected_answers = [];

		const client = self.protocols.session.getClientByAddress( client_address );
		if (!client) {
			DEBUG.log( COLORS.ERROR, 'ERROR', 'Router.onMessage:0: Unknown client:', client_address );
			callback.broadcast({ 'ROUTER ERROR 1': 'Unknown client in onMessage' });
			return;
		}


		function send_error (error, catch_mode = '') {
			DEBUG.log( COLORS.ERROR, 'ERROR Router.onMessage-send_error:', catch_mode, error );
//...return;
			callback.broadcast({
				type     : 'error',
				source   : 'router/' + catch_mode,
				error    : DEBUG.formatError( error ),
			});
		}


// CALL RQ HANDLER ///////////////////////////////////////////////////////////////////////////////////////////////119:/
		async function call_request_handler (protocol_name, command_name) {
			const combined_name = protocol_name + '.' + command_name;
			const request_handler = self.protocols[protocol_name].request[command_name];

			++request_id.request;
			request_id.command = combined_name;

//... Will be done through access rules
if (!request_handler) {
	rejected_commands.push( combined_name );

	if (DEBUG.ROUTER) DEBUG.log(
		COLORS.ERROR,
		'Router.onMessage:',
		'unknown command:',
		combined_name,
	);

	return;
}
//... Improve handled/rejected commands
handled_commands.push( combined_name );

			const do_log = SETTINGS.PING.LOG || (protocol_name != 'session') || (command_name != 'pong');
			if (do_log) {
				if (DEBUG.ROUTER) DEBUG.log(
					COLORS.ROUTER,
					'Router.onMessage:',
					'request_handler: ',
					request_handler,
				);
			}

			if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onMessage:', 'PRE COMMAND: ' );

			const request_arguments = message[protocol_name][command_name];
			let answer;

			try {
				//... How do I catch, when I accidentially
				//... forgot to await something in there?
				if (request_handler.constructor.name === 'AsyncFunction') {
					if (DEBUG.ROUTER) DEBUG.log( COLORS.ROUTER, 'AWAIT:', combined_name );

					try {
						answer = await request_handler(
							client,
							request_id,
							request_arguments,

						).catch( (error)=>{
							send_error( error, 3 );
							answer = {error : error};
						});

					} catch (error) {
						send_error( error, 4 );
						answer = {error : error};
					}

				} else {
					if (DEBUG.ROUTER) DEBUG.log( COLORS.ROUTER, 'SYNC', combined_name );

					try {
						answer = request_handler(
							client,
							request_id,
							request_arguments,
						);

					} catch (error) {
						send_error( error, 5 );
						answer = {error : error};
					}
				}

			} catch (error) {
				send_error( error, 'T/C:2' );
				answer = {error : error};
			}

			collected_answers.push({
				protocol : protocol_name,
				command  : command_name,
				message  : answer,  //...! Might be undefined. Raise error!
			});

			if (DEBUG.ROUTER_PERSISTENT_DATA) log_persistent( 'onMessage:', 'POST COMMAND: ' );

		} // call_request_handler


// CREATE HANDLER CALLS //////////////////////////////////////////////////////////////////////////////////////////119:/

		let handler_count = 0;
		const handler_calls = async ([protocol_name, protocol_command_names]) => {
			const protocol = self.protocols[protocol_name];

//... Will be done through access rules
if (!protocol) {
	if (DEBUG.ROUTER) DEBUG.log(
		COLORS.WARNING,
		'Router.onMessage:',
		'unknown protocol:',
		protocol_name,
	);
	rejected_commands.push( protocol_name );
	collected_answers.push({
		protocol : protocol_name,
		command  : Object.keys( protocol_command_names ).join(','),
		message  : {error : 'Error: Unknown protocol'},
	});
	return;
}

			if (DEBUG.ROUTER) DEBUG.log(
				COLORS.ROUTER,
				'Router.onMessage:',
				'protocol_commands:',
				Object.keys( message[protocol_name] ),
			);

			if (protocol && protocol.onMessage) {
				protocol.onMessage( socket, client_address, message );
			}

			const commands = Object.keys( protocol_command_names );
			return await commands.reduce( async (prev, command_name)=>{
				// Enforce execution order on second level (commands)
				await prev;
				return call_request_handler(protocol_name, command_name);
			}, Promise.resolve());

		}/*.reduce( async (prev, next)=>{//...? Execution order of protocols currently not guaranteed
			// Enforce execution order on top level (protocols)
			await prev;
			return next;
		})*/;


// CALL ALL HANDLERS /////////////////////////////////////////////////////////////////////////////////////////////119:/

		if (typeof message == 'string') {
			DEBUG.log(
				COLORS.WARNING,
				'Not JSON:',
				'String "' + message + '", ignoring',
			);
			return;
		}

		const tags                = ([protocol_name]) => protocol_name != 'tag';
		const addressed_protocols = Object.entries( message );
		const requests_processed  = addressed_protocols.filter( tags ).map( handler_calls );

		await Promise.allSettled( requests_processed );

//... Improve handled/rejected commands
if (rejected_commands.length) DEBUG.log(
	COLORS.ROUTER,
	'Router.onMessage:',
	(rejected_commands.length ? COLORS.ERROR : COLORS.DEFAULT)
	+ 'Commands handled/rejected:'
	+ COLORS.DEFAULT
	, handled_commands.length
	, '/'
	, rejected_commands.length
);


// COLLECT RESULTS ///////////////////////////////////////////////////////////////////////////////////////////////119:/

if (collected_answers.filter( answer => answer.command != 'pong' ).length > 0) {//...

		const results    = [];
		const broadcasts = [];
		collected_answers.forEach( (answer)=>{
			if( !answer.protocol ||  !answer.command ||  !answer.message
			||  Helpers.isEmptyObject( answer.message )
			) {
				DEBUG.log( COLORS.ERROR, 'Router.onMessage:', 'No handler response:', answer );
				answer.message = {error: new Error('Bad response from request handler') };
			}

			if (answer.message.broadcast) broadcasts.push( answer.message.broadcast );

			const command_name = answer.protocol + '.' + answer.command;

			if ('boolean' == typeof answer.message.success) {
				results.push({
					command : command_name,
					success : answer.message.success,
					result  : answer.message.result,
				});
			}
			if ('undefined' != typeof answer.message.failure) {
				const result = SETTINGS.SERVER.VERBOSITY ? answer.message.failure : undefined;
				results.push({
					command : command_name,
					success : false,
					result  : result,
				});
			}
			else if ('undefined' != typeof answer.message.result) {
				results.push({
					command : command_name,
					success : true,
					result  : answer.message.result,
				});
			}
			else if (answer.message.error) {
				const error = DEBUG.formatError( answer.message.error ).split('\n', 1)[0];
				const result = SETTINGS.SERVER.VERBOSITY ? error : undefined;
				results.push({
					command : command_name,
					success : null,
					error   : error,
				});
			}
		});


// COMPILE ANSWERS AND SEND //////////////////////////////////////////////////////////////////////////////////////119:/

		// REPLY
		const time_r0 = Number( hrtime.bigint() - nano_t0 ) / 1000/1000;
		const time_r1 =[
			date_t0,
			Math.round( time_r0 * 1000 ) / 1000,
		];
		const time_r2 = (SETTINGS.MESSAGE_TIMESTAMPS) ? time_r1 : undefined;
		const response = {
			response : (results.length > 1) ? results : results[0],
			time     : time_r2,
			tag      : message.tag,
		};

		socket.send( JSON.stringify(response) );

		// BROADCAST

		const requested_who = broadcasts.reduce( (prev, entry)=>{
			const had_who = entry.who;
			delete entry.who;
			return prev || had_who;
		}, false);

		const who_data = requested_who ? self.protocols.session.getWho() : undefined;
		const time_b   = (SETTINGS.MESSAGE_TIMESTAMPS) ? Date.now() : undefined;
		Object.entries( persistent.session.clients ).forEach( ([address, client])=>{
			const client_receives = [];
			broadcasts.forEach( (entry)=>{
				if( (!entry.recipients)
				||  (entry.recipients && entry.recipients( client ))
				) {
					client_receives.push( entry );
				}
			});
			if (client_receives.length > 0) {
				const receives = (client_receives.length == 1) ? client_receives[0] : client_receives;
				client.send({
					broadcast : receives,
					who       : who_data,
					time      : time_b,
				});
			}
		});

}   //... not a pong

	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'Router.exit' );

		return Promise.allSettled(
			Object.keys( self.protocols ).map( (name)=>{
				return (
					self.protocols[name].exit
					? self.protocols[name].exit()
					: Promise.resolve()
				);
			}),
		);

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'Router.reset' );

	}; // reset


	this.init = async function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'Router.init' );

		const meta = new MetaData();
		self.protocols = {};

// PROTOCOL INTERFACE ////////////////////////////////////////////////////////////////////////////////////////////119:/
		const SessionHandler = require( './session.js' );
		const AccessControl  = require( './access.js' );
		const ServerControl  = require( './control.js' );
		const ChatServer     = require( './chat/chat.js' );
		const RSSServer      = require( './rss/rss.js' );

		const registered_callbacks = {
			broadcast              : (...params)=>{ return self.protocols.session.broadcast(...params); },
			reset                  : callback.reset,
			triggerExit            : callback.triggerExit,
			verifyToken            : (...params)=>{ return self.protocols.mcp.verifyToken(...params); },
			getMeta                : ()=>{ return meta },
			getRules               : ()=>{ return self.protocols.access.rules; },
			getProtocols           : ()=>self.protocols,
			getWho                 : (...params)=>{ return self.protocols.session.getWho(...params); },
			getAllClients          : ()=>{ return persistent.session.clients; },
			getAllPersistentData   : ()=>{ return persistent; },
			getProtocolDescription : (show_line_numbers)=>{
				return self.protocols.access
				.getProtocolDescription( show_line_numbers );//...?
			},
		};

		const registered_protocols = {
			session: {
				template: SessionHandler,
				callbacks: [
					'broadcast',
					'verifyToken',
					'getAllClients',
				],
			},
			access: {
				template: AccessControl,
			},
			//...server: { template: ServerControl, callbacks: Object.keys(registered_callbacks) },
			server: {
				template: ServerControl,
				callbacks : [
					'broadcast',
					'reset',
					'getRules',
					'getUpTime',
					'getMeta',
					'getProtocols',
					'getAllClients',
					'getAllPersistentData',
					'getProtocolDescription',
					'triggerExit',
				],
			},
			chat: {
				template: ChatServer,
				callbacks : [
					'broadcast',
					'getWho',
					'getAllClients',
				],
			},
			rss: {
				template: RSSServer,
				callbacks : [
					'broadcast',
				],
			},
		};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		// Instantiate protocols

		const load_requests = Object.keys( registered_protocols ).map( async protocol_name =>{
			if (!persistent[protocol_name]) {
				DEBUG.log( COLORS.PROTOCOL, 'No persistent data for protocol:', protocol_name );
				persistent[protocol_name] = {};
			}

			const protocol  = registered_protocols[protocol_name];
			const data      = persistent[protocol_name];

			const new_callbacks = {};
			if (protocol.callbacks) protocol.callbacks.forEach( name =>{
				new_callbacks[name] = registered_callbacks[name];
			});

			meta.setCollectorKey( protocol_name );
			self.protocols[protocol_name] = await new protocol.template( data, new_callbacks, meta );
		});

		await Promise.all( load_requests );

		// Process collected meta data

console.log( 'meta.help:', meta.help );
console.log( 'meta.rules:', meta.rules );

		// Protocol description

		const registered_rules   = registered_callbacks.getProtocolDescription().split('\n');
		const validation_results = { registered:{}, declared:{} };

		function log (type, rule, good) {
			validation_results[type][rule] = !!good;
			//...DEBUG.log( COLORS[good ? 'ROUTER' : 'WARNING'], type + ':', rule );
		}

		meta.rules.forEach( description =>{
			const found = registered_rules.find( rule => rule == description );
			log( 'declared', description, found );
		});
		meta.rules.forEach( description =>{
			const found = meta.rules.find( rule => rule == description );
			log( 'registered', description, found );
		});
persistent.access.descriptionState = validation_results;
		DEBUG.log( COLORS.ROUTER, 'Protocols:', Object.keys(self.protocols), validation_results );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const router = await new Router();

}; // Router


//EOF
