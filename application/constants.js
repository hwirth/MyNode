// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - WEBSOCKET SERVER - copy(l)eft 2022 - https://spielwiese.central-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const STATUS = {
	SUCCESS : true,
	FAILURE : false,
	NONE    : null,

}; // STATUS

module.exports.REASONS = {
	UNKNOWN_COMMAND             : 'Unknown command',
	INTERNAL_ERROR              : 'Internal error',
	TOKEN_ISSUED                : 'A new token has been issued',
	INSUFFICIENT_PERMS          : 'Insufficient permissions',
	PERSISTENCE_RESET           : 'Persistent data have been reloaded',
	INVALID_REQUEST             : 'Invalid request',
	INVALID_ADDRESS             : 'Invalid address',
	INVALID_USERNAME            : 'Invalid username',
	INVALID_PASSWORD            : 'Invalid password',
	INVALID_ADDRESS_OR_USERNAME : 'Invalid address or username',
	INVALID_NICKNAME            : 'Invalid nickname',
	NOT_LOGGED_IN               : 'Not logged in',
	ALREADY_LOGGED_IN           : 'Already logged in',
	SUCCESSFULLY_LOGGED_IN      : 'Logged in',
	SUCCESSFULLY_LOGGED_OUT     : 'Logged out',
	SUCCESSFULLY_AUTHENTICATED  : 'Authenticated',
	AUTHENTICATION_FAILED       : 'Invalid second factor',
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
	LOGIN_TIMEOUT        : 'Login timeout',
	IDLE_TIMEOUT         : 'Idle timeout',
	END_OF_LINE          : 'END OF LINE.',

}; // STRINGS


const ID_SERVER = 'END_OF_LINE';


module.exports.STATUS    = STATUS;
module.exports.STRINGS   = STRINGS;
module.exports.ID_SERVER = ID_SERVER;

//EOF
