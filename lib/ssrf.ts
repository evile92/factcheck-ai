import { lookup } from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '::',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/**
 * Validates whether an IP address belongs to a private, reserved, or internal subnet.
 */
export function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!trimmed) return true;

  if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === '::' || trimmed === '0.0.0.0') {
    return true;
  }

  // Handle IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (trimmed.startsWith('::ffff:')) {
    const mapped = trimmed.slice(7);
    if (mapped.includes('.')) {
      return isPrivateIp(mapped);
    }
    return true;
  }

  // IPv4 checks
  const ipv4Parts = trimmed.split('.').map(Number);
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = ipv4Parts;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-grade NAT / internal shared space)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local & AWS/Azure/GCP metadata)
    if (a === 169 && b === 254) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 224.0.0.0/4 & 240.0.0.0/4 (Multicast / Reserved)
    if (a >= 224) return true;
  }

  // IPv6 checks (fe80:: link local, fc00::/fd00:: unique local)
  if (trimmed.startsWith('fe80:') || trimmed.startsWith('fc') || trimmed.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF attacks before allowing outbound network requests.
 * Blocks private IP spaces, localhost, cloud metadata endpoints, and non-http(s) protocols.
 */
export async function validateSafeUrl(urlString: string): Promise<{ valid: boolean; reason?: string; url?: URL }> {
  try {
    const parsed = new URL(urlString.trim());

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'فقط بروتوكول HTTP أو HTTPS مسموح به.' };
    }

    if (parsed.username || parsed.password) {
      return { valid: false, reason: 'الروابط المحتوية على بيانات اعتماد مدمجة غير مسموح بها.' };
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { valid: false, reason: 'محاولة الوصول إلى عنوان محلي أو محظور (Local/Internal Host).' };
    }

    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan') || hostname.endsWith('.localhost')) {
      return { valid: false, reason: 'نطاق داخلي غير مسموح به.' };
    }

    // Check if hostname is directly a private IP
    if (isPrivateIp(hostname)) {
      return { valid: false, reason: 'محاولة الوصول إلى عنوان IP داخلي أو محظور (Private/Restricted IP).' };
    }

    // Resolve DNS to prevent DNS rebinding or internal intranet hosts with timeout
    try {
      const lookupPromise = lookup(hostname, { all: true });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)
      );
      const records = await Promise.race([lookupPromise, timeoutPromise]);
      for (const rec of records) {
        if (isPrivateIp(rec.address)) {
          return { valid: false, reason: `عنوان النطاق موجه لشبكة داخلية محظورة: ${rec.address}` };
        }
      }
    } catch (dnsErr: any) {
      if (dnsErr.message !== 'DNS lookup timeout') {
        return { valid: false, reason: 'تعذر التحقق من صحة النطاق عبر خوادم الأسماء (DNS Lookup failed).' };
      }
    }

    return { valid: true, url: parsed };
  } catch (err: any) {
    return { valid: false, reason: `رابط غير صالح: ${err.message}` };
  }
}

/**
 * Fetches a URL safely with SSRF redirect protection and maximum byte limit.
 */
export async function safeFetchText(
  urlString: string,
  options?: { userAgent?: string; timeoutMs?: number; maxBytes?: number; maxRedirects?: number }
): Promise<{ ok: boolean; status: number; finalUrl: string; text: string; error?: string }> {
  const timeoutMs = options?.timeoutMs ?? 6000;
  const maxBytes = options?.maxBytes ?? 2 * 1024 * 1024; // 2MB
  const maxRedirects = options?.maxRedirects ?? 3;
  const userAgent =
    options?.userAgent ||
    'Mozilla/5.0 (compatible; FactCheckDesk/1.0; +https://factcheck-desk.netlify.app)';

  let currentUrl = urlString.trim();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = await validateSafeUrl(currentUrl);
    if (!check.valid) {
      return { ok: false, status: 400, finalUrl: currentUrl, text: '', error: check.reason };
    }

    const res = await fetch(currentUrl, {
      headers: { 'User-Agent': userAgent },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        return { ok: false, status: res.status, finalUrl: currentUrl, text: '', error: 'Missing redirect target' };
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      return { ok: false, status: res.status, finalUrl: currentUrl, text: '', error: `HTTP ${res.status}` };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { ok: true, status: res.status, finalUrl: currentUrl, text: text.slice(0, maxBytes) };
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          const remaining = value.byteLength - (totalBytes - maxBytes);
          if (remaining > 0) chunks.push(value.subarray(0, remaining));
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }

    const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.byteLength;
    }

    return {
      ok: true,
      status: res.status,
      finalUrl: currentUrl,
      text: new TextDecoder('utf-8', { fatal: false }).decode(combined),
    };
  }

  return { ok: false, status: 310, finalUrl: currentUrl, text: '', error: 'Too many redirects' };
}
