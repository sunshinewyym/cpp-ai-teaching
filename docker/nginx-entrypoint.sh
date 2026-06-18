#!/bin/sh
set -e
DOMAIN=${DOMAIN:-localhost}
envsubst '${DOMAIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
