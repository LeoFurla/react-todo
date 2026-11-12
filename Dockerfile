# Build stage: compiles the frontend bundle
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: server + prebuilt dist, runs as the unprivileged "node" user
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
RUN mkdir /avatars && chown node:node /avatars
USER node
CMD ["node", "server/index.js"]
