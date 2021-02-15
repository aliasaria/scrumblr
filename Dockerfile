FROM node:0.10.30 

ARG http_proxy
ARG https_proxy

COPY ./ /opt/scrumblr
WORKDIR /opt/scrumblr

RUN npm -g config set proxy ${http_proxy}
RUN npm -g config set https-proxy ${https_proxy}
RUN npm -g config set registry http://registry.npmjs.org/

RUN cd /opt/scrumblr
RUN npm install

CMD node server.js --port 80 --redis redis://redis:6379

