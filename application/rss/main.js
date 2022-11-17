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
// RSS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function poll (feed) {
		if (!persistent.items[feed.name]) persistent.items[feed.name] = {};
		const feed_items   = persistent.items[feed.name];
		const report_items = {};

		color_log( COLORS.RSS_ENABLED, 'RSS:', 'polling:', feed.name );
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

		feed.nrItems = Object.keys( feed_items ).length;

		if (Object.keys( report_items ).length > 0) {
			callback.broadcast({
				type  : 'rss',
				feed  : feed.name,
				items : report_items,
			});
		}

	} // poll


	function poll_next_server () {
		persistent.next = (persistent.next + 1) % persistent.feeds.length;
		const feed = persistent.feeds[persistent.next];

		if (feed.enabled) {
			poll( feed );
		} else {
			color_log( COLORS.RSS_DISABLED, 'RSS:', 'disabled:', feed.name );
		}

	}; // poll_next_server


	function start_interval () {
		if (self.rssInterval) stop_interval();
		self.rssInterval = setInterval( poll_next_server, persistent.interval );
	};


	function stop_interval () {
		clearInterval( self.rssInterval );
		self.rssInterval = null;
	};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.reset = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.reset>', client );
		reset_data();
		client.respond( STATUS.SUCCESS, request_id, 'RSS cache reset' );

	}; // request.clear


	this.request.status = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.list>', client );
		client.respond( STATUS.SUCCESS, request_id, {
			interval : persistent.interval,
			next     : persistent.next,
			feeds    : persistent.feeds,
		});

	}; // request.status


	this.request.toggle = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.toggle>', client );

		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

		const feed = persistent.feeds.find( f => f.name == parameters );

		if (!feed) {
			client.respond( STATUS.FAILURE, request_id, 'Unknown feed name' );
			return;
		}

		feed.enabled = !feed.enabled;
		poll( feed );
		self.request.status( client, request_id, {} );

		client.respond( STATUS.SUCCESS, request_id );

	}; // request.toggle


	this.request.interval = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.interval>', client );

		function isNumeric (string) {
			return !isNaN(parseFloat(string)) && isFinite(string);
		}

		if (isNumeric( parameters )) {
			persistent.interval = parameters*1000;
			start_interval();
			client.respond( STATUS.SUCCESS, request_id );
			return;
		}

		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

	}; // request.interval


	this.request.show = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.show>', dump_client(client) );

		const feed_name = parameters;

		let result = persistent;
		if ((typeof parameters == 'string') && (persistent.items[feed_name])) {
			result = persistent.items[feed_name];
		}

		client.respond( STATUS.SUCCESS, request_id, result );

	}; // request.show


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'RssServer.exit' );
		stop_interval();
		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'RSSServer.reset' );

		const data = {
			feeds: [
				{ enabled:false, name:'standard' , url:'https://www.derstandard.at/rss' },
				{ enabled:false, name:'orf'      , url:'https://rss.orf.at/news.xml'    },
				{ enabled:false, name:'fefe'     , url:'https://blog.fefe.de/rss.xml'   },
			],
			next     : -1,
			interval : 10*60*1000,
			items    : {},
		};

		Object.keys( data ).forEach( (key)=>{
			persistent[key] = data[key];
		});

		persistent.feeds.forEach( (feed)=>{
			feed.nrItems = null;
			poll( feed );
		});

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'RSSServer.init' );
		if (Object.keys( persistent ).length == 0) self.reset();
		start_interval();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // RSSServer


//EOF
