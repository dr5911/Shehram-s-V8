FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

RUN npm install
RUN cd packages/backend && npm install

COPY packages/backend ./packages/backend

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["npm", "run", "dev"]
