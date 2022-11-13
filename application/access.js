// access.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
const { REASONS         } = require( './constants.js' );


const PROTOCOL_DESCRIPTION = (`
	connecting: {session:{login:{username:literal=guest}}}
	connecting: {session:{login:{username:literal=guest,nickname:string}}}
	connecting: {session:{login:{username:string,password:string}}}
	connecting: {session:{login:{username:string,password:string,secondFactor:string}}}
	connecting: {session:{login:{username:string,nickname:string,password:string}}}
	connecting: {session:{login:{username:string,nickname:string,password:string,secondFactor:string}}}
	connecting,guest,user,mod,admin,dev,owner: {help:*}
	connecting,guest,user,mod,admin,dev,owner: {session:{status:empty}}
	guest,user,mod,admin,dev,owner: {session:{who:empty}}
	guest,user,mod,admin,dev,owner: {session:{who:{username:string}}}
	guest,user,mod,admin,dev,owner: {chat:{say:string}}
	guest,user,mod,admin,dev,owner: {chat:{nick:string}}
	mod,admin,dev,owner: {session:{who:{address:address}}}
	mod,admin,dev,owner: {session:{kick:{username:string}}}
	mod,admin,dev,owner: {session:{who:{address:address}}}
	admin,dev,owner: {mcp:{token:empty}}
	admin,dev,owner: {server:{reset:empty}}
	admin,dev,owner: {server:{reboot:empty}}
	dev,owner: {mcp:{status:empty}}

`); // PROTOCOL_DESCRIPTION


module.exports = function AccessControl (persistent, callback) {
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
		const groups = ['connecting', 'guest', 'user', 'mod', 'admin', 'dev', 'owner'];

		const without_comments = line => line.split('#', 1)[0].trim();
		const to_objects       = (line, index) => { return {source: index, text: line}; };
		const empty_lines      = lineMeta => (lineMeta.text.trim() != '');

		return (
			configuration
			.trim().split( '\n' )
			.map( without_comments )
			.map( to_objects )
			.filter( empty_lines )
			.map( (line)=>{
				const groups = line.text.split( ':', 1 )[0];
				const rule = line.text.slice( groups.length + 1 ).trim();
				return {
					groups : groups.trim().split( ',' ),
					rule   : parse_rule( line.source, rule ),
				};
			})
		);

		function parse_rule (source, rule) {
			const json = (
				rule
				.replace( /\{/g  , '{"'  )  // Regex chars: . \ + * ? [ ^ ] $ ( ) { } = ! < > | : -
				.replace( /\}/g  , '"}'  )
				.replace( /\:/g  , '":"' )
				.replace( /,/g   , '","' )
				.replace( /"\{/g , '{'   )
				.replace( /\}"/g , '}'   )
			);

			const types = ['empty', '*', 'address', 'string', 'number', 'boolean', 'literal=guest'];
			function check_rules (obj) {
				Object.keys( obj ).forEach( (property)=>{
					if (typeof obj[property] == 'object') {
						check_rules( obj[property] );
					} else {
						if (types.indexOf( obj[property] ) < 0) {
							throw new Error( 'Unknown type "' + obj[property] + '"' );
						}
					}
				});

				return obj;
			}

			try {
				return check_rules( JSON.parse( json ) );

			} catch (error) {
				color_log( COLORS.ERROR, 'parse_rule:', source, rule );
				throw new Error( error.message + ' in rule ' + source );
				return null;
			}

		} // parse_rule

	} // parse_configuration


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getProtocolDescription = function (show_line_numbers) {
		return format_source( persistent.configuration, show_line_numbers );

	}; // getProtocolDescription


	this.parseConfiguration = parse_configuration;


	this.loadConfiguration = function (new_configuration) {
		persistent.configuration = new_configuration.trim();
		self.rules = parse_configuration( new_configuration );

	}; // loadConfiguration


	this.reloadConfiguration = function () {
		self.loadConfiguration( persistent.configuration );

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

		if (Object.keys( persistent ).length == 0) {
			persistent.configuration = null;
			persistent.rules = {};
		}

		self.loadConfiguration( PROTOCOL_DESCRIPTION );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const access = await new AccessControl();

}; // AccessControl


//EOF
