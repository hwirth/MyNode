// helpers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

export const GET = new URLSearchParams( location.search.slice(1) );
//...!
export function get (search) {
	const decoded_uri = decodeURIComponent( location.href );
	if ((decoded_uri.indexOf( 'all' ) >= 0) && (search != 'separators')) return true;
	const result = search.split(' ').reduce( (prev, term)=>{
		return prev || (decoded_uri.indexOf( term ) >= 0);
	}, false);

	return result;

}


//EOF
