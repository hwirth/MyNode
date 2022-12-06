// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { ClientEndPoint } from './cep/cep.js';
import { log_event      } from './cep/config.js';

const PROGRAM_NAME = 'Chat';
const PROGRAM_VERSION = '0.0.1α';

const DEBUG = {
	INSTANCES : false,
	EVENTS    : false,
};

const Application = function () {
	const self = this;

	this.cep;        // ClientEndPoint handles the connection for us
	this.nickName;   // Remember last used name to determine, when to request a nick change


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function scroll_down () {
		//self.elements.textOutput.scrollTop = self.elements.textOutput.clientHeight;
		self.elements.textOutput.scrollBy( 0, 999999 );
		self.elements.textInput.focus();

	} // scroll_down


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


	function print (tag_name, html, class_name = null) {
		const new_element = document.createElement( tag_name );
		if (class_name) new_element.className = class_name;
		new_element.innerHTML = html;
		if (tag_name == 'pre') new_element.setAttribute( 'tabindex', '0' );
		self.elements.textOutput.appendChild( new_element );
		scroll_down();
	}


	function update_nick_color () {
		const nick = self.elements.textNickName;
		nick.style.color = color_from_name( nick.value );

	} // update_nick_color


	function update_user_list (clients = null) {
		if (!clients) return '';
		let html = 'Users in room: ';
		Object.keys( clients ).forEach( (address)=>{
			const client = clients[address];
			const name = client.nickName || client.userName || address;
			const color = color_from_name( name );
			html += '<span style="color:' + color + '">' + name + '</span>';
		});
		self.elements.listUsers.innerHTML = html;
	}


// COLOR FROM NAME ///////////////////////////////////////////////////////////////////////////////////////////////119:/

	function hue_to_rgb (p, q, t) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1/6) return p + (q - p) * 6 * t;
		if (t < 1/2) return q;
		if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;

	} // hue_to_rgb


	function dec_to_hex2 (dec) {
		const hex_digits = "0123456789abcdef";
		const hi_nibble  = (dec & 0xF0) >> 4;
		const lo_nibble  = (dec & 0x0F) >> 0;
		return hex_digits[hi_nibble] + hex_digits[lo_nibble];

	} // dec_to_hex2


	function hsl_to_html_color (h, s = 0.5, l = 0.5) {
		const q = (l < 0.5) ? (l * (1 + s)) : (l + s - l * s);
		const p = 2 * l - q;
		const r = hue_to_rgb(p, q, h + 1/3);
		const g = hue_to_rgb(p, q, h      );
		const b = hue_to_rgb(p, q, h - 1/3);

		return (
			'#'
			+ dec_to_hex2( Math.round(r * 255) )
			+ dec_to_hex2( Math.round(g * 255) )
			+ dec_to_hex2( Math.round(b * 255) )
		);

	} // hsl_to_html_color


	function color_from_name (name) {
		if (!name) return '#fff';

		const sum = name.split('').reduce( (sum, char) => (sum + char.charCodeAt(0)), 0 );
		const nr_colors = 16;
		const color = hsl_to_html_color( ((sum * 13) % nr_colors) / nr_colors, 0.5, 0.65 );
		return color;

		function rotl (byte, amount = 1) {
			byte = byte << amount;
			const overflow = byte >> 8;
			return byte & 0xFF & overflow;
		}

	} // color_from_name


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WEB SOCKET
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function set_connection_state (state) {
		// Set class to chat <form> according to state
		['offline', 'connecting', 'connected', 'online', 'error', 'retry'].forEach( (class_name)=>{
			self.elements.form.classList.toggle( class_name, (class_name == state) );
		});
	}

	this.onWsConnecting = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsconnecting', event );
		set_connection_state( 'connecting' );
	}; // onWsConnecting


	function remove (class_name) {
		const element = self.elements.textOutput.querySelector( ':scope > :last-child' );
		if (element.classList.contains(class_name)) element.parentNode.removeChild( element );
	}


	this.onWsRetry = function (attempt_nr) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsRetry', event );

		remove( 'warning' );
		remove( 'error' );
		remove( 'retry' );

		print('div', 'Reconnecting... ' + attempt_nr, 'retry')
		set_connection_state( 'retry' );
	}; // onWsRetry


	this.onWsOpen = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsOpen', event );
		set_connection_state( 'connected' );
	}; // onWsOpen


	this.onWsClose = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsClose', event );
		print( 'div', 'Connection lost.', 'warning' );
		set_connection_state( 'offline' );
	}; // onWsClose


	this.onWsError = function (event) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsError', event );
		set_connection_state( 'error' );

		print( 'div', 'Connection failed.', 'error' );
	}; // onWsError


	this.onWsSend = function (message) {
		// Gets called after the CEP sent our message
		// The main app would normally ignore this, it's for the debugger
		print( 'pre', JSON.stringify(message, null, '\t'), 'sent' );
		self.elements.textInput.value = '';
		self.elements.textInput.focus();

	}; // onWsSend


	this.onWsMessage = function (message) {
		if (DEBUG.EVENTS) log_event( 'Application.onWsMessage', message );

		// Print hidden protocol debug messages
		const pre     = document.createElement( 'pre' );
		pre.innerHTML = JSON.stringify( message, null, '\t' );
		pre.className = 'received';
		pre.setAttribute( 'tabindex', '0' );
		self.elements.textOutput.appendChild( pre );
		if (self.elements.textOutput.classList.contains('debug')) scroll_down();

		// Process message regluarly
		if( (message.response)
		&&  (message.response.success)
		&&  (message.response.type == 'result')
		&&  (message.response.command == 'session.login')
		) {
			const login = message.response.result.login;
			//...self.cep.send( {session:{who:true}} );
			return set_connection_state( 'online' );
		}
		else if( (message.response)
		&& (message.response.success)
		&& (message.response.type == 'result')
		&& (message.response.command == 'session.logout')
		) {
			set_connection_state( 'connected' );
		}
		else if( (message.response)
		&& (message.response.success)
		&& (message.response.type == 'result')
		&& (message.response.command == 'session.who')
		) {
			update_user_list(message.response.result);
		}
		else if (message.update && (message.update.type == 'server/name')) {
			const html =  'Connected to MyNode ' + message.update.name + '.';
			print( 'div', html );
		}
		else if (message.update && (message.update.type == 'chat/say')) {
			const sender = message.update.nickName || message.update.userName;
			const text   = message.update.chat;
			const html
			= '<span>' + format_timestamp(message.update.time) + '</span>'
			+ '<span style="color:' + color_from_name( sender )
			+ '">' + sender + '</span><span>' + text + '</span>'
			;
			print( 'div', html, 'talk' );
		}
		else if (message.broadcast && message.broadcast.type == 'session/login') {
			const name  = message.broadcast.userName;
			const color = color_from_name( name );
			const html
			= '<span>' + format_timestamp(message.broadcast.time) + '</span>'
			+ '<span style="color:' + color + '">' + name + '</span>' + ' joined the chat.'
			;
			print( 'div', html , 'join');
			update_user_list( message.broadcast.who );
		}
		else if (message.broadcast && message.broadcast.type == 'session/disconnect') {
			const name  = message.broadcast.nickName || message.broadcast.userName || message.broadcast.address;
			const color = color_from_name( name );
			const html
			= '<span>' + format_timestamp(message.broadcast.time) + '</span>'
			+ '<span style="color:' + color + '">' + name + '</span>' + ' left the chat.'
			;
			print( 'div', html, 'leave' );
			update_user_list( message.broadcast.who );
		}
		else if (message.broadcast && message.broadcast.type == 'chat/nick') {
			const prev_name  = message.broadcast.oldNick || message.broadcast.userName;
			const nick_name  = message.broadcast.nickName;
			const prev_color = color_from_name( prev_name );
			const nick_color = color_from_name( nick_name );
			const html
			= '<span>' + format_timestamp(message.broadcast.time) + '</span>'
			+ '<span style="color:' + prev_color + '">' + prev_name + '</span>'
			+ ' is now known as '
			+ '<span style="color:' + nick_color + '">' + nick_name + '</span>'
			+ '.'
			;
			print( 'div', html, 'nick' );
			update_user_list( message.broadcast.who );
		}

	}; // onWsMessage


// PROTOCOL //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getCredentials = function (websocket_url) {
		console.log( 'Application.getCredentials:', websocket_url );

		return new Promise( (proceed, abort)=>{
			//... Await dialog
			self.nickName = self.elements.textNickName.value.trim();
console.log( 'MAIN nick_name', self.nickName );
			if (self.nickName) {
				proceed({ session:{login:{username:'guest'}}, chat:{nick:self.nickName} });
			} else {
				proceed({ session:{login:{username:'guest'}} });
			}
		});

	}; // getCredentials


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Application.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( '%c' + PROGRAM_NAME + ' v' + PROGRAM_VERSION, 'color:#080; font-weight:bold;' );
		if (DEBUG.INSTANCES) console.log( 'Application.init' );

		// Gather DOM elements
		self.elements = Object.entries({
			form          : 'body > form.chat',
			btnSend       : 'body > form.chat button.send',
			textOutput    : 'body > form.chat output',
			textInput     : 'body > form.chat [name=text]',
			textNickName  : 'body > form.chat [name=nick]',
			listUsers     : 'body > form.chat .users',

		}).reduce( (prev, [name, selector])=>{
			return { ...prev, [name]:document.querySelector(selector) };

		}, /*initialValue*/{} );

		const params = new URLSearchParams( location.search.slice(1) );
		const name = params.get('name');
		if (name) self.elements.textNickName.value = name;
		self.nickName = null;
		update_nick_color();

		self.cep = await new ClientEndPoint({
			connection: {
				webSocketURL : 'wss://spielwiese.central-dogma.at:1337',
				events: {
					login   : self.getCredentials,
					open    : self.onWsOpen,
					message : self.onWsMessage,
					close   : self.onWsClose,
					error   : self.onWsError,
					retry   : self.onWsRetry,
					send    : self.onWsSend,
				},
			},
	/*
			events: {
				'reload/client' : ()=>print( 'div', 'The client was updated, reloading.', 'reload' ),
				'reload/css'    : ()=>print( 'div', 'A CSS file has been reloaded.'     , 'reload' ),
			},
	*/
		});

		// Disable <form> submission
		CEP.dom.disableFormSubmit( self.elements.form );

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

		self.elements.textNickName.addEventListener( 'input', update_nick_color );

		self.elements.btnSend.addEventListener( 'click', ()=>{
			const message  = self.elements.textInput.value.trim();
			const new_nick = self.elements.textNickName.value.trim();

			function set_nick (new_nick) {
				self.nickName = new_nick;
				window.history.pushState(
					"object or string",
					"Title",
					"/new/index.html?name=" + new_nick,
				);
			}

			if (new_nick && (new_nick != self.nickName)) {
				if (message) {
					self.cep.send( {chat:{nick:new_nick, say:message}} );
					set_nick( new_nick );
				} else {
					self.cep.send( {chat:{nick:new_nick}} );
					set_nick( new_nick );
				}
			} else if (message) {
				self.cep.send( {chat:{say:message}} );
			}
		});

		self.cep.connect();

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const app = await new Application()

}; // Application



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRAM ENTRY POINT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

addEventListener( 'load', async ()=>{
	load_status( 'Initializing...' );
	await new Application();
	document.querySelector( 'html' ).classList.remove('init');
});


//EOF
