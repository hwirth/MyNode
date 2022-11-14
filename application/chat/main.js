// chat: main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { DEBUG, COLORS   } = require( '../../server/debug.js' );
const { color_log, dump } = require( '../../server/debug.js' );
const { REASONS, STATUS } = require( '../constants.js' );


STATUS.CHAT = 'chat';


module.exports = function ChatServer (persistent_data, callback) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.nick = function (client, request_id, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<chat.nick>',
			dump( client ),
		);

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
		color_log(
			COLORS.PROTOCOL,
			'<chat.say>',
			dump( client ),
		);

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


	this.request.news = async function (client, request_id, parameters) {
		color_log( COLORS.COMMAND, '<chat.news>', 'client:', dump(client) );

		//throw new Error( 'TEST ERROR' );

		const url = 'https://rss.orf.at/news.xml';

		let response_html = '';

		await fetch( url )
		.then( response => response.text() )
		//.then( str => new DOMParser().parseFromString( str, 'text/xml' ) )
		.then( data => {
			console.log(
				data
				.split( '<item' )
				.map( (entries)=>{
					return (
						entries
						//.split( '\n' )
						.filter( (line)=>{
							return (
								   (line.indexOf('<title>') >= 0)
								|| (line.indexOf('<link>' ) >= 0)
							);
						})
					);
				}),
			);
	/*
			const items = data.querySelectorAll( 'item' );
			let html = ``;
			items.forEach( (element)=>{
				const parts = ['title', 'date', 'link'].map( (tag_name)=>{
					return element.querySelector( tag_name );
				});
				console.log( parts );
				/*
				response_html += (`
<article>
	<h2>
		<a href="${parts.link}" target="_blank" rel="noopener">
			${parts.title}
		</a>
	</h2>
	<p>${parts.date}</p>
</article>
				`).split('\n').map( line => line.trim() ).join('').trim();
				self.terminal.print( html );
				* /
			});
	*/
		});

	}; // news


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'ChatServer.exit' );

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

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // ChatServer


//EOF
