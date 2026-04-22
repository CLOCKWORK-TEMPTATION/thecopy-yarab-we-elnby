# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS builder

RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ ca-certificates

RUN corepack enable && \
    corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy dependency manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/core-memory/package.json ./packages/core-memory/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install dependencies after manifests so Docker layer caching remains effective on Railway.
RUN if [ -f .npmrc ]; then sed -i '/^\/\/registry\.tiptap\.dev\/:_authToken=/d' .npmrc; fi && \
    pnpm config set auto-install-peers false && \
    pnpm install --frozen-lockfile --filter @the-copy/backend...

COPY packages/tsconfig/ ./packages/tsconfig/
COPY apps/backend/ ./apps/backend/
COPY packages/core-memory/ ./packages/core-memory/
COPY packages/shared/ ./packages/shared/

RUN if [ -f apps/backend/.npmrc ]; then sed -i '/^\/\/registry\.tiptap\.dev\/:_authToken=/d' apps/backend/.npmrc; fi && \
    pnpm --filter @the-copy/core-memory build && \
    pnpm --filter @the-copy/backend build

FROM node:24-alpine AS runner

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache \
    antiword \
    poppler-utils \
    chromium \
    chromium-swiftshader \
    fontconfig \
    font-noto \
    font-noto-arabic \
    font-noto-cjk \
    font-dejavu \
    python3 \
    ca-certificates && \
    fc-cache -f && \
    ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app/apps/backend

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs -h /home/backenduser backenduser && \
    mkdir -p /app/apps/backend/tmp/mismatch-reports /app/apps/backend/editor-runtime/proofread-output /home/backenduser/.cache/node/corepack && \
    chown -R backenduser:nodejs /app /home/backenduser

ENV HOME=/home/backenduser
ENV COREPACK_HOME=/home/backenduser/.cache/node/corepack
ENV COREPACK_DEFAULT_TO_LATEST=0

RUN corepack enable && \
    corepack prepare pnpm@10.32.1 --activate && \
    chown -R backenduser:nodejs /home/backenduser/.cache/node/corepack

# Copy built artifacts from builder (single efficient layer)
COPY --chown=backenduser:nodejs --from=builder /app/node_modules /app/node_modules
COPY --chown=backenduser:nodejs --from=builder /app/apps/backend/ /app/apps/backend/
COPY --chown=backenduser:nodejs --from=builder /app/packages/core-memory/ /app/packages/core-memory/

RUN sed -i 's/\r$//' /app/apps/backend/docker-entrypoint.sh && \
    chmod +x /app/apps/backend/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV FILE_IMPORT_HOST=0.0.0.0
ENV FILE_IMPORT_PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox
ENV PUPPETEER_DISABLE_SANDBOX=false
ENV PUPPETEER_ALLOW_SANDBOX_FALLBACK=true
ENV ANTIWORD_PATH=/usr/bin/antiword
ENV ANTIWORDHOME=/usr/share/antiword
ENV PYTHONUTF8=1

USER backenduser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD ["node", "scripts/verify-runtime-health.mjs"]

ENTRYPOINT ["/app/apps/backend/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
