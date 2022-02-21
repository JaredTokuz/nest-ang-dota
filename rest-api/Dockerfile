FROM node:14-alpine
WORKDIR /app
COPY . .

RUN npm ci --only=production

CMD ["npm","run","start:prod"]
