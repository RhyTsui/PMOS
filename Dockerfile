ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE}
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
ENV AI_OS_ROOT=/app
ENV PORT=4312
EXPOSE 4312
CMD ["node", "dist/backend/src/backend/server.js"]
