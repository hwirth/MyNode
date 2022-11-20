#!/bin/bash
cd /var/www/spielwiese.central-dogma.at/websocket
grep -r 'function' */*.js | sed 's# {##'
