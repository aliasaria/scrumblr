FROM node:22-slim
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

USER node
EXPOSE 8080
CMD ["node", "server.js", "--server:port=8080"]
