/**
 * Feed Controller
 *
 * Public endpoints for accessing the OpenAI product feed.
 * - GET /feed/:shopId - Raw JSON feed for OpenAI consumption (latest)
 * - GET /feed/:shopId/view - HTML table for debugging/preview (supports ?snapshot=id)
 * - GET /feed/:shopId/snapshots - List available snapshots (past 7 days)
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { OPENAI_FEED_SPEC } from '@floxen/shared';

// Helper to get snapshot by ID or latest
async function getSnapshot<T extends object>(
  shopId: string,
  snapshotId: string | undefined,
  include?: T
) {
  const where = snapshotId ? { id: snapshotId, shopId } : { shopId };
  return prisma.feedSnapshot.findFirst({
    where,
    orderBy: snapshotId ? undefined : { generatedAt: 'desc' },
    include: include as any,
  });
}

export async function getFeedJson(req: Request, res: Response) {
  const { shopId } = req.params;
  const { snapshot: snapshotId } = req.query;

  try {
    const snapshot = await getSnapshot(shopId, snapshotId as string | undefined);

    if (!snapshot) {
      logger.warn('feed:json - No feed found', { shopId, snapshotId });
      return res.status(404).json({
        error: 'Feed not found',
        message: 'No feed has been generated for this shop yet. Trigger a sync first.',
      });
    }

    const feedData = snapshot.feedData as any;
    const items = feedData.items || [];

    logger.info('feed:jsonl - Serving feed', {
      shopId,
      snapshotId: snapshot.id,
      productCount: items.length,
      generatedAt: snapshot.generatedAt,
    });

    const jsonl = items.map((item: any) => JSON.stringify(item)).join('\n');

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('X-Feed-Generated-At', snapshot.generatedAt.toISOString());
    res.setHeader('X-Feed-Product-Count', items.length.toString());
    res.setHeader('X-Feed-Snapshot-Id', snapshot.id);

    return res.send(jsonl);
  } catch (err: any) {
    logger.error('feed:json error', { shopId, error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve feed' });
  }
}

export async function listSnapshots(req: Request, res: Response) {
  const { shopId } = req.params;

  try {
    const snapshots = await prisma.feedSnapshot.findMany({
      where: { shopId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        productCount: true,
        generatedAt: true,
      },
    });

    return res.json({
      shopId,
      count: snapshots.length,
      snapshots,
    });
  } catch (err: any) {
    logger.error('feed:snapshots error', { shopId, error: err.message });
    return res.status(500).json({ error: 'Failed to list snapshots' });
  }
}

export async function getFeedHtml(req: Request, res: Response) {
  const { shopId } = req.params;
  const { snapshot: snapshotId } = req.query;

  try {
    const allSnapshots = await prisma.feedSnapshot.findMany({
      where: { shopId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        productCount: true,
        generatedAt: true,
      },
    });

    const snapshot = await getSnapshot(
      shopId,
      snapshotId as string | undefined,
      { shop: { select: { sellerName: true, wooStoreUrl: true } } }
    );

    if (!snapshot) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Feed Not Found</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Feed Not Found</h1>
          <p>No feed has been generated for shop ID: ${shopId}</p>
          <p>Trigger a sync first to generate the feed.</p>
        </body>
        </html>
      `);
    }

    const feedData = snapshot.feedData as any;
    const items = feedData.items || [];
    const seller = feedData.seller || {};

    logger.info('feed:html - Serving feed view', {
      shopId,
      snapshotId: snapshot.id,
      productCount: items.length,
    });

    // Build HTML table with snapshot selector
    const html = buildFeedHtml(snapshot, feedData, items, seller, shopId, allSnapshots);

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err: any) {
    logger.error('feed:html error', { shopId, error: err.message });
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: system-ui; padding: 40px;">
        <h1>Error</h1>
        <p>Failed to retrieve feed: ${err.message}</p>
      </body>
      </html>
    `);
  }
}

function buildFeedHtml(
  snapshot: any,
  feedData: any,
  items: any[],
  seller: any,
  shopId: string,
  allSnapshots: Array<{ id: string; productCount: number; generatedAt: Date }>
): string {
  const allFields = OPENAI_FEED_SPEC.map(spec => ({
    attribute: spec.attribute,
    requirement: spec.requirement,
    category: spec.category,
  }));

  const fieldStats = new Map<string, number>();
  allFields.forEach(f => fieldStats.set(f.attribute, 0));
  items.forEach(item => {
    allFields.forEach(f => {
      if (item[f.attribute] !== null && item[f.attribute] !== undefined) {
        fieldStats.set(f.attribute, (fieldStats.get(f.attribute) || 0) + 1);
      }
    });
  });

  const filledFieldCount = Array.from(fieldStats.values()).filter(v => v > 0).length;

  const tableRows = items.map((item, idx) => {
    const cells = allFields.map(({ attribute: key }) => {
      let value = item[key];

      if (value === null || value === undefined) {
        return '<td class="cell-null">—</td>';
      }
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      const displayValue = String(value).length > 80
        ? String(value).substring(0, 80) + '...'
        : String(value);

      if (key === 'enable_search' || key === 'enable_checkout') {
        const isTrue = value === 'true' || value === true;
        return `<td class="cell-badge ${isTrue ? 'badge-green' : 'badge-gray'}">${value}</td>`;
      }
      if (key === 'availability') {
        const colorClass = value === 'in_stock' ? 'badge-green' : value === 'out_of_stock' ? 'badge-red' : 'badge-yellow';
        return `<td class="cell-badge ${colorClass}">${value}</td>`;
      }

      return `<td class="cell-value" title="${escapeHtml(String(value))}">${escapeHtml(displayValue)}</td>`;
    }).join('');

    return `<tr><td class="row-num">${idx + 1}</td>${cells}</tr>`;
  }).join('');

  const tableHeaders = allFields.map(({ attribute, requirement }) => {
    const reqClass = requirement === 'Required' ? 'req-required' :
                     requirement === 'Recommended' ? 'req-recommended' :
                     requirement === 'Conditional' ? 'req-conditional' : 'req-optional';
    const filled = fieldStats.get(attribute) || 0;
    const fillPercent = items.length > 0 ? Math.round((filled / items.length) * 100) : 0;
    const fillClass = fillPercent === 100 ? 'fill-100' : fillPercent > 0 ? 'fill-partial' : 'fill-0';

    return `<th class="${reqClass}">
      <div class="th-content">
        <span class="th-name">${escapeHtml(attribute)}</span>
        <span class="th-meta ${fillClass}">${fillPercent}%</span>
      </div>
    </th>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feed: ${escapeHtml(seller.name || shopId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header h1 { margin: 0; font-size: 1.4rem; }
    .header-meta { font-size: 0.85rem; opacity: 0.8; }
    .content { padding: 20px; }
    .stats {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .stat {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      min-width: 120px;
    }
    .stat-value { font-size: 1.4rem; font-weight: 600; color: #1a1a2e; }
    .stat-label { font-size: 0.75rem; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legend {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }
    .legend-title { font-weight: 600; font-size: 0.85rem; color: #333; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    .legend-dot.req { background: #dc3545; }
    .legend-dot.rec { background: #fd7e14; }
    .legend-dot.cond { background: #6f42c1; }
    .legend-dot.opt { background: #6c757d; }
    .seller-info {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .seller-info h3 { margin: 0 0 10px 0; font-size: 0.95rem; color: #1a1a2e; }
    .seller-info p { margin: 5px 0; font-size: 0.85rem; color: #555; }
    .seller-info a { color: #007bff; }
    .table-container {
      overflow-x: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    th {
      background: #1a1a2e;
      color: white;
      padding: 0;
      text-align: left;
      font-weight: 500;
      position: sticky;
      top: 0;
      z-index: 10;
      border-left: 1px solid #2d2d44;
    }
    th:first-child { border-left: none; }
    .th-content {
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .th-name { font-size: 0.75rem; white-space: nowrap; }
    .th-meta {
      font-size: 0.65rem;
      padding: 2px 5px;
      border-radius: 3px;
      display: inline-block;
      width: fit-content;
    }
    .fill-100 { background: #28a745; color: white; }
    .fill-partial { background: #ffc107; color: #333; }
    .fill-0 { background: #6c757d; color: white; }
    .req-required { border-top: 3px solid #dc3545; }
    .req-recommended { border-top: 3px solid #fd7e14; }
    .req-conditional { border-top: 3px solid #6f42c1; }
    .req-optional { border-top: 3px solid #6c757d; }
    td {
      padding: 8px;
      border-bottom: 1px solid #eee;
      border-left: 1px solid #eee;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: top;
    }
    td:first-child { border-left: none; }
    tr:hover td { background: #f8f9fa; }
    .row-num {
      background: #f8f9fa;
      color: #666;
      font-weight: 500;
      text-align: center;
      width: 40px;
      position: sticky;
      left: 0;
      z-index: 5;
    }
    .cell-null { color: #ccc; text-align: center; font-size: 0.9rem; }
    .cell-value { color: #333; }
    .cell-image img { max-width: 50px; max-height: 50px; border-radius: 4px; }
    .cell-badge { text-align: center; }
    .badge-green {
      background: #d4edda;
      color: #155724;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-red {
      background: #f8d7da;
      color: #721c24;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-yellow {
      background: #fff3cd;
      color: #856404;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-gray {
      background: #e9ecef;
      color: #495057;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .snapshot-select {
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 0.85rem;
      cursor: pointer;
      min-width: 200px;
    }
    .snapshot-select:hover { background: rgba(255,255,255,0.2); }
    .snapshot-select option { background: #1a1a2e; color: white; }
    .json-link {
      background: #28a745;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .json-link:hover { background: #218838; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>OpenAI Product Feed</h1>
      <div class="header-meta">Shop: ${escapeHtml(seller.name || shopId)}</div>
    </div>
    <div class="header-actions">
      <select id="snapshot-select" class="snapshot-select">
        ${allSnapshots.map((s, i) => {
          const date = new Date(s.generatedAt);
          const label = date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          const isSelected = s.id === snapshot.id;
          const isCurrent = i === 0;
          return `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${label} (${s.productCount} products)${isCurrent ? ' - Latest' : ''}</option>`;
        }).join('')}
      </select>
      <a href="/api/v1/feed/${shopId}?snapshot=${snapshot.id}" class="json-link">View Raw JSON</a>
    </div>
  </div>

  <div class="content">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${items.length}</div>
        <div class="stat-label">Products</div>
      </div>
      <div class="stat">
        <div class="stat-value">${allFields.length}</div>
        <div class="stat-label">Total Fields</div>
      </div>
      <div class="stat">
        <div class="stat-value">${filledFieldCount}</div>
        <div class="stat-label">Fields with Data</div>
      </div>
      <div class="stat">
        <div class="stat-value">${allFields.length - filledFieldCount}</div>
        <div class="stat-label">Empty Fields</div>
      </div>
      <div class="stat">
        <div class="stat-value">${new Date(snapshot.generatedAt).toLocaleString()}</div>
        <div class="stat-label">Generated</div>
      </div>
    </div>

    <div class="legend">
      <span class="legend-title">Field Requirements:</span>
      <span class="legend-item"><span class="legend-dot req"></span> Required</span>
      <span class="legend-item"><span class="legend-dot rec"></span> Recommended</span>
      <span class="legend-item"><span class="legend-dot cond"></span> Conditional</span>
      <span class="legend-item"><span class="legend-dot opt"></span> Optional</span>
    </div>

    <div class="seller-info">
      <h3>Seller Information</h3>
      <p><strong>ID:</strong> ${escapeHtml(seller.id || '-')}</p>
      <p><strong>Name:</strong> ${escapeHtml(seller.name || '-')}</p>
      <p><strong>URL:</strong> ${seller.url ? `<a href="${escapeHtml(seller.url)}" target="_blank">${escapeHtml(seller.url)}</a>` : '-'}</p>
      <p><strong>Privacy Policy:</strong> ${seller.privacy_policy ? `<a href="${escapeHtml(seller.privacy_policy)}" target="_blank">View</a>` : '-'}</p>
      <p><strong>Terms of Service:</strong> ${seller.terms_of_service ? `<a href="${escapeHtml(seller.terms_of_service)}" target="_blank">View</a>` : '-'}</p>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr><th class="row-num">#</th>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="71" style="text-align: center; padding: 40px;">No products in feed</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    document.getElementById('snapshot-select').addEventListener('change', function(e) {
      window.location.href = '/api/v1/feed/${shopId}/view?snapshot=' + e.target.value;
    });
  </script>
</body>
</html>
  `;
}

export async function listShopFeeds(req: Request, res: Response) {
  try {
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        sellerName: true,
        wooStoreUrl: true,
        feedStatus: true,
        lastFeedGeneratedAt: true,
      },
      orderBy: { lastFeedGeneratedAt: 'desc' },
    });

    const rows = shops.map(shop => {
      const lastGen = shop.lastFeedGeneratedAt
        ? new Date(shop.lastFeedGeneratedAt).toLocaleString()
        : '—';
      const statusColor = shop.feedStatus === 'COMPLETED' ? '#28a745' :
                          shop.feedStatus === 'FAILED' ? '#dc3545' :
                          shop.feedStatus === 'SYNCING' ? '#ffc107' : '#6c757d';

      return `<tr>
        <td><code>${escapeHtml(shop.id)}</code></td>
        <td>${escapeHtml(shop.sellerName || '—')}</td>
        <td>${escapeHtml(shop.wooStoreUrl || '—')}</td>
        <td style="color: ${statusColor}; font-weight: 500;">${shop.feedStatus || '—'}</td>
        <td>${lastGen}</td>
        <td>
          <a href="/api/v1/feed/${shop.id}">JSON</a> |
          <a href="/api/v1/feed/${shop.id}/view">View</a> |
          <a href="/api/v1/feed/${shop.id}/snapshots">Snapshots</a>
        </td>
      </tr>`;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>All Shop Feeds - Admin Debug</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #1a1a2e; color: white; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:hover td { background: #f8f9fa; }
    code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .count { color: #666; margin-bottom: 15px; }
  </style>
</head>
<body>
  <h1>All Shop Feeds</h1>
  <p class="count">${shops.length} shop(s) found</p>
  <table>
    <thead>
      <tr>
        <th>Shop ID</th>
        <th>Seller Name</th>
        <th>Store URL</th>
        <th>Feed Status</th>
        <th>Last Generated</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align: center; padding: 40px;">No shops found</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err: any) {
    logger.error('feed:list error', { error: err.message });
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: system-ui; padding: 40px;">
        <h1>Error</h1>
        <p>Failed to list shops: ${err.message}</p>
      </body>
      </html>
    `);
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
