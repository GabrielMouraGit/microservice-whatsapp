FROM node:22.14.0

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg

COPY package*.json ./

COPY . .

RUN npm i

EXPOSE 3060
