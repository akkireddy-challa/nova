import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { decodeHtmlEntities } from '../web-grounding';

export const PAGE_TIMEOUT_MS = 8000;
export const PAGE_MAX_BYTES = 200 * 1024;
export const PAGE_MAX_CHARS = 6000;
const MAX_REDIRECTS = 3;

/** Resolves a hostname to its IP addresses. Injectable so tests never touch DNS. */
export type HostLookup = (hostname: string) => Promise<string[]>;

export const defaultLookup: HostLookup = async hostname => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map(r => r.address);
};

export interface FetchedPage {
  url: string;
  title?: string;
  text: string;
  bytes: number;
}

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnsafeUrlError';
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_IPV4_RANGES: [string, number][] = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
];

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  // IPv4-mapped / compatible addresses: ::ffff:127.0.0.1 or ::ffff:7f00:1
  const mappedDotted = lower.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) return isPrivateIpv4(mappedDotted[1]);
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const firstGroup = parseInt(lower.split(':')[0] || '0', 16);
  if ((firstGroup & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstGroup & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((firstGroup & 0xff00) === 0xff00) return true; // multicast
  if (lower.startsWith('64:ff9b:')) return true; // NAT64 can reach IPv4 internals
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/**
 * Synchronous URL check: http(s) only, no credentials, no private/loopback IP
 * literals or local hostnames. Returns the parsed URL or throws UnsafeUrlError.
 */
export function assertPublicUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(`blocked protocol ${url.protocol}`);
  }
  if (url.username || url.password) throw new UnsafeUrlError('credentials in URL');
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!host) throw new UnsafeUrlError('missing host');
  if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some(s => host.endsWith(s))) {
    throw new UnsafeUrlError('blocked local hostname');
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('blocked private address');
  } else if (!host.includes('.')) {
    // Single-label names resolve against the local network's search domains.
    throw new UnsafeUrlError('blocked single-label hostname');
  }
  return url;
}

export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    assertPublicUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

/** Full check including DNS: every resolved address must be public. */
export async function assertPublicHost(url: URL, lookup: HostLookup): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return; // already checked by assertPublicUrl
  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    throw new UnsafeUrlError('host did not resolve');
  }
  if (addresses.length === 0) throw new UnsafeUrlError('host did not resolve');
  if (addresses.some(isPrivateAddress)) throw new UnsafeUrlError('host resolves to a private address');
}

/** Converts an HTML document to readable plain text. */
export function htmlToText(html: string): { title?: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() || undefined : undefined;
  const text = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template|iframe|head|nav|footer|form)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|blockquote|pre)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { title, text };
}

async function readCapped(res: Response, maxBytes: number): Promise<{ body: string; bytes: number }> {
  if (!res.body) return { body: '', bytes: 0 };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = maxBytes - bytes;
    const chunk = value.byteLength > room ? value.subarray(0, room) : value;
    chunks.push(chunk);
    bytes += chunk.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder('utf-8', { fatal: false }).decode(merged), bytes };
}

export interface FetchPageOptions {
  lookup?: HostLookup;
  timeoutMs?: number;
  maxBytes?: number;
  maxChars?: number;
}

/**
 * Fetches a public HTML page server-side and returns its readable text.
 * Redirects are followed manually so every hop passes the SSRF guard.
 */
export async function fetchPageText(rawUrl: string, options: FetchPageOptions = {}): Promise<FetchedPage> {
  const lookup = options.lookup ?? defaultLookup;
  const maxBytes = options.maxBytes ?? PAGE_MAX_BYTES;
  const maxChars = options.maxChars ?? PAGE_MAX_CHARS;
  const signal = AbortSignal.timeout(options.timeoutMs ?? PAGE_TIMEOUT_MS);

  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = assertPublicUrl(current);
    await assertPublicHost(url, lookup);
    const res = await fetch(url.toString(), {
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NovaResearch/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!location) throw new Error(`HTTP ${res.status} without location`);
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      await res.body?.cancel().catch(() => undefined);
      throw new Error(`not HTML (${contentType.split(';')[0] || 'unknown type'})`);
    }
    const { body, bytes } = await readCapped(res, maxBytes);
    const { title, text } = htmlToText(body);
    return { url: url.toString(), title, text: text.slice(0, maxChars), bytes };
  }
  throw new Error('too many redirects');
}
