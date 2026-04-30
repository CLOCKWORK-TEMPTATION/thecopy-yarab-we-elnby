# syntax=docker/dockerfile:1.7
# Cache breaker: removed packages/ui and packages/shared
FROM node:24-alpine AS builder

RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ ca-certificates

RUN corepack enable && \
    corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT_MODE=standalone \
    NEXT_BUILD_CPUS=1 \
    NEXT_STATIC_GENERATION_MAX_CONCURRENCY=1 \
    NEXT_WEBPACK_MEMORY_OPTIMIZATIONS=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_OPTIONS=--max-old-space-size=4096

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
ARG NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=http://localhost:3001/api/file-extract
ARG NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=http://localhost:3001/api/final-review

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=$NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL \
    NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=$NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY packages/breakapp/package.json ./packages/breakapp/
COPY packages/core-memory/package.json ./packages/core-memory/
COPY packages/prompt-engineering/package.json ./packages/prompt-engineering/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install dependencies after manifests so Docker layer caching remains effective on Railway.
RUN --mount=type=secret,id=tiptap_pro_token,required=true \
    export TIPTAP_PRO_TOKEN="$(cat /run/secrets/tiptap_pro_token | tr -d '\r\n')" && \
    if [ -z "$TIPTAP_PRO_TOKEN" ]; then \
      echo "Missing or empty TIPTAP_PRO_TOKEN secret"; \
      exit 1; \
    fi && \
    pnpm config set auto-install-peers false && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm config set fetch-timeout 120000 && \
    pnpm install --frozen-lockfile --filter @the-copy/web... && \
    sed -i '/^\/\/registry\.tiptap\.dev\/:_authToken=/d' .npmrc

# Copy only source packages needed for build
COPY apps/web/ ./apps/web/
COPY packages/breakapp/ ./packages/breakapp/
COPY packages/core-memory/ ./packages/core-memory/
COPY packages/prompt-engineering/ ./packages/prompt-engineering/
COPY packages/tsconfig/ ./packages/tsconfig/

RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @the-copy/web build

# Minimal runtime stage - only production files
FROM node:24-alpine AS runner

RUN apk add --no-cache ca-certificates && \
    corepack enable && \
    corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=5000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 5000

CMD ["node", "apps/web/server.js"]
