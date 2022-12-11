// parsers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import * as Helpers from '../../helpers.js';


export const Parsers = function (cep, terminal, shell, BUTTON_SCRIPTS) {
	const self = this;


	this.executeButtonScript = function (script_name) {
		shell.elements.input.value = self.parseButtonScript( script_name );
		shell.elements.btnEnter.click();

	}; // executeButtonScript


	this.parseButtonScript = function (script) {
		const login_menu = terminal.applets.loginMenu;
		const username = login_menu.elements.userName.value;
		const nickname = login_menu.elements.nickName.value;
		const factor2  = login_menu.elements.factor2.value || 'null';

		if (nickname && !username) login_menu.elements.userName.value = 'guest';

		script = script.replaceAll( '\n%N', (login_menu.elements.nickName.value) ? '\nchat\n\tnick: %n' : '' );
		const result = (
			script
			.replaceAll( '%u', username )
			.replaceAll( '%n', nickname )
			.replaceAll( '%p', login_menu.elements.passWord.value || 'null' )
			.replaceAll( '%t', factor2 )
			.split('\n')
			.filter( line => line.indexOf('password: null') < 0 )
			.filter( line => line.indexOf('factor2: null') < 0 )
			.join('\n')
		);

		return result;

	}; // parseButtonScript


	this.requestToText = function (request, indentation = '') {
		let text = '';

		Object.keys( request ).forEach( (key)=>{
			if ((typeof request[key] == 'object') && (request[key] !== null)) {
				text
				+= indentation + key + '\n'
				+  self.requestToText( request[key], indentation + '\t' )
				;
			} else {
				if (typeof request[key] == 'undefined') {
					text += indentation + key + '\n';
				} else {
					text += indentation + key + ': ' + request[key] + '\n';
				}
			}
		});

		if (indentation === '') {
			text = text.trim();
		}

		return text;

	}; // requestToText


	this.textToRequest = function (text, id = null) {
		const lines = text.split( '\n' );

		function find_indentation (text) {
			var i;
			for ( i = 0 ; (i < text.length) && (text.charAt(i) == '\t') ; ++i );
			return i;
		}

		const result = {};
		const stack = [result];
		let current_indentation = 0;

		const request = parse_line( 0 );

		if (id) {
			const new_request = { tag: id };
			Object.keys( request ).forEach( key => new_request[key] = request[key] );
			return new_request;
		} else {
			return request;
		}


		function parse_line (index, current_indentation = 0) {
			// Line does not exist: End of text, end recursion:
			if (typeof lines[index] == 'undefined') return result;

			const line_indentation = find_indentation( lines[index] );
			if (line_indentation < current_indentation) {
				const difference = current_indentation - line_indentation;
				for (let i = 0; i < difference; ++i) {
					stack.pop();
					--current_indentation;
				}
			}

			// Add entry to current parent
			const parent = stack[ stack.length - 1 ];
			const parts = lines[index].split( ':', 2 );   // Get key and value
			if (parts.length == 2) {
				// Actually has key and value
				const key = lines[index].split( ':', 1 )[0].trim();

				const colon_pos = lines[index].indexOf( ':' );
				let value = lines[index].slice( colon_pos + 1 ).trim();
				switch (value) {
					case 'true'  : value = true;   break;
					case 'false' : value = false;  break;
					case 'null'  : value = null;   break;
				}

				if (Helpers.isNumeric( value )) {
					value = parseFloat(value);
				}

				parent[key] = value;

			} else if (parts.length == 1) {
				// Is a sub-object
				const key = lines[index].trim();
				parent[key] = {};
				stack.push( parent[key] );
				//...? Expects next line with increased indentation
				++current_indentation;

			} else {
				console.log( 'textToRequest: parts.length == 0' );
			}

			return parse_line( index + 1, current_indentation );
		}

	}; // textToRequest


	this.parseShortRequest = function (text) {
		const parts = text.slice(1).split('.')
		let result = '';
		let indentation = 0;

		while (parts.length > 0) {
			const part = parts.shift();

			if (part === '') {
				if (--indentation < 0) throw new Error( 'Malformed short request' );

			} else {
				const pos_comma = part.indexOf( ',' );
				if (pos_comma >= 0) {
					part.split( ',' ).forEach( (sub_part)=>{
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  sub_part.replace( '=', ':' )
						;
					});

				} else {
					const pos_equals = part.indexOf( '=' );
					if (pos_equals >= 0) {
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  part.replace( '=', ':' )
						;
					} else {
						result
						+= '\n'
						+  '\t'.repeat( indentation )
						+  part
						;
						++indentation;
					}
				}
			}
		}

		return result.trim();

	}; // parseShortRequest

}; // Parsers


//EOF
