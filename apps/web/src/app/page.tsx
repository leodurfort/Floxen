import Link from 'next/link';
import { Product } from '@productsynch/shared';

const sampleProducts: Product[] = [
  {
    id: 'prod_a',
    shopId: 'shop_demo',
    wooProductId: 101,
    wooTitle: 'Lumen Desk Lamp',
    wooDescription: 'Minimal lamp with adjustable neck and warm LED.',
    wooSku: 'LAMP-101',
    wooPrice: '120.00',
    status: 'SYNCED',
    syncStatus: 'COMPLETED',
    lastSyncedAt: new Date().toISOString(),
    aiEnriched: true,
    feedEnableSearch: true,
    feedEnableCheckout: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_b',
    shopId: 'shop_demo',
    wooProductId: 102,
    wooTitle: 'Orbit Chair',
    wooDescription: 'Ergonomic task chair with breathable mesh back.',
    wooSku: 'CHAIR-204',
    wooPrice: '320.00',
    status: 'PENDING_REVIEW',
    syncStatus: 'PENDING',
    lastSyncedAt: null,
    aiEnriched: false,
    feedEnableSearch: true,
    feedEnableCheckout: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_c',
    shopId: 'shop_demo',
    wooProductId: 103,
    wooTitle: 'Atlas Hoodie',
    wooDescription: 'Heavyweight fleece hoodie for all-day comfort.',
    wooSku: 'HD-204',
    wooPrice: '68.00',
    status: 'APPROVED',
    syncStatus: 'COMPLETED',
    lastSyncedAt: new Date().toISOString(),
    aiEnriched: true,
    feedEnableSearch: true,
    feedEnableCheckout: false,
    updatedAt: new Date().toISOString(),
  },
];

export default function HomePage() {
  return (
    <main className="shell space-y-6">
      <section className="panel hero-grid">
        <div className="space-y-4">
          <p className="uppercase tracking-[0.2em] text-xs text-white/70">ProductSynch</p>
          <h1 className="section-title font-display">One-click sync from WooCommerce to ChatGPT</h1>
          <p className="subtle max-w-2xl">
            Connect your store, enrich listings with AI, and push a compliant OpenAI product feed on a schedule.
            Control manual overrides, review diffs, and keep every SKU in lockstep.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn--primary">Connect WooCommerce Store</button>
            <button className="btn">View API reference</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="pill">OAuth + Webhooks</span>
            <span className="pill">Feed Preview</span>
            <span className="pill">AI Enrichment</span>
          </div>
        </div>
        <div className="preview space-y-3">
          <p className="subtle text-sm">Sync snapshot</p>
          <div className="space-y-2">
            {sampleProducts.slice(0, 2).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div>
                  <p className="font-semibold">{p.wooTitle}</p>
                  <p className="text-sm subtle">SKU {p.wooSku}</p>
                </div>
                <span className={`badge ${p.syncStatus === 'COMPLETED' ? 'badge--success' : 'badge--warn'}`}>
                  {p.syncStatus === 'COMPLETED' ? 'Synced' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm subtle">
            Every 15 minutes ProductSynch polls WooCommerce, applies AI enrichment, and regenerates the OpenAI feed.
          </p>
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Ops</p>
            <h2 className="section-title">Sync health</h2>
          </div>
          <div className="flex gap-2">
            <button className="btn btn--primary">Trigger sync</button>
            <button className="btn">Enrich 50 pending</button>
          </div>
        </div>
        <div className="stat-grid">
          {[
            { label: 'Total products', value: '482', detail: '+12 this week' },
            { label: 'Synced to ChatGPT', value: '468', detail: '97% coverage' },
            { label: 'AI enriched', value: '451', detail: 'GPT-4' },
            { label: 'ChatGPT impressions', value: '15,120', detail: '+12.5%' },
            { label: 'Sync status', value: 'Idle', detail: 'Next at :15' },
          ].map((item) => (
            <div key={item.label} className="stat-card">
              <p className="subtle text-sm">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-sm subtle">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Catalog</p>
            <h2 className="section-title">Products</h2>
          </div>
          <div className="flex gap-2">
            <button className="btn">Filter</button>
            <button className="btn btn--primary">Bulk sync</button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>AI</th>
                <th>Status</th>
                <th>Last synced</th>
              </tr>
            </thead>
            <tbody>
              {sampleProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-semibold">{p.wooTitle}</div>
                    <div className="subtle text-sm">SKU {p.wooSku}</div>
                  </td>
                  <td>${p.wooPrice}</td>
                  <td>{p.aiEnriched ? <span className="badge badge--success">Enriched</span> : <span className="badge badge--warn">Pending</span>}</td>
                  <td>{p.syncStatus === 'COMPLETED' ? 'Synced' : 'Pending'}</td>
                  <td className="subtle text-sm">{p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/shops/shop_demo/products" className="btn">
            View full catalog
          </Link>
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Feed</p>
            <h2 className="section-title">OpenAI product feed</h2>
          </div>
          <button className="btn btn--primary">Preview JSON feed</button>
        </div>
        <p className="subtle max-w-3xl">
          Every sync generates a feed JSON that matches OpenAI’s Product Feed schema, including pricing, inventory,
          SEO-friendly metadata, and AI-enriched Q&A. Use the preview to validate before pushing.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="stat-card">
            <p className="subtle text-sm">Generated</p>
            <p className="text-lg font-semibold">12 minutes ago</p>
          </div>
          <div className="stat-card">
            <p className="subtle text-sm">File size</p>
            <p className="text-lg font-semibold">4.8 MB</p>
          </div>
          <div className="stat-card">
            <p className="subtle text-sm">Validations</p>
            <p className="text-lg font-semibold">No errors</p>
          </div>
        </div>
      </section>
    </main>
  );
}
