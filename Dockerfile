FROM node:24.11.0-alpine3.22 AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_URL=https://build.invalid \
    BETTER_AUTH_SECRET=build_time_only_random_7e0c22d80e1b49c9b50dc94ee3651f30 \
    GOOGLE_CLIENT_ID=build-client-id \
    GOOGLE_CLIENT_SECRET=build-client-secret \
    MINIO_BUCKET=build-bucket \
    S3_ENDPOINT=http://127.0.0.1:9000 \
    S3_REGION=us-east-1 \
    S3_ACCESS_KEY=build-access-key \
    S3_SECRET_KEY=build-secret-key \
    S3_FORCE_PATH_STYLE=true \
    OLLAMA_BASE_URL=http://127.0.0.1:11434 \
    OLLAMA_MODEL=qwen3.5:2b \
    npm run build

FROM base AS demo-seeder
RUN npm install --no-save --package-lock=false \
    @aws-sdk/client-s3@3.1085.0 \
    @prisma/adapter-pg@7.8.0 \
    @prisma/client@7.8.0 \
    dotenv@17.4.2 \
    pdfkit@0.19.1 \
    pg@8.22.0 \
    prisma@7.8.0 \
    tsx@4.23.1 \
    zod@4.4.3 \
    && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build ./node_modules/.bin/prisma generate
COPY tsconfig.json ./tsconfig.json
COPY scripts ./scripts
COPY src/shared/infrastructure/object-storage ./src/shared/infrastructure/object-storage
COPY public/fonts/pretendard ./public/fonts/pretendard
COPY public/mock ./public/mock
CMD ["./node_modules/.bin/tsx", "scripts/seed-demo-data.ts"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]

FROM base AS migrator
RUN npm install --omit=dev --no-save --package-lock=false prisma@7.8.0 dotenv@17.4.2 \
    && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]
