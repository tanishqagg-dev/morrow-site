// Synthetic TEST fixtures only. All non-local requests are intercepted or blocked.
import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4395',output=new URL('../../qa/round5/fixer/site-screens/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const requestId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', accountId='account-test';
const recent=new Date(Date.now()-120000).toISOString(),future=new Date(Date.now()+7*86400000).toISOString();
const personal={id:'personal',code:'PERSONAL_MONTHLY',name:'Morrow Personal',audience:'personal',period:'monthly',amountPaise:299900,chargeAmountPaise:353882,currency:'INR',minimumQuantity:1};
const company={...personal,id:'company-yearly',code:'COMPANY_YEARLY',name:'Morrow Business',audience:'company',period:'yearly',minimumQuantity:2};
const monthlyCompany={...company,id:'company-monthly',period:'monthly',code:'COMPANY_MONTHLY'};
const report=[];
try {
 for(const width of (process.argv.includes('--quick')?[390]:[1440,390])) for(const state of (process.argv.includes('--expiring')?['finishing-up','finishing-timeout']:process.argv.includes('--blocked')?['price-changed']:process.argv.includes('--quick')?['failed','uncertain']:['closed','resume','change-plan','failed','late-created','abandon-unverified','abandon-payment-pending','uncertain','quote','price-changed','seats','seat-upi','seat-unknown','documents-paired','replace-code'])) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));const calls=[];
  const expiring=state.startsWith('finishing-');
  const team=['seats','seat-upi','seat-unknown'].includes(state),paid=team||['documents-paired','replace-code'].includes(state),plan=team?company:personal;
  const account={id:accountId,kind:team?'company':'personal',name:team?'QA team':'Personal account',billing_email:'qa@example.test',owner_user_id:'qa-user',created_at:recent,invoice_recipient_name:'QA Buyer',invoice_profile:{kind:'consumer',stateCode:'07'}};
  const subscription={id:'local',account_id:accountId,plan_id:plan.id,razorpay_subscription_id:'sub_test',status:paid?'active':'created',quantity:team?3:1,scheduled_quantity:null,paid_until:paid?future:null,cancel_at_period_end:false,payment_method:state==='seat-upi'?'upi':state==='seat-unknown'?null:'card',plan:{name:plan.name,period:plan.period,amount_paise:plan.amountPaise,charge_amount_paise:plan.chargeAmountPaise}};
  const seat={id:'seat-test',account_id:accountId,email:'qa@example.test',hasLicense:true,licenseId:'license-test',licenseStatus:'active',expiresAt:future};
  let started=['late-created','uncertain'].includes(state),oldConnected=true,desktopStatus='pending';
  const snapshot=()=>({accounts:team?[account,{...account,id:'personal-account',kind:'personal',name:'Personal account'}]:[account],subscriptions:paid||started?[subscription]:[],seats:paid?[seat]:[],payments:state==='uncertain'?[{id:'payment',subscription_id:'local',razorpay_payment_id:'pay_test',status:'captured',amount_paise:11801,currency:'INR',paid_at:recent}]:[],trial:{enabled:expiring,eligible:expiring,days:7}});
  const reply=method=>({subscriptionId:'sub_test',keyId:'rzp_test_fixture',email:'qa@example.test',name:'QA',paymentMethod:method,amountPaise:11801,chargeAmountPaise:11801,trialEndsAt:null,trialAuthorizationExpiresAt:null});
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin)return route.continue();
   if(url.hostname!=='abcdefghijklmnopqrst.supabase.co')return route.abort();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const body=request.postDataJSON()||{};calls.push(body);let payload,status=200;
   if(url.pathname.endsWith('/billing-catalog'))payload={mode:'test',plans:[personal,company,monthlyCompany],trial:{enabled:expiring,eligible:expiring,days:7},betaInviteRequired:false};
   else if(body.action==='snapshot')payload=snapshot();
   else if(['save_invoice_profile','save_invoice_recipient_name'].includes(body.action))payload={saved:true};
   else if(body.action==='quote_checkout') {assert.equal(body.planId,plan.id);payload={amountPaise:11801,chargeAmountPaise:11801,renewalAmountPaise:23603,baseAmountPaise:10001,gstAmountPaise:1800,currency:'INR',quantity:body.quantity,period:plan.period,duration:'first_cycle',merchantPromotion:true,maximumQuantity:7,paymentMethods:['upi','card']};}
   else if(body.action==='quote_coupon')payload={code:'INTRO',unitAmountPaise:10001,chargeAmountPaise:11801,renewalAmountPaise:23603,duration:'first_cycle',paymentMethods:['upi','card']};
   else if(body.action==='checkout' && expiring){assert.equal(body.trial,true);status=409;payload={error:{code:'CHECKOUT_EXPIRING'},retryAfter:5};}
   else if(body.action==='checkout'){started=true;payload={...reply(body.paymentMethod),...(state==='price-changed'?{amountPaise:11901,chargeAmountPaise:11901}:{})};}
   else if(body.action==='abandon_checkout') {
    assert.equal(body.subscriptionId,'sub_test');
    if(state==='abandon-unverified'){status=409;payload={error:{code:'CHECKOUT_ABANDON_UNVERIFIED',message:'We could not confirm cancellation. Your checkout stays reserved.'}};}
    else if(state==='abandon-payment-pending'){status=409;payload={error:{code:'CHECKOUT_PAYMENT_PENDING',message:'A payment may be processing. Check its status before changing plan.'}};}
    else {started=false;subscription.status='cancelled';payload={abandoned:true};}
   }
   else if(body.action==='devices')payload={devices:oldConnected?[{installationId:'old-mac',deviceName:'Old Mac',deviceModel:'MacBook Air',appVersion:'0.3.11',activatedAt:recent,lastSeenAt:recent,seatId:seat.id,accountName:account.name}]:[]};
   else if(body.action==='desktop_request')payload={request:{id:requestId,status:desktopStatus,deviceName:'New Mac',deviceModel:'MacBook Air',appVersion:'0.3.12',requestedAt:recent,expiresAt:future,seatInUse:oldConnected?{installationId:'old-mac',deviceName:'Old Mac',lastSeenAt:recent}:null}};
   else if(body.action==='approve_desktop') {
    assert.equal(body.replaceInstallationId,'old-mac');
    if(body.userCode!=='K7M4QX'){status=400;payload={error:{code:'DEVICE_CODE_MISMATCH',message:'Wrong code'}};}
    else {oldConnected=false;desktopStatus='approved';payload={approved:true};}
   }
   else if(body.action==='invoices')payload={invoices:state==='documents-paired'?[{id:'tax',subscriptionId:'local',kind:'tax_invoice',paymentId:'pay_test',status:'issued',number:'MI2627/000000001',issuedOn:'2026-10-11',amountPaise:11801,printable:true}]:[],receipts:state==='documents-paired'?[{id:'inv_test',paymentId:'pay_test',status:'paid',amountPaise:11801,paidAt:recent,url:'https://rzp.io/test-receipt'}]:[],receiptsStatus:'available'};
   else throw new Error('Unstubbed action '+body.action);
   await route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.addInitScript(({state})=>{
   window.qaOpens=[];window.Razorpay=class {constructor(options){this.options=options;}on(name,fn){if(name==='payment.failed')this.failed=fn;}open(){window.qaOpens.push(this.options.subscription_id);window.qaMethod=this.options.config.display.blocks.selected.instruments[0].method;if(state==='failed')this.failed({error:{description:'Your bank declined this payment.'}});setTimeout(()=>this.options.modal.ondismiss(),0);}};
  },{state});
  if(['late-created','uncertain'].includes(state))await page.addInitScript(({accountId,requestId,reply})=>sessionStorage.setItem(`morrow:payment-pending:qa-user:${accountId}`,JSON.stringify({desktopRequest:'',subscriptionId:'sub_test',requestId,userId:'qa-user',startedAt:Date.now()-610000,expiresAt:Date.now()-1000,checkout:{reply,preparedAt:Date.now()-610000}})),{accountId,requestId,reply:reply('upi')});
  await page.goto(`${origin}/subscribe?qa=round5${paid&&state!=='replace-code'?'&view=subscription':''}${state==='replace-code'?'&desktop='+requestId:''}`,{waitUntil:'networkidle'});
  if(state==='replace-code') {
   await page.getByRole('heading',{name:'Connect this Mac?',exact:true}).waitFor();
   const boxes=page.getByRole('textbox',{name:/Code character/});
   const paste=async text=>boxes.nth(0).evaluate((el,text)=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));},text);
   await paste('AAAAAA');await page.getByRole('button',{name:'Replace that Mac',exact:true}).click();
   await page.getByText("That code doesn't match. Check Morrow on your Mac.",{exact:true}).waitFor();
   assert.equal(oldConnected,true);assert.equal(calls.filter(body=>body.action==='revoke_device').length,0);
   await page.waitForFunction(()=>document.querySelector('input[aria-label="Code character 1"]')?.value==='');
   await paste('k7m 4qx');await page.getByRole('button',{name:'Replace that Mac',exact:true}).click();
   await page.getByRole('heading',{name:'Waiting for your Mac…',exact:true}).waitFor();assert.equal(oldConnected,false);assert.equal(calls.filter(body=>body.action==='approve_desktop').length,2);
  } else if(paid) {
   await page.getByRole('heading',{name:'Your subscription',exact:true}).waitFor();
   if(state==='documents-paired') {await page.getByText('Payments and invoices',{exact:true}).click();await page.getByText('Documents for each payment',{exact:true}).waitFor();assert.equal(await page.locator('[data-payment-id="pay_test"]').getByRole('link',{name:'View receipt',exact:true}).count(),1);}
   else {
    await page.getByText('Manage team seats',{exact:true}).click();
    if(state==='seats'){const input=page.getByLabel('Seats for next billing period');await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.max==='7');await input.fill('100');assert.equal(await input.inputValue(),'7');await page.waitForFunction(()=>!document.querySelector('input[type="number"]').disabled);assert.equal(calls.filter(body=>body.action==='quote_checkout').every(body=>body.planId==='company-yearly'),true);}
    else assert.equal(await page.getByRole('button',{name:'Update seats',exact:true}).count(),0);
   }
  } else if(['late-created','uncertain'].includes(state)) {
   await page.getByRole('heading',{name:state==='late-created'?'Checkout closed. Nothing was charged.':'Payment status is not confirmed',exact:true}).waitFor();
   assert.equal(calls.filter(body=>body.action==='checkout').length,0);
   assert.equal(await page.getByRole('heading',{name:'Checking your payment…',exact:true}).count(),0);
   assert.ok(await page.evaluate(accountId=>sessionStorage.getItem(`morrow:payment-pending:qa-user:${accountId}`),accountId));
  } else if(expiring) {
   await page.clock.install();
   await page.getByRole('button',{name:'Review free trial',exact:true}).click();
   await page.getByRole('heading',{name:'Finishing up your last checkout…',exact:true}).waitFor();
   if(state==='finishing-timeout'){await page.clock.fastForward(91000);await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Retry',exact:true}).isEnabled(),true);}
   assert.deepEqual(await page.evaluate(()=>window.qaOpens),[]);assert.equal(calls.some(body=>body.action==='abandon_checkout'),false);
  } else {
   await page.getByRole('button',{name:'Subscribe',exact:true}).waitFor();
   await page.getByRole('button',{name:'Subscribe',exact:true}).isEnabled();
   if(state==='quote') {
    await page.waitForFunction(()=>document.querySelector('button[class*="primary"]')?.disabled===false);
    const text=await page.locator('[aria-label="Your plan"]').innerText();assert.ok(text.includes('₹118.01'));assert.ok(text.includes('₹100.01'));assert.ok(text.includes('₹18'));assert.ok(text.includes('₹236.03'));assert.ok(!text.includes('₹3,538.82'));
   } else {
    await page.getByText('Have a coupon?',{exact:true}).click();await page.getByPlaceholder('Enter code').fill('INTRO');await page.getByRole('button',{name:'Apply',exact:true}).click();
    const subscribe=page.getByRole('button',{name:'Subscribe',exact:true});await subscribe.click();
    await page.getByRole('heading',{name:state==='failed'?'Payment failed':'Checkout closed. Nothing was charged.',exact:true}).waitFor();
    if(state==='price-changed'){assert.deepEqual(await page.evaluate(()=>window.qaOpens),[]);assert.equal(await page.getByRole('button',{name:'Resume',exact:true}).count(),0);await page.getByText('The checkout price changed. Cancel this checkout and refresh your quote before paying.',{exact:true}).waitFor();}
    else assert.equal(await page.evaluate(()=>window.qaMethod),'upi');
    if(state==='resume') {await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('heading',{name:'Checkout closed. Nothing was charged.',exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.qaOpens),['sub_test','sub_test']);assert.equal(calls.filter(body=>body.action==='checkout').length,1);}
    if(['change-plan','abandon-unverified','abandon-payment-pending'].includes(state)) {
     await page.getByRole('button',{name:'Change plan',exact:true}).click();
     if(state==='change-plan') {await page.getByText('Checkout cancelled. Choose your plan and payment method below.',{exact:true}).waitFor();assert.equal(await page.evaluate(accountId=>sessionStorage.getItem(`morrow:payment-pending:qa-user:${accountId}`),accountId),null);assert.equal(await page.getByRole('combobox',{name:'Payment method'}).isEnabled(),true);}
     else {await page.locator('#main-content [role="alert"]').waitFor();assert.ok(await page.evaluate(accountId=>sessionStorage.getItem(`morrow:payment-pending:qa-user:${accountId}`),accountId));assert.equal(await page.getByRole('combobox',{name:'Payment method'}).isEnabled(),false);}
    }
    if(state==='failed') {assert.ok(await page.getByText('Your bank declined this payment.',{exact:true}).count());assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Use another method',exact:true}).count(),1);}
   }
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:`${output}checkout-${state}-${width}.png`,fullPage:true});report.push({state,width,errors,overflow,actions:calls.map(body=>body.action||'catalog')});console.log(`${state} ${width} OK`);await context.close();
 }
 if(process.argv.includes('--blocked')) {const previous=JSON.parse(await readFile(`${output}checkout-report.json`,'utf8'));report.unshift(...previous.filter(item=>item.state!=='price-changed'));}
 await writeFile(`${output}${process.argv.includes('--expiring')?'checkout-expiring-report':'checkout-report'}.json`,JSON.stringify(report,null,2));
} finally {await browser.close();}
