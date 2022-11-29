// audio.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

"use strict";

/* SamJS is a node module or something. It installs itself under window.SamJs and cannot be imported normally
 * I think a bundler would change that, but this is from the /dist folder!? I also added a volume option to it.
 */
import * as DUMMY_SamJs from './samjs.js';

import { SETTINGS, PRESETS } from '../config.js';
import { GET               } from '../helpers.js';


export const Audio = function (terminal) {
	const self = this;

	this.audioContext;

	this.sam;
	this.bit;

	var sam_tts;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SAM TTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.sam = {
		speak: function (text, ignore_toggle) {
			if (!self.audioContext) return;

			if (!terminal.toggles.tts.enabled && !ignore_toggle) return;

			if (!sam_tts || SETTINGS.SAM_ALWAYS_NEW) {
				sam_tts = new SamJs({
					singmode : !false,   //false
					pitch    : 35,       //64 Lower = higher voice
					speed    : 72,       //72
					mouth    : 128,      //128
					throat   : 128,      //128
					volume   : PRESETS.VOLUME.SAM * SETTINGS.MAIN_VOLUME,
					//1 I added volume to sam.js, but it's not too pretty
				});
			}

			text
			.split( 'PAUSE' )
			.reduce( async (prev, next, index, parts)=>{
				await prev;
				const part = parts[index].trim();
				return new Promise( async (done)=>{
					if (terminal.toggles.tts.enabled || ignore_toggle) {
						if (part != '') await sam_tts.speak( parts[index] );
						setTimeout( done, 150 );
					} else {
						done();
					}
				});

			}, Promise.resolve());

		}, // sam.speak

		read: function (message) {
			const text = (typeof message == 'string') ? message : JSON.stringify( message, null, ' ' );
			const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 ';
			const allowed = char => chars.indexOf(char.toLowerCase()) >= 0;
			sam_speak(
				text
				.trim()
				.replace( /: /g , ' '           )
				.replace( /,/g  , ' '           )
				.replace( /\t/g , ' '           )
				.replace( /\n/g , 'PAUSE PAUSE' )
				.replace( /=/g  , ' equals '    )
				.replace( /\//g , ' slash '     )
				.replace( /\\/g , ' backslash ' )
				.replace( /\./g , ' dot '       )
				.replace( /:/g  , ' colon '     )
				.split('')
				.filter( allowed )
				.join('')
			);

		}, // sam.read

	}; // sam


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// BIT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.bit = {
		say: function ( state, delay = 0, ignore_toggle = false ) {
			const success = state ? 'yes' : 'no';

			// We might receive several responses, when we sent several requersts, so we...
			setTimeout( ()=>{
				terminal.elements.terminal.classList.remove( 'yes' );
				terminal.elements.terminal.classList.remove( 'no' );
				terminal.elements.terminal.classList.add( success );

				self.sam.speak( success, ignore_toggle );

				setTimeout( ()=>{
					terminal.elements.terminal.classList.remove( success );
				}, SETTINGS.TIMEOUT.BIT_ANSWER_COLOR);

			// .. delay TTS accordingly:
			}, SETTINGS.TIMEOUT.BIT_ANSWER_SOUND * delay);

		}, // bit.say

	}; // bit


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// BEEP
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	let nr_active_sounds = 0;
	let last_beep_time = 0;

	this.beep = async function () {
		const elapsed_time = Date.now() - last_beep_time;

		if( !SETTINGS.KEY_BEEP
		//...||  !self.audioContext
		||  !terminal.toggles.keyBeep.enabled
		||  (nr_active_sounds > 25)
		||  (elapsed_time < SETTINGS.TIMEOUT.BEEP_IGNORE)
		) {
			return;
		}

if (!self.audioContext) await new Promise( (done)=>setTimeout(done) );   //...?

		last_beep_time = Date.now();

		const context = self.audioContext;

		let square_wave = context.createOscillator();
		let envelope = context.createGain();
		let volume = context.createGain();
		let destination = context.destination;

		square_wave.type = "square";
		square_wave.frequency.value = 440 * 4;
		square_wave.detune.value = 0;
		envelope.gain.value = 0.0;
		volume.gain.value = 0.025 * SETTINGS.MAIN_VOLUME;

		square_wave
		.connect(envelope)
		.connect(volume)
		.connect(destination)
		;

//...? Timeout makes sure, WebAudio does not glitch on the very first beep
//...? The envelope seems not to work as intended, context still "waking up"??
//...? Setting v < 0.2 makes the first sound played "louder" even with the timeout
const delay = (last_beep_time == 0) ? 100 : 0;
setTimeout( ()=>{
		// Envelope
		const t0 = context.currentTime + 0.1;   //...? Also needed to prevent the glitch
		const v = 0.1;
		var t1;
		envelope.gain.setValueAtTime         ( 0.0, t1 = t0 );
		envelope.gain.linearRampToValueAtTime( 1.0, t1 = t0 + v * 0.01 );
		envelope.gain.linearRampToValueAtTime( 0.1, t1 = t0 + v * 0.50 );
		envelope.gain.linearRampToValueAtTime( 0.0, t1 = t0 + v * 1.00 );

		//...square_wave.addEventListener('ended', on_ended);
		square_wave.onended = on_ended;
		square_wave.start();
		square_wave.stop(t1);

		++nr_active_sounds;
}, delay);
		function on_ended (event) {
			square_wave.disconnect( envelope );
			envelope.disconnect( volume );
			volume.disconnect( context.destination );

			--nr_active_sounds
		}

	}; // beep


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = function () {

		self.audioContext = new( window.AudioContext || window.webkitAudioContext )();

		if (self.audioContext.state == 'running') {
			self.bit.say( 'yes' );

		} else {
			function activate_audio () {
				self.audioContext.resume();
				removeEventListener( 'keydown', activate_audio );
				removeEventListener( 'mouseup', activate_audio );
				terminal.status.show( 'Audio context resumed.', /*clear*/true );
				if (GET.has('tts')) self.bit.say( 'yes' );
			}
			addEventListener( 'keydown', activate_audio );
			addEventListener( 'mouseup', activate_audio );

			setTimeout( ()=>terminal.status.show('User gesture required to activate audio.') );
		}

		return Promise.resolve();

	}; // init


	self.init().then( ()=>self );   // const audio = await new Audio()

}; // Audio


//EOF
