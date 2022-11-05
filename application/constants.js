// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const RESULT = {
	SUCCESS : true,
	FAILURE : false,
	NONE    : null,

}; // RESULT

module.exports.REASONS = {
	UNKNOWN_COMMAND             : 'Unknown command',
	INTERNAL_ERROR              : 'Internal error',
	INSUFFICIENT_PERMS          : 'Insufficient permissions',
	INVALID_REQUEST             : 'Invalid request',
	INVALID_ADDRESS             : 'Invalid address',
	INVALID_USERNAME            : 'Invalid username',
	INVALID_ADDRESS_OR_USERNAME : 'Invalid address or username',
	BAD_USERNAME                : 'Invalid username',   //... Say "Connection failed" to increase security
	BAD_PASSWORD                : 'Invalid password',   //... Say "Connection failed"
	NOT_LOGGED_IN               : 'Not logged in',
	ALREADY_LOGGED_IN           : 'Already logged in',
	LOGIN_TIMED_OUT             : 'Login timeout',            //... Say "Connection failed"
	IDLE_TIMEOUT                : 'Idle timeout',
	SUCCESSFULLY_LOGGED_IN      : 'Logged in',
	SUCCESSFULLY_LOGGED_OUT     : 'Logged out',
	KICKED_USER                 : 'Kicked user NAME, address: ADDRESS',
	KICKED_BY                   : 'Kicked by',
	USERNAME_UNKNOWN            : 'User NAME unknown',
	MALFORMED_REQUEST           : 'Malformed request',

}; // RESPONSES


const STRINGS = {
	GLOBAL_ERROR_HANDLER : 'GLOBAL ERROR HANDLER:',
	SYSTEM_ERROR         : 'SYSTEM FAILURE:',
	RESTARTING_SERVER    : 'THE SYSTEM IS GOING DOWN FOR A RESTART',
	YOU_SHOULDNT_HAVE    : "YOU SHOULDN'T HAVE COME BACK, FLYNN",
	END_OF_LINE          : 'END OF LINE.',

}; // STRINGS


const ID_SERVER = {
	MCP: STRINGS.END_OF_LINE,
};


module.exports.RESULT    = RESULT;
module.exports.STRINGS   = STRINGS;
module.exports.ID_SERVER = ID_SERVER;

//EOF
