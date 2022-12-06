// youtube.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// BILLIARD -copy(l)eft 2020 - http://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import * as Helpers from "./helpers.js"
import { DEBUG, SETTINGS } from "../constants.js";


/**
 * YouTubePlayer()
 */
export const YouTubePlayer = function (app, new_container_element, new_video_id) {
	const self = this;

	this.containerElement;
	this.player;
	this.videoId;


	/**
	 * onAPIReady()
	 */
	this.onAPIReady = function () {
		self.player = new YT.Player( self.containerElement.id, {
			height  : "315",
			width   : "560",
			videoId : self.videoId,
			playerVars: {
				//autoplay: false,
			},
			events  : {
				onReady: (event)=>{
					const player = event.target;
					player.setVolume( SETTINGS.YOUTUBE.VOLUME );
					if (SETTINGS.YOUTUBE.AUTO_PLAY) player.playVideo();
				},
				onStateChange: (event)=>{
					const player = event.target;
					const state = player.getPlayerState();
					if (state == 0) {
						player.playVideo();
					}
				}
			}
		});
	}


	/**
	 * loadVideo()
	 */
	this.loadVideo = function (new_video_id) {
		self.player.loadVideoById( new_video_id );
	}; // loadVideo


	/**
	 * playVideo()
	 */
	this.playVideo = function (video_id = null) {
		if (video_id !== null) self.loadVideo( video_id );
		if (DEBUG.YOUTUBE) console.log( "YT playVideo()" );
		self.player.playVideo();

	}; // playVideo


	/**
	 * pauseVideo()
	 */
	this.pauseVideo = function () {
		if (DEBUG.YOUTUBE) console.log( "YT pauseVideo()" );
		self.player.pauseVideo();

	}; // pauseVideo


	/**
	 * stopVideo()
	 */
	this.stopVideo = function () {
		if (DEBUG.YOUTUBE) console.log( "YT stopVideo()" );
		self.player.stopVideo();

	}; // stopVideo


	/**
	 * togglePlayer()
	 */
	this.togglePlayer = function () {
		/* state
		 * -1 - unstarted
		 *  0 - ended
		 *  1 - playing
		 *  2 - paused
		 *  3 - buffering
		 *  5 - video cued
		 */
		const state = self.player.getPlayerState();

		switch (state) {
		case 0:  case 2:  self.playVideo();  break;
		case 1:  case 3:  self.stopVideo();  break;
		default: self.playVideo();
		}

	}; // togglePlayer


	/**
	 * togglePause()
	 */
	this.togglePause = function () {
		/* state
		 * -1 - unstarted
		 *  0 - ended
		 *  1 - playing
		 *  2 - paused
		 *  3 - buffering
		 *  5 - video cued
		 */
		const state = self.player.getPlayerState();

		switch (state) {
		case 0:  case 2:  self.playVideo();   break;
		case 1:  case 3:  self.pauseVideo();  break;
		default: self.playVideo();
		}

	}; // togglePause


	/**
	 * init()
	 */
	this.init = function (new_container_element, new_video_id) {
		console.log( "YouTubePlayer() initializing (Container: #" + new_container_element.id + ")" );
		self.videoId = new_video_id;

		self.containerElement = new_container_element;
		window.onYouTubeIframeAPIReady = self.onAPIReady;

		const script = document.createElement( "script" );
		script.src = "https://www.youtube.com/iframe_api";
		document.querySelector( "head" ).appendChild( script );

		const div = document.createElement( "div" );
		div.id = "yt_controller";

		const img = document.createElement( "img" );
		img.className = "yt_icon";
		img.src = "images/yt_icon.png";

		div.appendChild( img );
		div.appendChild( self.containerElement );
		document.body.appendChild( div );

	}; // init

	// CONSTRUCTOR

	self.init( new_container_element, new_video_id );

}; // YouTubePlayer


function onYouTubeIframeAPIReady () {
}
