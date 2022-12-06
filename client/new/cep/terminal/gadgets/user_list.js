	this.updateWhoList = function (users_online, full_name = null) {
		const list  = terminal.elements.navWho;
		if (users_online !== true) list.innerHTML = '';
		if (users_online === null) return;

		if (!full_name) full_name = terminal.elements.btnCEP.innerText;

if (terminal.elements.navWho.querySelectorAll( 'button' ).length == 0) for(let i = 0; i < 1; ++i) {
const button = document.createElement( 'button' );
button.className = 'enabled room';
button.innerText = 'Public Room';
list.appendChild( button );
}
		if (users_online !== true) {
			Object.keys( users_online ).forEach( (address)=>{
				const user_record = users_online[address];
				const button      = document.createElement( 'button' );
				const text = (
					(typeof user_record == 'string')
					? user_record
					: user_record.nickName || user_record.userName

				).trim();
				button.innerText = text;
				list.appendChild( button );
			});
		}

		terminal.elements.navWho.querySelectorAll( 'button' ).forEach( (button)=>{
			const is_self = (full_name.indexOf(button.innerText) >= 0);
			button.classList.toggle( 'self', is_self );
		});


for(let i = 0; i < 0; ++i) {
const button = document.createElement( 'button' );
button.className = '';
button.innerText = 'dummyuser';
list.appendChild( button );
}

	}; // updateWhoList


