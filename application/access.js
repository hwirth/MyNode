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
	LINES        : !false,
	RULES        : !false,
	TOKENS       : !false,
	SOURCE       : !false,
	NEW_RULES    : !false,
};

const PROTOCOL_DESCRIPTION = (`
	connecting,guest,user,mod,admin,dev: session.status
	connecting: session.login.username=string,password=string
	guest,user,mod,admin,dev: session.logout
	guest,user,mod,admin,dev: session.who
	guest,user,mod,admin,dev: session.who.username=string
	user,mod,admin,dev: server.status
	mod,admin,dev: session.who.address=address+port
	mod,admin,dev: session.kick.address=address+port
	mod,admin,dev: session.kick.username=string
	admin,dev: server.status.persistent
	admin,dev: server.restart
	dev: server.log.*
	dev: test.*
	#some,groups: some.(complex.arg1,arg2=string),(more:string,(deeper.nested))
	#	{
	#		some: {
	#			complex: {
	#				arg1: empty,
	#				arg2: string,
	#			},
	#			more: string,
	#			deeper: {
	#				nested: empty,
	#			}
	#		}
	#	}
`); // PROTOCOL_DESCRIPTION


module.exports = function AccessControl (persistent_data, callbacks) {
	const self = this;

	this.rules;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function format_source (configuration, show_line_numbers = true) {
		const line_number        = (index) => (show_line_numbers ? (index + ': ') : '');
		const comments_removed   = line => line.split('#', 1)[0].trim();
		const line_numbers_added = (line, index) => { return line_number(index) + line };
		const empty_lines        = (line, index) => (line.length > line_number(index).length);
		return (
			configuration
			.trim().split( '\n' )
			.map( comments_removed )
			.map( line_numbers_added )
			.filter( empty_lines )
			.join( '\n' )
		);

	} // format_source


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PARSER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function parse_configuration (configuration) {

		function line_objects (configuration) {
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

		} // get_line_objects


		function groups_and_rules (line) {
			const pos_colon  = line.text.indexOf( ':' );
			const pos_equals = line.text.indexOf( '=' );

			const has_colon  = (pos_colon  >= 0);
			const has_equals = (pos_equals >= 0);

			if (! has_colon) {
				throw new Error(
					'No group in line '
					+ line.source
					+ ': '
					+ line.text
				);
			}

			const parts = line.text.split( ':', 2 );
			return {
				source : line.source,                    // 3.
				groups : parts[0].trim().split( ',' ),   // Comma
				rule   : parts[1].trim().split( '.' ),   // Period
			};

		} // get_groups_and_rules


		function get_rules (line) {
			const separators = [
				{ char: '=', name: 'equals'       },
				{ char: ',', name: 'comma'        },
				{ char: '|', name: 'pipe'         },
				{ char: '(', name: 'parensOpen'   },
				{ char: ')', name: 'parensClose'  },
				/*
				{ char: '[', name: 'bracketOpen'  },
				{ char: ']', name: 'bracketClose' },
				{ char: '{', name: 'curlyOpen'    },
				{ char: '}', name: 'curlyClose'   },
				*/
			];

			return {
				source : line.source,
				groups : line.groups,
				tokens : line.rule.map( rule => parse(rule) ),
			};

			function parse (rule) {
				const pos = {};  separators.forEach( (glyph)=>{
					pos[glyph.name] = rule.indexOf( glyph.char );
				});
				const has = {};  Object.keys( pos ).forEach( (key)=>{
					has[key] = (pos[key] >= 0);
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
						.map( sub_rule => parse(sub_rule) )
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

		} // get_rules


		// PARSER ENTRY POINT

		const rule_logs = [];

		const new_rules = {};
		const lines     = line_objects( configuration );
		const separated = lines.map( groups_and_rules );
		const rules     = separated.map( get_rules );

		rules.forEach( (rule)=>{
			rule.groups.forEach( (group)=>{
				if (! new_rules[group]) new_rules[group] = [];
				new_rules[group].push( rule.tokens );
			});
		});

		function add_rule (group, rule) {
			rule_logs.push( ()=>console.log( 'ADD RULE:', group, ':', rule.tokens ) );
		}


		// 5. Done

		if (DEBUG.PARSE.LINES) {
			console.log( 'lines:', lines );
			console.log( '*'.repeat(79) );
		}
		if (DEBUG.PARSE.RULES) {
			console.log( 'rules:', rules );
			console.log( '*'.repeat(79) );
		}
		if (DEBUG.PARSE.SOURCE) {
			console.log( 'formatted_source:', '\n' + format_source(configuration) );
			console.log( '*'.repeat(79) );
		}
		if (DEBUG.PARSE.TOKENS) {
			console.log( 'add_rule callbacks:' );
			rule_logs.forEach( callback => callback() );
			console.log( '*'.repeat(79) );
		}
		if (DEBUG.PARSE.NEW_RULES) {
			console.log( 'new_rules:' );
			console.log( new_rules );
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
			console.log( error );
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
