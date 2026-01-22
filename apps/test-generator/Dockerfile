# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/test-generator/package.json ./apps/test-generator/

# Install dependencies with npm
RUN npm install

# Copy test-generator source
COPY apps/test-generator ./apps/test-generator

# Build test-generator
WORKDIR /app/apps/test-generator
RUN npm run build

# Production stage - run full Next.js (not standalone)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built app and node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next ./apps/test-generator/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/public ./apps/test-generator/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/package.json ./apps/test-generator/
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/next.config.js ./apps/test-generator/

WORKDIR /app/apps/test-generator

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "next", "start", "-p", "3000"]
