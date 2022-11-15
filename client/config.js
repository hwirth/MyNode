// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

function get (search) {
	return search.split(' ').reduce( (prev, term)=>{
		return prev || (location.href.indexOf( term ) >= 0);
	}, false);

} // get

export const DEBUG = {
	WEBSOCKET       : !false,
	KEYBOARD_EVENTS : false,

	HIDE_MESSAGES: {
		PING : true,
		CHAT : false,
	},
};

export const SETTINGS = {
	CONNECT_ON_START : location.href.indexOf('connect') >= 0,
	AUTO_APPEND_TAGS : true,
	KEYBOARD_BEEP    : true,   // Turn off entirely, see PRESETS
	HIDE_PINGPONG    : true,   // Don't log ping/pong messages to the dev console

	WEBSOCKET: {
		URL : 'wss://spielwiese.central-dogma.at:1337',
	},

	TIMEOUT: {
		CONNECTION_PING  : 500,
		RECONNECT        : 200,   //1000 ms
		BIT_ANSWER_COLOR : 200,
		BIT_ANSWER_SOUND : 270,
	},

	YOUTUBE: {
		VOLUME    : 3,
		AUTO_PLAY : !false,
		VIDEO_IDS : [
			"lzQ3IS1Xq2s",
			"KLLVXw335u4",
			"3be40pMfSas",
			"Mckcmh-OU5M",
			"lzXucw7xcE8",
			"3be40pMfSas",
		],
	},
};

export const PRESETS = {
	FILTER: {
		DEBUG     : true,   //... -> ALL, Currently: when false, only chat visible
		CEP       : true,
		STRING    : true,
		NOTICE    : true,
		BROADCAST : true,
		UPDATE    : true,
		REQUEST   : true,
		RESPONSE  : true,
	},

	TOGGLE: {
		TERMINAL      : get( 'terminal' ),
		COMPRESS      : !true,
		SEPARATORS    : false,
		OVERFLOW      : !true,
		ANIMATE       : !true,
		FANCY         : !false,
		KEYBOARD_BEEP : !false,
		TTS           : !false,
	},

	VOLUME: {
		SAM: 0.01,
	},
};


//EOF
