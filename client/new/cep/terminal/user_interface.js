// user_interface.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from '../config.js';


export const UserInterface = function () {
	const self = this;

	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function document_from_html (file_name) {
		return fetch( file_name ).then( (response)=>{
			if (response.ok) {
				return response.text();
			} else {
				return Promise.reject( file_name + ': ' + response.statusText );
			}

		}).then( (html)=>{
			const parser = new DOMParser();
			const new_document = parser.parseFromString( html, 'text/html' );
			return new_document;
		});

	} // document_from_html


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		console.log( 'UserInterface.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		console.log( 'UserInterface.init' );

		let container = null;

		await Promise.all([
			new Promise( (done)=>{
				const link = document.createElement( 'link' );
				link.setAttribute( 'rel', 'stylesheet' );
				link.setAttribute( 'href', 'cep/terminal/terminal.css' );
				link.setAttribute( 'class', 'cep_terminal' );
				document.querySelector('head').appendChild( link );
				link.onload = done;
			}),
			document_from_html( 'cep/terminal/terminal.html' ).then( (document)=>{
				container = document.querySelector( 'cep-terminal' );
			}),
		]);

		document.body.appendChild( container );

		// Gather DOM elements
		self.elements = Object.entries({
			html          : document.documentElement,
			terminal      : container,
			header        : ':scope > header',
			footer        : ':scope > footer',
			main          : ':scope > header',

		}).reduce( (prev, [name, selector])=>{ return {
			...prev, [name]: (typeof selector == 'string') ? container.querySelector(selector) : selector,

		}}, /*initialValue*/{} );

		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const ui = await new UserInterface()

}; // UserInterface


//EOF
