import { describe, it, expect } from 'vitest';
import { isPrivateIp, validateSafeUrl } from '../lib/ssrf';

describe('SSRF Protection & URL Validation', () => {
  it('identifies loopback and private IPv4 addresses', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.0.5')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true); // AWS/GCP metadata IP
  });

  it('identifies public IPv4 addresses as non-private', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('142.250.180.206')).toBe(false);
  });

  it('rejects forbidden local and metadata URLs', async () => {
    const r1 = await validateSafeUrl('http://localhost:3000/admin');
    expect(r1.valid).toBe(false);

    const r2 = await validateSafeUrl('http://127.0.0.1:8080');
    expect(r2.valid).toBe(false);

    const r3 = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    expect(r3.valid).toBe(false);

    const r4 = await validateSafeUrl('file:///etc/passwd');
    expect(r4.valid).toBe(false);
  });

  it('accepts safe external URLs', async () => {
    const res = await validateSafeUrl('https://en.wikipedia.org/wiki/Fact_check');
    expect(res.valid).toBe(true);
    expect(res.url?.hostname).toBe('en.wikipedia.org');
  });
});
