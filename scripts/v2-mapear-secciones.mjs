import { chromium } from 'playwright-core'
import dotenv from 'dotenv'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const __d=path.dirname(fileURLToPath(import.meta.url)); const ROOT=path.resolve(__d,'..')
dotenv.config({ path: path.join(ROOT,'.env.local') })
const EXEC='/Users/marcoantonio/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const LOGIN=process.env.SOOPREMA_URL||'https://costablancainvestments.com/crm/login'
const ADD='https://www.costablancainvestments.com/admin/propiedades/add/'
const REF='A'+Math.floor(Math.random()*9000+1000)+'TEST'
const log=(m)=>console.log(m)
const b=await chromium.launch({headless:true,executablePath:EXEC})
const page=await(await b.newContext({viewport:{width:1440,height:900}})).newPage(); page.setDefaultTimeout(45000)
const navTo=async(txt)=>{ // clic en item del left-nav por texto
  const it=page.locator('.propertyuploadnavigation a, .propertyuploadnavigation li, [class*="navigation"] a, [class*="navigation"] li').filter({hasText:txt}).first()
  if(await it.count()){ await it.click(); await page.waitForTimeout(2000); return true } return false
}
try{
  await page.goto(LOGIN,{waitUntil:'domcontentloaded'})
  await page.fill('input[name="user"]',process.env.SOOPREMA_USERNAME); await page.fill('input[name="password"]',process.env.SOOPREMA_PASSWORD)
  await page.click('input[type="submit"]'); await page.waitForTimeout(2500)
  await page.goto(ADD,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(3000)
  await page.fill('[name="input-txt-precio"]','549000').catch(()=>{}); await page.fill('[name="txt-referencia"]',REF).catch(()=>{})
  await page.selectOption('[name="txt-tipo_det"]','5').catch(()=>{}); await page.fill('[name="txt-constru"]','127').catch(()=>{})
  await page.locator('#btnsend, #btn').first().click().catch(()=>{}); await page.waitForTimeout(4000)
  const ok=page.locator('#popup_ok').first(); if(await ok.count()&&await ok.isVisible().catch(()=>false)){await ok.click();await page.waitForTimeout(1000)}
  await page.waitForSelector('[name="address"]',{state:'visible',timeout:45000})
  log('V2: '+page.url())

  // LEFT NAV items
  const nav=await page.evaluate(()=>{const o=[];document.querySelectorAll('[class*="navigation"] a,[class*="navigation"] li,[class*="menu"] a').forEach(e=>{const t=(e.textContent||'').replace(/\s+/g,' ').trim();const r=e.getBoundingClientRect();if(t&&r.width>0&&t.length<30)o.push(t)});return [...new Set(o)].slice(0,15)})
  log('LEFT NAV: '+JSON.stringify(nav))

  // AGENTE dropdown: abrir panel selectores, escribir en el 2º input
  log('\n=== AGENTE ===')
  await page.locator('.floating-selector__button').first().click().catch(()=>{}); await page.waitForTimeout(1200)
  const inputs=page.locator('.searchinputselector__input')
  log('searchinputselector inputs: '+await inputs.count())
  // escribir 'a' en cada uno para ver qué opciones salen (identificar cuál es agente)
  for(let i=0;i<Math.min(3,await inputs.count());i++){
    try{ await inputs.nth(i).click(); await inputs.nth(i).fill('a'); await page.waitForTimeout(1200)
      const opts=await page.evaluate(()=>{const o=[];document.querySelectorAll('.searchinputselector__results li,[class*="results"] li,[class*="result"]').forEach(e=>{const t=(e.textContent||'').trim();const r=e.getBoundingClientRect();if(t&&r.width>0&&t.length<40)o.push(t)});return o.slice(0,5)})
      log(`  input[${i}] opciones con "a": ${JSON.stringify(opts)}`)
      await inputs.nth(i).fill('').catch(()=>{})
    }catch(e){log(`  input[${i}] err: ${e.message.slice(0,40)}`)}
  }
  await page.locator('button,.basic-button').filter({hasText:/Cancelar/}).first().click().catch(()=>{}); await page.waitForTimeout(800)

  // TEXTOS VENTA
  log('\n=== TEXTOS VENTA ===')
  await navTo('Textos')
  const tv=await page.evaluate(()=>{const o=[];document.querySelectorAll('input,textarea').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0&&r.height>0)o.push({tag:e.tagName.toLowerCase(),name:e.name,ph:e.placeholder,cls:(e.className||'').slice(0,30)})});return o.slice(0,20)})
  log('campos: '+JSON.stringify(tv))
  await page.screenshot({path:'/tmp/v2-textos.png',fullPage:true})

  // PORTALES Y XMLS
  log('\n=== PORTALES Y XMLS ===')
  await navTo('Portales')
  const pt=await page.evaluate(()=>{const o=[];document.querySelectorAll('input[type="checkbox"],label').forEach(e=>{const r=e.getBoundingClientRect();const t=(e.textContent||'').trim();if(r.width>0&&(e.type==='checkbox'||t))o.push(e.type==='checkbox'?('chk:'+e.name):('lbl:'+t.slice(0,30)))});return [...new Set(o)].slice(0,25)})
  log('portales: '+JSON.stringify(pt))
  await page.screenshot({path:'/tmp/v2-portales.png',fullPage:true})

  // GENERAL → equipa labels
  log('\n=== EQUIPMENT (General) ===')
  await navTo('General')
  await page.waitForTimeout(1500)
  const eq=await page.evaluate(()=>{const o=[];document.querySelectorAll('input[name^="equipa"]').forEach(e=>{let lbl='';const p=e.closest('label')||e.parentElement;if(p)lbl=(p.textContent||'').replace(/\s+/g,' ').trim().slice(0,30);const sib=e.nextElementSibling;if(!lbl&&sib)lbl=(sib.textContent||'').trim().slice(0,30);o.push(e.name+'='+lbl)});return o})
  log('equipa: '+JSON.stringify(eq))
  log('REF:'+REF)
}catch(e){console.error('❌',e.message);await page.screenshot({path:'/tmp/v2-mapear-ERROR.png',fullPage:true}).catch(()=>{})}
finally{await b.close()}
