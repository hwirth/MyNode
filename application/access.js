// access.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { STATUS, REASONS } = require( './constants.js' );

const PROTOCOL_DESCRIPTION = (`
	connected: {session:{login:{username:literal=guest}}}
	connected: {session:{login:{username:literal=guest,nickname:string}}}
	connected: {session:{login:{username:string,password:string}}}
	connected: {session:{login:{username:string,password:string,factor2:string}}}
	connected: {session:{login:{username:string,nickname:string,password:string}}}
	connected: {session:{login:{username:string,nickname:string,password:string,factor2:string}}}
	connected,guest,user,mod,admin,dev,owner: {help:*}
	connected,guest,user,mod,admin,dev,owner: {session:{status:empty}}
	guest,user,mod,admin,dev,owner: {session:{who:empty}}
	guest,user,mod,admin,dev,owner: {session:{who:{username:string}}}
	guest,user,mod,admin,dev,owner: {chat:{nick:string}}
	guest,user,mod,admin,dev,owner: {chat:{say:string}}
	mod,admin,dev,owner: {chat:{html:string}}
	mod,admin,dev,owner: {session:{who:{address:address}}}
	mod,admin,dev,owner: {session:{kick:{username:string}}}
	mod,admin,dev,owner: {session:{who:{address:address}}}
	admin,dev,owner: {mcp:{token:empty}}
	admin,dev,owner: {server:{reset:empty}}
	admin,dev,owner: {server:{reboot:empty}}
	dev,owner: {access:{rules:{list:empty}}}
	dev,owner: {access:{rules:{list:{number:number}}}}
	dev,owner: {access:{rules:{list:{user:string}}}}
	dev,owner: {access:{rules:{list:{group:string}}}}
	dev,owner: {mcp:{status:empty}}

`); // PROTOCOL_DESCRIPTION


module.exports = function AccessControl (persistent, callback, meta) {
	const self = this;
	const RULE = meta.addRule;
	const HELP = meta.addHelp;

	this.rules;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RULE PARSERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function format_source (configuration, show_line_numbers = true) {
		const comments_removed   = line  => line.split('#', 1)[0].trim();
		const empty_lines        = line  => (line.length > 0);
		const line_number        = index => (show_line_numbers ? (index + ': ') : '');
		const line_numbers_added = (line, index) => { return line_number(index) + line };
		return (
			configuration
			.trim().split( '\n' )
			.map( comments_removed )
			.filter( empty_lines )
			.map( line_numbers_added )
			.join( '\n' )
		);

	} // format_source


	function stringify_configuration (rules) {
		return Object.keys( rules ).map( (key)=>{
			const rule = rules[key];
			const groups = rule.groups.join( ',' );
			const syntax = (
				JSON.stringify( rule.syntax )
				.replace( /"/g  , '' )
				.replace( /\[/g , '' )
				.replace( /\]/g , '' )
			);

			return groups + ': ' + syntax;

		}).join('\n');

	} // stringify_configuration


	function parse_configuration (configuration) {
		const groups = ['connected', 'guest', 'user', 'mod', 'admin', 'dev', 'owner'];

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
				const syntax = line.text.slice( groups.length + 1 ).trim();
				return {
					groups : groups.trim().split( ',' ),
					syntax : parse_syntax( line.source, syntax ),
				};
			})
		);

		function parse_syntax (source, syntax) {
			const json = (
				syntax
				.replace( /\{/g  , '{"'  )  // Regex chars: . \ + * ? [ ^ ] $ ( ) { } = ! < > | : -
				.replace( /\}/g  , '"}'  )
				.replace( /\:/g  , '":"' )
				.replace( /,/g   , '","' )
				.replace( /"\{/g , '{'   )
				.replace( /\}"/g , '}'   )
			);

			const types = ['empty', '*', 'address', 'string', 'number', 'boolean', 'literal=guest'];
			function check_syntax (obj) {
				Object.keys( obj ).forEach( (property)=>{
					if (typeof obj[property] == 'object') {
						check_syntax( obj[property] );
					} else {
						if (types.indexOf( obj[property] ) < 0) {
							throw new Error( 'Unknown type "' + obj[property] + '"' );
						}
					}
				});

				return obj;
			}

			try {
				return check_syntax( JSON.parse( json ) );

			} catch (error) {
				DEBUG.log( COLORS.ERROR, 'parse_rule:', source, syntax );
				throw new Error( error.message + ' in rule ' + source + '\n' + syntax );
				return null;
			}

		} // parse_syntax

	} // parse_configuration


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// VERIFY
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function verify_request (client, request) {
	} // verify_request


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

// RULES /////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
HELP( 'rules', 'Request available protocols' );

RULE( 'guest,user,mod,admin,dev,owner: {access:{rules:empty}}' );
RULE( 'guest,user,mod,admin,dev,owner: {access:{rules:{grouped:empty}}}' );
RULE( 'admin,dev,owner: {access:{rules:{all:empty}}}' );
RULE( 'admin,dev,owner: {access:{rules:{description:empty}}}' );

	this.request.rules = function (client, parameters) {
		if (parameters.grouped) {
			return { result: self.getClientRulesGrouped(client) };
		}
		else if (parameters.all) {
			return { result: self.rules };
		}
		else if (parameters.description) {
			return { result: self.getProtocolDescription().split('\n') };
		}
		else {
			return { result: self.getClientRules(client) };
		}

	}; // rules


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

// CLIENT RULES //////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function find_rules (group_name) {
		const match  = rule => rule.groups.indexOf(group_name) >= 0;
		const syntax = rule => (
			JSON.stringify( rule.syntax )
			.replaceAll('"', '')
			.replaceAll(':{', '.')
			.replaceAll('{', '')
			.replaceAll('}', '')
		);
		const found_rules = self.rules.filter( match ).map( syntax );
		return { [group_name]: found_rules };
	}

	this.getClientRulesGrouped = function (client) {
		const combine = (prev, group)=>({...prev, ...group});
		return client.getGroups().map( find_rules ).reduce( combine, {} );

	}; // getClientRules


	this.getClientRules = function (client) {
		const combine = (prev, group)=>({...prev, ...group});
		const result  = client.getGroups().map( find_rules ).reduce( combine, {} );

		// Filter duplicates
		const all_combined = new Set();
		Object.values( result ).forEach( (rules)=>{
			rules.forEach( rule => all_combined.add(rule) );
		});

		return { result: Array.from( all_combined ) };

	}; // getClientRules


// PROTOCOL //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.getProtocolDescription = function () {
		return stringify_configuration( self.rules );

	}; // getProtocolDescription


	this.parseConfiguration = parse_configuration;


	this.loadConfiguration = function (configuration) {
		const source      = format_source( configuration, /*show_line_numbers*/false );
		const parsed      = parse_configuration( source );
		const stringified = stringify_configuration( parsed );

		if (stringified !== source) {
			throw new Error( 'Syntax error in configuration' );
		}

		self.rules = parsed;

	}; // loadConfiguration


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'Access.exit' );

		return Promise.resolve();

	}; // exit


	this.reset = function () {
		if (DEBUG.RESET) DEBUG.log( COLORS.INSTANCES, 'Access.reset' );
		const configuration = callback.getMeta().rules.join('\n');
		self.loadConfiguration( configuration );

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) DEBUG.log( COLORS.INSTANCES, 'Access.init' );
		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const access = await new AccessControl();

}; // AccessControl


//EOF
