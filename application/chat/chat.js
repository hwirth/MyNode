// chat.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fetch     = require( 'node-fetch' );
const DomParser = require( 'dom-parser' );
const RssParser = require( 'rss-parser' );

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


module.exports = function ChatServer (persistent, callback, meta) {
	const self = this;

	this.request = {};

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	meta( 'guest,user,mod,admin,dev,owner: {chat:{nick:string}}' );
	this.request.nick = function (client, request_id, parameters) {
		if (client.login) {
			//... Check nick validity/availability
			if (!parameters) {
				client.respond( STATUS.FAILURE, request_id, STATUS.INVALID_NICKNAME );
				return;
			}

			const user_name     = client.login.userName;
			const old_nick      = client.login.nickName || client.login.userName || client.address;
			const new_nick      = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			client.login.nickName = new_nick;

			callback.broadcast({
				address  : client.address,
				type     : 'chat/nick',
				userName : user_name,
				nickName : new_nick,
				oldNick  : old_nick,
				who      : callback.getWho(),
			});

			client.respond( STATUS.SUCCESS, request_id, {
				userName : user_name,
				nickName : new_nick,
				oldNick  : old_nick,
			});
			color_log( COLORS.COMMAND, '<chat.nick>', client );

		} else {
			color_log( COLORS.COMMAND, '<chat.nick>', client );
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.nick


	meta( 'guest,user,mod,admin,dev,owner: {chat:{say:string}}' );
	this.request.say = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.say>', client	);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients ).filter( authenticated ).forEach( (recipient)=>{
				all_clients[recipient].update({
					type     : 'chat/say',
					time     : t0,
					userName : client.login.userName,
					nickName : client.login.nickName,
					chat     : message,
				});
			});

			client.respond( STATUS.SUCCESS, request_id );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.say


	meta( 'mod,admin,dev,owner: {chat:{html:string}}' );
	this.request.html = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.html>', client	);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients )
			.filter( authenticated )
			.forEach( (key)=>{
				all_clients[key].update({
					type     : 'chat/html',
					time     : t0,
					userName : client.login.userName,
					nickName : client.login.nickName,
					html     : message,
				});
			});

			client.respond( STATUS.SUCCESS, request_id );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.html


	meta( 'mod,admin,dev,owner: {chat:{remote:string}}' );
	this.request.remote = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.remote>', client	);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients )
			.filter( authenticated )
			.forEach( (key)=>{
				all_clients[key].update({
					type     : 'chat/remote',
					time     : t0,
					userName : client.login.userName,
					nickName : client.login.nickName,
					remote   : message,
				});
			});

			client.respond( STATUS.SUCCESS, request_id );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.html


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.exit' );

		//exit_rss();

		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'ChatServer.reset' );

		if (Object.keys( persistent ).length == 0) ;

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.init' );
		self.reset();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // ChatServer


//EOF
