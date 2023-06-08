FROM node:alpine
MAINTAINER moenka <moenka@10forge.org>

ENV SCRUMBLR_PORT="8080"
ENV SCRUMBLR_BASEURL="/"
ENV SCRUMBLR_REDIS_URL="redis://redis"
ENV SCRUMBLR_REDIS_PORT="6379"

WORKDIR /srv/scrumblr
COPY . /srv/scrumblr

RUN npm install

ENTRYPOINT /usr/local/bin/node server.js \
           --port ${SCRUMBLR_PORT} \
           --baseurl ${SCRUMBLR_BASEURL} \
           --redis ${SCRUMBLR_REDIS_URL}:${SCRUMBLR_REDIS_PORT}

