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
  log('V2 listo: '+page.url())

  // Los 3 selectores arriba-derecha: Oficina / Agente / Propietario
  const btns=page.locator('.floating-selector__button')
  log('floating-selector__button count: '+await btns.count())
  // dump labels de los selectores
  const labels=await page.evaluate(()=>{const o=[];document.querySelectorAll('.floating-selector,[class*="floating-selector"]').forEach(e=>{const t=(e.textContent||'').replace(/\s+/g,' ').trim();if(t)o.push(t.slice(0,50))});return o.slice(0,6)})
  log('Selectores: '+JSON.stringify(labels))

  // Abrir el de AGENTE (normalmente el 2º). Probamos clic en el 2º botón.
  await btns.nth(1).click().catch(e=>log('click agente err: '+e.message.slice(0,40)))
  await page.waitForTimeout(1500)
  await page.screenshot({path:'/tmp/v2-agente-abierto.png'})
  // dump del popup abierto: inputs y clases
  const popup=await page.evaluate(()=>{
    const o={inputs:[],cleaners:[],buttons:[]}
    document.querySelectorAll('input').forEach(i=>{const r=i.getBoundingClientRect();if(r.width>0&&r.height>0)o.inputs.push({name:i.name,ph:i.placeholder,cls:i.className.slice(0,40)})})
    document.querySelectorAll('.searchinputselector__cleaner,[class*="cleaner"]').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0)o.cleaners.push(e.className.slice(0,50))})
    document.querySelectorAll('button,.basic-button').forEach(e=>{const r=e.getBoundingClientRect();const t=(e.textContent||'').trim();if(r.width>0&&t&&t.length<20)o.buttons.push(t)})
    return o
  })
  log('POPUP inputs: '+JSON.stringify(popup.inputs.slice(0,8)))
  log('POPUP cleaners: '+JSON.stringify(popup.cleaners))
  log('POPUP buttons: '+JSON.stringify([...new Set(popup.buttons)].slice(0,12)))
  log('REF:'+REF)
}catch(e){console.error('❌',e.message);await page.screenshot({path:'/tmp/v2-agente-ERROR.png',fullPage:true}).catch(()=>{})}
finally{await b.close()}
