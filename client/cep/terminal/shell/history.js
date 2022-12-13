// history.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MyNode - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";


export const History = function (input_element, callback = {}) {
	const self = this;

	this.entries;
	this.currentEntry;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// INTERFACE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.add = function (new_entry) {
		const existing_index = self.entries.indexOf( new_entry );

		if (existing_index >= 0) {
			self.entries.splice( existing_index, 1 );
		}

		self.entries.push( new_entry );
		self.currentEntry = 0;

	}; // add


	this.back = function () {
		--self.currentEntry;

		if (self.currentEntry < 0) {
			self.currentEntry = self.entries.length - 1;
		}

		input_element.value = self.entries[self.currentEntry] || '';
		input_element.selectionStart
		= input_element.selectionEnd
		= 0
		;

		if (callback.onInputChanged) callback.onInputChanged();

	}; // goBack


	this.forward = function () {
		++self.currentEntry;

		if (self.currentEntry >= self.entries.length) {
			self.currentEntry = 0;
		}
		if (self.currentEntry < 0) {
			self.currentEntry = 0;
		}

		input_element.value = self.entries[self.currentEntry] || '';
		input_element.selectionStart
		= input_element.selectionEnd
		= input_element.value.length
		;

		if (callback.onInputChanged) callback.onInputChanged();

	}; // goForward


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
