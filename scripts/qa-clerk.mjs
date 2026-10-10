import { chromium } from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
const evidence = `/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/site${process.env.QA_ROUND2 === '1' ? '/round2' : ''}`;
await mkdir(evidence,{recursive:true});
const browser = await chromium.launch();
try {
for (const width of [1440,390]) {
  const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page = await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error') console.log('CONSOLE',msg.text());});
  page.on('requestfailed',req=>console.log('FAILED',req.url(),req.failure()));
  page.on('response',response=>{if(response.status()>=400)console.log('HTTP',response.status(),response.url());});
  page.on('pageerror',error=>console.log('Clerk page error:',error.message));
  // Production origin satisfies the live Clerk key. Every site response is local code.
  await page.route('https://morrow.aestrum.in/**',async route=>{
    const url = new URL(route.request().url());
    const response = await route.fetch({url:`http://localhost:4392${url.pathname}${url.search}`,headers:{...route.request().headers(),host:'localhost:4392',origin:'http://localhost:4392',referer:'http://localhost:4392/subscribe'}});
    await route.fulfill({response});
  });
  await page.goto('https://morrow.aestrum.in/subscribe',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Create your Morrow account.'}).waitFor({timeout:25000});
  await page.locator('.cl-signUp-root').waitFor({timeout:20000});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(['apple','google'].map(async provider=>{const icon=new Image();icon.src=`/icons/${provider}.svg`;await icon.decode();}));});
  const icons = await page.locator('.cl-socialButtonsProviderIcon__apple,.cl-socialButtonsProviderIcon__google').evaluateAll(els=>els.map(el=>getComputedStyle(el).maskImage + getComputedStyle(el).backgroundImage));
  if (icons.length !== 2 || icons.some(icon=>!icon.includes('/icons/'))) throw new Error('Provider logo is not served locally');
  const controls = await page.locator('.cl-socialButtonsBlockButton,.cl-formFieldInput').evaluateAll(els=>els.map(el=>({shadow:getComputedStyle(el).boxShadow,width:el.getBoundingClientRect().width,border:getComputedStyle(el).borderTopWidth})));
  if (controls.some(control=>control.shadow !== 'none' || control.border !== '1px' || Math.abs(control.width - controls[0].width) > 1)) throw new Error(`Clerk control styles differ at ${width}px`);
  const consent = await page.locator('.cl-formFieldCheckboxInput__legalAccepted').evaluate(el=>({input:el.getBoundingClientRect().toJSON(),label:el.parentElement.querySelector('label').getBoundingClientRect().toJSON()}));
  if (Math.abs(consent.input.y + consent.input.height / 2 - consent.label.y - 10) > 3) throw new Error(`Consent is misaligned at ${width}px`);
  if (await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw new Error(`Sign-up overflows at ${width}px`);
  await page.screenshot({path:`${evidence}/subscribe-clerk-sign-up-${width}.png`,fullPage:true});
  console.log(`Embedded Clerk sign-up verified at ${width}px`);
  await page.locator('.cl-footerActionLink').filter({hasText:'Sign in'}).click();
  await page.locator('.cl-signIn-root').waitFor();
  if (await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw new Error(`Clerk overflows at ${width}px`);
  await page.locator('.cl-signIn-root input:not([type=hidden]):not([type=checkbox])').first().focus();
  await page.screenshot({path:`${evidence}/subscribe-clerk-sign-in-${width}.png`,fullPage:true});
  await context.close();
}
}finally{await browser.close();}
