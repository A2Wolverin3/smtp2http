FROM node:latest

ARG HOMEBRIDGE_ADDR
RUN test -n "$HOMEBRIDGE_ADDR" || (echo "HOMEBRIDGE_ADDR build argument not set!" && false)
#ENV HOMEBRIDGE_ADDR=${PHYS_NET}

# Install tools: cron, logrotate - m4 should already be installed
RUN apt-get update && \
    apt-get install cron -y && \
    apt-get install logrotate -y
#     apt-get install m4 -y

# Install smtp2http
COPY . /opt/smtp2http/
WORKDIR /opt/smtp2http
RUN ./container-setup.sh ${HOMEBRIDGE_ADDR}

# Run smtp2http
CMD cron && smtp2http -c /opt/smtp2http/config.json --snap-dir /var/snaps >> /var/log/smtp2http.log
