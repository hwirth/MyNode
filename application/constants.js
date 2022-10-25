// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

module.exports.REASONS = {
	UNKNOWN_COMMAND             : 'Unknown command',
	INTERNAL_ERROR              : 'Internal error',
	INSUFFICIENT_PERMS          : 'Insufficient permissions',
	INVALID_ADDRESS             : 'Invalid address',
	INVALID_USERNAME            : 'Invalid username',
	INVALID_ADDRESS_OR_USERNAME : 'Invalid address or username',
	ALREADY_LOGGED_IN           : 'Already logged in',
	BAD_USERNAME                : 'Invalid username',   //... Say "Connection failed" to increase security
	BAD_PASSWORD                : 'Invalid password',   //... Say "Connection failed"
	LOGIN_TIMED_OUT             : 'Timeout',            //... Say "Connection failed"
	IDLE_TIMEOUT                : 'Timeout',
	NOT_LOGGED_IN               : 'Not logged in',
	SUCCESSFULLY_LOGGED_IN      : 'Logged in',
	KICKED_USER                 : 'Kicked user',
	KICKED_BY                   : 'Kicked by ',

}; // RESPONSES


//EOF
