FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files from root and packages
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/landing/package.json ./apps/landing/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/test-generator/package.json ./apps/test-generator/

RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first, then landing
RUN npm run build:shared
RUN npm run build:landing

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/landing/.next ./apps/landing/.next
COPY --from=builder /app/apps/landing/public ./apps/landing/public
COPY --from=builder /app/apps/landing/package.json ./apps/landing/
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["npm", "run", "start:landing"]
