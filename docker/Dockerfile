FROM node:20-alpine

RUN apk add bash curl git

WORKDIR /common-api
COPY . .
RUN npm ci

CMD ["npm", "run", "start"]
