// settings.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

import { DEBUG } from '../../config.js';

import { SETTINGS as CEP_SETTINGS  } from '../../config.js';
import { DEBUG    as CEP_DEBUG     } from '../../config.js';
import { SETTINGS as TERM_SETTINGS } from '../config.js';
import { PRESETS  as TERM_PRESETS  } from '../config.js';


export const Settings = function (cep, terminal) {
	const self = this;
	this.templateName = 'Settings';

	this.containers;
	this.elements;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	const RESSOURCE = [
		// Containers will be removed and re-inserted by the UI.
		// If a mount location needs more than one element, they need to be separate containers:
		{
			parent   : 'terminal',
			html     : (`
				<main tabindex="0">
					<div class="settings">
						<h2>Terminal Settings</h2>
						<div class="term_settings settings"></div>
						<h2>Terminal Presets</h2>
						<div class="term_presets settings"></div>
						<h2>Client Endpoint Settings</h2>
						<div class="cep_settings settings"></div>
						<h2>Client Endpoint Debug</h2>
						<div class="cep_debug settings"></div>
					</div>
				</main>
			`),
			elements : {
				main         : 'CONTAINER',
				termSettings : '.settings.term_settings',
				termPresets  : '.settings.term_presets',
				cepSettings  : '.settings.cep_settings',
				cepDebug     : '.settings.cep_debug',
			},
		},{
			parent   : 'bottomRight',
			html     : (`
					<button class="reload">Reload</button>
			`),
			elements : {
				btnReload : 'CONTAINER',
			},
		},{
			parent   : 'bottomRight',
			html     : (`
					<button class="save">Save</button>
			`),
			elements : {
				btnSave : 'CONTAINER',
			},
		},{
			parent   : 'bottomRight',
			html     : (`
					<button class="close">Exit</button>
			`),
			elements : {
				btnClose : 'CONTAINER',
			},
		},
	];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.taskName      = 'Settings';
	this.taskMainClass = 'settings';
	this.focusItem;
	this.taskEntry;   // Will be created by  DebugTerminal.installApplet()


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// GATHER DATA
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function create_settings (obj, path = '') {
		const NEW = cep.dom.newElement;

		const new_element = NEW({
			tagName: 'div',
		});

		Object.entries( obj ).forEach( ([key, value])=>{
			const new_path = (path ? path + '.' : '') + key;

			if (typeof value == 'object') {
				new_element.append(
					...create_settings( obj[key], new_path ),
				);
			} else {
				new_element.appendChild(
					NEW({
						tagName   : 'label',
						children  : [
							NEW({
								tagName : 'input',
								value   : value,
							}),
							NEW({
								tagName   : 'span',
								innerText : new_path,
							}),
						],
					}),
				);
			}
		});

		return new_element.querySelectorAll( ':scope > *' );

	} // create_settings


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function () {
		if (DEBUG.INSTANCES) console.log( 'Editor.exit' );
		return Promise.resolve();

	}; // exit


	this.init = async function () {
		if (DEBUG.INSTANCES) console.log( 'Editor.init' );

		self.containers = [];
		self.elements = {};
		terminal.createComponents( self, RESSOURCE );   // Populates self.containers and self.elements
		//self.focusItem = self.elements.main;

		self.elements.termSettings.append( ...create_settings(TERM_SETTINGS) );
		self.elements.termPresets .append( ...create_settings(TERM_PRESETS ) );
		self.elements.cepSettings .append( ...create_settings(CEP_SETTINGS ) );
		self.elements.cepDebug    .append( ...create_settings(CEP_DEBUG    ) );

		self.elements.main.querySelectorAll( 'input' ).forEach( (input)=>{
			input.addEventListener( 'change'  , on_input_change );
			input.addEventListener( 'input'   , on_input_change );
			input.addEventListener( 'keydown' , on_input_change );
			input.addEventListener( 'keyup  ' , on_input_change );
			on_input_change();
			function on_input_change () {
				const tokens = ['true','false','null'];
				const is_token = tokens.indexOf( input.value.trim().toLowerCase() );
				if (is_token >= 0) tokens.forEach( (token, index)=>{
					input.classList.toggle( token, index == is_token );
				});
			}
		});



		return Promise.resolve();

	}; // init


	return self.init().then( ()=>self );   // const settings = await new Settings()

}; // Settings


//EOF
