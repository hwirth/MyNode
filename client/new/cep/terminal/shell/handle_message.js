// hadnle_message.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../config.js';


export function handle_message (cep, terminal, shell, message) {
	//...if (!message.update || !message.update.ping) terminal.animatePing( /*transmit*/true );

	// See  WebSocketClient.send()
	try   { message = JSON.parse( event.data ); }
	catch { /* Assume string */ }

	const root_key = Object.keys( message )[0];
	switch (root_key) {
		case 'update': {
			switch (message.update.type) {
				case 'chat/say'     :  return update_chat_say();
				case 'chat/html'    :  update_chat_html();    break;
				case 'server/name'  :  return update_server_name();
				case 'session/ping' :  return print_message( 'ping' );
			}
			return shell.output.print( message, 'update error' );
		}
		case 'broadcast': {
			let type = message.broadcast.type;
			if (type.slice(0, 5) == 'error') type = 'error';
			switch (type) {
				case 'rss'                :  broadcast_rss();    break;
				case 'error'              :  broadcast_error();  break;
				case 'reload/server'      : // fall through
				case 'reload/client'      : // fall through
				case 'chat/nick'          : // fall through
				case 'session/connect'    : // fall through
				case 'session/login'      : // fall through
				case 'session/logout'     : // fall through
				case 'session/disconnect' :  terminal.updateWhoList( message.broadcast.who );  break;
			}
			break;
		}
		case 'response': {
			switch (message.response.command) {
				case 'session.login'  :  response_session_login();   break;
				case 'session.logout' :  response_session_logout();  break;
				case 'session.who'    :  response_session_who();     break;
				case 'chat.nick'      :  response_chat_nick();       break;
			}

			break;
		}
	}

	return print_message();


// PRINT MESSAGE /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function print_message (extra_class = '') {
		let class_name = 'response';
		if (extra_class) extra_class = ' ' + extra_class;

		if      (typeof message == 'string')              class_name = 'string expand'
		else if (typeof message.cep       != 'undefined') class_name = 'cep expand'
		else if (typeof message.notice    != 'undefined') class_name = 'notice'
		else if (typeof message.broadcast != 'undefined') class_name = 'broadcast'
		else if (typeof message.update    != 'undefined') class_name = 'update'
		;

		shell.output.print( message, class_name + extra_class );

	} // print_message


// UPDATE ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function update_server_name () {
		terminal.applets.loginMenu.elements.btnNode.innerText = message.update.name;
		terminal.updateWhoList( null ); //{dummy:'Logged out'} );
		print_message();
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



	function update_chat_say () {
		print_message();
		const name = (message.update.nickName || message.update.userName);
		const sender
		= '<span style="color:' + color_from_name(name) + '">'
		+ name
		+ '</span>'
		;
		const html = sender + '<span> ' + message.update.chat + ' </span>';
		shell.output.print( {html: html}, 'chat' );
	}

	function update_chat_html () {
		shell.output.print({ html: message.update.html });
	}


// BROADCAST /////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function broadcast_rss () {
		Object.values( message.broadcast.items ).forEach( (entry, index)=>{
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
		});
	}


	function broadcast_error () {
		terminal.applets.status.show(
			'<span><span class="warning">Warning</span>: '
			+ message.broadcast.error
			+ '</span>'
			,
			/*clear*/true,
		);
	}


// RESPONSE //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function response_session_login () {
		if (message.response.success) {
			terminal.elements.terminal.classList.add( 'authenticated' );
			terminal.applets.mainMenu.elements.btnCEP.innerText
			= message.response.result.login.nickName || message.response.result.login.userName;
			terminal.updateWhoList( true );
		}
	}


	function response_session_logout () {
		terminal.elements.terminal.classList.remove( 'authenticated' );
		terminal.applets.mainMenu.elements.btnCEP.innerText = 'Connected';
		if (message.response.success) terminal.updateWhoList( null ); //{dummy:'Logged out'} );
	}


	function response_session_who () {
		if (message.response.success) terminal.updateWhoList( message.response.result );
	}


	function response_chat_nick () {
		if (message.response.success) {
			const parts = terminal.applets.mainMenu.elements.btnCEP.innerText.split(':');
			const new_name = message.response.result.userName + ':' + message.response.result.nickName;
			terminal.applets.mainMenu.elements.btnCEP.innerText = new_name;
			terminal.updateWhoList( true );
		} else {
			shell.output.print( 'Nick change failed: ' + message.response.result, 'cep error' );
		}
	}


} // handle_message


//EOF
