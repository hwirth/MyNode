// access.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS                 } = require( '../server/config.js' );
const { DEBUG, COLORS, color_log } = require( '../server/debug.js' );
const { REASONS                  } = require( './constants.js' );

DEBUG.PARSE = {
	SHOW_HEADER  : !false,
	LINES        : false,
	INSTRUCTIONS : false,
	TOKENS       : !false,
	SOURCE       : !false,
};

const PROTOCOL_DESCRIPTION = (`
	connecting,guest,user,mod,admin,dev: session.status
	connecting: session.login.username=string,password=string
	guest,user,mod,admin,dev: session.logout
	#guest,user,mod,admin,dev: session.who
	#guest,user,mod,admin,dev: session.who.username=string
	#user,mod,admin,dev: server.status
	#mod,admin,dev: session.who.address=address+port
	mod,admin,dev: session.kick.address=address+port
	#mod,admin,dev: session.kick.username=string
	#admin,dev: server.status.persistent
	#admin,dev: server.restart
	dev: server.log.*
	#dev: test.*
`); // PROTOCOL_DESCRIPTION


module.exports = function AccessControl (persistent_data, callbacks) {
	const self = this;

	this.rules;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function format_source (configuration, show_line_numbers = true) {
		const line_number = (index) => (show_line_numbers ? (index + ': ') : '')

		return configuration
		.trim().split( '\n' )                                                   // Split text into lines
		.map( line => line.split( '#', 1 )[0].trim() )                          // Remove comments
		.map( (line, index)=>{return line_number(index) + line} )               // Add line numbers
		.filter( (line, index) => (line.length > line_number(index).length) )   // Remove empty lines
		.join( '\n' )
		;

	} // format_source


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PARSER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function parse_configuration (configuration) {
		if (DEBUG.PARSE.SHOW_HEADER) {
			console.log( '*'.repeat(79) );
		}


		// Turn text into array of line objects, preserve source code line numbers

		const lines = (()=>{
			const without_comments = line => line.split('#', 1)[0].trim();
			const to_objects       = (line, index) => { return {source: index, text: line}; };
			const empty_lines      = line => (line.text.trim() != '');
			return (
				configuration
				.trim().split( '\n' )
				.map( without_comments )
				.map( to_objects )
				.filter( empty_lines )
			);
		})();

	/*
		const lines = configuration
		.trim().split( '\n' )                                         // Split text into lines
		.map( line => line.split( '#', 1 )[0].trim() )                // Remove comments
		.map( (line, index)=>{return {source: index, text: line}} )   // Turn lines into objects
		.filter( line => line.text.trim() )                           // Remove empty lines
		;
	*/

		if (DEBUG.PARSE.LINES) {
			console.log( 'lines:', lines );
			console.log( '*'.repeat(79) );
		}


		// 1. Turn include or rule instructions into objects
		// 2. Split groups and dot-separated instruction parts into arrays

		const instructions = lines.map( (line)=>{
			const pos_colon  = line.text.indexOf( ':' );
			const pos_equals = line.text.indexOf( '=' );

			const has_colon  = (pos_colon  >= 0);
			const has_equals = (pos_equals >= 0);

			// No group ":" or include "=" ?
			if (!has_colon) {
				throw new Error(
					'No group in line '
					+ line.source
					+ ': '
					+ line.text
				);
			}

			if (has_colon) {
				const parts = line.text.split( ':', 2 );
				return {
					source : line.source,
					groups : parts[0].trim().split( ',' ),   // Comma
					rule   : parts[1].trim().split( '.' ),   // Period
				};
			}

			throw new Error(
				'Missing group separator in line '
				+ line.source
				+ ': '
				+ line.text
			);

		}); // instructions

		if (DEBUG.PARSE.INSTRUCTIONS) {
			console.log( 'instructions:', instructions );
			console.log( '*'.repeat(79) );
		}


		// 3. Turn rule strings into tokens

		const separators = [
			{ char: '=', name: 'equals'       },
			{ char: ',', name: 'comma'        },
			{ char: '|', name: 'pipe'         },
			{ char: '[', name: 'bracketOpen'  },
			{ char: ']', name: 'bracketClose' },
			{ char: '{', name: 'curlyOpen'    },
			{ char: '}', name: 'curlyClose'   },
		];

		const tokens = instructions.map( (line)=>{
			return {
				source : line.source,
				groups : line.groups,
				rule   : line.rule.map( rule => parse_rule(rule) ),
			};

			function parse_rule (rule) {
				const pos = {};  separators.forEach( (glyph)=>{
					pos[ glyph.name ] = rule.indexOf( glyph.char );
				});
				const has = {};  Object.keys( pos ).forEach( (key)=>{
					has[ key ] = (pos[ key ] >= 0);
				});


				if (has.curlyOpen || has.curlyClose || has.bracketOpen || has.bracketClose) {
					throw new Error(
						'Not implemented yet: "'
						+ rule
						+ '" in line '
						+ line.source
						+ ': '
						+ line.text
					);
				}

				if (has.comma) {
					return (
						rule
						.split( ',' )
						.map( sub_rule => parse_rule(sub_rule) )
					);
				}

				if (has.equals) {
					const parts = rule.split( '=' );

					if (parts.length != 2) throw new Error(
						'Too many equal signs: "'
						+ rule
						+ '" in line '
						+ line.source
						+ ': '
						+ line.text
					);

					return {
						token : parts[0],
						type  : parts[1],
					};
				}

				return {
					token: rule,
				}
			}
		});

		if (DEBUG.PARSE.TOKENS) {
			console.log( 'tokens:', tokens );
			console.log( '*'.repeat(79) );
		}


		// 4. Create rules for each group

		const new_rules = {};

		tokens.forEach( (token)=>{
			token.groups.forEach( (group)=>{
				add_rule( group, token );
			});
		});

		function add_rule (group, token) {
		}


		// 5. Done

		if (DEBUG.PARSE.SOURCE) {
			console.log( 'formatted_source:', '\n' + format_source(configuration) );
			console.log( '*'.repeat(79) );
		}

		return new_rules;

	} // parse_configuration


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getProtocolDescription = function (show_line_numbers) {
		return format_source( persistent_data.configuration, show_line_numbers );

	}; // getProtocolDescription


	this.parseConfiguration = parse_configuration;


	this.loadConfiguration = function (new_configuration) {
		persistent_data.configuration = new_configuration.trim();

		try {
			self.rules = parse_configuration( new_configuration );

		} catch (error) {
			color_log( COLORS.ERROR, 'ERROR:', error.message );
		}

	}; // loadConfiguration


	this.reloadConfiguration = function () {
		self.loadConfiguration( persistent_data.configuration );

	}; // reloadConfiguration



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Access.exit' );

		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'Access.init' );

		if (Object.keys( persistent_data ).length == 0) {
			persistent_data.configuration = null;
			persistent_data.rules = {};
		}

		self.loadConfiguration( PROTOCOL_DESCRIPTION );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const access = await new AccessControl();

}; // AccessControl


//EOF
