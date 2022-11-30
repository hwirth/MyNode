// config.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const DEBUG = {
	WINDOW_APP      : !false,   // Reference DebugConsole instance under window.APP
	WEBSOCKET       : !false,
	KEYBOARD_EVENTS : false,
};

export const SETTINGS = {
	CONNECT_ON_START     : location.href.indexOf('connect') >= 0,

	WEBSOCKET: {
		MAX_RETRIES    : 35,
		RETRY_INTERVAL : 1000,
		HIDE_PING      : true,
		LOG_MESSAGES   :!false,
		LOG_SLICE      : 60,
		RESET_RETRIES  : true,   // When the server closes connection, do we retry endlessly?
	},
};


export function log_event (caption, data) {
	if (!DEBUG.WEBSOCKET) return;
	console.groupCollapsed( caption );
	console.log( data );
	console.groupEnd();

} // log_event


//EOF
