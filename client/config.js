// debug_console.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { get } from './helpers.js';


export const DEBUG = {
	WINDOW_APP      : !false,   // Reference DebugConsole instance under window.APP
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
	KEY_BEEP         : true,   // Turn off entirely, see PRESETS
	HIDE_PINGPONG    : true,   // Don't log ping/pong messages to the dev console
	MAIN_VOLUME      : 1.0,    //0..1
	SAM_ALWAYS_NEW   : !true,   // Reinstantiate SAM on every call, enabling MAIN_VOLUME

	WEBSOCKET: {
		URL       : 'wss://spielwiese.central-dogma.at:1337',
		LOG_SLICE : 60,
	},

	TIMEOUT: {
		PING_CSS         : 100,
		RECONNECT        : 200,   //1000 ms
		STATUS_FADE      : 250,
		STATUS_SHOW      : 6000,
		BEEP_IGNORE      : 100,
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
		CHAT      : !get( 'debug' ),   //... -> ALL, Currently: when true, only chat visible
		CEP       : false,
		STRING    : false,
		NOTICE    : false,
		BROADCAST : true,
		UPDATE    : true,
		REQUEST   : true,
		RESPONSE  : true,
	},

	TOGGLE: {
		TERMINAL   : get( 'terminal' ),
		SCROLL     : !get( 'scroll' ),
		COMPACT    : !get( 'compact' ),
		SEPARATORS : get( 'separators' ),
		STRIPES    : get( 'stripes' ),
		OVERFLOW   : !get( 'overflow' ),
		ANIMATE    : !get( 'animate' ),
		BIT        : !get( 'bit' ),
		FANCY      : get( 'fancy' ),
		KEY_BEEP   : get( 'keybeep' ),
		LAST       : !get( 'last' ),
		TTS        : !get( 'tts' ),
	},

	VOLUME: {
		SAM: 0.01,
	},
};


//EOF
