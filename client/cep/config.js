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
	FONTS           : !false,    // Show font changes
};

export const SETTINGS = {
	CSS_FILE_NAME : '/terminal/layout.css',
	CSS_VARS_NAME : '/terminal/variables.css',

	CONNECT_ON_START     : location.href.indexOf('connect') >= 0,
	AUTO_APPEND_TAGS     : true,
	KEY_BEEP             : true,   // Turn off entirely, see PRESETS
	MAIN_VOLUME          : 1.0,    //0..1
	SAM_ALWAYS_NEW       : !true,   // Reinstantiate SAM on every call, enabling MAIN_VOLUME
	ANIMATE_TRANSMISSION : true,   // Blink buttons/beam, when websocket data are sent or received

	KEEP_STATUS_CHARS : 'abcdefghijklmnopqrstuvwxyz0123456789 .,;:!?+-="\'*$%&/|\\()[<>]{}ßäöü~#_@€',

	WEBSOCKET: {
		URL       : 'wss://spielwiese.central-dogma.at:1337',
		LOG_SLICE : 60,
	},

	TIMEOUT: {
		PING_CSS         : 100,
		RECONNECT        : 200,   //1000 ms
		STATUS_FADE      : 333,
		STATUS_SHOW      : 10000,   // Max. display time, max length 240 (status.js, rss.js)
		BEEP_IGNORE      : 100,
		BIT_ANSWER_COLOR : 200,
		BIT_ANSWER_SOUND : 270,
	},

	HIDE_MESSAGES: {
		PING : true,    // Being set, when the toggle is instantiated (See  PRESETS[] )
		CHAT : false,
	},

	RELOAD_FOLDER: {
		TERMINAL : false,
	},
};

export const PRESETS = {
	FILTER: {
		PING      : true,
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
		ALL_USERS  : !get( 'terminal' ),
		SCROLL     : !get( 'scroll' ),
		COMPACT    : !get( 'compact' ),
		SEPARATORS : get( 'separators' ),
		STRIPES    : get( 'stripes' ),
		OVERFLOW   : !get( 'overflow' ),
		ANIMATE    : get( 'animate' ),
		BIT        : !get( 'bit' ),
		FANCY      : get( 'fancy' ),
		KEY_BEEP   : get( 'keybeep' ),
		LAST       : !get( 'last' ),
		TTS        : get( 'tts' ),
	},

	VOLUME: {
		SAM: 0.01,
	},
};


//EOF
