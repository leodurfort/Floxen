# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/test-generator/package.json ./apps/test-generator/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy test-generator source
COPY apps/test-generator ./apps/test-generator

# Build test-generator
WORKDIR /app/apps/test-generator
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output (includes node_modules with resolved deps)
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
