# MyNode
My CSS based poker game really lacks multi-player capabilities, so I set out to write a prototype server.
As per protocol, the scope of the program exploded a little and the prototype has become MyNode, which is a client/server system written in NodeJS
for applications like a chat or multi-player games.

## Features
  * Hot code reloading server and client side. I can code live, while everyone stays connected.
  * Websocket interface that recovers from server and client crashes, and tries very hard to stay connected or reconnect.
  * Watchdog (Boot screen) - It is hard to catch every type of mistake I could make when live editing code. The watchdog serves as a fallback, reloading the whole web page.
  * Debug terminal (view and manually craft JSON messages, think WireShark). Also serves as interface for moderators, allowing to kick users, etc.
  * Remote code editor and file manager (Micro-CMS)
  * Basic user and session management so a game lobby can be implemented
  * JSON request verification mechanism (syntax, permissions)

## Overview
![server_block_diagram]
![client_block_diagram]


[client_block_diagram]: https://github.com/hwirth/MyNode/blob/main/client_block_diagram.png "Block diagram of the client's architecture"
[server_block_diagram]: https://github.com/hwirth/MyNode/blob/main/server_block_diagram.png "Block diagram of the server's architecture"
