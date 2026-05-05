import { NextResponse } from 'next/server'

// Endpoint de emergencia: cuando el browser/PWA tiene cache corrupto y no
// consigue cargar la app ("This page couldn't load"), abrir
// https://app.costablancainvestments.com/api/clear desde Safari fuerza al
// navegador a borrar TODO (cookies, storage, cache, service workers) gracias
// al header Clear-Site-Data.

export const dynamic = 'force-dynamic'

const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Limpieza completa</title>
<style>
  html,body { margin:0; height:100%; background:#0A0A0A; color:#F5F0E8; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
  .wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:24px; text-align:center; }
  h1 { color:#C9A84C; font-size:18px; letter-spacing:0.18em; text-transform:uppercase; margin:0 0 8px; }
  p { color:#9A9080; font-size:14px; line-height:1.5; max-width:340px; }
  a { display:inline-block; margin-top:24px; background:#C9A84C; color:#0A0A0A; text-decoration:none; padding:14px 28px; border-radius:14px; font-weight:700; font-size:14px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>✓ Caché limpiada</h1>
  <p>Todo el almacenamiento local de la PWA ha sido borrado. Vuelve a entrar al SaaS para descargar la versión limpia.</p>
  <a href="/dashboard">Volver al SaaS</a>
</div>
</body>
</html>`

export async function GET() {
  return new NextResponse(PAGE, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
