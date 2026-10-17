import type { NextConfig } from 'next';
import { secureHeaders } from './src/lib/security';
const nextConfig: NextConfig = { poweredByHeader: false, experimental: { serverActions: { bodySizeLimit: '5mb' } }, async headers() { return [{ source: '/(.*)', headers: Object.entries(secureHeaders).filter(([key]) => key !== 'Content-Security-Policy').map(([key, value]) => ({ key, value })) }]; } };
export default nextConfig;
