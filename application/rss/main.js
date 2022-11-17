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
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function start_interval () {
		if (self.rssInterval) stop_interval();
		self.rssInterval = setInterval( poll_next_server, persistent_data.interval );
	};


	function stop_interval () {
		clearInterval( self.rssInterval );
		self.rssInterval = null;
	};


	async function poll_next_server () {
		persistent_data.next = (persistent_data.next + 1) % persistent_data.feeds.length;
		const feed = persistent_data.feeds[persistent_data.next];

		if (!feed.enabled) {
			color_log( COLORS.RSS_DISABLED, 'RSS:', 'disabled:', feed.name );
			return;
		}

		if (!persistent_data.items[feed.name]) persistent_data.items[feed.name] = {};
		const feed_items   = persistent_data.items[feed.name];
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

	}; // poll_next_server


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.reset = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.reset>', dump(client) );
		reset_data();
		client.respond( STATUS.SUCCESS, request_id, 'RSS cache reset' );

	}; // request.clear


	this.request.status = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.list>', dump(client) );
		client.respond( STATUS.SUCCESS, request_id, {
			interval : persistent_data.interval,
			next     : persistent_data.next,
			feeds    : persistent_data.feeds,
		});

	}; // request.status


	this.request.toggle = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.toggle>', dump(client) );

		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

		const feed = persistent_data.feeds.find( f => f.name == parameters );

		if (!feed) {
			client.respond( STATUS.FAILURE, request_id, 'Unknown feed name' );
			return;
		}

		feed.enabled = !feed.enabled;

		client.respond( STATUS.SUCCESS, request_id );

	}; // request.toggle


	this.request.interval = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.interval>', dump(client) );

		function isNumeric (string) {
			return !isNaN(parseFloat(string)) && isFinite(string);
		}

		if (isNumeric( parameters )) {
			persistent_data.interval = parameters*1000;
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
		color_log( COLORS.COMMAND, '<rss.show>', dump(client) );

		const feed_name = parameters;

		let result = persistent_data;
		if ((typeof parameters == 'string') && (persistent_data.items[feed_name])) {
			result = persistent_data.items[feed_name];
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


	function reset_data () {
		const p = persistent_data;

		p.feeds = [
			{ enabled:false, name:'standard' , url:'https://www.derstandard.at/rss' },
			{ enabled:false, name:'orf'      , url:'https://rss.orf.at/news.xml'    },
			{ enabled:false, name:'fefe'     , url:'https://blog.fefe.de/rss.xml'   },
		];

		p.next     = -1;
		p.interval = 10*60*1000;
		p.items    = {};

		p.feeds.forEach( (feed)=>{
			feed.nrItems = null;
			poll_next_server()
		});

	} // reset_data


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'RSSServer.init' );
		if (!persistent_data.feeds) reset_data();
		start_interval();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // RSSServer


//EOF
