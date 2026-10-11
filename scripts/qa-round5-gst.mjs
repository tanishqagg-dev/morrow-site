// Synthetic contract fixtures. External requests never leave this browser context.
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4395';
const output=new URL('../../qa/round5/fixer/site-screens/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report=[];
const future=new Date(Date.now()+7*86400_000).toISOString(),now=new Date().toISOString();
const plan={id:'plan-test',code:'PERSONAL_MONTHLY',name:'Morrow Personal',audience:'personal',period:'monthly',amountPaise:10000,chargeAmountPaise:11800,currency:'INR',minimumQuantity:1};
const supplier={legalName:'Morrow QA Supplier',gstin:'07AAACM1234A1Z5',address:'Test supplier address, Delhi 110001',stateCode:'07',stateName:'Delhi',sacCode:'998313',gstRateBps:1800};
const invoice={id:'invoice-test',subscriptionId:'subscription-test',kind:'tax_invoice',status:'issued',errorCode:null,number:'MI2627/000000001',issuedOn:'2026-10-11',issuedAt:now,amountPaise:11800,currency:'INR',amountInWords:'One hundred eighteen rupees only',paidAt:now,paymentId:'pay_test',buyer:{kind:'consumer',name:'अनन्या शर्मा',stateCode:'07',stateName:'Delhi'},supplier,printable:true,url:null,placeOfSupply:{stateCode:'07',stateName:'Delhi'},sacCode:'998313',gstRateBps:1800,reverseCharge:false,description:'Morrow Personal',quantity:1,listPricePaise:11800,discountPaise:0,taxableValuePaise:10000,cgstPaise:900,sgstPaise:900,igstPaise:0};
const credit={...invoice,id:'credit-test',kind:'credit_note',number:'MC2627/000000001',amountPaise:5900,amountInWords:'Fifty-nine rupees only',refundId:'refund_test',refundReason:'Partial refund',originalInvoiceNumber:invoice.number,originalInvoiceDate:invoice.issuedOn,taxableValuePaise:5000,cgstPaise:450,sgstPaise:450};
const html='<!doctype html><html><head><meta charset="utf-8"><title>Test GST invoice</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:24px}h1{font-size:28px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px;border-bottom:1px solid #ddd}@media print{body{margin:0}}</style></head><body><h1>GST tax invoice</h1><p>Test document</p><p>MI2627/000000001 · 11 October 2026</p><h2>अनन्या शर्मा</h2><p>Delhi (07)</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>Morrow Personal</td><td>₹118.00</td></tr><tr><td>Taxable value</td><td>₹100.00</td></tr><tr><td>CGST</td><td>₹9.00</td></tr><tr><td>SGST</td><td>₹9.00</td></tr></table></body></html>';
try{
 for(const width of [1440,390])for(const state of ['issued-credit','not-configured','billing-details-required','receipts-unavailable','failed','empty',...(process.argv.includes('--recipients')?['recipient-consumer','recipient-business']:[])]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],actions=[];
  page.on('pageerror',error=>errors.push(error.message));
  const recipient=state.startsWith('recipient-');
  const account={id:'account-test',kind:'personal',name:'Personal account',billing_email:'qa@example.test',owner_user_id:'qa-user',created_at:now,invoice_recipient_name:'अनन्या शर्मा',invoice_profile:state==='recipient-business'?{kind:'business',stateCode:'07',businessName:'Morrow QA Private Limited',gstin:'07AAACM1234A1Z5',address:'Test address, Delhi',postalCode:'110001'}:{kind:'consumer',stateCode:'07'}};
  const subscription={id:invoice.subscriptionId,account_id:account.id,plan_id:plan.id,razorpay_subscription_id:'sub_test',status:'active',quantity:1,scheduled_quantity:null,paid_until:future,cancel_at_period_end:false,plan:{name:plan.name,period:'monthly',amount_paise:plan.amountPaise,charge_amount_paise:plan.chargeAmountPaise}};
  let invoices=state==='issued-credit'?[invoice,credit]:state==='empty'?[]:[invoice];
  if(['not-configured','billing-details-required','failed'].includes(state))invoices=[{...invoice,status:state==='failed'?'failed':state==='not-configured'?'not_configured':'billing_details_required',errorCode:state==='failed'?'GST_DOCUMENT_FAILED':null,number:null,issuedAt:null,supplier:null,printable:false}];
  const receipts=state==='receipts-unavailable'||state==='empty'?[]:[{id:'receipt-test',number:'RZP-test-1',status:'paid',amountPaise:11800,paidAt:now,url:'https://razorpay.example/receipt-test'}];
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());if(url.origin===origin)return route.continue();
   assert.ok(!url.search.includes('qa-session'));
   if(url.hostname==='abcdefghijklmnopqrst.supabase.co'&&url.pathname.startsWith('/functions/v1/')){
    const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const body=request.postDataJSON()||{};actions.push(body);
    if(body.action==='invoices'&&body.format==='html'){
     assert.equal(request.method(),'POST');assert.equal(request.headers().authorization,'Bearer qa-session');assert.equal(body.documentId,invoice.id);assert.equal(body.subscriptionId,invoice.subscriptionId);
     return route.fulfill({status:200,headers:{...headers,'cache-control':'no-store'},contentType:'text/html; charset=utf-8',body:html});
    }
    let result;
    if(url.pathname.endsWith('/billing-catalog'))result={mode:'test',plans:[plan],trial:{enabled:false,days:7}};
    else if(body.action==='snapshot')result={accounts:[account],subscriptions:recipient?[]:[subscription],seats:[],payments:[],trial:{enabled:false,days:7}};
    else if(body.action==='devices')result={devices:[]};
    else if(body.action==='invoices')result={invoices,receipts,receiptsStatus:state==='receipts-unavailable'?'unavailable':'available'};
    else throw new Error('Unstubbed GST action '+body.action);
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(result)});
   }
   return route.abort();
  });
  await page.goto(`${origin}/subscribe?qa=gst${recipient?'':'&view=subscription'}`,{waitUntil:'networkidle'});
  if(recipient){
   await page.locator('#billing-state').waitFor();
   if(state==='recipient-consumer')assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'अनन्या शर्मा');
   else {await page.getByText('Business invoice (optional)',{exact:true}).click();assert.equal(await page.getByLabel('Registered business name').inputValue(),'Morrow QA Private Limited');assert.equal(await page.getByLabel('Your name',{exact:true}).count(),0);}
  }else{
   await page.getByRole('heading',{name:'Your subscription',exact:true}).waitFor();
   await page.getByText('Payments and invoices',{exact:true}).click();
   await page.getByRole('heading',{name:'GST tax invoices and credit notes',exact:true}).waitFor();
   if(['not-configured','billing-details-required','failed'].includes(state)){assert.equal(await page.getByRole('button',{name:'Print or save as PDF',exact:true}).count(),0);assert.equal(await page.getByText(invoice.number,{exact:false}).count(),0);}
   if(state==='issued-credit'){await page.getByText('₹59 reversed',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Print or save as PDF',exact:true}).count(),2);}
   if(state==='receipts-unavailable')assert.equal(await page.getByRole('button',{name:'Print or save as PDF',exact:true}).count(),1);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:`${output}gst-${state}-${width}.png`,fullPage:true});
  if(state==='issued-credit'){
   const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Print or save as PDF',exact:true}).first().click();const popup=await popupPromise;
   await popup.waitForURL('blob:**');await popup.getByRole('heading',{name:'अनन्या शर्मा',exact:true}).waitFor();assert.equal(await popup.evaluate(()=>window.opener),null);assert.equal(actions.filter(action=>action.format==='html').length,1);
   await popup.screenshot({path:`${output}gst-print-${width}.png`,fullPage:true});await popup.close();
  }
  report.push({state,width,errors,overflow,actions});console.log(`GST ${state} ${width} OK`);await context.close();
 }
 await writeFile(`${output}gst-report.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
