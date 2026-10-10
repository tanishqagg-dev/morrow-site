import { chromium } from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
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
  await page.screenshot({path:`/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/site/subscribe-clerk-sign-up-${width}.png`,fullPage:true});
  console.log(`Embedded Clerk sign-up verified at ${width}px`);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.locator('.cl-signIn-root').waitFor();
  if (await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw new Error(`Clerk overflows at ${width}px`);
  await page.locator('.cl-signIn-root input:not([type=hidden]):not([type=checkbox])').first().focus();
  await page.screenshot({path:`/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/site/subscribe-clerk-sign-in-${width}.png`,fullPage:true});
  await context.close();
}
}finally{await browser.close();}
