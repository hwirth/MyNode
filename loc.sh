#/bin/sh

echo "du"
du -h --max-depth=1 . --exclude={.work,node_modules,.git}
du -h --max-depth=1 . --exclude={.work,server,application,client}
echo "wc"
wc -l $(find . -type f -name *.js -o -name *.css -o -name *.html | grep -v -e node_modules -e .work)
