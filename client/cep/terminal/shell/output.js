// output.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const ShellOutput = function (cep, terminal, shell) {
	const self = this;


	this.printVersion = function () {
		self.print(
			'MyNode Client End Point v'   + cep.version
			+ ', Terminal v' + terminal.version
			+ ', Shell v'    + shell.version
			, 'cep'
		);
	};


	this.clearInput = function () {
		shell.elements.input.value = '';
		shell.input.focusPrompt();
	};


	this.clearScreen = function () {
		shell.elements.output.innerHTML = '';
		self.clearInput();
	};


	this.scrollPos1 = function () {
		shell.elements.output.scrollTop = 0;

	}; // scrollPos1


	this.scrollDown = function (force) {
		if (shell.toggles.scroll.enabled || force) {
			shell.elements.output.scrollBy(0, 99999);
			shell.elements.output1.scrollBy(0, 99999);
		}
		if( !document.activeElement.closest( 'cep-terminal' )   // In case the main app steals our focus
		||  !document.activeElement.closest( '.login.menu'  )   // Don't take focus out of login form
		) {
			shell.input.focusPrompt();
		}

	}; // scrollDown


	this.isScrolledUp = function () {
		const client = shell.elements.output.clientHeight;
		const height = shell.elements.output.scrollHeight;
		const top    = shell.elements.output.scrollTop;
	/*
		console.log(
			'DebugConsole.isScrolledUp: clientHeight:',
			client, 'scrollHeight:', height, 'scrollTop:', top,
		);
	*/
		return (height - client) - top;

	}; // isScrolledUp


	this.scrollPageUp = function () {
		shell.elements.output.scrollBy( 0, -shell.elements.output.clientHeight );
	};


	this.scrollPageDown = function () {
		shell.elements.output.scrollBy( 0, shell.elements.output.clientHeight );
	};


	this.deleteToMarker = function () {
		let element = get_last();
		shell.elements.input.value = '';
		if (element && element.classList.contains( 'mark' )) {
			shell.elements.output.removeChild( element );
			return;
		}
		while (element = get_last()) {
			if (element.classList.contains( 'mark' )) break;
			shell.elements.output.removeChild( element );
		}
		shell.input.focusPrompt();

		function get_last () {
			return shell.elements.output.querySelector( ':scope > :last-child' );
		}
	};


	this.showFile = async function (file_name, id_selector) {
		const file_contents = await fetch( file_name ).then( (response)=>{
			if (! response.ok) throw new Error( 'HTTP error, status = ' + response.status );
			return response.text();   // returns a Promise
		});

		const file_extension = file_name.split('.').pop();
		switch (file_extension) {
			case 'html': {
				shell.toggles.compact.toggle( false );

				const iframe     = document.createElement( 'iframe' );
				iframe.src       = file_name + '?included' + (id_selector ? '#'+id_selector : '');
				iframe.className = 'Xcep htmlfile expand';
				iframe.setAttribute( 'tabindex'    , '0' );
				iframe.setAttribute( 'frameborder' , '0' );
				iframe.setAttribute( 'scrolling'   , 'yes' );
				iframe.addEventListener( 'load', ()=>{
					iframe.style.height = (
						iframe.contentWindow.document.documentElement.scrollHeight + 'px'
					);
					shell.toggles.scroll.toggle( true );
					self.scrollDown();
					setTimeout( ()=>shell.toggles.scroll.toggle(false), 500 );
				});
				const last_print = shell.elements.output.querySelector( ':scope > :last-child' );
				iframe.addEventListener( 'click', (event)=>{
					shell.elements.output.scrollTop = last_print.offsetTop - 15;
				});
				last_print.innerHTML += '\n';
				last_print.appendChild( iframe );

				break;
			}
			case 'txt': // fall through
			default: {
				const html_parsed = (
					file_contents
					.split( '//EOF', 1 )[0]
					.replaceAll( '&', '&amp;' )
					.replaceAll( '<', '&lt;'  )
					.replaceAll( '\n[ ]' , '\n<span class="todo"> </span>'            )
					.replaceAll( '\n[!]' , '\n<span class="todo important">!</span>'  )
					.replaceAll( '\n[#]' , '\n<span class="todo urgent">#</span>'     )
					.replaceAll( '\n[?]' , '\n<span class="todo research">?</span>'   )
					.replaceAll( '\n[\\]', '\n<span class="todo cancelled">\\</span>' )
				);
				const pages = html_parsed.split( '\n#' );

				if (!id_selector) {
					return self.print( pages[0], 'Xcep textfile expand' );
				}

				const with_tag = page => page.slice( 0, id_selector.length ) == id_selector;
				const found_page = pages.find( with_tag ).slice( id_selector.length )

				if (found_page) {
					self.print( found_page, 'Xcep textfile expand' );
				} else {
					self.print( 'Unknown help topic: ' + id_selector, 'cep error' );
				}

				self.scrollDown();
			}
		}

	}; // showFile


// PRINT /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.print = function (message, class_name = null, output_nr = '') {

		function replace_href (word) {
			//...! Ignores tab-prefixed "words":
			if ((word.slice(0,7) == 'http://') || (word.slice(0,8) == 'https://')) {
				const pos_tab = Math.min(
					(word + ' ').indexOf( ' ' ),
					(word + '\t').indexOf( '\t' ),
					(word + '\n').indexOf( '\n' ),
				);
				const href = word.slice(0, pos_tab);
				const rest = word.slice(pos_tab);
				return '<a target="_blank" href="' + href + '">' + href + '</a>' + rest;
			} else {
				return word;
			}

		} // replace_href

		function highlight () {
			// Decorate tokens with HTML
			const class_names = [
		/*//... Removed to reduce CPU load
				'slash'    , 'period'  , 'colon'   , 'semi'     , 'curlyO' ,
				'bracketO' , 'parensO' , 'parensC' , 'bracketC' , 'curlyC' ,
		*/
				'true'     , 'false'   , 'null'    , 'error',
			];
			const tokens = [
		/*
				'/', '.', ':', ';', '{',
				'[', '(', ')', ']', '}',
		*/
				'true', 'false', 'null', 'error:'
			];

			let message_html = (
				(typeof message == 'string')
				? message
				: shell.parsers.requestToText( message )
			)
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;'  )
			.replaceAll('\\n', '\n')   // '\\n' for .readme
			.replaceAll( '&lt;', '###lt###' )
			.replaceAll( '&gt;', '###gt###' )
			.replaceAll( '&amp;', '###amp###' )
			;

			tokens.forEach( (token, index)=>{
				const html
				= (token == 'error:')
				? '<code class="' + class_names[index] + '">error</code>:'
				: '<code class="' + class_names[index] + '">' + token + '</code>'
				;
				message_html = message_html.replaceAll( token, html );
			});

			message_html = message_html
			.replaceAll( '###amp###', '&amp;' )
			.replaceAll( '###gt###', '&gt;' )
			.replaceAll( '###lt###', '&lt;' )
			.split(' ').map( replace_href ).join(' ')
			.split('\n').map( replace_href).join('\n')
			;

			return message_html;

		} // highlight


		// Let user scroll up   //... Make optional
		const o = shell.elements.output;
		const do_scroll = (o.scrollHeight - o.scrollTop >= o.clientHeight - 1);

		let print_message = null;
		if (message.html) {
			print_message = message.html.replaceAll( '<a href', '<a target="_blank" href' );
			print_message = print_message.replaceAll( '\n', '<br>\n' );
			print_message = (
				print_message
				.split(' ' ).map( replace_href ).join(' ' )
				.split('\n').map( replace_href ).join('\n')
			);
			if (!class_name) class_name = 'html';

		} else {
			print_message
			= (typeof message == 'string')
			? message
			: highlight( JSON.stringify(message, null, '\t') )
			;
		}

		// Create DOM element
		const new_element = document.createElement( 'pre' );
		if (class_name) new_element.className = class_name;
		new_element.innerHTML = print_message.trim();

		shell.elements['output' + output_nr].appendChild( new_element );

		['response', 'broadcast'].forEach( (category)=>{
			if (message[category] && message[category].type) {
				new_element.dataset.type = message[category].type;
			}
		});

		self.scrollDown();


		// Visualize/sonifiy success/failure
		if (message.broadcast && (typeof message.broadcast.success != 'undefined')) {
			terminal.bit.say( message.broadcast.success );
		}

		if (message.response && (typeof message.response.success != 'undefined')) {
			// We might receive several responses, when we sent several requersts,
			// so we tell the bit to stack its answers:
			terminal.bit.say( message.response.success, message.response.request - 1 );
		}

	}; // print

}; // ShellOutput


//EOF
