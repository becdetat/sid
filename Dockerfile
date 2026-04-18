# ---- build client ----
FROM node:20-alpine AS build-client
WORKDIR /app
COPY client/package*.json ./client/
RUN npm ci --prefix client
COPY client ./client
RUN npm run build --prefix client

# ---- build server ----
FROM node:20-alpine AS build-server
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server
COPY server ./server
RUN npm run build --prefix server

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-client /app/client/dist ./client/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
