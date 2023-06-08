FROM node:13.11.0-slim 
ENV NODE_ENV=production

COPY . .

RUN npm install

EXPOSE 1000
CMD node server.js --server:port=1000 --redis:url=redis://redis-dock:6379
