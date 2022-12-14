// rss.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from '../config.js';


export function StatusBar (container_element) {
	const self = this;

	this.elements;
	this.clockElement;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CLOCK
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const start_time = new Date();

	function start_clock () {
		const current_second = () => Math.floor( Date.now() / 1000 );
		let recent_second = current_second();

		update_clock();
		long_wait();
		return;


		function long_wait () {
			const remaining_ms = 1000 - Date.now() % 1000;
			setTimeout( narrow_wait, remaining_ms - 50 );
		}

		function narrow_wait () {
			if (current_second() == recent_second) {
				setTimeout( narrow_wait );
			} else {
				update_clock();
				//...recent_second = current_second();
				//...long_wait();
				setInterval( update_clock, 1000 );
			}
		}

		function update_clock () {
			self.clockElement.innerText = Intl.DateTimeFormat(
				navigator.language, {
					weekday : 'short',
					year    : 'numeric',
					month   : 'short',
					day     : 'numeric',
					hour    : '2-digit',
					minute  : '2-digit',
					second  : '2-digit',
					//...fractionalSecondDigits: '3',
					timeZoneName: ['short', 'shortOffset', 'shortGeneric'][0],
					hour12  : false,
				},
			).format(new Date());
		}

	} // start_clock


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// STATUS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let timeout = null;

	function add_element (html) {
		// New span to bottom
		const new_entry = document.createElement( 'span' );
		new_entry.innerHTML = html;
		new_entry.className = 'fade';
		self.elements.appendChild( new_entry );

		if (!timeout) show();   // Start loop
		return;

		async function show (initial_fadeout = true) {
			const top      = () => self.elements.querySelector( ':scope > :first-child' );;
			const fade_in  = () => top() && top().classList.remove( 'fade' );
			const fade_out = () => top() && top().classList.add   ( 'fade' );

			const delay    = (ms = 0) => new Promise( (done)=>{
				timeout = setTimeout( done, ms );
			});

			function abort () {
				if (timeout) return false;
				else fade_in(); return true;
			}

			timeout = true;

			await delay();   // Allow DOM update
			if (abort()) return;

			if (initial_fadeout) {
				fade_out();
				await delay( SETTINGS.TIMEOUT.STATUS_FADE );
				if (abort()) return;
			}

			// Move time span to bottom
			self.elements.removeChild( self.clockElement );
			self.elements.appendChild( self.clockElement );

			const show_time
			= SETTINGS.TIMEOUT.STATUS_SHOW
			* (0.3 + 0.7 * Math.min( 1.0, top().innerText.length / 240) )
			;

			fade_in();
			await delay( show_time );
			if (abort()) return;

			fade_out();
			await delay( SETTINGS.TIMEOUT.STATUS_FADE );
			if (abort()) return;

			if (self.elements.children.length > 1) {   // Never remove time
				self.elements.removeChild( top() );
				await delay();
				if (abort()) return;
			}

			if (self.elements.children.length > 1) {
				timeout = setTimeout( ()=>show(/*initial_fadeout*/false) );
			} else {
				// Last remaining is clock: Remember, that loop has ended
				timeout = null;
				fade_in();
			}
		}

	} // add_element


	function clear_list () {
		if (timeout) clearTimeout( timeout );
		timeout = null;
		self.elements.innerHTML = '';
		self.elements.appendChild( self.clockElement );
		self.clockElement.classList.remove( 'fade' );
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.show = function (html, urgent = false) {
		//...console.log( 'StatusBar.show: html:', html );

		if (html === null) return clear_list();
		//...if (self.elements.children.length > 10) return;

		add_element( clean(html) );

		function clean (html) {
			const only_allowed = char => SETTINGS.KEEP_STATUS_CHARS.indexOf(char.toLowerCase()) >= 0;
			return (
				html
				.split( '\n' )[0]   //...?
				.split( '' ).filter( only_allowed ).join( '' )
				.replaceAll( '<a href', '<a target="_blank" href' )
			);
		}

	}; // show


	this.clear = function (event) {
		console.log( event );
		if (event && event.target.tagName == 'A') return;
		self.show( null );
		clear_list();

	} // clear


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'StatusBar.exit' );
		clear_list();
		return Promise.resolve();

	}; // exit


	this.reset = function (force = false) {
		if (DEBUG.RESET) color_log( COLORS.INSTANCES, 'StatusBar.reset' );

	}; // reset


	this.init = function () {
		if (DEBUG.INSTANCES) color_log( COLORS.INSTANCES, 'StatusBar.init' );

		self.elements = container_element;

		self.clockElement = self.elements.querySelector( ':scope > .time' );
		if (!self.clockElement) {
			self.clockElement = document.createElement( 'span' );
			self.clockElement.className = 'time';
			self.elements.appendChild( self.clockElement );
		}
		start_clock();
		//self.clockElement.classList.add( 'fade' );

		//self.show( 'Ready.' );

		self.elements.addEventListener( 'click', self.clear );
		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const chat = await new ChatServer();

}; // StatusBar


//EOF
