// config.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const DEBUG = {
	WINDOW_APP: !false,   // Reference DebugConsole instance under window.APP
	WEBSOCKET: {
		LOG_EVENTS   : !false,   // Log event objects of messages
		LOG_MESSAGES : !false,   // Log formatted messages to dev console
	},
	KEYBOARD_EVENTS : false,
	INSTANCES       : false,
	EVENTS          : false,
};

export const SETTINGS = {
	CONNECT_ON_START : location.href.indexOf('connect') >= 0,
	RELOAD_ON_UPDATE : true,

	WEBSOCKET: {
		MAX_RETRIES    : 100, //Number.POSITIVE_INFINITY,
		RETRY_INTERVAL : 1000,
		RETRY_TIMOUT   : 3000,
		HANDLE_PING    : true,
		HIDE_PING      : true,
		LOG_SLICE      : 60,
	},
};


export function log_event (caption, data) {
	if (!DEBUG.WEBSOCKET.LOG_EVENTS) return;
	console.groupCollapsed( caption );
	console.log( data );
	console.groupEnd();

} // log_event


//EOF
