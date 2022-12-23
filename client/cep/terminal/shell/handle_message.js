// handle_message.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as Helpers from '../../helpers.js';
import { SETTINGS } from '../config.js';


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HANDLE MESSAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export function handle_message (cep, terminal, shell, message) {
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

	print_message();

	if      (message.broadcast) Helpers.wrapArray( message.broadcast ).forEach( handle_broadcast );
	else if (message.response ) Helpers.wrapArray( message.response  ).forEach( handle_response  );
	else {
		console.log( 'handle_message(): Unidentified message:', JSON.stringify(message, null, '\t') );
		shell.output.print( message, 'cep unknown', 1 );
	}

	return;


	function handle_broadcast (broadcast) {
		if (broadcast.error) broadcast.error = format_error( broadcast.error );
		if (!broadcast.type) return console.log( 'handle_message: No broadcast type:', broadcast );

		switch (broadcast.type) {
			// Other types are broadcast:
			case 'error'              : broadcast_error        ( broadcast );  break;
			case 'server/name'        : broadcast_server_name  ( broadcast );  break;
			case 'server/reset'       : break;
			case 'reload/client'      : // fall through
			case 'reload/server'      : broadcast_reload_server( broadcast );  break;
			case 'session/ping'       : print_message( entry, 'ping' );        break;
			case 'session/connect'    : break;
			case 'session/disconnect' : break;
			case 'session/login'      : break;
			case 'session/logout'     : break;
			case 'chat/nick'          : break;
			case 'chat/room'          : // fall through
			case 'chat/private'       : broadcast_chat_say     ( broadcast );  break;
			case 'chat/html'          : broadcast_chat_html    ( broadcast );  break;
			case 'rss/news'           : broadcast_rss_news     ( broadcast );  break;
			default: {
				console.log( 'handle_message: Unknown broadcast type:', broadcast );
				shell.output.print( broadcast, 'cep error', 1 );
			}
		}

	} // handle_broadcast


	function handle_response (response) {
		if (response.error) response.error = format_error( response.error, 1 );
		if (!response.success) return;

		switch (response.command) {
			case 'access.meta':  {
				//...terminal.applets.nodeMenu.updateRequestItems( response.result );
				//...Currently testing  taggedRequest.then  in DebugTerminal.onWsLogin
				break;
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
		terminal.applets.nodeMenu.elements.btnNode.innerText = broadcast.name;
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
		const pm_class = (broadcast.type == 'chat/private') ? ' private' : '';
		shell.output.print( {html: html}, 'chat' + pm_class );

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
