FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files from root and packages
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/product-checker/package.json ./apps/product-checker/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/landing/package.json ./apps/landing/
COPY apps/test-generator/package.json ./apps/test-generator/

RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first, then product-checker
RUN npm run build:shared
RUN npm run build:product-checker

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/product-checker/.next ./apps/product-checker/.next
COPY --from=builder /app/apps/product-checker/public ./apps/product-checker/public
COPY --from=builder /app/apps/product-checker/package.json ./apps/product-checker/
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["npm", "run", "start:product-checker"]
