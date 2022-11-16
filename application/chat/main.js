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


module.exports = function ChatServer (persistent_data, callback) {
	const self = this;

	const dom_parser = new DomParser();
	const rss_parser = new RssParser();

	this.rssInterval;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.nick = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.nick>', dump(client) );

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

			client.broadcast({
				type     : 'nickName',
				userName : client.login.userName,
				nickName : new_nick,
				oldNick  : old_nick,
			});

			client.respond( STATUS.SUCCESS, request_id, REASONS.NICKNAME_CHANGED );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.nick


	this.request.say = function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.say>', dump(client)	);

		if (client.login) {
			const message       = parameters;
			const t0            = Date.now();
			const all_clients   = callback.getAllClients();
			const authenticated = client_address => all_clients[client_address].login;

			Object.keys( all_clients ).filter( authenticated ).forEach( (recipient)=>{
				all_clients[recipient].send({
					update: {
						type     : 'chat',
						time     : t0,
						userName : client.login.userName,
						nickName : client.login.nickName,
						message  : message,
					},
				});
			});

			client.respond( STATUS.SUCCESS, request_id );

		} else {
			client.respond( STATUS.FAILURE, request_id, REASONS.INSUFFICIENT_PERMS );
		}

	}; // request.say


// NEWS //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	if (!persistent_data.news) persistent_data.news = {};

	this.request.news = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.news>', dump(client) );
		client.respond( STATUS.SUCCESS, request_id, persistent_data.news );

	}; // news


	this.onPollRSS = async function () {
		const report_items = [];
		const url          = 'https://rss.orf.at/news.xml';
		const feed         = await rss_parser.parseURL( url );

		feed.items.forEach( (item)=>{
			const key = item.title;

			if( !persistent_data.news[key] ) {   //... parameters.all
				persistent_data.news[key] = item;
				report_items.push( item );
			}
		});

		if (report_items.length > 0) {
			callback.broadcast({
				type    : 'rss',
				message : {
					title: feed.title,
					items: report_items,
				},
			});
		}

	}; // onPollRSS


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.exit' );

		clearInterval( self.rssInterval );
		return Promise.resolve();

	}; // exit


	function load_data () {
		return {};

	} // load_data


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.init' );

		if (Object.keys( persistent_data ).length == 0) {
			const data = load_data();
			Object.keys( data ).forEach( (key)=>{
				persistent_data[key] = data[key];
			});
		}

		self.rssInterval = setInterval( self.onPollRSS, 3000 );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // ChatServer


//EOF
