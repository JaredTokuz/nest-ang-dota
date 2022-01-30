FROM node:14-alpine3.14
WORKDIR /app
COPY . .
WORKDIR /app/rest-api
RUN npm i
WORKDIR /app
CMD ["npm", "run", "rest"]
