// helpers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


export function isNumeric (string) {
	return !isNaN(parseFloat( string )) && isFinite( string );
} // isNumeric


export function wrapArray (string_or_array) {
	return (string_or_array instanceof Array) ? string_or_array : [string_or_array];

} // wrapArray


export function capitalize (string) {
	return string.charAt(0).toUpperCase() + string.slice(1);

} // capitalize


function format_error (string_error, extra_tabs = 0) {
	return string_error.split('\n').map( indent ).join('\n');

	function indent (line, index) {
		if ((extra_tabs === null) || (index == 0)) return line.charAt(0) == '\t' ? line.slice(1) : line;
		const indent = '\t'.repeat( SETTINGS.INDENT_ERRORS + extra_tabs );
		return indent + line.trim();
	}

} // format_error


function color_from_name (name) {
	function hue_to_rgb (p, q, t) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1/6) return p + (q - p) * 6 * t;
		if (t < 1/2) return q;
		if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;

	} // hue_to_rgb


	function dec_to_hex2 (dec) {
		const hex_digits = "0123456789abcdef";
		const hi_nibble  = (dec & 0xF0) >> 4;
		const lo_nibble  = (dec & 0x0F) >> 0;
		return hex_digits[hi_nibble] + hex_digits[lo_nibble];

	} // dec_to_hex2


	function hsl_to_html_color (h, s = 0.5, l = 0.5) {
		const q = (l < 0.5) ? (l * (1 + s)) : (l + s - l * s);
		const p = 2 * l - q;
		const r = hue_to_rgb(p, q, h + 1/3);
		const g = hue_to_rgb(p, q, h      );
		const b = hue_to_rgb(p, q, h - 1/3);

		return (
			'#'
			+ dec_to_hex2( Math.round(r * 255) )
			+ dec_to_hex2( Math.round(g * 255) )
			+ dec_to_hex2( Math.round(b * 255) )
		);

	} // hsl_to_html_color


	if (!name) return '#fff';

	const sum = name.split('').reduce( (sum, char) => (sum + char.charCodeAt(0)), 0 );
	const nr_colors = 16;
	const color = hsl_to_html_color( ((sum * 13) % nr_colors) / nr_colors, 0.8, 0.7 );
	return color;

	function rotl (byte, amount = 1) {
		byte = byte << amount;
		const overflow = byte >> 8;
		return byte & 0xFF & overflow;
	}

} // color_from_name


//EOF
