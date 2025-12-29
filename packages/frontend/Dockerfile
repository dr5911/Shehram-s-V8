FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/

RUN npm install
RUN cd packages/frontend && npm install

COPY packages/frontend ./packages/frontend

WORKDIR /app/packages/frontend

EXPOSE 3000

CMD ["npm", "start"]
