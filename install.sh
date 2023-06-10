#!/bin/bash
set -x
set -e

# Update config with homebridge address
if [ "$1" == "" ]; then
    echo "Must supply an address for homebridge!"
    exit 1
fi
m4 -D __HOMEBRIDGE__="$1" config.template.json > config.json

# Install node.js modules
npm install
npm install -g
ln -s /usr/lib/node_modeules/smtp2http/smtp2http.js /usr/bin/smtp2http

# Setup logging
cp logrotate/smtp2http /etc/logrotate.d/smtp2http
touch /var/log/smtp2http.log
chmod a+rw /var/log/smtp2http.log

# Setup snaps
mkdir -p /var/snaps
chmod a+rw /var/snaps

# Periodically Cleanup Snaps
cp clean-snaps /etc/cron.daily
