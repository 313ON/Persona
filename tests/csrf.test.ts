import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { requestOriginAllowed } from '../src/lib/security';

describe('request origin protection', () => {
  it('accepts same-origin requests and rejects missing or foreign origins', () => {
    const sameOrigin = new NextRequest('http://127.0.0.1:3000/api/auth/login', { headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } });
    const missingOrigin = new NextRequest('http://127.0.0.1:3000/api/auth/login', { headers: { host: '127.0.0.1:3000' } });
    const foreignOrigin = new NextRequest('http://127.0.0.1:3000/api/auth/login', { headers: { host: '127.0.0.1:3000', origin: 'https://attacker.example' } });
    expect(requestOriginAllowed(sameOrigin)).toBe(true);
    expect(requestOriginAllowed(missingOrigin)).toBe(false);
    expect(requestOriginAllowed(foreignOrigin)).toBe(false);
  });
});
