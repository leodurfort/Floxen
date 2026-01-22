# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/test-generator/package.json ./apps/test-generator/

# Install dependencies
RUN npm install

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

# Copy everything needed to run the app in a flat structure
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/test-generator/next.config.js ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
