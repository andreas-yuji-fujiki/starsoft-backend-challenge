FROM node:18-alpine AS development

WORKDIR /app

RUN apk add --no-cache curl netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .

RUN chmod +x entrypoint.sh
RUN npm run build

EXPOSE 3000

CMD ["sh", "./entrypoint.sh"]
