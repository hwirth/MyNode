// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

module.exports.RESULT = {
	SUCCESS : true,
	FAILURE : false,
	NONE    : null,
};

module.exports.ID_SERVER = {
	server: {
		Xstatus: true,
	},
};

module.exports.REASONS = {
	UNKNOWN_COMMAND             : 'Unknown command',
	INTERNAL_ERROR              : 'Internal error',
	INSUFFICIENT_PERMS          : 'Insufficient permissions',
	INVALID_ADDRESS             : 'Invalid address',
	INVALID_USERNAME            : 'Invalid username',
	INVALID_ADDRESS_OR_USERNAME : 'Invalid address or username',
	BAD_USERNAME                : 'Invalid username',   //... Say "Connection failed" to increase security
	BAD_PASSWORD                : 'Invalid password',   //... Say "Connection failed"
	NOT_LOGGED_IN               : 'Not logged in',
	ALREADY_LOGGED_IN           : 'Already logged in',
	LOGIN_TIMED_OUT             : 'Timeout',            //... Say "Connection failed"
	IDLE_TIMEOUT                : 'Timeout',
	SUCCESSFULLY_LOGGED_IN      : 'Logged in',
	SUCCESSFULLY_LOGGED_OUT     : 'Logged out',
	KICKED_USER                 : 'Kicked user NAME, address: ADDRESS',
	KICKED_BY                   : 'Kicked by',
	USERNAME_UNKNOWN            : 'User NAME unknown',

}; // RESPONSES


//EOF
