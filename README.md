# Floxen Monorepo

This repository follows the Floxen technical specification (see `Floxen-Technical-Specification.md`). It is organized as a monorepo with a TypeScript Express API and a Next.js App Router frontend. Infra targets Railway (Postgres + Redis) and Resend for email.

## Structure

- `apps/api` — Express + TypeScript API with Prisma schema, JWT auth, WooCommerce connection, sync/feed/analytics endpoints, queue processing, and OpenAI/Resend integrations.
- `apps/web` — Next.js 14 dashboard shell (Tailwind CSS) with hero, auth pages, basic dashboard wired to API for shops/products, and feed summary inspired by the spec.
- `packages/shared` — Shared types (User, Shop, Product, enums) consumed by both apps.
- `tsconfig.base.json` — Base TS config and path aliases.

## Scripts (root)

- `npm run dev:api` — start the API in watch mode (uses `tsx`).
- `npm run dev:web` — start the Next.js dev server.
- `npm run build` — build both apps.
- `npm --workspace <app> run ...` — run scripts within a workspace.
- Set `NEXT_PUBLIC_API_URL` (e.g., http://localhost:3001) for the web app to call the API.

> Note: Network installs are restricted in this environment. To run locally, install dependencies first: `npm install` (root) then `npm run dev:api` and `npm run dev:web`.

## API routes (stubbed)

Base path: `/api/v1`

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- Shops: `GET/POST /shops`, `GET/PATCH/DELETE /shops/:id`, `POST /shops/:id/oauth/callback`, `POST /shops/:id/verify`
- Products: `GET /shops/:id/products`, `GET/PATCH /shops/:id/products/:pid`, `POST /shops/:id/products/:pid/enrich`, `GET /shops/:id/products/:pid/preview-feed`, `POST /shops/:id/products/bulk`
- Sync: `POST /shops/:id/sync`, `GET /shops/:id/sync/history`, `POST /shops/:id/sync/push`, `GET /shops/:id/sync/feed/preview`, `GET /shops/:id/sync/feed/download`
- Analytics: `GET /shops/:id/analytics/products`, `GET /shops/:id/analytics/timeline` (coming soon)
- Webhooks: `POST /webhooks/woocommerce/:shopId`

These endpoints use mock data for now and illustrate the payload shapes and routing required by the spec.

## Frontend

The dashboard landing page mirrors the spec’s priorities: store connection CTA, sync stats, product catalog snapshot, and feed preview tiles. Tailwind is configured, but you can swap in shadcn/ui or other components as you flesh out flows (shop connection wizard, product detail tabs, analytics charts, etc.).

## Next steps

- Wire real persistence (Prisma/PostgreSQL, Redis) and replace the mock store.
- Implement OAuth with WooCommerce, webhook signature verification, and job queues (BullMQ) for sync/enrichment.
- Expand the web app with the full navigation/layout, product detail flows, and analytics visualizations from the spec.
# Trigger deployment
