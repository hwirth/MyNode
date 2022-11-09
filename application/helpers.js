// helpers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

const { SETTINGS        } = require( '../server/config.js' );
const { DEBUG, COLORS   } = require( '../server/debug.js' );
const { color_log, dump } = require( '../server/debug.js' );


function format_error (error) {
	return error.stack.replace( new RegExp(SETTINGS.BASE_DIR, 'g'), '' );

} // format_error


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EXPORTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

module.exports = {
	formatError : format_error,

} // module.exports


//EOF
