// client.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );

const { REASONS, STATUS, STRINGS, ID_SERVER } = require( './constants.js' );


module.exports = function WebSocketClient (socket, client_address, callback) {
	const self = this;

	this.address;
	this.idleSince;
	this.maxIdleTime;
	this.login;
	this.pingNr;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// TIMEOUTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const timeouts = {};

	function set_timeout (name, on_timeout, delay_ms) {
		if ((name == 'idle') && (timeouts.login)) return;

		clear_timeout( name );

		if (delay_ms) {
			timeouts[name] = setTimeout( on_timeout, delay_ms );
		}

	} // set_timeout


	function clear_timeout (name) {
		if (timeouts[name]) {
			clearTimeout( timeouts[ name ] );
			delete timeouts[name];
/*//...
			if (self.maxIdleTime && (name == 'login')) {
				set_timeout( 'idle' , on_idle_timeout , self.maxIdleTime );
			}
*/
		}

	} // clear_timeout


	function on_login_timeout () {
		color_log( COLORS.WARNING, 'WebSocketClient-on_login_timeout:', client_address );
		self.send({ notice: STRINGS.LOGIN_TIMEOUT });
		self.closeSocket();

	} // on_login_timeout


	function on_idle_timeout () {
		color_log( COLORS.WARNING, 'WebSocketClient-on_idle_timeout:', client_address );
		self.send({ notice: STRINGS.IDLE_TIMEOUT });
		self.closeSocket();

	} // on_idle_timeout


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


// CONNECTION AND MESSAGES ///////////////////////////////////////////////////////////////////////////////////////119:/

	this.send = function (message, request_id) {
		if (request_id && (typeof message != 'string')) message.request = request_id.request;

		if (request_id) message.command = request_id.command;

		if (DEBUG.MESSAGE_OUT) color_log(
			COLORS.SESSION,
			'WebSocketClient-send:',
			message,
		);

		if (typeof message != 'string') {
			message = JSON.stringify( message, null, '\t' );
		}

		if (socket.send) socket.send( message );

	}; // send


	this.respond = function (status, request_id, result) {
		self.send({
			response: {
				type     : request_id.command,
				time     : Date.now(),
				tag      : request_id.tag || null,
				request  : request_id.request,
				success  : status,
				message  : result,
			},
		});

	}; // respond


	this.broadcast = function (message, request_id = {}) {
		if (request_id && (typeof message != 'string')) message.request = request_id.request;

		if (!self.login) {
			self.respond( STATUS.FAILURE, null, REASONS.INSUFFICIENT_PERMS );
			return;
		}

		message.tag      = request_id.tag,
		message.request  = request_id.request,
		message.command  = request_id.command,
		message.userName = (self.login) ? self.login.userName : null;
		message.nickName = (self.login) ? self.login.nickName : null;
		callback.broadcast( message );

	}; // broadcast


	this.closeSocket = function () {
		return new Promise( (done)=>{
			setTimeout( ()=>{
				socket.close();
				self.exit().then( done );

			}, SETTINGS.TIMEOUT.SOCKET_CLOSE );
		});

	}; // closeSocket


// OTHER METHODS /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.setIdleTime = function (new_idle_time = SETTINGS.TIMEOUT.LOGIN) {
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


	this.inGroup = function (...groups) {
		if (!self.login) return false;

		const in_at_least_one = (previous, group)=>{
			return previous || (self.login.groups.indexOf(group) >= 0);
		}

		return [...groups].reduce( in_at_least_one, /*initialValue*/false );

	}; // inGroup


	this.sendPing = function () {
		self.send({
			advisory: {
				type: 'ping',
				pong: ++self.pingNr,
			}
		});

	}; // sendPing


	this.receivePong = function () {
		set_timeout( 'ping', self.sendPing, SETTINGS.TIMEOUT.PING_INTERVAL );

	}; // receivePong


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'WebSocketClient.exit' );

		Object.keys( timeouts ).forEach( (name)=>{
			clear_timeout( name );
		});

		return Promise.resolve();

	}; // exit


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'WebSocketClient.init' );

		self.address     = client_address;
		self.idleSince   = Date.now();
		self.maxIdleTime = SETTINGS.TIMEOUT.IDLE;
		self.login       = false;

		set_timeout( 'login', on_login_timeout, SETTINGS.TIMEOUT.LOGIN );

		self.pingNr = 0;
		self.receivePong();

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const client = await new WebSocketClient();

}; // WebSocketClient


//EOF
