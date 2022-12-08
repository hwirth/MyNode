#!/bin/bash

if [ "$1" == "sort" ] ; then
	grep -rn '//\.\.\.' {server,application,client}/* | grep -v 'client/old' | grep '//\.\.\.!'
	echo
	grep -rn '//\.\.\.' {server,application,client}/* | grep -v 'client/old' | grep '//\.\.\.?'
	echo
	grep -rn '//\.\.\.' {server,application,client}/* | grep -v 'client/old' | grep -v -e '//\.\.\.!' -e '//\.\.\.?'
else
	grep -rn '//\.\.\.' {server,application,client}/* | grep -v 'client/old'
fi
