#!/bin/bash
export DIR=`dirname $0`
cd $DIR
./smtp2http.js > /var/log/smtp2http.log

