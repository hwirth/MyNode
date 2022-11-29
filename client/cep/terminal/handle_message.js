// hadnle_message.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS } from '../config.js';


export function handle_message (terminal, message, callback) {
	if (!message.update || !message.update.ping) terminal.dom.animatePing( /*transmit*/true );

	// See  WebSocketClient.send()
	try   { message = JSON.parse( event.data ); }
	catch { /* Assume string */ }

	const root_key = Object.keys( message )[0];
	switch (root_key) {
		case 'update': {
			switch (message.update.type) {
				case 'session/ping' :  return update_session_ping();
				case 'chat/say'     :  return update_chat_say();
				case 'chat/html'    :  update_chat_html();    break;
				case 'server/name'  :  return update_server_name();
			}
			return terminal.shell.print( message, 'update error' );
		}
		case 'broadcast': {
			let type = message.broadcast.type;
			if (type.slice(0, 5) == 'error') type = 'error';
			switch (type) {
				case 'rss'                :  broadcast_rss();    break;
				case 'error'              :  broadcast_error();  break;
				case 'reload/server'      : // fall through
				case 'reload/client'      :  broacast_reload();  break;
				case 'chat/nick'          : // fall through
				case 'session/connect'    : // fall through
				case 'session/login'      : // fall through
				case 'session/logout'     : // fall through
				case 'session/disconnect' :  terminal.dom.updateWhoList( message.broadcast.who );  break;
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

	function print_message () {
		let class_name = 'response';

		if      (typeof message == 'string')              class_name = 'string expand'
		else if (typeof message.cep       != 'undefined') class_name = 'cep expand'
		else if (typeof message.notice    != 'undefined') class_name = 'notice'
		else if (typeof message.broadcast != 'undefined') class_name = 'broadcast'
		else if (typeof message.update    != 'undefined') class_name = 'update'
		;

		terminal.shell.print( message, class_name );

	} // print_message


// UPDATE ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function update_session_ping () {
		if (!SETTINGS.HIDE_MESSAGES.PING) print_message();
		callback.send( {session:{ pong: message.update.pong }} );
		terminal.dom.animatePing();
	}


	function update_server_name () {
		terminal.elements.btnNode.innerText = message.update.name;
		terminal.dom.updateWhoList( null ); //{dummy:'Logged out'} );
		print_message();
	}


	function update_chat_say () {
		print_message();
		const sender = message.update.nickName || message.update.userName;
		terminal.shell.print( {[sender]: message.update.chat}, 'chat' );
	}

	function update_chat_html () {
		terminal.shell.print({ html: message.update.html });
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
			terminal.status.show( anchor );
		});
	}


	function broadcast_error () {
		terminal.status.show(
			'<span><span class="warning">Warning</span>: '
			+ message.broadcast.error
			+ '</span>'
			,
			/*clear*/true,
		);
	}


	function broacast_reload () {
		Object.keys( message.broadcast.reload ).forEach( (file_name)=>{
			if (message.broadcast.type == 'reload/client') {

				if( (SETTINGS.RELOAD_FOLDER.TERMINAL)
				&&  (file_name.split('/')[1] == 'terminal')
				) {
					location.reload();
				}

				switch (file_name) {
					case 'client/terminal/layout.css':
					case 'client/terminal/variables.css': {
						terminal.dom.reloadCSS( file_name.replace('client/', '') );
						return print_message();
					}
					case 'client/terminal/terminal.js' :  // fall through
					case 'client/main.js'              :  // fall through
					case 'client/index.html': {
						location.reload();
						return;
					}
				}
			}

			terminal.status.show(
				'The file <a href="'
				+ file_name.replace( 'client/', '' )
				+ '">'
				+ file_name.replaceAll( '/', '/<wbr>' )
				+ '</a> has been updated.'
			);
		});
	}


// RESPONSE //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function response_session_login () {
		if (message.response.success) {
			terminal.elements.terminal.classList.add( 'authenticated' );
			terminal.elements.btnCEP.innerText
			= message.response.result.login.nickName || message.response.result.login.userName;
			terminal.dom.updateWhoList( true );
		}
	}


	function response_session_logout () {
		terminal.elements.terminal.classList.remove( 'authenticated' );
		terminal.elements.btnCEP.innerText = 'Connected';
		if (message.response.success) terminal.dom.updateWhoList( null ); //{dummy:'Logged out'} );
	}


	function response_session_who () {
		if (message.response.success) terminal.dom.updateWhoList( message.response.result );
	}


	function response_chat_nick () {
		if (message.response.success) {
			const parts = terminal.elements.btnCEP.innerText.split(':');
			const new_name = message.response.result.userName + ':' + message.response.result.nickName;
			terminal.elements.btnCEP.innerText = new_name;
			terminal.dom.updateWhoList( true );
		}
	}


} // handle_message


//EOF
