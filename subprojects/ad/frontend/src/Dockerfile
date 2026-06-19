#FROM node:20-alpine AS deps
FROM sjb-storage-registry.cn-hangzhou.cr.aliyuncs.com/ops_new/node-python:24.13.0 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

#FROM node:20-alpine AS builder
FROM sjb-storage-registry.cn-hangzhou.cr.aliyuncs.com/ops_new/node-python:24.13.0 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

#FROM node:20-alpine AS runner
FROM sjb-storage-registry.cn-hangzhou.cr.aliyuncs.com/ops_new/node-python:24.13.0 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
RUN corepack enable
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
