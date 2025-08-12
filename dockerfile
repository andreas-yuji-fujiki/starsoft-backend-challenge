# 1) build
FROM node:24-alpine AS builder

RUN apk add --no-cache git build-base python3

WORKDIR /usr/src/app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi

COPY tsconfig*.json ormconfig*.json ./  
COPY src ./src

RUN npm run build

# 2) production image
FROM node:24-alpine AS runner

RUN addgroup -S app && adduser -S -G app app
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

USER app

CMD ["node", "dist/main.js"]
