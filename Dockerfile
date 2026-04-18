# ---- build client ----
FROM node:20-alpine AS build-client
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
COPY client ./client
RUN npm run build -w client

# ---- build server ----
FROM node:20-alpine AS build-server
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
COPY server ./server
RUN npm run build -w server

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --omit=dev
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-client /app/client/dist ./client/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
