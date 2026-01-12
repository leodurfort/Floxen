# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspaces
COPY package*.json ./
COPY apps/test-generator/package.json ./apps/test-generator/

# Install all dependencies
RUN npm ci

# Copy test-generator source
COPY apps/test-generator ./apps/test-generator

# Build test-generator
WORKDIR /app/apps/test-generator
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next/static ./apps/test-generator/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/test-generator/server.js"]
