// chat: main.js
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


module.exports = function ChatServer (persistent, callback) {
	const self = this;

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.nick = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.nick>', client );

		if (client.login) {
			//... Check nick validity/availability
			if (!parameters) {
				client.respond( STATUS.FAILURE, request_id, STATUS.INVALID_NICKNAME );
				return;
			}

			const new_nick      = parameters;
			const old_nick      = client.login.nickName;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			client.login.nickName = new_nick;

			callback  .broadcast({
				address  : client.address,
				type     : 'nickName',
				userName : client.login.userName,
				nickName : new_nick,
				oldNick  : old_nick,
			});

			client.respond( STATUS.SUCCESS, request_id, new_nick );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.nick


	this.request.say = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.say>', client	);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients ).filter( authenticated ).forEach( (recipient)=>{
				all_clients[recipient].update({
					type     : 'chat',
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
					type     : 'html',
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


// NEWS //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
/*
	this.onPollRSS = async function () {
		const rss_data = persistent.rss;

		const feed = rss_data.feeds[rss_data.next];
		rss_data.next = (rss_data.next + 1) % rss_data.feeds.length;

		if (!feed.enabled) return;

		if (!rss_data.items[feed.name]) rss_data.items[feed.name] = {};
		const feed_items   = rss_data.items[feed.name];
		const report_items = {};

		const result = await rss_parser.parseURL( feed.url );

		result.items.forEach( (item)=>{
			const key
			=  item.date
			|| item.pubDate
			|| item.isoDate
			|| item.guid
			|| item.title
			;

			if( !feed_items[key] ) {
				const new_item = {
					//...date  : item.date,
					title : item.title,
					link  : item.link,
				};
				feed_items[key] = report_items[key] = new_item;
			}
		});

		if (Object.keys( report_items ).length > 0) {
			callback.broadcast({
				type  : 'rss',
				feed  : feed.name,
				items : report_items,
			});
		}

	}; // onPollRSS


	function reset_rss_data () {
		persistent.rss = {
			feeds: [
				{ enabled:true, name:'standard' , url:'https://www.derstandard.at/rss' },
				{ enabled:true, name:'orf'      , url:'https://rss.orf.at/news.xml'    },
				{ enabled:true, name:'fefe'     , url:'https://blog.fefe.de/rss.xml'   },
			],
			next     : 0,
			interval : 10*60*1000,
			items    : {},
		};

	} // reset_rss_data


	function  init_rss () {
		if (!persistent.rss) reset_rss_data();
		self.rssInterval = setInterval( self.onPollRSS, persistent.rss.interval );
	}


	function exit_rss () {
		clearInterval( self.rssInterval );
	}


	this.request.rss = async function (client, request_id, parameters) {
		if (typeof parameters.clear != 'undefined') {
			color_log( COLORS.COMMAND, '<chat.rss.clear>', client );
			reset_rss_data();
			await self.onPollRSS();
			client.respond( STATUS.SUCCESS, request_id, 'RSS cache cleared' );
			return;
		}

		color_log( COLORS.COMMAND, '<chat.rss>', client );
		client.respond( STATUS.SUCCESS, request_id, persistent.rss );

	}; // news
*/

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
