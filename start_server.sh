#!/bin/bash

# Prevent systemctl stop from hanging
trap cleanup exit
function cleanup () {
	exit 0
}


nr_crashes=0
max_crashes=30

debug=--inspect=127.0.0.1:1339

cd server

while [ 1 ] ; do
	node --trace-warnings $debug main.js

	exit_code=$?

	logger "Spielwiese terminated with code $exit_code"
	logger "Nr. crashes: $nr_crashes";

	case $exit_code in
	0|1|2)
		# Conditions that need this loop to end
		echo "$0 terminating"
		exit $exit_code
		;;
	-1|255)
		# Requested restart
		echo -e "\n$0: Restart requested\n"
		nr_crashes=0
		sleep 1

		;;
	*)
		echo "$0: Unknown exit code '$exit_code', restarting"
		nr_crashes=$(($nr_crashes + 1))
		if [ $nr_crashes -gt $max_crashes ] ; then
			nr_crashes=$max_crashes
		fi
		sleep $nr_crashes
		;;
	esac
done


#EOF
