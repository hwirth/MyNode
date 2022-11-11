// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

export const DEBUG = {
	WEBSOCKET       : !false,
	KEYBOARD_EVENTS : false,

	HIDE_MESSAGES: {
		PING : true,
		CHAT : true,
	},
};

export const SETTINGS = {
	WS_URL           : 'wss://spielwiese.central-dogma.at:1337',
	CONNECT_ON_START : location.href.indexOf('connect') >= 0,
	AUTO_APPEND_TAGS : true,

	TIMEOUT: {
		RECONNECT : 200,   //1000 ms
	},

	KEYBOARD_BEEP : true,

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
	ANIMATIONS    : !true,
	COMPRESSED    : true,
	FANCY         : true,
	KEYBOARD_BEEP : true,
	SEPARATORS    : false,
	SAM           : true,
	TERMINAL      : location.href.indexOf('terminal') >= 0,
};

//EOF
