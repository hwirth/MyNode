// chat.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fetch     = require( 'node-fetch' );
const DomParser = require( 'dom-parser' );
const RssParser = require( 'rss-parser' );

const { SETTINGS        } = require( '../../server/config.js' );
const { DEBUG, COLORS   } = require( '../../server/debug.js'  );
const { REASONS, STATUS } = require( '../constants.js'        );


module.exports = function ChatServer (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

// NICK //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'nick', 'Change your nickname in chat. Allowed characters: ' + SETTINGS.ALLOWED_NAME_CHARS );
RULE( 'guest,user,mod,admin,dev,owner: {chat:{nick:string}}' );

	this.request.nick = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<chat.nick>', client );

		if (client.login) {
			const allowed  = char => SETTINGS.ALLOWED_NAME_CHARS.indexOf(char.toLowerCase()) >= 0;
			const filtered = parameter.split('').filter( allowed ).join('');

			//... Check nick validity/availability
			if (!parameter || (filtered != parameter)) {
				return { failure:REASONS.INVALID_NICKNAME };
			}

			const user_name     = client.login.userName;
			const old_nick      = client.login.nickName || client.login.userName || client.address;
			const new_nick      = parameter;

			client.login.nickName = new_nick;
			const who_data = callback.getWho();
			console.log( 'WHO', who_data );

			return {
				result: {
					userName : user_name,
					nickName : new_nick,
					oldNick  : old_nick,
				},
				broadcast: {
					who      : true,
					type     : 'chat/nick',
					address  : client.address,
					userName : user_name,
					nickName : new_nick,
					oldNick  : old_nick,
				},
			};

		} else {
			return { failure:REASONS.INSUFFICIENT_PERMS };
		}

	}; // request.nick


// SAY ///////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'say', 'Send a text message to all or one specific users' );
RULE( 'guest,user,mod,admin,dev,owner: {chat:{say:{room:string,message:string}}}' );
RULE( 'guest,user,mod,admin,dev,owner: {chat:{say:{user:string,message:string}}}' );

	this.request.say = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<chat.say>', client	);

		const type = (parameter.room) ? 'room' : 'private';

		if( (type == 'chat/room'   ) && !parameter.room
		||  (type == 'chat/private') && !parameter.user
		) {
			return { failure: REASONS.INVALID_REQUEST };
		}

		const recipients
		= (type == 'room')
		? client => client.login
		: client => client.login && (client.login.userName.toLowerCase() == parameter.user.toLowerCase());
		;

		return {
			success   : true,
			broadcast : {
				recipients : recipients,
				type       : 'chat/' + type,
				userName   : client.login.userName,
				nickName   : client.login.nickName,
				message    : parameter.message,
			},
		};

	}; // request.say


// HTML //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'html', 'Send HTML to all users' );
RULE( 'mod,admin,dev,owner: {chat:{html:string}}' );

	this.request.html = function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<chat.html>', client	);

		if (client.login) {
			return {
				success   : true,
				broadcast : {
					recipients : client => client.login,
					type       : 'chat/html',
					userName   : client.login.userName,
					nickName   : client.login.nickName,
					html       : parameter,
				},
			};

		} else {
			return { failure:REASONS.INSUFFICIENT_PERMS };
		}

	}; // request.html


// MODE //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'mode', 'Adds or removes (comma separated) class name(s) on <cep-terminal> in all connected browsers' );
HELP( 'mode.set', 'Enable only (comma separated) class name(s) on <cep-terminal> in all connected browsers' );
HELP( 'mode.add', 'Add (comma separated) class name(s) on <cep-terminal> in all connected browsers' );
HELP( 'mode.del', 'Remove (comma separated) class name(s) on <cep-terminal> in all connected browsers' );

RULE( 'mod,admin,dev,owner: {chat:{mode:{set:string}}}' );
RULE( 'mod,admin,dev,owner: {chat:{mode:{add:string}}}' );
RULE( 'mod,admin,dev,owner: {chat:{mode:{del:string}}}' );

	this.request.mode = function (client, parameter, request_id) {
		DEBUG.log( COLORS.COMMAND, '<char.mode>', client );

		const command_type
		= (parameter.set) ? 'set'
		: (parameter.add) ? 'add'
		: (parameter.del) ? 'del'
		: null
		;
		const mode = parameter[command_type];
		if (!command_type || !mode) {
			return { failure:REASONS.INVALID_REQUEST };
		}

		return {
			success   : true,
			broadcast : {
				type : 'chat/mode/' + command_type,
				mode : mode,
			}
		};

	}; // request.mode


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'ChatServer.exit' );

		//exit_rss();

		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'ChatServer.reset' );

		if (Object.keys( persistent ).length == 0) ;

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'ChatServer.init' );
		self.reset();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // ChatServer


//EOF
