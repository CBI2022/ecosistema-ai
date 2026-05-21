import { chromium } from 'playwright-core'
import dotenv from 'dotenv'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(__dirname,'..')
dotenv.config({ path: path.join(ROOT,'.env.local') })
const EXEC='/Users/marcoantonio/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const LOGIN=process.env.SOOPREMA_URL||'https://costablancainvestments.com/crm/login'
const ADD='https://www.costablancainvestments.com/admin/propiedades/add/'
const REF='A'+Math.floor(Math.random()*9000+1000)+'TEST'
const b=await chromium.launch({headless:true,executablePath:EXEC})
const page=await(await b.newContext({viewport:{width:1440,height:900}})).newPage(); page.setDefaultTimeout(30000)
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
  // escribir en población y volcar DOM del dropdown
  await page.fill('[name="cityId"]','Altea'); await page.waitForTimeout(2000)
  const dump=await page.evaluate(()=>{
    const out=[]
    document.querySelectorAll('*').forEach(el=>{
      const t=(el.textContent||'').trim()
      const r=el.getBoundingClientRect()
      if(r.width>0&&r.height>0&&/altea/i.test(t)&&t.length<40&&el.children.length<=1){
        out.push({tag:el.tagName.toLowerCase(),cls:el.className,text:t.slice(0,30)})
      }
    })
    return out.slice(0,15)
  })
  console.log('Candidatos con "Altea" visibles:'); console.log(JSON.stringify(dump,null,1))
  // probar ArrowDown+Enter
  await page.click('[name="cityId"]').catch(()=>{}); await page.fill('[name="cityId"]','Altea'); await page.waitForTimeout(1500)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(800)
  console.log('cityId tras ArrowDown+Enter = "'+await page.locator('[name="cityId"]').first().inputValue()+'"')
  await page.screenshot({path:'/tmp/poblacion-tras-enter.png'})
  console.log('REF:'+REF)
}catch(e){console.error('❌',e.message)}finally{await b.close()}
