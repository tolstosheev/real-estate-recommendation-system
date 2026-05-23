FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm install -g serve

RUN chown -R node:node /app

USER node

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
