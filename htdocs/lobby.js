// lobby.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export const Lobby = function () {
	const self = this;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_markup () {
		return (`
<form>
	<label>
		<div class="caption">User name</div>
		<div class="combined">
			<input type="text" placeholder="Choose a name">
			<button>Log in</button>
		</div>
	</label>
</form>
		`);
	}

	this.init = function () {
		const article = document.querySelector( 'article' );
		article.className = 'lobby';
		article.innerHTML = create_markup();

		const form = document.querySelector( 'article form' );
		form.addEventListener( 'submit', (event)=>{
			event.preventDefault();
		});

		const input = document.querySelector( 'article input' );
		input.focus();

		const button = document.querySelector( 'article button' );
		button.addEventListener( 'click', ()=>{
			const style = document.querySelector( 'link[href="spielwiese.css"]' );
			if (style) {
				style.parentElement.removeChild( style );
			} else {
				const new_style = document.createElement( 'link' );
				new_style.setAttribute( 'rel', 'stylesheet' );
				new_style.setAttribute( 'type', 'text/css' );
				new_style.setAttribute( 'href', 'spielwiese.css' );
				document.querySelector( 'head' ).appendChild( new_style );
			}
		});

	}; // init


	self.init();

}; // Lobby


//EOF