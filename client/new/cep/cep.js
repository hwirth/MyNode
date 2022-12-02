// cep.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG, log_event } from './config.js';

import { Events        } from './events.js';
import { AutoWebSocket } from './websocket.js';
import { DebugTerminal } from './terminal/terminal.js';


const KNOWN_EVENTS = ['reload'];


export const ClientEndPoint = function (parameters = {}) {
	const self = this;

	if (DEBUG.WINDOW_APP) window.CEP = self;

	this.events;
	this.connection;
	this.terminal;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.reloadCSS = function  (file_name) {
		if (file_name.charAt(0) != '/') file_name = '/' + file_name;

		const head     = document.querySelector( 'head' );
		const selector = '[href^="' + file_name + '"]';
		const old_link = head.querySelector( selector );
		const new_link = document.createElement( 'link' );

		new_link.rel  = 'stylesheet';
		new_link.href = file_name + '?' + Date.now();
		new_link.type = 'text/css';

		head.appendChild( new_link );

		console.log( 'ClientEndPoint.reloadCSS():', file_name );

		new_link.addEventListener( 'load', ()=>{
		/*
			const message
			= 'Style sheet <a href="' + file_name
			+ '">client' + file_name
			+ '</a> reloaded.'
			;
			terminal.status.show( message , /*urgent* /true );
		*/
			if (old_link) old_link.parentNode.removeChild( old_link );
		});

	}; // reloadCSS


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.onWsMessage = function (message) {
		if (message.broadcast && (message.broadcast.type == 'reload/client')) {
			let do_reload = false;
			Object.keys( message.broadcast.reload ).forEach( (file_name)=>{//...! change protocol
				if (file_name.slice(-4) == '.css') {
					self.reloadCSS( file_name );
					self.events.emit( 'reload', 'css//...' );
				} else {
					do_reload |= (file_name.slice(-4) != '.css');
				}
			});
			if (do_reload) {
				self.events.emit( 'reload', 'client' );
				if (SETTINGS.RELOAD_ON_UPDATE) {
					setTimeout( ()=>location.reload(), 1500 );
					self.send( {chat:{say:'Reloading'}} );
				}
			}
		}
	}; // onMessage


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.connected = function () {
		return self.connection.connected();

	} // connected


	this.connect = function () {
		self.connection.connect();

	}; // connect


	this.disconnect = async function () {
		self.connection.disconnect();

	}; // connect


	this.send = function (request) {
		self.connection.send( request );

	};  // send


	this.toggleTerminal = async function () {
		if (!self.terminal) {
			self.terminal = await new DebugTerminal( self );
		} else {
			self.terminal.toggleVisibility();
		}
	}; // toggleTerminal


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		console.log( 'ClientEndPoint.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'ClientEndPoint.init' );

		//init_event_listeners( parameters.events );
		self.events     = await new Events( {known:KNOWN_EVENTS, events:parameters.events} );
		self.connection = await new AutoWebSocket( parameters.connection );

		self.connection.events.add( 'message', self.onWsMessage );
		//...self.connection( 'reload', self.onWsReload );


		document.documentElement.addEventListener( 'keydown', (event)=>{
			if ((event.key == 't') && !event.shiftKey && !event.ctrlKey && event.altKey) {
				event.preventDefault();
				self.toggleTerminal();
			}
		});

		const GET = new URLSearchParams( location.search.slice(1) );
		if (GET.has('terminal')) self.toggleTerminal();

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const cep = await new ClientEndPoint()

}; // ClientEndPoint


//EOF
