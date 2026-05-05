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
  // /sw.js ahora se sirve dinámicamente desde /api/sw (route handler)
  // para evitar el cache CDN de Vercel para assets de /public/.
  // Ver src/app/api/sw/route.ts.
  async rewrites() {
    return [
      { source: '/sw.js', destination: '/api/sw' },
    ]
  },
  async headers() {
    return [
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
