FROM node:20-alpine

WORKDIR /common-api
COPY . .
RUN npm ci

CMD ["npm", "run", "start"]
