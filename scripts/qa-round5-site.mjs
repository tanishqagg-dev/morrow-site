// Local synthetic fixtures only. Run against next dev with environment-file loading disabled.
import {chromium} from 'playwright-core';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4395';
const output = new URL('../../qa/round5/fixer/site-screens/', import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const accountId='account-test';
const future=new Date(Date.now()+7*86400_000).toISOString();
const recent=new Date(Date.now()-120_000).toISOString();
const plan={id:'plan-test',code:'PERSONAL_MONTHLY',name:'Morrow Personal',audience:'personal',period:'monthly',amountPaise:299900,chargeAmountPaise:353882,currency:'INR',minimumQuantity:1};
const report=[];
try {
 for(const width of [1440,390]) for(const state of ['consent','waiting','connected','expired','devices','consumer','business','pending','halted','paused','payment-check']) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const calls=[];
  const pairing=['consent','waiting','connected','expired'].includes(state);
  const accountView=['devices','pending','halted','paused'].includes(state);
  const paid=pairing||state==='devices';
  let requestStatus={consent:'pending',waiting:'approved',connected:'connected',expired:'expired'}[state];
  const subscription={id:'subscription-test',account_id:accountId,plan_id:plan.id,razorpay_subscription_id:'sub_test',status:accountView&&state!=='devices'?state:state==='payment-check'?'created':'active',quantity:1,scheduled_quantity:null,paid_until:paid?future:recent,cancel_at_period_end:false,plan:{name:plan.name,period:'monthly',amount_paise:plan.amountPaise,charge_amount_paise:plan.chargeAmountPaise}};
  const seat={id:'seat-test',account_id:accountId,email:'qa@example.test',hasLicense:true,licenseId:'license-test',licenseStatus:'active',expiresAt:future};
  const snapshot={accounts:[{id:accountId,kind:'personal',name:'Personal account',billing_email:'qa@example.test',owner_user_id:'qa-user',created_at:recent,invoice_recipient_name:'QA Buyer',invoice_profile:{kind:'consumer',stateCode:'07'}}],subscriptions:paid||accountView||state==='payment-check'?[subscription]:[],seats:paid?[seat]:[],payments:[],trial:{enabled:false,days:7}};
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin)return route.continue();
   if(url.hostname==='abcdefghijklmnopqrst.supabase.co'&&url.pathname.startsWith('/functions/v1/')) {
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}});
    const body=request.postDataJSON()||{};calls.push(body.action||'catalog');
    let payload;
    if(url.pathname.endsWith('/billing-catalog'))payload={mode:'test',plans:[plan],trial:{enabled:false,days:7},betaInviteRequired:false};
    else if(body.action==='snapshot')payload=snapshot;
    else if(body.action==='desktop_request')payload={request:{id,status:requestStatus,deviceName:'Tanishq’s MacBook Air',deviceModel:'MacBook Air',appVersion:'0.3.12',requestedAt:recent,expiresAt:state==='expired'?recent:future,seatInUse:null}};
    else if(body.action==='devices')payload={devices:[{installationId:id,deviceName:'Tanishq’s MacBook Air',deviceModel:'MacBook Air',appVersion:'0.3.12',activatedAt:recent,lastSeenAt:recent,seatId:seat.id,accountName:'Personal account'}]};
    else if(body.action==='approve_desktop'){assert.equal(body.userCode,'K7M4QX');requestStatus='approved';payload={approved:true};}
    else if(body.action==='save_invoice_recipient_name'){assert.equal(body.name,'QA Buyer');payload={saved:true};}
    else if(body.action==='save_invoice_profile'){assert.equal(body.invoiceProfile.kind,'consumer');payload={saved:true};}
    else if(body.action==='checkout')payload={subscriptionId:'sub_test',keyId:'rzp_test_fixture',email:'qa@example.test',name:'QA',trialEndsAt:null,trialAuthorizationExpiresAt:null};
    else if(body.action==='invoices')payload={invoices:[],receipts:[],receiptsStatus:'available'};
    else throw new Error('Unstubbed action '+body.action);
    return route.fulfill({status:200,headers:{'access-control-allow-origin':origin},contentType:'application/json',body:JSON.stringify(payload)});
   }
   // No third-party payment, Clerk or backend request can leave this harness.
   return route.abort();
  });
  if(state==='payment-check')await page.addInitScript(({accountId,id})=>sessionStorage.setItem(`morrow:payment-pending:qa-user:${accountId}`,JSON.stringify({desktopRequest:'',subscriptionId:'sub_test',requestId:id,userId:'qa-user',startedAt:Date.now(),expiresAt:Date.now()+600_000})),{accountId,id});
  if(state==='consumer')await page.addInitScript(()=>{
   window.Razorpay=class {constructor(options){this.options=options;}on(){}open(){setTimeout(()=>this.options.modal.ondismiss(),0);}};
  });
  await page.goto(`${origin}/subscribe?qa=round5${accountView?'&view=subscription':''}${pairing?'&desktop='+id:''}`,{waitUntil:'networkidle'});
  const title={consent:'Connect this Mac?',waiting:'Waiting for your Mac…',connected:'Connected',expired:'This connection request expired.',devices:'Your subscription',consumer:'Choose your plan.',business:'Choose your plan.',pending:'Your subscription',halted:'Your subscription',paused:'Your subscription','payment-check':'Checking your payment…'}[state];
  if(['consumer','business'].includes(state))await page.locator('#billing-state').waitFor();
  else await page.getByRole('heading',{name:title,exact:true}).waitFor();
  if(state==='business') {
   await page.getByText('Business invoice (optional)',{exact:true}).click();
   await page.getByLabel('Add my business GSTIN').check();
   await page.getByLabel('Registered business name').fill('Morrow QA Private Limited');
   await page.getByLabel('GSTIN',{exact:true}).fill('07AAACM1234A1Z5');
   await page.getByLabel('Registered billing address').fill('Test billing address, Delhi');
   await page.getByLabel('PIN code').fill('110001');
  }
  if(state==='consent') {
   assert.equal(calls.filter(action=>action==='approve_desktop').length,0);
   assert.equal(await page.getByRole('button',{name:'Connect this Mac',exact:true}).isEnabled(),false);
   assert.equal(await page.getByRole('textbox',{name:/Code character/}).count(),6);
  }
  if(accountView)await page.getByRole('button',{name:'Revoke Tanishq’s MacBook Air',exact:true}).waitFor();
  if(['pending','halted','paused'].includes(state)) {
   assert.equal(await page.getByRole('button',{name:'Choose a plan',exact:true}).count(),0);
   const guidance=page.locator('[role="status"]').filter({has:page.getByRole('heading',{level:3})});
   assert.equal(await guidance.evaluate(el=>getComputedStyle(el).gap),'12px');
   assert.equal(await page.getByRole('button',{name:'Cancel existing renewal',exact:true}).evaluate(el=>getComputedStyle(el).borderRadius),'999px');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${state} overflow at ${width}`);
  assert.deepEqual(errors,[],`${state} browser errors`);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"});});
  await page.screenshot({path:`${output}${state}-${width}.png`,fullPage:true});
  report.push({state,width,png:`${state}-${width}.png`,errors,overflow,actions:calls});
  if(state==='consumer') {
   await page.getByRole('button',{name:'Subscribe',exact:true}).click();
   await page.getByRole('heading',{name:'Checking your payment…',exact:true}).waitFor();
   const marker=await page.evaluate(accountId=>JSON.parse(sessionStorage.getItem(`morrow:payment-pending:qa-user:${accountId}`)),accountId);
   assert.equal(marker.userId,'qa-user');assert.equal(marker.subscriptionId,'sub_test');assert.ok(marker.requestId);assert.ok(marker.expiresAt>Date.now());
   await page.reload({waitUntil:'networkidle'});
   await page.getByRole('heading',{name:'Checking your payment…',exact:true}).waitFor();
   await page.getByRole('button',{name:'Check payment status',exact:true}).click();
   assert.equal(calls.filter(action=>action==='checkout').length,1);
   assert.equal(await page.getByRole('button',{name:'Subscribe',exact:true}).count(),0);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`${output}dismiss-reload-${width}.png`,fullPage:true});
   report.push({state:'dismiss-reload',width,png:`dismiss-reload-${width}.png`,errors,checkoutCalls:1,markerSurvived:true});
  }
  console.log(`${state} ${width} OK`);await context.close();
 }
 await writeFile(`${output}report.json`,JSON.stringify(report,null,2));
} finally {await browser.close();}
