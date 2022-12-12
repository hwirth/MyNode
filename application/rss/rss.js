// rss.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const fetch     = require( 'node-fetch' );
const DomParser = require( 'dom-parser' );
const RssParser = require( 'rss-parser' );

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );

const { isNumeric } = require( '../constants.js' );


module.exports = function ChatServer (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;

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

		DEBUG.log( COLORS.RSS_ENABLED, 'RSS:', 'polling:', feed.name );
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
					title : item.title.slice(0, 240),
					link  : item.link,
				};
				feed_items[key] = report_items[key] = new_item;
			}
		});

		feed.nrItems = Object.keys( feed_items ).length;

		if (Object.keys( report_items ).length > 0) {
			callback.broadcast({
				type  : 'rss/news',
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
			DEBUG.log( COLORS.RSS_DISABLED, 'RSS:', 'disabled:', feed.name );
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


// STATUS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'status', 'Show configuration of all feeds' );
RULE( 'guest,user,mod,admin,dev,owner: {rss:{status:empty}}' );

	this.request.status = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.list>', client );
		return { result:get_status() };

	}; // request.status


// TOGGLE ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'toggle', 'Enable or disable regular polling of one or all feed(s)' );
RULE( 'mod,admin,dev,owner: {rss:{toggle:string}}' );

	this.request.toggle = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.toggle>', client );

		if (typeof parameter != 'string') {
			return { failure:REASONS.INVALID_REQUEST };
		}

		if (parameter == 'all') {
			persistent.feeds.forEach( (feed)=>{
				feed.enabled = !feed.enabled;
				//...poll( feed );
			});

		} else {
			const feed = persistent.feeds.find( f => f.name == parameter );
			if (!feed) {
				return { failure:'Unknown feed' };
			}

			feed.enabled = !feed.enabled;
			//...poll( feed );
			// Return all
		}

		return { result:get_status() };

	}; // request.toggle


// INTERVAL //////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'interval', 'Change time between poll attempts' );
RULE( 'mod,admin,dev,owner: {rss:{interval:number}}' );

	this.request.interval = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.interval>', client );

		if (Helpers.isNumeric( parameter )) {
			persistent.interval = Math.max( SETTINGS.RSS.MIN_INTERVAL, parameter );
			start_interval();
			return { result: {interval: parameter} };
			return;
		}

		if (typeof parameter != 'string') {
			return { failure:REASONS.INVALID_REQUEST };
		}

	}; // request.interval


// NICK //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'show', 'Show cached feed items of a feed' );
RULE( 'guest,user,mod,admin,dev,owner: {rss:{show:string}}' );

	this.request.show = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.show>', client );

		const feed_name = parameter;
		let result = persistent;
		if ((typeof parameter == 'string') && (persistent.items[feed_name])) {
			result = persistent.items[feed_name];
		}

		return { result:result };

	}; // request.show


// UPDATE ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'update', 'Poll a feed immediately' );
RULE( 'mod,admin,dev,owner: {rss:{update:string}}' );

	this.request.update = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.update>', client );

		const feed_name = parameter;

		let feeds = persistent.feeds;
		if (typeof parameter == 'string') {
			if (persistent.feeds[feed_name]) {
				feeds = persistent.feeds[feed_name];
			} else {
				return { failure:'Unknown feed' };
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

		return { result:polled };

	}; // request.show


// NICK //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'reset', 'Reset persistent RSS data' );
RULE( 'dev,owner: {rss:{reset:empty}}' );

	this.request.reset = async function (client, parameter) {
		DEBUG.log( COLORS.COMMAND, '<rss.reset>', client );
		self.reset( /*force*/true );
		return { result: 'RSS cache reset' };

	}; // request.reset


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'RssServer.exit' );
		stop_interval();
		return Promise.resolve();

	}; // exit


	this.reset = function (force = false) {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'RSSServer.reset' );

		if (force || Object.keys( persistent ).length == 0) {
			const data = {
				feeds: [
{ enabled:false, name:'Der Standard'              , url:'https://www.derstandard.at/rss' },
{ enabled:false, name:'ORF'                       , url:'https://rss.orf.at/news.xml'    },
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
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'RSSServer.init' );
		self.reset();
		poll_all_enabled();
		start_interval();
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // RSSServer


//EOF
