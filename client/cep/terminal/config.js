// config.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const SETTINGS = {
	WEBSOCKET: {
		URL: 'wss://spielwiese.central-dogma.at:1337',
	},

	CSS_FILE_NAME : '/cep/terminal/css/layout.css',
	CSS_VARS_NAME : '/cep/terminal/css/variables.css',

	CONNECT_ON_START     : location.href.indexOf('connect') >= 0,
	AUTO_APPEND_TAGS     : true,
	KEY_BEEP             : true,   // Turn off entirely, overrides PRESET
	MAIN_VOLUME          : 1.0,    //0..1
	SAM_ALWAYS_NEW       : !true,   // Reinstantiate SAM on every call, enabling MAIN_VOLUME
	ANIMATE_TRANSMISSION : true,   // Blink buttons/beam, when websocket data are sent or received

	KEEP_STATUS_CHARS : 'abcdefghijklmnopqrstuvwxyz0123456789 .,;:!?+-="\'*$%&/|\\()[<>]{}ßäöü~#_@€',

	TIMEOUT: {
		PING_CSS         : 200,
		RECONNECT        : 200,   //1000 ms
		STATUS_FADE      : 333,
		STATUS_SHOW      : 10000,   // Max. display time, max length 240 (status.js, rss.js)
		BUTTON_BLINK     : 200,     // See CSS: cep-terminal button.blink
		BEEP_IGNORE      : 100,
		BIT_ANSWER_COLOR : 200,
		BIT_ANSWER_SOUND : 270,
	},

	HIDE_MESSAGES: {
		PING : true,    // Being set, when the toggle is instantiated (See  PRESETS[] )
		CHAT : false,
	},
};

export const PRESETS = {
	FILTER: {
		PING      : !get( 'ping'      ),
		CEP       : !get( 'cep'       ),
		STRING    :  get( 'string'    ),
		NOTICE    :  get( 'notice'    ),
		BROADCAST : !get( 'broadcast' ),
		UPDATE    : !get( 'update'    ),
		REQUEST   : !get( 'request'   ),
		RESPONSE  : !get( 'response'  ),
	},

	TOGGLE: {
		TERMINAL   :  get( 'terminal'   ),
		STATUS     : !get( 'status'     ),
		FILTER     : !get( 'filter'     ),
		ALL_USERS  : !get( 'terminal'   ),
		SCROLL     : !get( 'scroll'     ),
		COMPACT    : !get( 'compact'    ),
		SEPARATORS :  get( 'separators' ),
		STRIPES    :! get( 'stripes'    ),
		OVERFLOW   : !get( 'overflow'   ),
		ANIMATE    :! get( 'animate'    ),
		BIT        :  get( 'bit'        ),
		FANCY      :  get( 'fancy'      ),
		BEEP       : !get( 'beep'       ),
		LAST       : !get( 'last'       ),
		SPEECH     : !get( 'speech'     ),
	},

	VOLUME: {
		SAM: 0.01,
	},
};
function get (search) {
	const decoded_uri = decodeURIComponent( location.href );
	if ((decoded_uri.indexOf( 'all' ) >= 0) && (search != 'separators')) return true;
	const result = search.split(' ').reduce( (prev, term)=>{
		return prev || (decoded_uri.indexOf( term ) >= 0);
	}, false);
	return result;
//... I'd prefer the main system to use &toggles=<comma separated list>, but that doesn't work with JS-free login
//... <form>s. This is still nice to use when testing and typing the URL in manually, perhaps I'll fix the main program
}


//EOF