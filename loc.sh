#/bin/sh
wc -l $(find . -type f -name *.js -o -name *.css -o -name *.html | grep -v node_modules)
