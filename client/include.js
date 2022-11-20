// include.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

init();

function GET (search) {
	if ((location.href.indexOf( 'all' ) >= 0) && (search != 'separators')) return true;
	return search.split(' ').reduce( (prev, term)=>{
		return prev || (location.href.indexOf( term ) >= 0);
	}, false);

}

function init () {
	console.log( 'include.js: reload' );
	addEventListener( 'dblclick', ()=>location.reload() );

	if (GET('included')) addEventListener( 'load', ()=>{
		document.querySelector( 'html' ).classList.add( 'included' );
/*
		document.querySelectorAll( 'article' ).forEach( (article, index)=>{
			article.classList.toggle( 'hidden', index > 0 );
		});
*/
	});

	if( (location.href.indexOf( '#' ) < 0)
	||  (location.href.indexOf( '#recent' ) >= 0)
	) {
		location.href = (
			location.href
			+ '#'
			+ document.querySelector( 'body > [id]' ).id

		).replace( '#recent', '' );
	} else {
		addEventListener( 'load', ()=>document.body.classList.add('has_target') );
	}

	console.log( location.href );
}

//EOF
