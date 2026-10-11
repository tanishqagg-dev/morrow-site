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
 for(const width of [1440,390]) for(const state of ['empty','filled','mismatch','locked']) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const calls=[];let attempts=0;
  const snapshot={accounts:[{id:accountId,kind:'personal',name:'Personal account',billing_email:'qa@example.test',owner_user_id:'qa-user',created_at:recent}],subscriptions:[{id:'subscription-test',account_id:accountId,plan_id:plan.id,razorpay_subscription_id:'sub_test',status:'active',quantity:1,scheduled_quantity:null,paid_until:future,cancel_at_period_end:false,plan:{name:plan.name,period:'monthly',amount_paise:plan.amountPaise,charge_amount_paise:plan.chargeAmountPaise}}],seats:[{id:'seat-test',account_id:accountId,email:'qa@example.test',hasLicense:true,licenseId:'license-test',licenseStatus:'active',expiresAt:future}],payments:[],trial:{enabled:false,days:7}};
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin)return route.continue();
   if(url.hostname!=='abcdefghijklmnopqrst.supabase.co')return route.abort();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const body=request.postDataJSON()||{};calls.push(body);let payload;let status=200;
   if(url.pathname.endsWith('/billing-catalog'))payload={mode:'test',plans:[plan],trial:{enabled:false,days:7},betaInviteRequired:false};
   else if(body.action==='snapshot')payload=snapshot;
   else if(body.action==='desktop_request')payload={request:{id,status:'pending',deviceName:"Tanishq's MacBook Air",deviceModel:'MacBook Air',appVersion:'0.3.12',requestedAt:recent,expiresAt:future,seatInUse:null}};
   else if(body.action==='approve_desktop') {
    assert.equal(body.userCode,'K7M4QX');attempts++;status=attempts===5?410:400;
    payload={error:{code:attempts===5?'DEVICE_LOGIN_EXPIRED':'DEVICE_CODE_MISMATCH',message:'Synthetic wrong code'}};
   } else throw new Error('Unstubbed action '+body.action);
   return route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(`${origin}/subscribe?qa=round5&desktop=${id}`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Connect this Mac?',exact:true}).waitFor();
  const boxes=page.getByRole('textbox',{name:/Code character/});
  const button=page.getByRole('button',{name:'Connect this Mac',exact:true});
  assert.equal(await boxes.count(),6);assert.equal(await button.isEnabled(),false);
  assert.equal(calls.filter(body=>body.action==='approve_desktop').length,0);
  assert.equal(await page.getByRole('checkbox').count(),0);
  if(state!=='empty') {
   await boxes.nth(0).pressSequentially('k');assert.equal(await boxes.nth(0).inputValue(),'K');assert.equal(await boxes.nth(1).evaluate(el=>el===document.activeElement),true);
   await boxes.nth(1).press('Backspace');assert.equal(await boxes.nth(0).inputValue(),'');assert.equal(await boxes.nth(0).evaluate(el=>el===document.activeElement),true);
   await boxes.nth(0).pressSequentially('b');assert.equal(await boxes.nth(0).inputValue(),'');
   const paste=async text=>boxes.nth(0).evaluate((el,text)=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));},text);
   await paste('k7m-4qx');assert.deepEqual(await boxes.evaluateAll(elements=>elements.map(el=>el.value)),['K','7','M','4','Q','X']);assert.equal(await button.isEnabled(),true);
   if(state==='mismatch'||state==='locked') {
    for(let attempt=1;attempt<=(state==='locked'?5:1);attempt++) {
     if(attempt>1)await paste('k7m 4qx');
     await button.click();
     if(attempt<5) {
      await page.getByRole('alert').filter({hasText:"That code doesn't match. Check Morrow on your Mac."}).waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('input[aria-label^="Code character"]')].every(el=>el.value===''));
      assert.equal(await boxes.nth(0).evaluate(el=>el===document.activeElement),true);assert.equal(await button.isEnabled(),false);
     } else {
      await page.getByRole('heading',{name:'Too many tries.',exact:true}).waitFor();
      assert.ok(await page.getByText('Too many tries. Start again from Morrow on your Mac.',{exact:true}).count());
      assert.equal(await boxes.count(),0);
     }
    }
   }
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:`${output}typed-${state}-${width}.png`,fullPage:true});
  report.push({state,width,attempts,errors,overflow});console.log(`${state} ${width} OK`);await context.close();
 }
 await writeFile(`${output}typed-report.json`,JSON.stringify(report,null,2));
} finally {await browser.close();}
