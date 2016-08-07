#!/bin/bash
#A simple bash script to manage Scrumblr service on server bootup
#
#Author: https://github.com/nonai

NODEJS=`which nodejs`
TIMESTAMP=`date +"%d-%m-%Y-%T"`

ps=`ps aux | grep scrumblr | grep -v grep`
if [[ ps == 0 ]]; then
  echo "$TIMESTAMP - Scrumblr process found. Not starting."
  else
echo "$TIMESTAMP - Scrumblr process not running. Starting up in background."
  cd /opt/scrumblr/ && $NODEJS /opt/scrumblr/server.js --port 80 &
fi
