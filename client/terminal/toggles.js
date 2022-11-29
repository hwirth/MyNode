// toggles.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS       } from '../cep/config.js';


export function create_toggles (terminal, definition) {

	return definition.map( to_toggles ).reduce( to_dict, /*initialValue*/{} );

	function to_dict (prev, next) {
		return { ...prev, [next.name]: next };
	}


// CREATE TOGGLE /////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function to_toggles (toggle) {
		const target = toggle.target;
		const menu   = terminal.elements[toggle.menu];
		let element  = terminal.elements[toggle.name];

		// Some toggles may have been placed in the HTML manually
		// We might have forgotten to add the element or the menu to self.elements
		if (!element && menu) {
			element           = document.createElement( 'button' );
			element.innerText = toggle.caption || toggle.name;
			element.className = toggle.name;
			if (toggle.shortcut) element.title = 'Shortcut: Alt+' + toggle.shortcut;
			menu.appendChild( element );
		}

		if (!true && toggle.shortcut) {
			KEYBOARD_SHORTCUTS.push({
				event     : 'keydown',
				key       : toggle.shortcut,
				modifiers : ['alt'],
				action    : ()=>{ terminal.toggles[toggle.name].toggle(); },
			});
		}

		toggle = {
			enabled : toggle.preset,
			...toggle,
			enable  : ()     =>{ flip( true  ); },
			disable : ()     =>{ flip( false ); },
			toggle  : (state)=>{ flip( state ); },
		};

		if (element.tagName == 'BUTTON') {   //...? Do we still have non-buttons?
			element.addEventListener( 'click', ()=>{
				flip();
				terminal.focusPrompt();
			});
		}

		update_dom();  // Set UI states depending on preset

		return toggle;


		function update_dom () {
			// Toggle
			const is_terminal = (toggle.name == 'terminal');
			if (!is_terminal && element) element.classList.toggle( 'enabled', toggle.enabled );
			const set_enable = ['terminal'].indexOf(toggle.name) >= 0;
			target.classList.toggle( set_enable ? 'enabled' : toggle.name, toggle.enabled );

			// Custom
setTimeout( ()=>{
			// Tell websocket.js, if it should log messages to the dev console
			//SETTINGS.HIDE_MESSAGES.PING = toggle.enabled;
				SETTINGS.HIDE_MESSAGES.PING = terminal.toggles.ping.enabled;
});  //...? Argh. Why?
			if (toggle.name == 'light') {
				const prefers_light_scheme
				= window.matchMedia( '(prefers-color-scheme:light)' ).matches
				^ toggle.enabled
				;
				terminal.elements.html.classList.toggle( 'light', prefers_light_scheme );
				terminal.elements.html.classList.toggle( 'dark', !prefers_light_scheme );
			}

			terminal.scrollDown();
			if (is_terminal && toggle.enabled) terminal.focusPrompt();
			setTimeout( update_toggle_state );

		} // update_dom


		function flip (new_state = null) {
			// Toggle
			//...console.log( 'flip:', toggle, typeof new_state );
			const just_toggle = (new_state === null) || (typeof new_state == 'event');
			toggle.enabled = just_toggle ? !toggle.enabled : new_state;

			update_dom();

			// Custom
			//...SETTINGS.HIDE_MESSAGES.PING = toggle.enabled;

			 if (toggle.name == 'terminal') {
				terminal.elements.html.classList.toggle( 'animate', !toggle.enabled );
			}

			terminal.bit.say( toggle.enabled );//..., /*delay*/0, (toggle.name == 'tts') );

			let blink_button = terminal.elements.btnToggles;
			if (toggle.menu == 'filter') blink_button = terminal.elements.btnFilter;

			const cep_button = terminal.elements.btnCEP;
			blink_button.classList.add( 'blink', toggle.enabled ? 'success' : 'error' );
			cep_button  .classList.add( 'blink', toggle.enabled ? 'success' : 'error' );
			setTimeout( ()=>{
				blink_button.classList.remove( 'blink', 'success', 'error' );
				cep_button  .classList.remove( 'blink', 'success', 'error' );
			}, 350 );
		} // flip

	} // to_toggles


	// UI element, list of chars
	function update_toggle_state () {
		const has_shortcut = toggle => toggle.shortcut !== null;
		const shortcuts    = Object.values( terminal.toggles ).filter( has_shortcut );

		const nr_first    = Math.floor( Object.keys( shortcuts ).length / 2 );
		const first_half  = (_, index) => index >= nr_first;
		const second_half = (_, index) => index < nr_first;

		terminal.elements.toggleState.innerHTML
		= '<span>'
		+  create_part( shortcuts, first_half )
		+ '</span><span>'
		+ create_part( shortcuts, second_half );
		+ '</span>'
		;

		function create_part (toggles, half) {
			const alphabetically = (a, b) => (a.shortcut > b.shortcut) ? +1 : -1;
			const to_character   = (toggle, index) => (
				toggle.enabled
				? '<b>' + toggle.shortcut.toLowerCase() + '</b>'
				: toggle.shortcut.toLowerCase()
			);
			return (
				Object.values( shortcuts )
				.sort( alphabetically )
				.filter( half )
				.map( to_character )   // Uppercase for enabled toggles
				.join('')
			);
		}

	} // update_toggle_state

} // create_toggles


//EOF
