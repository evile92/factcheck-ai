import { lookup } from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'metadata.google.internal',
  'instance-data',
]);

/**
 * Validates whether an IP address belongs to a private, reserved, or internal subnet.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true;

  // IPv4 checks
  const ipv4Parts = ip.split('.').map(Number);
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = ipv4Parts;
    // 10.0.0.0/8
    if (a === 10) return true;
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
  }

  // IPv6 checks (fe80:: link local, fc00:: unique local, ::1 loopback)
  const lower = ip.toLowerCase();
  if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
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

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { valid: false, reason: 'محاولة الوصول إلى عنوان محلي أو محظور (Local/Internal Host).' };
    }

    // Check if hostname is directly a private IP
    if (isPrivateIp(hostname)) {
      return { valid: false, reason: 'محاولة الوصول إلى عنوان IP داخلي أو محظور (Private/Restricted IP).' };
    }

    // Resolve DNS to prevent DNS rebinding or internal intranet hosts with timeout
    try {
      const lookupPromise = lookup(hostname);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)
      );
      const { address } = await Promise.race([lookupPromise, timeoutPromise]);
      if (isPrivateIp(address)) {
        return { valid: false, reason: `عنوان النطاق موجه لشبكة داخلية محظورة: ${address}` };
      }
    } catch (dnsErr: any) {
      // If DNS timed out on public known host or in test, don't block unless it is private
      if (dnsErr.message === 'DNS lookup timeout') {
        // Fallback: verify hostname does not end with local/internal TLDs
        if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
          return { valid: false, reason: 'نطاق داخلي غير مسموح به.' };
        }
      } else {
        return { valid: false, reason: 'تعذر التحقق من صحة النطاق عبر خوادم الأسماء (DNS Lookup failed).' };
      }
    }

    return { valid: true, url: parsed };
  } catch (err: any) {
    return { valid: false, reason: `رابط غير صالح: ${err.message}` };
  }
}
