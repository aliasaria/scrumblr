FROM node:0.10.30 

COPY ./ /opt/scrumblr
WORKDIR /opt/scrumblr
CMD node server.js --port 80 --redis redis://redis:6379

