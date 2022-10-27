#!/bin/bash

if [ "$1" == "" ] ; then
	echo "no name given"
	exit
fi

version="$*"
base_dir=/var/www/spielwiese.central-dogma.at/websocket
backup_dir=$base_dir/.work/backup

echo "Creating $backup_dir/$version"

read

mkdir $backup_dir/$version
cp -vr $base_dir/{server,application,client} $backup_dir/$version
