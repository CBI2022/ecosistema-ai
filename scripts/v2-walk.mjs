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
const snapshot=async(tag)=>{
  const s=await page.evaluate(()=>{
    const heading=(document.querySelector('h1,h2,.propertyuploadcontent__title,[class*="title"]')||{}).textContent||''
    const fields=[]; document.querySelectorAll('input,textarea,select').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0&&r.height>0&&e.type!=='hidden')fields.push((e.tagName.toLowerCase())+':'+(e.name||e.placeholder||e.className.split(' ')[0]).slice(0,28))})
    const checks=[]; document.querySelectorAll('input[type="checkbox"]').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0){const p=e.closest('label')||e.parentElement;checks.push((e.name||'?')+'='+((p?.textContent||'').replace(/\s+/g,' ').trim().slice(0,22)))}})
    return {heading:heading.replace(/\s+/g,' ').trim().slice(0,40),fields:[...new Set(fields)].slice(0,22),checks:checks.slice(0,40)}
  })
  log(`\n##### ${tag} | URL ${page.url().split('#')[1]||''}`)
  log('  heading: '+s.heading)
  log('  fields: '+JSON.stringify(s.fields))
  if(s.checks.length) log('  checks: '+JSON.stringify(s.checks))
  await page.screenshot({path:`/tmp/walk-${tag}.png`,fullPage:true}).catch(()=>{})
}
const clickNext=async()=>{
  const n=page.locator('.propertyuploadnavigation__submit--next, button:has-text("Siguiente")').first()
  if(await n.count()&&await n.isEnabled().catch(()=>false)){ await n.click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(2500); return true } return false
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
  // rellenar ubicación con geocoder para poder avanzar
  const geo=page.getByPlaceholder(/Introduce una ubicaci/i).first()
  if(await geo.count()){await geo.click();await geo.fill('Carrer Major 14, Altea, 03590');await page.waitForTimeout(2500);await page.keyboard.press('ArrowDown');await page.waitForTimeout(300);await page.keyboard.press('Enter');await page.waitForTimeout(1500)}
  await page.fill('[name="address_number"]','14').catch(()=>{})
  await snapshot('00-ubicacion')
  for(let i=1;i<=6;i++){ const moved=await clickNext(); if(!moved){log(`\n(no avanzó en paso ${i})`);break} await snapshot(String(i).padStart(2,'0')+'-step') }
  // botones finales disponibles
  const btns=await page.evaluate(()=>{const o=[];document.querySelectorAll('button,.basic-button').forEach(e=>{const t=(e.textContent||'').trim();const r=e.getBoundingClientRect();if(t&&r.width>0&&t.length<25)o.push(t)});return [...new Set(o)]})
  log('\nBotones finales: '+JSON.stringify(btns))
  log('REF:'+REF)
}catch(e){console.error('❌',e.message);await page.screenshot({path:'/tmp/walk-ERROR.png',fullPage:true}).catch(()=>{})}
finally{await b.close()}
