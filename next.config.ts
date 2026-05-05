import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
  // Sparticuz chromium y playwright-core no deben ser bundleados —
  // deben resolverse en runtime desde node_modules en la función serverless
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  // Incluir binarios de chromium (brotli) en el trazado de archivos del server
  outputFileTracingIncludes: {
    '/**': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  // Headers críticos para que las PWAs detecten nuevas versiones.
  // /sw.js debe servirse SIEMPRE fresco para que registration.update() detecte cambios.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
