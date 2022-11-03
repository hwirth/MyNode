// history.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const History = function (input_element, callback = {}) {
	const self = this;

	this.entries;
	this.currentEntry;

	this.add = function (new_entry) {
		const existing_index = self.entries.indexOf( new_entry );

		if (existing_index >= 0) {
			self.entries.splice( existing_index, 1 );
		}

		self.entries.push( new_entry );
		self.currentEntry = self.entries.length - 1;

	}; // add

	this.back = function () {
		--self.currentEntry;

		const start = input_element.selectionStart;

		if (self.currentEntry < 0) {
			self.currentEntry = self.entries.length - 1;
			//...input_element.value = '';
			input_element.value = self.entries[self.currentEntry];
		} else {
			input_element.value = self.entries[self.currentEntry];
		}

		set_selection( start );

	}; // goBack

	this.forward = function () {
		++self.currentEntry;

		const start = input_element.selectionStart;

		if (self.currentEntry >= self.entries.length) {
			self.currentEntry = 0;
			input_element.value = '';
		} else {
			input_element.value = self.entries[self.currentEntry];
		}

		set_selection( start );

	}; // goForward


	function set_selection (start_before) {
		if (start_before == 0) {
			input_element.selectionStart
			= input_element.selectionEnd
			= 0
			;
		} else {
			input_element.selectionStart
			= input_element.selectionEnd
			= input_element.value.length
			;
		}

	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {
		self.entries = [];
		self.currentEntry = -1;

	}; // init


	self.init();

}; // History


//EOF
