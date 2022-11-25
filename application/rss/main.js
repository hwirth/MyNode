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

	this.request = {};

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
		const feed = persistent.feeds[persistent.next];

		if (feed.enabled) {
			poll( feed );
		} else {
			color_log( COLORS.RSS_DISABLED, 'RSS:', 'disabled:', feed.name );
		}

		persistent.next = (persistent.next + 1) % persistent.feeds.length;

	}; // poll_next_server


	function poll_all_enabled () {
		persistent.feeds.forEach( (feed)=>{
			if (feed.enabled) poll( feed );
		});

	} // poll_all_enabled


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

	function get_status () {
		return {
			interval : persistent.interval,
			next     : persistent.next,
			feeds    : persistent.feeds,
		};

	} // get_status


	this.request.status = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.list>', client );
		client.respond( STATUS.SUCCESS, request_id, get_status() );

	}; // request.status


	this.request.toggle = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.toggle>', client );

		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

		if (parameters == 'all') {
			persistent.feeds.forEach( (feed)=>{
				feed.enabled = !feed.enabled;
				//...poll( feed );
			});
			request_id.command += ':all';   //...?
		} else {
			const feed = persistent.feeds.find( f => f.name == parameters );
			if (!feed) {
				client.respond( STATUS.FAILURE, request_id, 'Unknown feed name' );
				return;
			}
			feed.enabled = !feed.enabled;
			//...poll( feed );
		}

		client.respond( STATUS.SUCCESS, request_id, get_status() );

	}; // request.toggle


	this.request.interval = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.interval>', client );

		function isNumeric (string) {
			return !isNaN(parseFloat(string)) && isFinite(string);
		}

		if (isNumeric( parameters )) {
			persistent.interval = parameters;
			start_interval();
			client.respond( STATUS.SUCCESS, request_id, {interval: parameters} );
			return;
		}

		if (typeof parameters != 'string') {
			client.respond( STATUS.FAILURE, request_id, REASONS.MALFORMED_REQUEST );
			return;
		}

	}; // request.interval


	this.request.show = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.show>', client );

		const feed_name = parameters;

		let result = persistent;
		if ((typeof parameters == 'string') && (persistent.items[feed_name])) {
			result = persistent.items[feed_name];
		}

		client.respond( STATUS.SUCCESS, request_id, result );

	}; // request.show


	this.request.update = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.update>', client );

		const feed_name = parameters;

		let feeds = persistent.feeds;
		if (typeof parameters == 'string') {
			if (persistent.feeds[feed_name]) {
				feeds = persistent.feeds[feed_name];
			} else {
				client.respond( STATUS.FAILURE, request_id, 'Unknown feed' );
			}
		}

		const polled = feeds.map( (feed)=>{
			if (feed.enabled) {
				poll( feed );
				return feed.name;
			} else {
				return null;
			}
		}).filter( entry => (entry != null) );

		client.respond( STATUS.SUCCESS, request_id, polled );

	}; // request.show


	this.request.reset = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<rss.reset>', client );
		self.reset( /*force*/true );
		client.respond( STATUS.SUCCESS, request_id, 'RSS cache reset' );

	}; // request.reset


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'RssServer.exit' );
		stop_interval();
		return Promise.resolve();

	}; // exit


	this.reset = function (force = false) {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'RSSServer.reset' );

		if (force || Object.keys( persistent ).length == 0) {
			const data = {
				feeds: [
{ enabled:false, name:'Der Standard'              , url:'https://www.derstandard.at/rss' },
{ enabled:false, name:'www.orf.at'                , url:'https://rss.orf.at/news.xml'    },
{ enabled:false, name:'Fefes Blog'                , url:'https://blog.fefe.de/rss.xml'   },
{ enabled:false, name:'BBC World'                 , url:'http://feeds.bbci.co.uk/news/world/rss.xml' },
{ enabled:false, name:'BBC Science & Environment' , url:'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
{ enabled:false, name:'BBC Technology'            , url:'http://feeds.bbci.co.uk/news/technology/rss.xml' },
				],
				next     : 0,
				interval : 1*60*1000,
				items    : {},
			};

			Object.keys( data ).forEach( (key)=>{
				persistent[key] = data[key];
			});

			persistent.feeds.forEach( (feed)=>{
				feed.nrItems = null;
			});
		}

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'RSSServer.init' );
		self.reset();
		poll_all_enabled();
		start_interval();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // RSSServer


//EOF
