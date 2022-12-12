// handle_message.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../config.js';


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HANDLE MESSAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export function handle_message (cep, terminal, shell, message) {
	//...if (!message.update || !message.update.ping) terminal.animatePing( /*transmit*/true );

	// See  WebSocketClient.send()
	try   { message = JSON.parse( event.data ); }
	catch { /* Assume string */ }

	function print_message (output_nr) {
		let class_name = 'error';
		if (message.broadcast) class_name = 'broadcast';
		if (message.response ) class_name = 'response';
		shell.output.print( message, class_name );
	}

	if (typeof message == 'string') return shell.output.print( message, 'string expand' );
	if (message.who) terminal.applets.userList.update( message.who );

	if (message.tag && shell.tagData[message.tag]) {
		message.time.push( Date.now() - shell.tagData[message.tag] );
		shell.tagData[message.tag] = message;   //...! Display list on screen
	}

	print_message();

	if      (message.broadcast) process_broadcast();
	else if (message.response ) process_response();
	else {
		console.log( 'handle_message(): Unidentified message:', JSON.stringify(message, null, '\t') );
		shell.output.print( message, 'cep unknown', 1 );
	}

	return;


	function process_broadcast () {
		const broadcast = (message.broadcast instanceof Array) ? message.broadcast : [message.broadcast];
		broadcast.forEach( entry =>{
			if (entry.error) entry.error = format_error( entry.error );
			if (!entry.type) return console.log( 'handle_message: No broadcast type:', entry );

			switch (entry.type) {
				// Other types are broadcast:
				case 'error'              : broadcast_error        ( entry );  break;
				case 'server/name'        : broadcast_server_name  ( entry );  break;
				case 'server/reset'       : break;
				case 'reload/client'      : // fall through
				case 'reload/server'      : broadcast_reload_server( entry );  break;
				case 'session/ping'       : print_message( entry, 'ping' );    break;
				case 'session/connect'    : break;
				case 'session/disconnect' : break;
				case 'session/login'      : break;
				case 'session/logout'     : break;
				case 'chat/nick'          : break;
				case 'chat/say'           : broadcast_chat_say     ( entry );  break;
				case 'chat/html'          : broadcast_chat_html    ( entry );  break;
				case 'rss/news'           : broadcast_rss_news     ( entry );  break;
				default: {
					console.log( 'handle_message: Unknown broadcast type:', entry );
					shell.output.print( entry, 'cep error', 1 );
				}
			}
		});

	} // process_broadcast


	function process_response () {
		const is_array = message.response instanceof Array;

		// Handle all responses
		if (is_array) {
			message.response.forEach( handle_response );
		} else {
			handle_response( message.response );     //...	.chat.say:test...server.token
		}

		return true;

		function handle_response (response) {
			if (!response) return;   //... Server error

			if (response.who) terminal.applets.userList.update( response.who );

			if (response.error) response.error = format_error( response.error, 1 );
			//...if (!response.response && !response.success) return;   //... Server error

			switch (response.command) {
				case 'session.login'  :  response_session_login( response );  break;
case 'chat/nick'      :  response_chat_nick    ( response );  break;
case 'session/status' :  break;
			}
		}

	} // process_response


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// BROADCAST
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function broadcast_error (broadcast) {
		const text    = format_error( broadcast.error, null );
		const parts   = text.split( ':' );
		const error   = parts.shift();
		const message = parts.join( ':' ).replaceAll( '\n', '<br>' );
		const html = '<span class="error">' + error + '</span>: ' + message.trim();

		shell.output.print({ html: html }, 'cep error expand', 1 );

		terminal.applets.status.show(
			'<span><span class="warning">Warning</span>: '
			+ broadcast.error.split('\n')[0]
			+ '</span>'
			,
			/*clear*/true,
		);

	} // broadcast_error


	function broadcast_server_name (broadcast) {
		terminal.applets.loginMenu.elements.btnNode.innerText = broadcast.name;
	}


	function broadcast_reload_server (broadcast) {
		const NEW = cep.dom.newElement;

		const result = broadcast.reload;
		const file_names = (typeof result == 'string') ? [result] : result;

		const children = file_names.map( file_name => NEW({
			tagName   : 'a',
			innerText : file_name,
			href      : file_name,
		}) );

		const html = NEW({
			tagName   : 'div',
			children  : children,
		}).innerHTML;

		shell.output.print( {html: html}, 'cep files', 1 );

	} // broadcast_reload_server


	function broadcast_chat_say (broadcast) {
		const name = (broadcast.nickName || broadcast.userName);
		const sender
		= '<span style="color:' + color_from_name(name) + '">'
		+ name
		+ '</span>'
		;
		const html = sender + '<span> ' + broadcast.message + ' </span>';
		shell.output.print( {html: html}, 'chat' );

	} // broadcast_chat_say


	function broadcast_chat_html (broadcast) {
		shell.output.print({ html: broadcast.html }, 'html');

	} // broadcast_chat_html


	function broadcast_rss_news (broadcast) {
		Object.values( broadcast.items ).forEach( (entry, index)=>{
			const anchor = (
				'<a href="'
				+ entry.link
				+ '">'
				+ message.broadcast.feed
				+ ': '
				+ entry.title
				+ '</a>'
			);
			terminal.applets.status.show( anchor );
			shell.output.print( {html: anchor}, 'cep', 1 );
		});

	} // broadcast_rss_news


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RESPONSE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function response_session_login (response) {
		if (response.success) {
			terminal.elements.terminal.classList.add( 'authenticated' );
			terminal.applets.mainMenu.elements.btnCEP.innerText
			= response.result.login.userName
			+ (response.result.login.nickName ? ':'+response.result.login.nickName : '')
			;
		}

	} // response_session_login


	function response_session_logout (response) {
		if (response.success) {
			terminal.elements.terminal.classList.remove( 'authenticated' );
			terminal.applets.mainMenu.elements.btnCEP.innerText = 'Connected';
		}

	} // response_session_logout


	function response_session_who () {
		if (message.response.success) terminal.applets.userList.update( message.response.result );

	} // response_session_who


	function response_chat_nick (broadcast) {
		if (response.success) {
			const parts = terminal.applets.mainMenu.elements.btnCEP.innerText.split(':');
			const new_name = response.result.userName + ':' + response.result.nickName;
			terminal.applets.mainMenu.elements.btnCEP.innerText = new_name;
		} else {
			shell.output.print( 'Nick change failed: ' + response.result, 'cep error' );
		}

	} // response_chat_nick

} // new_protocol


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

function format_error (string_error, extra_tabs = 0) {
	return string_error.split('\n').map( indent ).join('\n');

	function indent (line, index) {
		if ((extra_tabs === null) || (index == 0)) return line.charAt(0) == '\t' ? line.slice(1) : line;
		const indent = '\t'.repeat( SETTINGS.INDENT_ERRORS + extra_tabs );
		return indent + line.trim();
	}

} // format_error


function color_from_name (name) {
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


	if (!name) return '#fff';

	const sum = name.split('').reduce( (sum, char) => (sum + char.charCodeAt(0)), 0 );
	const nr_colors = 16;
	const color = hsl_to_html_color( ((sum * 13) % nr_colors) / nr_colors, 0.8, 0.7 );
	return color;

	function rotl (byte, amount = 1) {
		byte = byte << amount;
		const overflow = byte >> 8;
		return byte & 0xFF & overflow;
	}

} // color_from_name


//EOF
