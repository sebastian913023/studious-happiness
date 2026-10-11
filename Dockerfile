# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=5000 DATABASE_PATH=/data/data.db
RUN apk add --no-cache python3 make g++ && mkdir -p /data
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && apk del python3 make g++
COPY --from=build /app/dist ./dist
VOLUME ["/data"]
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
USER node
CMD ["node", "dist/index.cjs"]
