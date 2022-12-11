export function isNumeric (string) {
	return !isNaN(parseFloat( string )) && isFinite( string );
}
