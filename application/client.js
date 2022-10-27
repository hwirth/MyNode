// client.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS      } = require( '../server/config.js' );
const { DEBUG, COLORS } = require( '../server/debug.js' );
const { color_log     } = require( '../server/debug.js' );
const { REASONS       } = require( './constants.js' );


module.exports = function WebSocketClient (socket, client_address) {
	const self = this;

	this.address;
	this.idleSince;
	this.maxIdleTime;
	this.login;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function send_as_json (socket, data) {
		const stringified_json = JSON.stringify( data, null, '\t' );

		if (DEBUG.MESSAGE_OUT) color_log(
			COLORS.SESSION,
			'WebSocketClient-send_as_json:',
			JSON.parse( stringified_json ),
		);

		if (socket.send) socket.send( stringified_json );

	} // send_as_json //... Redundant with same function in  Protocols()


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TIMEOUTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const timeouts = {};

	function set_timeout (name, on_timeout, delay_ms) {
		if ((name == 'idle') && (timeouts.login)) return;

		clear_timeout( name );

		if (delay_ms) {
			timeouts[ name ] = setTimeout( on_timeout, delay_ms );
		}

	} // set_timeout


	function clear_timeout (name) {
		if (timeouts[ name ]) {
			clearTimeout( timeouts[ name ] );
			delete timeouts[ name ];

			if (name == 'login') {
				set_timeout( 'idle' , on_idle_timeout , self.maxIdleTime );
			}
		}

	} // clear_timeout


	function on_login_timeout () {
		color_log( COLORS.WARNING, 'WebSocketClient-on_login_timeout:', client_address );
		self.reportFailure( 'session', 'login', REASONS.LOGIN_TIMED_OUT );
		self.closeSocket();

	} // on_login_timeout


	function on_idle_timeout () {
		color_log( COLORS.WARNING, 'WebSocketClient-on_idle_timeout:', client_address );
		self.reportFailure( 'session', 'activity', REASONS.IDLE_TIMEOUT );
		self.closeSocket();

	} // on_idle_timeout


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


// CONNECTION AND MESSAGES ///////////////////////////////////////////////////////////////////////////////////////119:/

	this.send = function (message) {
		send_as_json( socket, message );

	}; // send


	this.closeSocket = function () {
		return new Promise( (done)=>{
			setTimeout( ()=>{
				socket.close();
				self.exit().then( done );

			}, SETTINGS.TIMEOUT.SOCKET_CLOSE );
		});

	}; // closeSocket


	this.reportSuccess = function (protocol, command, reason, status = true) {
		self.send({
			session: {
				[command]: {
					success   : status,
					reason    : reason,
				},
			},
		});

	}; // reportSuccess


	this.reportFailure = function (protocol, command, reason) {
		self.reportSuccess( protocol, command, reason, false );

	} // respond_failure


// OTHER METHODS /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.setIdleTime = function (new_idle_time) {
		self.maxIdleTime = new_idle_time;
		set_timeout( 'idle', on_idle_timeout, self.maxIdleTime );

	}; // setIdleTime


	this.clearLoginTimeout = function () {
		clear_timeout( 'login' );

	}; // clearLoginTimeout


	this.registerActivity = function () {
		self.idleSince = Date.now();
		set_timeout( 'idle', on_idle_timeout, self.maxIdleTime );

	}; // registerActivity


	this.inGroup = function (group) {
		return self.login && (self.login.groups.indexOf( group ) >= 0);

	}; // send


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		Object.keys( timeouts ).forEach( (name)=>{
			clear_timeout( name );
		});

		return Promise.resolve();

	}; // exit


	this.init = function () {
		self.address     = client_address;
		self.idleSince   = Date.now();
		self.maxIdleTime = SETTINGS.TIMEOUT.IDLE;
		self.login       = false;

		set_timeout( 'login', on_login_timeout, SETTINGS.TIMEOUT.LOGIN );

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const client = await new WebSocketClient();

}; // WebSocketClient


//EOF