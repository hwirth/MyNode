// dom_actions.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from '../cep/config.js';


export function DomActions (terminal) {
	const self = this;


	this.animatePing = function (transmit = false) {
		if (!SETTINGS.ANIMATE_TRANSMISSION) return;

		terminal.elements.terminal.classList.add( transmit ? 'transmit' : 'ping' );
		setTimeout( ()=>{
			terminal.elements.terminal.classList.remove( transmit ? 'transmit' : 'ping' );
		}, SETTINGS.TIMEOUT.PING_CSS);

	}; // animatePing


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


	this.setFont = function (font_index = 0) {
		//...const new_font_name = terminal.fontNames[font_index] || terminal.fontNames[0];
		//...terminal.elements.terminal.style.setProperty( '--font-family', new_font_name );

		for (let i = 0; i < terminal.fontNames.length; ++i) {
			terminal.elements.terminal.classList.toggle( 'font' + i, i == font_index );
		}

		if (DEBUG.FONTS) console.log(
			'DebugConsole.setFont: Font', font_index, terminal.fontNames[font_index],
		);

	} // setFont


	this.nextFont = function (delta = 1) {
		const nr_fonts = terminal.fontNames.length;
		const t        = terminal.elements.terminal;

		let index = -1;
		for (let i = 0; i < nr_fonts; ++i) {
			const class_name = 'font' + i;
			if (t.classList.contains( class_name )) index = i;
			t.classList.remove( class_name );
		}

		if (index < 0) {
			index = 1;
		} else {
			index = ((index + delta + nr_fonts) % nr_fonts);
		}

		const new_class = 'font' + index;

		t.classList.add( new_class );

		if (DEBUG.FONTS) console.log( 'DebugConsole.nextFont: Font', index, terminal.fontNames[index] );
		terminal.status.show( 'Font ' + terminal.fontNames[index] + ' was selected' );

	}; // nextFont


	this.changeFontSize = function (delta_px) {
		const css_size     = getComputedStyle( terminal.elements.terminal ).getPropertyValue('--font-size');
		const current_size = parseInt( css_size.slice(0, -2), 10 );
		const new_size     = Math.min( 100, Math.max( 3, current_size + delta_px ));

		terminal.elements.terminal.style.setProperty( '--font-size', new_size+'px' );

		if (DEBUG.FONTS) console.log( 'DebugConsole.changeFontSize:', new_size );

	}; // changeFontSize


	this.reloadCSS = function  (file_name) {
		if (file_name.charAt(0) != '/') file_name = '/' + file_name;

		const head     = document.querySelector( 'head' );
		const selector = '[href^="' + file_name + '"]';
		const old_link = head.querySelector( selector )
		const new_link = document.createElement( 'link' );

		new_link.rel  = 'stylesheet';
		new_link.href = file_name + '?' + Date.now();
		new_link.type = 'text/css';

		head.appendChild( new_link );

		if (DEBUG.FONTS) console.log( 'DebugConsole.reloadCSS():', file_name );

		new_link.addEventListener( 'load', ()=>{
			const message
			= 'Style sheet <a href="' + file_name
			+ '">client' + file_name
			+ '</a> reloaded.'
			;
			terminal.status.show( message , /*urgent*/true );
			old_link.parentNode.removeChild( old_link );
		});

	}; // reloadCSS


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const dom = await new DomActions()

}; // DomActions


//EOF
