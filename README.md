# MyNode
My CSS based poker game really lacks multi-player capabilities, so I set out to write a prototype server.
As per protocol, the scope of the program exploded a little and the prototype has become MyNode, which is a client/server system written in NodeJS
for applications like a chat or multi-player games.

## v0.0.7p
It is a prototype that grew out of proportions. I went for the low hanging fruit only and am still surprised how
powerful the program already became after my initial rush. It is still very crude in some parts.

## Features
  * Hot code reloading server and client side. I can code live, while everyone stays connected.
  * Websocket interface that recovers from server and client crashes, and tries very hard to stay connected or reconnect.
  * Watchdog (Boot screen) - It is hard to catch every type of mistake I could make when live editing code. The watchdog serves as a fallback, reloading the whole web page.
  * Debug terminal (view and manually craft JSON messages, think WireShark).
    Also serves as interface for moderators (ban, etc.)
  * Remote code editor and file manager (Micro-CMS)
  * Basic user and session management so a game lobby can be implemented
  * JSON request verification mechanism (syntax, permissions)

## Overview
![server_block_diagram]
![client_block_diagram]

[client_block_diagram]: https://github.com/hwirth/MyNode/blob/main/client_block_diagram.png "Block diagram of the client's architecture"
[server_block_diagram]: https://github.com/hwirth/MyNode/blob/main/server_block_diagram.png "Block diagram of the server's architecture"

## Debug Terminal
### tabJSON
```javascript
session
	login
		username:itsme
		password:secRet
chat
	nick: I
```
will be sent as
```javascript
{
	"session":{
		"login":{
			"username":"itsme",
			"password":"secRet"
		}
	},
	"chat":{
		"nick":"I"
	}
}
```
### dotJSON
Only usable when parameters are simple.
```javascript
.session.login.username:itsme,password:secRet...chat.nick:I
```

## File Structure

| File name | Description |
| --------- | ----------- |
| ./server/config.js   | Reads config file and provides "global" constants |
| ./server/debug.js    | Debug settings and facilities like color_log |
| ./server/helpers.js  | isNumeric, ... |
| ./server/main.js     | http and ws server |
| ./server/reloader.js | Checks, if file changes occurred when a message comes in, reloads application (router) if needed |
| ./application/router.js    | Validates request and calls corresponding request handlers |
| ./application/session.js   | Manages websockets |
| ./application/access.js    | Syntax and persmission checks |
| ./application/client.js    | Data associated to a user on a specific socket |
| ./application/meta.js      | Gathers help, syntax and permissions from a protocol object template |
| ./application/control.js   | Restart server, etc. |
| ./application/chat/chat.js | Talk to the public room or send a private message |
| ./application/rss/rss.js   | Simple RSS client, sends broadcasts to all users |
| ./application/file_manager/file_manager.js | NIY. Editor, upload |
| ./client/main.js           | Demo application, a simple chat, using the CEP |
| ./client/cep/cep.js        | Client end point, mainly a fancy websocket |
| ./client/cep/config.js     | Options and debug settings |
| ./client/cep/websocket.js  | Connects and sends first login JSON automatically |
| ./client/cep/dom_assist.js | Helpers, CSS reload |
| ./client/cep/events.js     | Simple event facility |
| ./client/cep/whoami.js     | WS should be protocol agnostic. Login, etc. will be moved here soon |
| ./client/cep/helpers.js    | Notably: wrapArray() - Wraps non-array messages in array to be used with forEach |
| ./client/cep/terminal/terminal.js             | Debug terminal, applet management |
| ./client/cep/terminal/config.js               | Settings |
| ./client/cep/terminal/audio.js                | Beep and Software Automatic Mouth (Bit) |
| ./client/cep/terminal/samjs.js                | I mangled this file and added a volume option |
| ./client/cep/terminal/toggle.js               | Holds state, can be associated with buttons and automatically assign classes |
| ./client/cep/terminal/components/main_menu.js | Global toggles |
| ./client/cep/terminal/components/status.js    | Status bar/clock |
| ./client/cep/terminal/components/user_list.js | Show and select users, PM channels, moderator functions |
| ./client/cep/terminal/shell/shell.js          | The actual debugger, shell toggles |
| ./client/cep/terminal/shell/input.js          | <textarea> handling, making it look like a real prompt |
| ./client/cep/terminal/shell/output.js         | CEP or received JSON messages as printed to the screen |
| ./client/cep/terminal/shell/history.js        | Remembers commands |
| ./client/cep/terminal/shell/parsers.js        | Converters, mainly dotJSON/tabJSON |
| ./client/cep/terminal/shell/handle_message.js | Big switch for broadcast and response messages |
| ./client/cep/terminal/editor/editor.js        | Text editor |
| ./client/cep/terminal/file_manager/file_manager.js  | Manage files on the server |
