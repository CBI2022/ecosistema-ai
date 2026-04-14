'use server'

function formatCurrency(value: string | null) {
  if (!value) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function today() {
  return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function generateValuationPDF(formData: FormData) {
  const ownerName = formData.get('owner_name') as string || ''
  const ownerEmail = formData.get('owner_email') as string || ''
  const ownerPhone = formData.get('owner_phone') as string || ''
  const propertyType = formData.get('property_type') as string || ''
  const address = formData.get('address') as string || ''
  const zone = formData.get('zone') as string || ''
  const cadastralRef = formData.get('cadastral_ref') as string || ''
  const yearBuilt = formData.get('year_built') as string || ''
  const bedrooms = formData.get('bedrooms') as string || ''
  const bathrooms = formData.get('bathrooms') as string || ''
  const buildArea = formData.get('build_area') as string || ''
  const plotArea = formData.get('plot_area') as string || ''
  const estimatedValue = formData.get('estimated_value') as string || ''
  const minValue = formData.get('min_value') as string || ''
  const maxValue = formData.get('max_value') as string || ''
  const notes = formData.get('notes') as string || ''
  const salePrice = formData.get('sale_price') as string || ''
  const commissionPct = formData.get('commission_pct') as string || ''
  const commissionAmount = parseFloat(formData.get('commission_amount') as string) || 0
  const commissionVat = parseFloat(formData.get('commission_vat') as string) || 0
  const netToSeller = parseFloat(formData.get('net_to_seller') as string) || 0
  const agentName = formData.get('agent_name') as string || ''
  const agentEmail = formData.get('agent_email') as string || ''
  const agentPhone = formData.get('agent_phone') as string || ''

  // Comparables
  let comparables: Array<{ address: string; price: string; area: string; distance: string }> = []
  try {
    const raw = formData.get('comparables_json') as string
    if (raw) comparables = JSON.parse(raw)
  } catch {}

  // Pricing per m² for comparables
  const comparablesWithPrice = comparables.map((c) => {
    const price = parseFloat(c.price) || 0
    const area = parseFloat(c.area) || 0
    const pricePerM2 = area > 0 ? Math.round(price / area) : 0
    return { ...c, pricePerM2 }
  })

  const featureList: string[] = []
  if (formData.get('has_pool')) featureList.push('Piscina')
  if (formData.get('has_garage')) featureList.push('Garaje')
  if (formData.get('has_garden')) featureList.push('Jardín')
  if (formData.get('has_terrace')) featureList.push('Terraza')
  if (formData.get('has_ac')) featureList.push('Aire acondicionado')
  if (formData.get('has_sea_view')) featureList.push('Vistas al mar')

  const ibi = formData.get('ibi_annual') as string || ''
  const basura = formData.get('basura_annual') as string || ''
  const community = formData.get('community_annual') as string || ''
  const hasAnyExpense = !!(ibi || basura || community)

  const fmtEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>CBI — Informe de Valoración — ${ownerName || address}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Maharlika&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #111; font-size: 12.5px; line-height: 1.5; }

  /* Page system — each .sheet = 1 printed page */
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 22mm 20mm; page-break-after: always; position: relative; }
  .sheet:last-of-type { page-break-after: auto; }

  /* Header (on every page except cover) */
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #C9A84C; margin-bottom: 28px; }
  .page-header .brand { font-family: 'Maharlika', serif; font-size: 14px; letter-spacing: 0.18em; color: #0A0A0A; }
  .page-header .brand .gold { color: #C9A84C; }
  .page-header .page-kicker { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: #888; }

  /* Footer */
  .page-footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 9px; color: #999; letter-spacing: 0.08em; text-transform: uppercase; border-top: 1px solid #eee; padding-top: 10px; }

  /* COVER */
  .cover { background: linear-gradient(135deg, #0A0A0A 0%, #1a1510 100%); color: #F5F0E8; padding: 0; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-inner { padding: 30mm 25mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-top { text-align: center; }
  .cover-brand { font-family: 'Maharlika', serif; font-size: 42px; letter-spacing: 0.28em; color: #C9A84C; margin-bottom: 8px; }
  .cover-brand-sub { font-size: 11px; letter-spacing: 0.35em; color: #9A9080; text-transform: uppercase; }
  .cover-mid { text-align: center; padding: 40mm 0; }
  .cover-kicker { font-size: 11px; letter-spacing: 0.3em; color: #C9A84C; text-transform: uppercase; margin-bottom: 18px; }
  .cover-title { font-family: 'Maharlika', serif; font-size: 40px; font-weight: bold; line-height: 1.1; color: #F5F0E8; text-transform: uppercase; margin-bottom: 14px; }
  .cover-address { font-size: 15px; color: #9A9080; max-width: 400px; margin: 0 auto; line-height: 1.6; }
  .cover-divider { width: 60px; height: 2px; background: #C9A84C; margin: 26px auto; }
  .cover-prepared { text-align: center; }
  .cover-prepared-label { font-size: 9px; letter-spacing: 0.3em; color: #9A9080; text-transform: uppercase; margin-bottom: 6px; }
  .cover-prepared-name { font-family: 'Maharlika', serif; font-size: 20px; color: #F5F0E8; margin-bottom: 2px; }
  .cover-date { font-size: 11px; color: #9A9080; }
  .cover-footer { text-align: center; font-size: 9px; letter-spacing: 0.25em; color: #5a554c; text-transform: uppercase; }

  /* Section styling */
  .section-kicker { font-size: 9px; font-weight: bold; letter-spacing: 0.3em; color: #C9A84C; text-transform: uppercase; margin-bottom: 6px; }
  .section-title { font-family: 'Maharlika', serif; font-size: 26px; color: #0A0A0A; margin-bottom: 22px; line-height: 1.1; }

  /* Ficha - property card */
  .ficha-hero { background: #f8f5ee; border-left: 4px solid #C9A84C; border-radius: 10px; padding: 24px 28px; margin-bottom: 22px; }
  .ficha-address { font-family: 'Maharlika', serif; font-size: 22px; color: #0A0A0A; margin-bottom: 6px; }
  .ficha-meta { font-size: 12px; color: #666; letter-spacing: 0.05em; }
  .specs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
  .spec-card { background: #fff; border: 1px solid #ece5d0; border-radius: 10px; padding: 18px 16px; text-align: center; }
  .spec-icon { font-size: 20px; margin-bottom: 6px; }
  .spec-value { font-family: 'Maharlika', serif; font-size: 22px; font-weight: bold; color: #0A0A0A; }
  .spec-label { font-size: 9px; letter-spacing: 0.18em; color: #888; text-transform: uppercase; margin-top: 4px; }
  .features-row { background: #f8f5ee; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; display: flex; flex-wrap: wrap; gap: 10px; }
  .feature-chip { background: #fff; border: 1px solid #C9A84C; color: #0A0A0A; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; margin-bottom: 22px; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0e8d0; font-size: 12px; }
  .info-row .label { color: #888; font-weight: 500; letter-spacing: 0.04em; }
  .info-row .value { color: #0A0A0A; font-weight: 500; }

  /* Valuation */
  .val-hero { background: #0A0A0A; color: #F5F0E8; border-radius: 16px; padding: 36px 40px; text-align: center; margin-bottom: 24px; }
  .val-hero .label { font-size: 11px; letter-spacing: 0.3em; color: #C9A84C; text-transform: uppercase; margin-bottom: 12px; }
  .val-hero .amount { font-family: 'Maharlika', serif; font-size: 52px; font-weight: bold; color: #C9A84C; letter-spacing: 0.02em; line-height: 1; }
  .val-hero .sub { font-size: 11px; color: #9A9080; margin-top: 10px; }
  .val-range { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
  .range-box { background: #f8f5ee; border-radius: 12px; padding: 20px 24px; text-align: center; }
  .range-box .lbl { font-size: 9px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; margin-bottom: 6px; }
  .range-box .amt { font-family: 'Maharlika', serif; font-size: 24px; font-weight: bold; color: #0A0A0A; }
  .commission-box { background: #f8f5ee; border-radius: 12px; padding: 22px 26px; margin-bottom: 20px; }
  .commission-title { font-size: 10px; font-weight: bold; letter-spacing: 0.22em; color: #C9A84C; text-transform: uppercase; margin-bottom: 14px; }
  .commission-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ece5d0; font-size: 13px; }
  .commission-row:last-child { border-bottom: none; padding-top: 14px; font-weight: bold; font-size: 15px; color: #0A0A0A; }
  .commission-row .lbl { color: #666; }
  .commission-row .val { color: #0A0A0A; font-weight: 500; }
  .commission-row.net { background: #e8f7ef; padding: 12px 16px; border-radius: 8px; margin-top: 10px; border: none; }
  .commission-row.net .lbl { color: #0c6b3d; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; font-size: 11px; }
  .commission-row.net .val { color: #0c6b3d; font-family: 'Maharlika', serif; font-size: 22px; font-weight: bold; }
  .notes-box { background: #f8f5ee; border-radius: 10px; padding: 18px 22px; font-size: 12.5px; line-height: 1.7; color: #333; white-space: pre-wrap; border-left: 3px solid #C9A84C; }

  /* Comparables */
  .comp-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .comp-table th { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #888; text-align: left; padding: 10px 12px; background: #f8f5ee; border-bottom: 2px solid #C9A84C; }
  .comp-table td { padding: 14px 12px; border-bottom: 1px solid #f0e8d0; font-size: 12.5px; color: #111; }
  .comp-table .num { text-align: right; font-weight: 500; }
  .comp-empty { background: #f8f5ee; border-radius: 10px; padding: 28px; text-align: center; color: #888; font-style: italic; font-size: 12px; }

  /* Services */
  .services-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .service-card { background: #f8f5ee; border-radius: 12px; padding: 20px 22px; border-left: 3px solid #C9A84C; }
  .service-card h3 { font-family: 'Maharlika', serif; font-size: 15px; color: #0A0A0A; margin-bottom: 6px; }
  .service-card p { font-size: 11.5px; color: #555; line-height: 1.6; }
  .service-card .icon { font-size: 22px; margin-bottom: 8px; }

  /* Signatures */
  .sig-intro { background: #f8f5ee; border-radius: 10px; padding: 20px 24px; margin-bottom: 30px; font-size: 12px; color: #444; line-height: 1.7; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 80px; }
  .sig-box { text-align: center; }
  .sig-line { border-bottom: 1.5px solid #0A0A0A; margin-bottom: 10px; height: 70px; }
  .sig-label { font-size: 10px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; margin-bottom: 4px; }
  .sig-name { font-family: 'Maharlika', serif; font-size: 16px; color: #0A0A0A; font-weight: bold; }
  .sig-detail { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.5; }

  .disclaimer { margin-top: 28px; font-size: 10px; color: #888; line-height: 1.7; font-style: italic; background: #f8f5ee; padding: 14px 18px; border-radius: 8px; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .sheet { margin: 0; width: 100%; min-height: auto; padding: 18mm 16mm; }
    .cover { background: linear-gradient(135deg, #0A0A0A 0%, #1a1510 100%) !important; }
    .val-hero { background: #0A0A0A !important; }
  }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>

<!-- ========== PAGE 1 : COVER ========== -->
<div class="sheet cover">
  <div class="cover-inner">
    <div class="cover-top">
      <div class="cover-brand">[ CBI ]</div>
      <div class="cover-brand-sub">Costa Blanca Investments</div>
    </div>

    <div class="cover-mid">
      <div class="cover-kicker">Informe de valoración</div>
      <div class="cover-title">${propertyType || 'Propiedad'}${zone ? ' en ' + zone : ''}</div>
      <div class="cover-divider"></div>
      <div class="cover-address">${address || 'Dirección no especificada'}</div>
    </div>

    <div class="cover-prepared">
      <div class="cover-prepared-label">Preparado para</div>
      <div class="cover-prepared-name">${ownerName || '—'}</div>
      <div class="cover-date">${today()}</div>
    </div>

    <div class="cover-footer">
      Costa Blanca Norte · España · Luxury Real Estate
    </div>
  </div>
</div>

<!-- ========== PAGE 2 : FICHA ========== -->
<div class="sheet">
  <div class="page-header">
    <div class="brand">[ <span class="gold">CBI</span> ]</div>
    <div class="page-kicker">Ficha · 01 de 05</div>
  </div>

  <div class="section-kicker">Sección 1</div>
  <h2 class="section-title">Ficha técnica de la propiedad</h2>

  <div class="ficha-hero">
    <div class="ficha-address">${address || 'Dirección no especificada'}</div>
    <div class="ficha-meta">${propertyType || '—'} · ${zone || '—'}${yearBuilt ? ' · Construido en ' + yearBuilt : ''}</div>
  </div>

  <div class="specs-grid">
    <div class="spec-card">
      <div class="spec-icon">🛏️</div>
      <div class="spec-value">${bedrooms || '—'}</div>
      <div class="spec-label">Dormitorios</div>
    </div>
    <div class="spec-card">
      <div class="spec-icon">🛁</div>
      <div class="spec-value">${bathrooms || '—'}</div>
      <div class="spec-label">Baños</div>
    </div>
    <div class="spec-card">
      <div class="spec-icon">📐</div>
      <div class="spec-value">${buildArea || '—'}</div>
      <div class="spec-label">m² construidos</div>
    </div>
    <div class="spec-card">
      <div class="spec-icon">🌳</div>
      <div class="spec-value">${plotArea || '—'}</div>
      <div class="spec-label">m² parcela</div>
    </div>
  </div>

  ${featureList.length > 0 ? `<div class="features-row">
    ${featureList.map((f) => `<span class="feature-chip">✓ ${f}</span>`).join('')}
  </div>` : ''}

  <div class="info-grid">
    <div>
      ${cadastralRef ? `<div class="info-row"><span class="label">Referencia catastral</span><span class="value">${cadastralRef}</span></div>` : ''}
      ${yearBuilt ? `<div class="info-row"><span class="label">Año construcción</span><span class="value">${yearBuilt}</span></div>` : ''}
      <div class="info-row"><span class="label">Tipo</span><span class="value">${propertyType || '—'}</span></div>
      <div class="info-row"><span class="label">Zona</span><span class="value">${zone || '—'}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="label">Propietario</span><span class="value">${ownerName || '—'}</span></div>
      ${ownerEmail ? `<div class="info-row"><span class="label">Email</span><span class="value">${ownerEmail}</span></div>` : ''}
      ${ownerPhone ? `<div class="info-row"><span class="label">Teléfono</span><span class="value">${ownerPhone}</span></div>` : ''}
    </div>
  </div>

  ${hasAnyExpense ? `<h3 style="font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#C9A84C; margin-bottom:10px; margin-top:10px;">Gastos anuales</h3>
  <div class="info-grid">
    ${ibi ? `<div class="info-row"><span class="label">IBI</span><span class="value">${formatCurrency(ibi)}/año</span></div>` : ''}
    ${basura ? `<div class="info-row"><span class="label">Basura</span><span class="value">${formatCurrency(basura)}/año</span></div>` : ''}
    ${community ? `<div class="info-row"><span class="label">Comunidad</span><span class="value">${formatCurrency(community)}/año</span></div>` : ''}
  </div>` : ''}

  <div class="page-footer">
    <span>CBI · Informe de valoración</span>
    <span>Página 2 de 6</span>
  </div>
</div>

<!-- ========== PAGE 3 : VALORACIÓN ========== -->
<div class="sheet">
  <div class="page-header">
    <div class="brand">[ <span class="gold">CBI</span> ]</div>
    <div class="page-kicker">Valoración · 02 de 05</div>
  </div>

  <div class="section-kicker">Sección 2</div>
  <h2 class="section-title">Valoración estimada de mercado</h2>

  <div class="val-hero">
    <div class="label">Valor estimado</div>
    <div class="amount">${formatCurrency(estimatedValue)}</div>
    <div class="sub">Basado en condiciones actuales del mercado y comparables de la zona</div>
  </div>

  <div class="val-range">
    <div class="range-box">
      <div class="lbl">Mínimo probable</div>
      <div class="amt">${formatCurrency(minValue)}</div>
    </div>
    <div class="range-box">
      <div class="lbl">Máximo probable</div>
      <div class="amt">${formatCurrency(maxValue)}</div>
    </div>
  </div>

  ${salePrice && commissionAmount > 0 ? `<div class="commission-box">
    <div class="commission-title">💰 Cálculo de comisión y neto para el vendedor</div>
    <div class="commission-row"><span class="lbl">Precio de venta propuesto</span><span class="val">${formatCurrency(salePrice)}</span></div>
    <div class="commission-row"><span class="lbl">Comisión CBI (${commissionPct}%)</span><span class="val">${fmtEur(commissionAmount)}</span></div>
    <div class="commission-row"><span class="lbl">IVA sobre comisión (21%)</span><span class="val">${fmtEur(commissionVat)}</span></div>
    <div class="commission-row"><span class="lbl">Total honorarios CBI</span><span class="val">${fmtEur(commissionAmount + commissionVat)}</span></div>
    <div class="commission-row net"><span class="lbl">Neto al vendedor</span><span class="val">${fmtEur(netToSeller)}</span></div>
  </div>` : ''}

  ${notes ? `<div class="notes-box">${notes}</div>` : ''}

  <div class="page-footer">
    <span>CBI · Informe de valoración</span>
    <span>Página 3 de 6</span>
  </div>
</div>

<!-- ========== PAGE 4 : COMPARABLES ========== -->
<div class="sheet">
  <div class="page-header">
    <div class="brand">[ <span class="gold">CBI</span> ]</div>
    <div class="page-kicker">Comparables · 03 de 05</div>
  </div>

  <div class="section-kicker">Sección 3</div>
  <h2 class="section-title">Comparables de mercado</h2>

  <p style="font-size:12px; color:#555; margin-bottom:20px; line-height:1.7;">
    Los siguientes inmuebles se han utilizado como referencia para la valoración. Comparables seleccionados por proximidad, tipología y estado similar a la propiedad valorada.
  </p>

  ${comparablesWithPrice.length > 0 ? `<table class="comp-table">
    <thead>
      <tr>
        <th>Dirección / referencia</th>
        <th class="num">Precio</th>
        <th class="num">m²</th>
        <th class="num">€/m²</th>
        <th class="num">Distancia</th>
      </tr>
    </thead>
    <tbody>
      ${comparablesWithPrice.map((c) => `<tr>
        <td>${c.address || '—'}</td>
        <td class="num">${c.price ? formatCurrency(c.price) : '—'}</td>
        <td class="num">${c.area ? c.area + ' m²' : '—'}</td>
        <td class="num">${c.pricePerM2 > 0 ? fmtEur(c.pricePerM2) : '—'}</td>
        <td class="num">${c.distance ? c.distance + ' m' : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<div class="comp-empty">No se han incluido comparables específicos en este informe.</div>`}

  <div class="page-footer">
    <span>CBI · Informe de valoración</span>
    <span>Página 4 de 6</span>
  </div>
</div>

<!-- ========== PAGE 5 : SERVICIOS CBI ========== -->
<div class="sheet">
  <div class="page-header">
    <div class="brand">[ <span class="gold">CBI</span> ]</div>
    <div class="page-kicker">Servicios CBI · 04 de 05</div>
  </div>

  <div class="section-kicker">Sección 4</div>
  <h2 class="section-title">Lo que CBI hace por usted</h2>

  <p style="font-size:12.5px; color:#444; line-height:1.8; margin-bottom:10px;">
    En Costa Blanca Investments no publicamos propiedades, las posicionamos. Cada venta combina marketing, datos y red de compradores cualificados.
  </p>

  <div class="services-grid">
    <div class="service-card">
      <div class="icon">📸</div>
      <h3>Fotografía profesional y drone</h3>
      <p>Sesión profesional con fotógrafo propio, imágenes editadas, tour 3D y vídeo con drone para maximizar impacto online.</p>
    </div>
    <div class="service-card">
      <div class="icon">🌐</div>
      <h3>Publicación multi-portal</h3>
      <p>Idealista, Fotocasa, web CBI y feed XML a portales internacionales. Presencia total en 48 horas.</p>
    </div>
    <div class="service-card">
      <div class="icon">👥</div>
      <h3>Base de compradores cualificados</h3>
      <p>Acceso directo a nuestra base de inversores internacionales y lista privada de WhatsApp con compradores activos.</p>
    </div>
    <div class="service-card">
      <div class="icon">📱</div>
      <h3>Redes sociales y marketing</h3>
      <p>Contenido curado en Instagram, campañas segmentadas y newsletters a 3.000+ suscriptores del mercado premium.</p>
    </div>
    <div class="service-card">
      <div class="icon">🤝</div>
      <h3>Negociación y seguimiento</h3>
      <p>Gestión completa: visitas organizadas, negociación profesional, reservas y arras hasta firma ante notario.</p>
    </div>
    <div class="service-card">
      <div class="icon">⚖️</div>
      <h3>Gestión legal y documental</h3>
      <p>Coordinación con abogados, nota simple, certificados energéticos, plusvalías e impuestos. Usted solo firma.</p>
    </div>
  </div>

  <div class="disclaimer">
    CBI garantiza exclusividad, profesionalidad y transparencia en cada operación. Comisión única establecida; sin costes ocultos.
  </div>

  <div class="page-footer">
    <span>CBI · Informe de valoración</span>
    <span>Página 5 de 6</span>
  </div>
</div>

<!-- ========== PAGE 6 : FIRMAS ========== -->
<div class="sheet">
  <div class="page-header">
    <div class="brand">[ <span class="gold">CBI</span> ]</div>
    <div class="page-kicker">Aceptación · 05 de 05</div>
  </div>

  <div class="section-kicker">Sección 5</div>
  <h2 class="section-title">Aceptación y firmas</h2>

  <div class="sig-intro">
    El propietario acepta que la presente valoración ha sido preparada por Costa Blanca Investments a título informativo, basada en condiciones actuales del mercado y comparables recientes. Los valores indicados son estimativos y pueden variar según evolución del mercado.
    Al firmar, las partes confirman su conformidad con la información presentada en este informe.
  </div>

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Propietario</div>
      <div class="sig-name">${ownerName || '—'}</div>
      <div class="sig-detail">
        ${ownerEmail || ''}${ownerEmail && ownerPhone ? '<br/>' : ''}${ownerPhone || ''}
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Agente CBI</div>
      <div class="sig-name">${agentName || '—'}</div>
      <div class="sig-detail">
        Costa Blanca Investments<br/>
        ${agentEmail || ''}${agentEmail && agentPhone ? ' · ' : ''}${agentPhone || ''}
      </div>
    </div>
  </div>

  <div style="margin-top: 60px; text-align: center;">
    <p style="font-size:11px; color:#888; margin-bottom:4px;">Fecha del informe</p>
    <p style="font-family:'Maharlika',serif; font-size:18px; color:#0A0A0A;">${today()}</p>
  </div>

  <div class="disclaimer" style="margin-top:40px;">
    Este documento es un informe de valoración orientativo y no constituye tasación oficial a efectos hipotecarios.
    Para tasaciones oficiales se requiere informe de sociedad de tasación homologada por el Banco de España (Real Decreto 775/1997).
    CBI Eco — Costa Blanca Investments · Costa Blanca Norte, España.
  </div>

  <div class="page-footer">
    <span>CBI · Informe de valoración</span>
    <span>Página 6 de 6</span>
  </div>
</div>

<script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body>
</html>`

  const encoded = Buffer.from(html).toString('base64')
  return { pdfUrl: `data:text/html;base64,${encoded}` }
}

export async function generateInvoicePDF(formData: FormData) {
  const agentName = formData.get('agent_name') as string || ''
  const agentEmail = formData.get('agent_email') as string || ''
  const agentPhone = formData.get('agent_phone') as string || ''
  const agentNif = formData.get('agent_nif') as string || ''
  const clientName = formData.get('client_name') as string || ''
  const clientEmail = formData.get('client_email') as string || ''
  const clientNif = formData.get('client_nif') as string || ''
  const propertyAddress = formData.get('property_address') as string || ''
  const salePrice = formData.get('sale_price') as string || ''
  const commissionPct = formData.get('commission_pct') as string || ''
  const commissionAmount = formData.get('commission_amount') as string || ''
  const invoiceNumber = formData.get('invoice_number') as string || ''
  const invoiceDate = formData.get('invoice_date') as string || ''
  const notes = formData.get('notes') as string || ''

  const commissionNum = parseFloat(commissionAmount) || 0
  const vatRate = 0.21
  const vatAmount = commissionNum * vatRate
  const total = commissionNum + vatAmount

  const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>CBI Invoice ${invoiceNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Maharlika&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; background: #fff; color: #111; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px 56px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 3px solid #C9A84C; margin-bottom: 32px; }
  .logo { font-family: 'Maharlika', Georgia, serif; font-size: 24px; color: #0A0A0A; letter-spacing: 0.04em; }
  .logo span { color: #C9A84C; }
  .logo-sub { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #666; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h1 { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
  .invoice-meta .meta-line { font-size: 11px; color: #888; margin-top: 4px; }
  .section-title { font-size: 8px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; color: #C9A84C; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #f0e8d0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
  .party { background: #f8f5ee; border-radius: 8px; padding: 16px 20px; }
  .party .party-label { font-size: 8px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; color: #C9A84C; margin-bottom: 8px; }
  .party .party-name { font-size: 15px; font-weight: bold; margin-bottom: 6px; }
  .party .party-detail { font-size: 11px; color: #555; line-height: 1.7; }
  .property-section { margin-bottom: 24px; }
  .property-box { background: #0A0A0A; color: #F5F0E8; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
  .property-box .prop-label { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #C9A84C; margin-bottom: 4px; }
  .property-box .prop-address { font-size: 14px; font-weight: 500; }
  .property-box .prop-price { text-align: right; }
  .property-box .prop-price-label { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #C9A84C; margin-bottom: 4px; }
  .property-box .prop-price-value { font-size: 18px; font-weight: bold; color: #C9A84C; }
  .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .invoice-table th { font-size: 9px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; color: #888; text-align: left; padding: 8px 12px; background: #f8f5ee; border-bottom: 2px solid #e8e0d0; }
  .invoice-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .invoice-table .amount-col { text-align: right; font-weight: 500; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals-box { min-width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f0e0d0; }
  .totals-row.total { font-size: 16px; font-weight: bold; padding: 14px 0 0; border-bottom: none; color: #0A0A0A; }
  .totals-row.vat { color: #888; }
  .notes-box { background: #f8f5ee; border-radius: 8px; padding: 16px 20px; font-size: 12px; line-height: 1.7; color: #333; white-space: pre-wrap; margin-bottom: 24px; }
  .footer { padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 10px; color: #999; line-height: 1.7; }
  .signature-area { text-align: right; }
  .signature-line { width: 180px; border-bottom: 1px solid #ccc; margin-bottom: 6px; height: 40px; margin-left: auto; }
  .signature-label { font-size: 10px; color: #888; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .property-box { background: #0A0A0A !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">CBI <span>ECO</span></div>
      <div class="logo-sub">Costa Blanca Investments</div>
    </div>
    <div class="invoice-meta">
      <h1>Invoice</h1>
      ${invoiceNumber ? `<div class="meta-line">Nº ${invoiceNumber}</div>` : ''}
      <div class="meta-line">${invoiceDate || today()}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">From (Agent)</div>
      <div class="party-name">${agentName || '—'}</div>
      <div class="party-detail">
        ${agentNif ? `NIF: ${agentNif}<br/>` : ''}
        ${agentEmail ? `${agentEmail}<br/>` : ''}
        ${agentPhone ? `${agentPhone}` : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">To (Client)</div>
      <div class="party-name">${clientName || '—'}</div>
      <div class="party-detail">
        ${clientNif ? `NIF/NIE: ${clientNif}<br/>` : ''}
        ${clientEmail ? `${clientEmail}` : ''}
      </div>
    </div>
  </div>

  ${propertyAddress ? `<div class="property-section">
    <div class="property-box">
      <div>
        <div class="prop-label">Property</div>
        <div class="prop-address">${propertyAddress}</div>
      </div>
      ${salePrice ? `<div class="prop-price">
        <div class="prop-price-label">Sale Price</div>
        <div class="prop-price-value">${formatCurrency(salePrice)}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <table class="invoice-table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">%</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Real Estate Commission — ${propertyAddress || 'Property sale'}</td>
        <td class="amount-col">${commissionPct ? commissionPct + '%' : '—'}</td>
        <td class="amount-col">${commissionNum ? fmt(commissionNum) : '—'}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${commissionNum ? fmt(commissionNum) : '—'}</span></div>
      <div class="totals-row vat"><span>IVA 21%</span><span>${commissionNum ? fmt(vatAmount) : '—'}</span></div>
      <div class="totals-row total"><span>TOTAL</span><span>${commissionNum ? fmt(total) : '—'}</span></div>
    </div>
  </div>

  ${notes ? `<div class="notes-box">${notes}</div>` : ''}

  <div class="footer">
    <div class="footer-note">
      Costa Blanca Investments<br />
      Costa Blanca Norte, Spain<br />
      <em>Thank you for your business</em>
    </div>
    <div class="signature-area">
      <div class="signature-line"></div>
      <div class="signature-label">Agent Signature</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const encoded = Buffer.from(html).toString('base64')
  return { pdfUrl: `data:text/html;base64,${encoded}` }
}
