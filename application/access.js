// access.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );
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
	guest,user,mod,admin,dev,owner: {chat:{say:string}}
	guest,user,mod,admin,dev,owner: {chat:{nick:string}}
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


module.exports = function AccessControl (persistent, callback) {
	const self = this;

	this.rules;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PARSER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
				color_log( COLORS.ERROR, 'parse_rule:', source, syntax );
				throw new Error( error.message + ' in rule ' + source );
				return null;
			}

		} // parse_syntax

	} // parse_configuration


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

	}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// VERIFY
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function verify_request (client, request) {
		return self.rules.find( (rule)=>{

		});

	} // verify_request


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// REQUEST HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.request = {};

	this.request.rules = function (client, request_id, parameters) {
		const command = Object.keys( parameters )[0];

		switch (command) {
			case 'list': {
				const switches = (typeof parameters.list == 'string') ? null : parameters.list;
				client.respond( STATUS.SUCCESS, request_id, switches );
			}
		}
	};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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

		persistent.configuration = source;
		self.rules = parsed;

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
