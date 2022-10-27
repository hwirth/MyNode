#/bin/sh

du -h --max-depth=1 . --exclude={node_modules,.work,.git}
du -h --max-depth=1 . --exclude={server,application,client}
wc -l $(find . -type f -name *.js -o -name *.css -o -name *.html | grep -v node_modules)
