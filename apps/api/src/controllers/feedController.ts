/**
 * Feed Controller
 *
 * Public endpoints for accessing the OpenAI product feed.
 * - GET /feed/:shopId - Raw JSON feed for OpenAI consumption
 * - GET /feed/:shopId/view - HTML table for debugging/preview
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Get raw JSON feed for a shop
 * This is the endpoint OpenAI will fetch from
 */
export async function getFeedJson(req: Request, res: Response) {
  const { shopId } = req.params;

  try {
    const snapshot = await prisma.feedSnapshot.findUnique({
      where: { shopId },
      include: {
        shop: {
          select: { sellerName: true, isConnected: true },
        },
      },
    });

    if (!snapshot) {
      logger.warn('feed:json - No feed found', { shopId });
      return res.status(404).json({
        error: 'Feed not found',
        message: 'No feed has been generated for this shop yet. Trigger a sync first.',
      });
    }

    logger.info('feed:json - Serving feed', {
      shopId,
      productCount: snapshot.productCount,
      generatedAt: snapshot.generatedAt,
    });

    // Return the feed data directly (OpenAI format)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Feed-Generated-At', snapshot.generatedAt.toISOString());
    res.setHeader('X-Feed-Product-Count', snapshot.productCount.toString());

    return res.json(snapshot.feedData);
  } catch (err: any) {
    logger.error('feed:json error', { shopId, error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve feed' });
  }
}

/**
 * Get HTML view of the feed for debugging
 */
export async function getFeedHtml(req: Request, res: Response) {
  const { shopId } = req.params;

  try {
    const snapshot = await prisma.feedSnapshot.findUnique({
      where: { shopId },
      include: {
        shop: {
          select: { sellerName: true, wooStoreUrl: true },
        },
      },
    });

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
      productCount: items.length,
    });

    // Build HTML table
    const html = buildFeedHtml(snapshot, feedData, items, seller, shopId);

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

/**
 * Build the HTML page for feed visualization
 */
function buildFeedHtml(
  snapshot: any,
  feedData: any,
  items: any[],
  seller: any,
  shopId: string
): string {
  // Get all unique keys from items for table headers
  const allKeys = new Set<string>();
  items.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });

  // Priority order for columns
  const priorityKeys = [
    'id', 'title', 'price', 'availability', 'enable_search', 'enable_checkout',
    'image_link', 'brand', 'product_category', 'inventory_quantity'
  ];

  const sortedKeys = [
    ...priorityKeys.filter(k => allKeys.has(k)),
    ...Array.from(allKeys).filter(k => !priorityKeys.includes(k)).sort()
  ];

  const tableRows = items.map((item, idx) => {
    const cells = sortedKeys.map(key => {
      let value = item[key];

      // Format special values
      if (value === null || value === undefined) {
        return '<td class="null">-</td>';
      }
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      // Truncate long values
      const displayValue = String(value).length > 100
        ? String(value).substring(0, 100) + '...'
        : String(value);

      // Special styling for certain columns
      if (key === 'image_link') {
        return `<td><img src="${value}" alt="" style="max-width: 60px; max-height: 60px;" onerror="this.style.display='none'"/></td>`;
      }
      if (key === 'enable_search' || key === 'enable_checkout') {
        const isTrue = value === 'true' || value === true;
        return `<td class="${isTrue ? 'badge-green' : 'badge-gray'}">${value}</td>`;
      }
      if (key === 'availability') {
        const colorClass = value === 'in_stock' ? 'badge-green' : value === 'out_of_stock' ? 'badge-red' : 'badge-yellow';
        return `<td class="${colorClass}">${value}</td>`;
      }

      return `<td title="${String(value).replace(/"/g, '&quot;')}">${escapeHtml(displayValue)}</td>`;
    }).join('');

    return `<tr>${cells}</tr>`;
  }).join('');

  const tableHeaders = sortedKeys.map(key => `<th>${escapeHtml(key)}</th>`).join('');

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
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container { max-width: 100%; overflow-x: auto; }
    .header {
      background: #1a1a2e;
      color: white;
      padding: 20px 30px;
      margin: -20px -20px 20px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .header h1 { margin: 0; font-size: 1.5rem; }
    .header-meta { font-size: 0.9rem; opacity: 0.8; }
    .stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .stat {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value { font-size: 1.5rem; font-weight: 600; color: #1a1a2e; }
    .stat-label { font-size: 0.8rem; color: #666; margin-top: 4px; }
    .seller-info {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .seller-info h3 { margin: 0 0 10px 0; font-size: 1rem; }
    .seller-info p { margin: 5px 0; font-size: 0.9rem; color: #555; }
    .actions { margin-bottom: 20px; }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #1a1a2e;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-right: 10px;
    }
    .btn:hover { background: #2d2d44; }
    .btn-secondary { background: #6c757d; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      font-size: 0.85rem;
    }
    th {
      background: #1a1a2e;
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-weight: 500;
      white-space: nowrap;
      position: sticky;
      top: 0;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #eee;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    tr:hover td { background: #f8f9fa; }
    .null { color: #aaa; font-style: italic; }
    .badge-green {
      background: #d4edda;
      color: #155724;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .badge-red {
      background: #f8d7da;
      color: #721c24;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .badge-yellow {
      background: #fff3cd;
      color: #856404;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .badge-gray {
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .json-link {
      background: #28a745;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.85rem;
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
    <a href="/api/v1/feed/${shopId}" class="json-link">View Raw JSON</a>
  </div>

  <div class="container">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${items.length}</div>
        <div class="stat-label">Products in Feed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${sortedKeys.length}</div>
        <div class="stat-label">Fields per Product</div>
      </div>
      <div class="stat">
        <div class="stat-value">${new Date(snapshot.generatedAt).toLocaleString()}</div>
        <div class="stat-label">Generated At</div>
      </div>
    </div>

    <div class="seller-info">
      <h3>Seller Information</h3>
      <p><strong>ID:</strong> ${escapeHtml(seller.id || '-')}</p>
      <p><strong>Name:</strong> ${escapeHtml(seller.name || '-')}</p>
      <p><strong>URL:</strong> ${seller.url ? `<a href="${escapeHtml(seller.url)}" target="_blank">${escapeHtml(seller.url)}</a>` : '-'}</p>
      <p><strong>Privacy Policy:</strong> ${seller.privacy_policy ? `<a href="${escapeHtml(seller.privacy_policy)}" target="_blank">View</a>` : '-'}</p>
      <p><strong>Terms of Service:</strong> ${seller.terms_of_service ? `<a href="${escapeHtml(seller.terms_of_service)}" target="_blank">View</a>` : '-'}</p>
    </div>

    <h2 style="margin: 20px 0 15px 0; font-size: 1.1rem;">Products (${items.length})</h2>

    <table>
      <thead>
        <tr>${tableHeaders}</tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="100%" style="text-align: center; padding: 40px;">No products in feed</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
}

/**
 * Escape HTML special characters
 */
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
