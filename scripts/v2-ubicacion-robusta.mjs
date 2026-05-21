import { chromium } from 'playwright-core'
import dotenv from 'dotenv'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const __d = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(__d,'..')
dotenv.config({ path: path.join(ROOT,'.env.local') })
const EXEC='/Users/marcoantonio/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const LOGIN=process.env.SOOPREMA_URL||'https://costablancainvestments.com/crm/login'
const ADD='https://www.costablancainvestments.com/admin/propiedades/add/'
const REF='A'+Math.floor(Math.random()*9000+1000)+'TEST'
const FULL='Carrer Major 14, Altea, 03590'
const log=(m)=>console.log(m)
const b=await chromium.launch({headless:true,executablePath:EXEC})
const page=await(await b.newContext({viewport:{width:1440,height:900}})).newPage(); page.setDefaultTimeout(45000)
try{
  await page.goto(LOGIN,{waitUntil:'domcontentloaded'})
  await page.fill('input[name="user"]',process.env.SOOPREMA_USERNAME); await page.fill('input[name="password"]',process.env.SOOPREMA_PASSWORD)
  await page.click('input[type="submit"]'); await page.waitForTimeout(2500)
  await page.goto(ADD,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(3000)
  await page.fill('[name="input-txt-precio"]','549000').catch(()=>{}); await page.fill('[name="txt-referencia"]',REF).catch(()=>{})
  await page.selectOption('[name="txt-tipo_det"]','5').catch(()=>{}); await page.fill('[name="txt-constru"]','127').catch(()=>{})
  await page.locator('#btnsend, #btn').first().click().catch(()=>{}); await page.waitForTimeout(4000)
  const ok=page.locator('#popup_ok').first(); if(await ok.count()&&await ok.isVisible().catch(()=>false)){await ok.click();await page.waitForTimeout(1000)}
  await page.waitForLoadState('networkidle').catch(()=>{})
  log('V2: '+page.url())
  // ESPERAR a que el step de ubicación esté listo
  await page.waitForSelector('[name="address"]',{state:'visible',timeout:45000})
  log('✓ step ubicación listo')

  // MÉTODO 1: geocoder "Introduce una ubicación"
  let geocoderOk=false
  try{
    const geo=page.getByPlaceholder(/Introduce una ubicaci/i).first()
    if(await geo.count()){
      await geo.click(); await geo.fill(FULL); await page.waitForTimeout(2500)
      await page.screenshot({path:'/tmp/v2-geo-dropdown.png'})
      // dump sugerencias visibles
      const sugg=await page.evaluate(()=>{const o=[];document.querySelectorAll('.pac-item,[class*="suggestion"],[class*="autocomplete"] li,[role="option"]').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0)o.push({cls:e.className,t:(e.textContent||'').slice(0,40)})});return o.slice(0,8)})
      log('Sugerencias geocoder: '+JSON.stringify(sugg))
      await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(2000)
      const a=await page.locator('[name="address"]').first().inputValue().catch(()=>'')
      geocoderOk=!!a
      log('Tras geocoder → address="'+a+'"')
    } else log('⚠ no hay caja geocoder')
  }catch(e){log('geocoder err: '+e.message.slice(0,60))}

  // MÉTODO 2 (fallback): campos individuales + población keyboard
  if(!geocoderOk){
    log('→ fallback campos individuales')
    for(const [n,v] of Object.entries({address:'Carrer Major',address_number:'14',floorNumber:'2',door:'A',postal_code:'03590'})){
      await page.fill(`[name="${n}"]`,v).catch(()=>{})
    }
    const city=page.locator('[name="cityId"]').first()
    await city.click().catch(()=>{}); await city.fill('Altea'); await page.waitForTimeout(1800)
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500); await page.keyboard.press('Enter'); await page.waitForTimeout(1000)
  }

  log('\n--- Valores finales ---')
  for(const n of ['address','address_number','floorNumber','door','postal_code','cityId']){
    log(`  ${n} = "${await page.locator(`[name="${n}"]`).first().inputValue().catch(()=>'n/a')}"`)
  }
  await page.screenshot({path:'/tmp/v2-ubicacion-final.png',fullPage:true})
  log('REF:'+REF)
}catch(e){console.error('❌',e.message);await page.screenshot({path:'/tmp/v2-ubic-ERROR.png',fullPage:true}).catch(()=>{})}
finally{await b.close()}
