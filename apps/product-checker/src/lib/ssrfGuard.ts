/**
 * SSRF Guard — DNS-based Server-Side Request Forgery prevention.
 *
 * Resolves hostnames via DNS and blocks requests targeting private, loopback,
 * link-local, or otherwise reserved IP ranges.
 */

import dns from 'dns';

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class SsrfError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SsrfError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// IPv4 private / reserved range checks
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return false;

  const [a, b] = parts;

  // 0.0.0.0
  if (ip === '0.0.0.0') return true;

  // 127.0.0.0/8  — loopback
  if (a === 127) return true;

  // 10.0.0.0/8  — private
  if (a === 10) return true;

  // 172.16.0.0/12  — private (172.16.x.x – 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16  — private
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16  — link-local
  if (a === 169 && b === 254) return true;

  return false;
}

// ---------------------------------------------------------------------------
// IPv6 private / reserved range checks
// ---------------------------------------------------------------------------

function isPrivateIPv6(ip: string): boolean {
  const normalised = ip.toLowerCase();

  // ::1  — loopback
  if (normalised === '::1') return true;

  // ::  — unspecified
  if (normalised === '::') return true;

  // fc00::/7  — unique local addresses (fc00:: – fdff::)
  if (normalised.startsWith('fc') || normalised.startsWith('fd')) return true;

  // fe80::/10  — link-local
  if (normalised.startsWith('fe80')) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4Mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) {
    return isPrivateIPv4(v4Mapped[1]);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Blocked hostnames
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set(['localhost']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates that a URL does not resolve to a private or reserved IP address.
 *
 * @throws {SsrfError} If the URL targets a blocked address or the hostname
 *   cannot be parsed / resolved.
 */
export async function validateUrlSafety(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfError('INVALID_URL', `Unable to parse URL: ${url}`);
  }

  const { hostname, protocol } = parsed;

  // Only allow HTTP(S) schemes
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new SsrfError(
      'BLOCKED_PROTOCOL',
      `Protocol "${protocol}" is not allowed. Only http and https are permitted.`,
    );
  }

  // Block well-known dangerous hostnames
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new SsrfError(
      'BLOCKED_HOST',
      `Hostname "${hostname}" is not allowed.`,
    );
  }

  // If the hostname is already an IP literal, check it directly
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    throw new SsrfError(
      'BLOCKED_IP',
      `IP address "${hostname}" resolves to a private or reserved range.`,
    );
  }

  // Resolve DNS and check the resulting IP
  let address: string;
  try {
    const result = await dns.promises.lookup(hostname);
    address = result.address;
  } catch (err: any) {
    throw new SsrfError(
      'DNS_RESOLUTION_FAILED',
      `Failed to resolve hostname "${hostname}": ${err?.message ?? 'unknown error'}`,
    );
  }

  if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
    throw new SsrfError(
      'BLOCKED_IP',
      `Hostname "${hostname}" resolves to "${address}", which is a private or reserved IP range.`,
    );
  }
}
