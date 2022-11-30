// client/main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { ClientEndPoint } from './cep/cep.js';
import { log_event      } from './cep/config.js';

const DEBUG = {
	EVENTS: false,
};

const Application = function () {
	const self = this;

	this.webSocket;
	this.nickName;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function scroll_down () {
		//self.elements.textOutput.scrollTop = self.elements.textOutput.clientHeight;
		self.elements.textOutput.scrollBy( 0, 999999 );
		self.elements.textInput.focus();
	}

	function color_from_name (name) {

		function hsl_to_html_color( h, s, l ) {

			function hsl_to_rgb( h, s, l ) {
				var r, g, b;

				if (s == 0) {
				r = g = b = l; // achromatic
				} else {
					var hue2rgb = function hue2rgb( p, q, t ) {
						if (t < 0) t += 1;
						if (t > 1) t -= 1;
						if (t < 1/6) return p + (q - p) * 6 * t;
						if (t < 1/2) return q;
						if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
						return p;
					}

					var q
					= (l < 0.5)
					? l * (1 + s)
					: l + s - l * s
					;
					var p = 2 * l - q;
					r = hue2rgb(p, q, h + 1/3);
					g = hue2rgb(p, q, h      );
					b = hue2rgb(p, q, h - 1/3);
				}

				return [
					Math.round(r * 255),
					Math.round(g * 255),
					Math.round(b * 255)
				];
			}

			const hex_digits = "0123456789abcdef";
			function dec_to_hex2( dec ) {
				const hi_nibble = (dec & 0xF0) >> 4;
				const lo_nibble = (dec & 0x0F) >> 0;
				return hex_digits[ hi_nibble ] + hex_digits[ lo_nibble ];
			}

			const rgb = hsl_to_rgb( h, s, l );
			const r = dec_to_hex2( rgb[0] );
			const g = dec_to_hex2( rgb[1] );
			const b = dec_to_hex2( rgb[2] );

			return "#" + r + g + b;
		}

		function rotl (byte, amount = 1) {
			byte = byte << amount;
			const overflow = byte >> 8;
			return byte & 0xFF & overflow;
		}

		const sum = name.split('').reduce( (sum, char) => (sum + char.charCodeAt(0)), 0 );
		const nr_colors = 16;
		const color = hsl_to_html_color( ((sum * 13) % nr_colors) / nr_colors, 0.5, 0.65 );
		return color;

	} // color_from_name


	function format_timestamp (timestamp) {
		return Intl.DateTimeFormat(
			navigator.language, {
				weekday : 'short',
				year    : 'numeric',
				month   : 'short',
				day     : 'numeric',
				hour    : '2-digit',
				minute  : '2-digit',
				second  : '2-digit',
				fractionalSecondDigits: '3',
				timeZoneName: ['short', 'shortOffset', 'shortGeneric'][0],
				hour12  : false,
			},
		).format( timestamp );

	} // format_timestamp


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEB SOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function set_connection_state (state) {
		['offline', 'connecting', 'connected', 'online', 'error'].forEach( (class_name)=>{
			self.elements.form.classList.toggle( class_name, (class_name == state) );
		});
	}

	this.onWsConnecting = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsconnecting', event );
		set_connection_state( 'connecting' );
	}; // onWsOpen


	this.onWsOpen = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsOpen', event );
		set_connection_state( 'connected' );
	}; // onWsOpen


	this.onWsClose = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsClose', event );
		set_connection_state( 'offline' );
	}; // onWsClose


	this.onWsError = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsError', event );
		set_connection_state( 'error' );
	}; // onWsError


	this.onWsSend = function (message) {
		// Gets called after the CEP sent our message
		const pre     = document.createElement( 'pre' );
		pre.innerHTML = JSON.stringify( message, null, '\t' );
		pre.className = 'sent';
		pre.setAttribute( 'tabindex', '0' );
		self.elements.textOutput.appendChild( pre );
		scroll_down();
		self.elements.textInput.value = '';
		self.elements.textInput.focus();

	}; // onWsSend


	this.onWsMessage = function (message) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsMessage', message );

		const pre     = document.createElement( 'pre' );
		pre.innerHTML = JSON.stringify( message, null, '\t' );
		pre.className = 'received';
		pre.setAttribute( 'tabindex', '0' );
		self.elements.textOutput.appendChild( pre );
		if (self.elements.textOutput.classList.contains('debug')) scroll_down();

		if( (message.response)
		&&  (message.response.success)
		&&  (message.response.type == 'result')
		&&  (message.response.command == 'session.login')
		) {
			return set_connection_state( 'online' );
		}
		else if( (message.response)
		&& (message.response.success)
		&& (message.response.type == 'result')
		&& (message.response.command == 'session.logout')
		) {
			set_connection_state( 'connected' );
		}
		else if (message.update && (message.update.type == 'server/name')) {
			const div = document.createElement( 'div' );
			div.innerHTML =  'Connected to MyNode ' + message.update.name + '.';
			self.elements.textOutput.appendChild( div );
			scroll_down();
		}
		else if (message.update && (message.update.type == 'chat/say')) {
			const div = document.createElement( 'div' );
			const sender = message.update.nickName || message.update.userName;
			const text   = message.update.chat;
			div.className = 'talk';
			div.innerHTML
			= '<span>' + format_timestamp(message.update.time) + '</span>'
			+ '<span style="color:' + color_from_name( sender )
			+ '">' + sender + '</span><span>' + text + '</span>'
			;
			self.elements.textOutput.appendChild( div );
			scroll_down();
		}
		else if (message.broadcast && message.broadcast.type == 'session/login') {
			const name = message.broadcast.userName;
			const color = color_from_name( name );
			const div = document.createElement( 'div' );
			div.className = 'join';
			div.innerHTML
			= '<span>' + format_timestamp(message.broadcast.time) + '</span>'
			+ '<span style="color:' + color + '">' + name + '</span>' + ' joined the chat.'
			;
			self.elements.textOutput.appendChild( div );
			scroll_down();
			self.nickName = message.broadcast.name;
		}
		else if (message.broadcast && message.broadcast.type == 'chat/nick') {
			const prev_name = message.broadcast.oldNick || message.broadcast.userName;
			const nick_name = message.broadcast.nickName;
			const prev_color = color_from_name( prev_name );
			const nick_color = color_from_name( nick_name );
			const div = document.createElement( 'div' );
			div.className = 'nick';
			div.innerHTML
			= '<span>' + format_timestamp(message.broadcast.time) + '</span>'
			+ '<span style="color:' + prev_color + '">' + prev_name + '</span>'
			+ ' is now known as '
			+ '<span style="color:' + nick_color + '">' + nick_name + '</span>'
			;
			self.elements.textOutput.appendChild( div );
			scroll_down();
			self.nickName = message.broadcast.nickName;
		}

	}; // onWsMessage


	this.getCredentials = function (websocket_url) {
		console.log( 'Application.getCredentials:', websocket_url );

		return new Promise( (proceed, abort)=>{

			//... Show dialog

			self.nickName = self.elements.textNickName.value.trim();

			proceed({
				session: {
					login: {
						username: 'guest',
					},
				},
				chat: {
					nick: self.nickName,
				},
			});
		});

	}; // getCredentials


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'Application.init' );

		// Gather DOM elements
		self.elements = Object.entries({
			'form'          : 'body > form.chat',
			'btnSend'       : 'body > form.chat button.send',
			'textOutput'    : 'body > form.chat output',
			'textInput'     : 'body > form.chat [name=text]',
			'textNickName'  : 'body > form.chat [name=nick]',

		}).reduce( (prev, [name, selector])=>{
			return { ...prev, [name]:document.querySelector(selector) };

		}, /*initialValue*/{} );

		// Disable <form> submission
		self.elements.form.addEventListener( 'submit', event => event.preventDefault() );

		self.webSocket = await new ClientEndPoint({
			webSocketURL   : 'wss://spielwiese.central-dogma.at:1337',
			getCredentials : self.getCredentials,
			onOpen         : self.onWsOpen,
			onMessage      : self.onWsMessage,
			onClose        : self.onWsClose,
			onError        : self.onWsError,
			onSend         : self.onWsSend,
			autoReconnect  : true,               // Try to reopen a lost connection
		});

		self.elements.form.addEventListener( 'click', (event)=>{
			if (['FORM', 'OUTPUT'].indexOf( event.target.tagName) >= 0) {
				scroll_down();
				self.elements.textInput.focus();
			}
		});

		self.elements.textInput.addEventListener( 'keydown', (event)=>{
			if ((event.key == 'd') && !event.shiftKey && !event.ctrlKey && event.altKey) {
				event.preventDefault();
				self.elements.textOutput.classList.toggle( 'debug' );
			}
		});

		self.elements.btnSend.addEventListener( 'click', ()=>{
			const message  = self.elements.textInput.value.trim();
			const new_nick = self.elements.textNickName.value.trim();

			if (new_nick && (new_nick != self.nickName)) {
				if (message != '') {
					self.webSocket.send( {chat:{nick:new_nick, say:message}} );
					self.nickName = new_nick;
				} else {
					self.webSocket.send( {chat:{nick:new_nick}} );
				}
			} else {
				self.webSocket.send( {chat:{say:message}} );
			}
		});

		self.webSocket.connect();

		return Promise.resolve();

	}; // init


	//return self.init().catch( watchdog ).then( ()=>self );   // const app = await new Application()
	return self.init().then( ()=>self );   // const app = await new Application()

}; // Application



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

addEventListener( 'load', async ()=>{
	load_status( 'Initializing...' );

	function delay (ms) { return new Promise( done => setTimeout(done, ms) ); }

	//try {
		await new Application();
		document.querySelector( 'html' ).classList.remove('init')

	//} catch (error) {
	//	console.log( 'main.js.onLoad: error:', error );
	//	watchdog( error );
	//}
});


//EOF
