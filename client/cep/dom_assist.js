// dom_assist.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { SETTINGS, DEBUG } from './config.js';


export const DomAssist = function (cep) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.documentFromFile = function (file_name) {
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

	}; // documentFromFile


	this.loadCSS = function (file_name) {
		return new Promise( (done)=>{
			if (file_name.slice(0, cep.baseDir.length + 1) == (cep.baseDir + '/')) {
				file_name = file_name.slice( cep.baseDir.length + 1 );
			}
			const link = document.createElement( 'link' );
			link.setAttribute( 'rel', 'stylesheet' );
			link.setAttribute( 'href', file_name );
			document.querySelector('head').appendChild( link );
			link.onload = done;
		});

	}; // loadCSS


	/*  //... function refreshCSS
		var links = document.getElementsByTagName("link");
		for (var cl in links) {
			var link = links[cl];
			if (link.rel === "stylesheet") link.href += "";
		}
	*/
	this.reloadCSS = function (file_name) {
		return new Promise( (done)=>{
			//... if (file_name.charAt(0) != '/') file_name = '/' + file_name;

			if (cep.baseDir && (file_name.slice(0, cep.baseDir.length + 1) == (cep.baseDir + '/'))) {
				file_name = file_name.slice( cep.baseDir.length + 1 );
			}

			const head     = document.querySelector( 'head' );
			const selector = '[href^="' + file_name + '"]';
			const old_link = head.querySelector( selector );
			const new_link = document.createElement( 'link' );

			new_link.rel  = 'stylesheet';
			new_link.href = file_name + '?' + Date.now();
			new_link.type = 'text/css';

			head.appendChild( new_link );

			new_link.addEventListener( 'load', ()=>{
				if (old_link) setTimeout( ()=>head.removeChild(old_link) );
				done();
			});
		});

	}; // reloadCSS


	this.getCSSVariable = function (variable_name, element = null) {
		if (!element) element = document.documentElement;
		return getComputedStyle( element ).getPropertyValue( variable_name );

	}; // getCSSVariable


	this.setCSSVariable = function (variable_name, new_value, element = null) {
		if (!element) element = document.documentElement;
		element.style.setProperty( variable_name, new_value );

	}; // setCSSVariable


	this.newElement = function (parameters) {
		const p = parameters;

		const new_element = document.createElement( p.tagName );  delete p.tagName;
		const class_name  = p.className ? p.className : null;     delete p.className;
		const text        = p.innerText ? p.innerText : null;     delete p.innerText;
		const html        = p.innerHTML ? p.innerHTML : null;     delete p.innerHTML;
		const events      = p.events    ? p.events    : {};       delete p.events;
		const dataset     = p.dataset   ? p.dataset   : {};       delete p.dataset;
		const children    = p.children  ? p.children  : [];       delete p.children;
		const attributes  = p;

		if (class_name) new_element.className = class_name;
		if (text      ) new_element.innerText = text;
		if (html      ) new_element.innerHTML = html;

		Object.keys( events     ).forEach( name => new_element.addEventListener(name, events[name]) );
		Object.keys( attributes ).forEach( name => new_element.setAttribute(name, attributes[name]) );
		Object.keys( dataset    ).forEach( name => new_element.dataset[name] = dataset[name]        );

		children.forEach( child => new_element.appendChild(child) );

		return new_element;

	}; // new_element


	this.gatherElements = function (container_element, selectors) {
		return Object.entries( selectors ).reduce( (prev, [name, selector])=>{
			const element
			= (selector == 'CONTAINER')
			? container_element
			: container_element.querySelector(selector)
			;
			return { ...prev, [name]:element };

		}, /*initialValue*/{} );

	}; // gatherElements


	this.elementFromHTML = function (html) {
		const temp = document.createElement( 'div' );
		temp.className = 'container';
		temp.innerHTML = html;
		return temp.querySelector( ':scope > *' );

	}; // elementFromHTML


// FORM SUBMIT ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function deny_form_submit (event) {
		return event.preventDefault();
	}

	this.disableFormSubmit = function (container_element = null) {
		if (container_element === null) container_element = document.body;

		if (container_element.tagName == 'FORM') {
			container_element.addEventListener( 'submit', deny_form_submit );
		}
		container_element.querySelectorAll( 'form' ).forEach( (form)=>{
			form.addEventListener( 'submit', deny_form_submit );
		});

	}; // disableFormSubmit


	this.enableFormSubmit = function (container_element = null) {
		if (container_element === null) container_element = document.body;

		if (container_element.tagName == 'FORM') {
			container_element.removeEventListener( 'submit', deny_form_submit );
		}
		container_element.querySelectorAll( 'form' ).forEach( (form)=>{
			form.removeEventListener( 'submit', deny_form_submit );
		});

	}; // enableFormSubmit


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'DomAssist.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'DomAssist.init' );
		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const dom = await new DomAssist()

}; // UserInterface


//EOF
