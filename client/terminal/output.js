// output.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

export const ShellOutput = function (terminal, callback, CEP_VERSION) {
	const self = this;


	this.printVersion = function (additional_text) {
		self.print( 'CEP/Shell-' + CEP_VERSION + additional_text, 'cep' );

	}; // printVersion


	this.clearScreen = function () {
		terminal.elements.output.innerHTML = terminal.elements.input.value = '';

	} // clearScreen


	this.scrollDown = function () {
		if (!terminal.toggles//...?
		|| terminal.toggles && terminal.toggles.scroll.enabled) {
			terminal.elements.output.scrollBy(0, 99999);
		}

	}; // scrollDown


	this.isScrolledUp = function () {
		const client = terminal.elements.output.clientHeight;
		const height = terminal.elements.output.scrollHeight;
		const top    = terminal.elements.output.scrollTop;
		console.log(
			'DebugConsole.isScrolledUp: clientHeight:',
			client, 'scrollHeight:', height, 'scrollTop:', top,
		);
		return (height - client) - top;

	}; // isScrolledUp


	this.scrollPageUp = function () {
		terminal.elements.output.scrollBy( 0, -terminal.elements.output.clientHeight );
	}


	this.scrollPageDown = function () {
		terminal.elements.output.scrollBy( 0, terminal.elements.output.clientHeight );
	}


	this.deleteToMarker = function () {
		var element;
		while (element = terminal.elements.output.querySelector(':scope > :last-child') ) {
			terminal.elements.output.removeChild( element );
			if (element.classList.contains( 'mark' )) return;
		}
	}


	this.showFile = async function (file_name, id_selector) {
		const file_contents = await fetch( file_name ).then( (response)=>{
			if (! response.ok) throw new Error( 'HTTP error, status = ' + response.status );
			return response.text();   // returns a Promise
		});

		const file_extension = file_name.split('.').pop();
		switch (file_extension) {
			case 'html': {
				terminal.toggles.compact.disable();

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
					terminal.toggles.scroll.enable();
					self.scrollDown();
					setTimeout( ()=>terminal.toggles.scroll.disable(), 500 );
				});
				const last_print = terminal.elements.output.querySelector( ':scope > :last-child' );
				iframe.addEventListener( 'click', (event)=>{
					terminal.elements.output.scrollTop = last_print.offsetTop - 15;
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
					.replaceAll( '\n[ ]' , '\n[<span class="todo"> </span>]'            )
					.replaceAll( '\n[!]' , '\n[<span class="todo important">!</span>]'  )
					.replaceAll( '\n[#]' , '\n[<span class="todo urgent">#</span>]'     )
					.replaceAll( '\n[?]' , '\n[<span class="todo research">?</span>]'   )
					.replaceAll( '\n[\\]', '\n[<span class="todo cancelled">\\</span>]' )
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

	this.print = function (message, class_name = null) {

		function highlight () {
			// Decorate tokens with HTML
			const class_names = [
		/*
				'slash'    , 'period'  , 'colon'   , 'semi'     , 'curlyO' ,
				'bracketO' , 'parensO' , 'parensC' , 'bracketC' , 'curlyC' ,
		*/
				'true'     , 'false'   , 'null'
			];
			const tokens = [
		/*
				'/', '.', ':', ';', '{',
				'[', '(', ')', ']', '}',
		*/
				'true', 'false', 'null',
			];

			const replace_href = (word)=>{
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
			};

			let message_html = (
				(typeof message == 'string')
				? message
				: terminal.parsers.requestToText( message )
			)
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;'  )
			.replaceAll('\\n', '\n')   // '\\n' for .readme
			.replaceAll( '&lt;', '###lt###' )
			.replaceAll( '&gt;', '###gt###' )
			.replaceAll( '&amp;', '###amp###' )
			;

			tokens.forEach( (token, index)=>{
				const html = '<code class="' + class_names[index] + '">' + token + '</code>';
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
		}


		// Let user scroll up   //... Make optional
		const o = terminal.elements.output;
		const do_scroll = (o.scrollHeight - o.scrollTop >= o.clientHeight - 1);

		let print_message = null;
		if (message.html) {
			print_message = message.html.replaceAll( '<a href', '<a target="_blank" href' );
			print_message = message.html.replaceAll( '\n', '<br>\n' );
			class_name = 'html';

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
		terminal.elements.output.appendChild( new_element );

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function () {
		console.log( 'ShellOutput.init' );

	}; // init


	self.init();

}; // ShellOutput


//EOF
