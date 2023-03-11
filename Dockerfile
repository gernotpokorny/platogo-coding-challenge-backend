FROM node:18.15.0

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3001

CMD [ "node", "build/index.js" ]