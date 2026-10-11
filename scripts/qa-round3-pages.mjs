import { chromium } from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const round2 = false;
let motion = 'no-preference';
const evidence = '/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/round3/pages';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const plan = { id: 'qa-plan', code: 'PERSONAL_MONTHLY', name: 'Morrow Personal', audience: 'personal', period: 'monthly', amountPaise: 299900, chargeAmountPaise: 353882, currency: 'INR', minimumQuantity: 1 };
const account = { id: 'account-a', kind: 'personal', name: 'Personal', billing_email: 'qa@example.test', owner_user_id: 'qa-user', created_at: '2026-10-11T00:00:00Z' };
const date = '2026-10-18T10:00:00Z';
const report = [];
const desktopOnly = process.env.QA_DESKTOP_ONLY === '1';
const desktopId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function setup(state, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: motion, acceptDownloads: true });
  const page = await context.newPage();
  // Read-only SDK form QA: keep local assets local and give Clerk's
  // environment/client requests the canonical origin required by live keys.
  await page.route('https://clerk.morrow.aestrum.in/v1/**', async route => { try { const response = await route.fetch({headers:{...route.request().headers(),origin:'https://morrow.aestrum.in',referer:'https://morrow.aestrum.in/'}}); await route.fulfill({response}); } catch(error) { if(!page.isClosed()) throw error; } });
  page.setDefaultNavigationTimeout(15000);
  const goto = page.goto.bind(page); page.goto = (url, options) => goto(url, { waitUntil: 'domcontentloaded', ...options });
  console.log(`Audit ${state} ${width}`);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400 && ['font','image','script','media'].includes(response.request().resourceType()) && !response.url().includes('__nextjs')) errors.push(`Asset ${response.status()}: ${response.url()}`);});
  let purchased = false, granted = false, canceled = false, snapshotCount = 0, checkoutCount = 0, cancelCount = 0, approvals = 0, options;
  const paid = ['trialing','trial-canceled','paid','ready','cancel','cancel-failed','company'].includes(state);
  const subscription = () => ({ id: 'sub-a', account_id: 'account-a', plan_id: 'qa-plan', razorpay_subscription_id: 'sub_qa', access_source: state === 'paid' ? 'payment' : 'trial',
    status: state === 'confirmation-failed' ? 'expired' : state === 'paid' || state === 'company' ? 'active' : state === 'trial-canceled' || canceled ? 'trial_canceled' : state === 'expired' ? 'expired' : 'trialing',
    quantity: state === 'company' ? 3 : 1, scheduled_quantity: null, paid_until: ['expired','confirmation-failed'].includes(state) ? '2026-10-01T00:00:00Z' : date, trial_ends_at: state === 'paid' ? null : date, cancel_at_period_end: false,
    plan: { name: state === 'company' ? 'Morrow Business' : 'Morrow Personal', period: 'monthly', amount_paise: 299900, charge_amount_paise: 353882 } });
  const snapshot = () => ({ accounts: state === 'company' ? [{...account,id:'personal-unused'},{...account,kind:'company'}] : [account], subscriptions: paid || granted || state === 'expired' || (state === 'confirmation-failed' && purchased) ? [subscription()] : [],
    seats: paid || granted ? [{ id: 'seat-a', account_id: 'account-a', email: 'qa@example.test', hasLicense: true, licenseId: 'license-a', licenseStatus: 'active', expiresAt: date }] : [], payments: [],
    betaInviteRequired: state === 'invite', trial: { enabled: state !== 'trial-off', days: 7, eligible: !paid && state !== 'expired' && state !== 'ineligible', reason: state === 'ineligible' ? 'used' : null } });
  await page.route('**/functions/v1/**', async route => {
    const request = route.request(), body = request.postDataJSON() || {}, action = body.action;
    let payload = {};
    if (request.url().endsWith('/billing-catalog')) payload = { mode: 'live', plans: state === 'empty' ? [] : [plan], betaInviteRequired: state === 'invite', trial: { enabled: state !== 'trial-off', days: 7 } };
    else if (action === 'snapshot') {
      snapshotCount++;
      if ((desktopOnly || (round2 && state === 'trial')) && body.desktopRequestId !== desktopId) throw new Error('Snapshot lost desktop installation eligibility');
      if (state === 'error' && snapshotCount === 1) return route.fulfill({ status: 503, json: { error: { message: 'Your account is temporarily unavailable. Please try again.' } } });
      payload = snapshot();
    } else if (action === 'checkout') {
      checkoutCount++;
      if ((desktopOnly || (round2 && state === 'trial')) && (body.desktopRequestId !== desktopId || body.requestId === desktopId || body.trial !== true)) throw new Error('Checkout lost the separate desktop request or trial flag');
      if (state === 'expired-checkout' && checkoutCount === 1) return route.fulfill({ status: 410, json: { error: { code: 'TRIAL_CHECKOUT_EXPIRED', message: 'Checkout expired.' } } });
      if (state === 'rejected-trial') return route.fulfill({ status: 409, json: { error: { code: 'TRIAL_NOT_AVAILABLE', message: 'This trial is unavailable.' } } });
      payload = { subscriptionId: 'sub_qa', keyId: 'rzp_test_qa', email: 'qa@example.test', name: 'QA', trialEndsAt: body.trial ? date : null, amountPaise: 353882 };
    } else if (action === 'confirm_checkout') { purchased = true; payload = {}; }
    else if (action === 'approve_desktop') { approvals++; payload = {}; }
    else if (action === 'cancel') { cancelCount++; if (state === 'cancel-failed' && cancelCount === 1) return route.fulfill({status:409,json:{error:{code:'CANCELLATION_VERIFICATION_FAILED',message:'Unconfirmed cancellation.'}}}); canceled = true; payload = {}; }
    else if (action === 'quote_coupon') payload = {code:body.couponCode,unitAmountPaise:2119,chargeAmountPaise:2500,renewalAmountPaise:353882,duration:'first_cycle',paymentMethods:['upi','card']};
    else if (action === 'invoices') payload = { invoices: [{ id: 'invoice-a', number: 'MOR-001', status: 'paid', amountPaise: 353882, paidAt: date, url: 'https://example.test/invoice' }] };
    await route.fulfill({ json: payload });
  });
  await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.Razorpay = class { constructor(options) { window.__qaCheckout = options; } open() { window.__qaCheckout.handler({razorpay_subscription_id:'sub_qa',razorpay_payment_id:'pay_qa',razorpay_signature:'qa'}); } on() {} }` }));
  await page.route('https://github.com/**/releases/download/**', route => route.fulfill({ status: 200, headers: { 'Content-Disposition': 'attachment; filename="Morrow.dmg"' }, contentType: 'application/octet-stream', body: 'local QA installer fixture, never shipped' }));
  return { page, context, errors, get checkoutCount() { return checkoutCount; }, get approvals() { return approvals; }, grant: () => { granted = true; }, purchased: () => purchased };
}
async function capture(flow, state, width, label = state) {
  if (desktopOnly) label = `${label}-desktop`;
  if (motion === 'reduce') label += '-reduced';
  if (flow.page.url().includes('?qa=')) await flow.page.waitForFunction(state => document.documentElement.dataset.morrowQaReady === state, state);
  await flow.page.locator('h1').first().waitFor();
  await flow.page.evaluate(() => document.fonts.ready);
  if(flow.page.url().includes("/download")) await flow.page.waitForTimeout(1000);
  if (!label.includes("help-expanded")) await flow.page.evaluate(() => scrollTo({top:0,left:0,behavior:'instant'}));
  await flow.page.mouse.move(0,0);
  await flow.page.waitForTimeout(350);
  if (!label.includes('help-expanded')) await flow.page.evaluate(() => scrollTo({top:0,left:0,behavior:'instant'}));
  await flow.page.screenshot({ path: `${evidence}/${label}-${width}.png`, fullPage: false });
  await flow.page.screenshot({path:`${evidence}/${label}-${width}-full.png`,fullPage:true});
  const overflow = await flow.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  report.push({ state: label, width, overflow, errors: flow.errors });
  if (flow.errors.length) throw new Error(`${label}: ${flow.errors.join(', ')}`);
  if (overflow) throw new Error(`${label} overflows at ${width}`);
}
try {
for (const pass of ['no-preference','reduce']) { motion=pass;
for (const width of process.env.QA_WIDTH ? [Number(process.env.QA_WIDTH)] : [1440, 390]) {
  if (process.env.QA_AUTH_ONLY !== '1') {
  for (const route of process.env.QA_DOWNLOAD_ONLY === '1' ? [] : process.env.QA_OPTIONS_ONLY === '1' ? ['operator','terms'] : ['privacy','terms','refunds','contact','thanks','windows-setup','open-source','operator','not-a-real-page']) {
    const flow=await setup(route,width);await flow.page.goto(`http://localhost:4390/${route}`);await flow.page.locator('h1').first().waitFor();await capture(flow,route,width,route==='not-a-real-page'?'404':route);await flow.context.close();
  }
  for (const state of process.env.QA_OPTIONS_ONLY === '1' ? [] : desktopOnly ? [] : round2 ? ['download-trial-on', 'trial-off'] : ['download', 'download-started','trial-off']) {
    const flow = await setup(state, width); await flow.page.goto(`http://localhost:4390/download${round2 || state !== 'download' ? '?start=1' : ''}`);
    await flow.page.getByRole('heading', { name: round2 || state !== 'download' ? 'Your download has started' : 'Download Morrow for Mac', exact: true }).waitFor();
    if (round2) { await flow.page.getByText(state === 'trial-off' ? 'Press \"Subscribe\".' : 'Press \"Start free trial\".', {exact:false}).waitFor(); if (state === 'trial-off') await flow.page.getByRole('heading',{name:'Setup walkthrough.'}).waitFor(); else if (await flow.page.getByRole('heading',{name:'Setup walkthrough.'}).count()) throw new Error('Old checkout video shown during trial'); }
    await capture(flow, state, width); await flow.page.getByText('Release details and SHA-256').click(); await capture(flow, state, width, `${state}-checksum`);
    if (state === 'download-started') {
      await flow.page.getByText('Release details and SHA-256').click();
      for(const [label,index] of [['disk',0],['drag',1],['launch',2]]) {await flow.page.getByRole('button',{name:['1 Open Morrow.dmg','2 Drag into Applications','3 Open Morrow'][index],exact:false}).click();await capture(flow,state,width,`download-step-${label}`);}
      await flow.page.locator('#help-permissions summary').click();await flow.page.locator('#help-permissions video').scrollIntoViewIfNeeded();await capture(flow,state,width,'download-help-expanded');
      await flow.page.reload(); await flow.page.getByText('Already started in this session.', { exact: false }).waitFor(); }
    if (state === 'download' && motion === 'no-preference') { await flow.page.keyboard.press('Tab'); await flow.page.getByRole('button',{name:'Download for Mac',exact:false}).focus(); if (await flow.page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth === '0px')) throw new Error('Download keyboard focus is invisible'); await capture(flow,state,width,'download-keyboard-focus'); }
    await flow.context.close();
  }
  for (const state of process.env.QA_DOWNLOAD_ONLY === '1' ? [] : process.env.QA_OPTIONS_ONLY === '1' ? ['trial-off'] : desktopOnly ? ['trial'] : round2 ? ['trial','trial-off','cancel-failed'] : ['closed','loading','error','invite','trial-off','trial','ineligible','empty','trialing','trial-canceled','paid','expired','ready','cancel','cancel-failed','rejected-trial','expired-checkout','confirmation-failed','confirmation-timeout','company']) {
    const flow = await setup(state, width);
    const accountView = ['trialing','trial-canceled','paid','expired','cancel','cancel-failed','company'].includes(state);
    const desktop = state === 'trial' || state === 'ready' || desktopOnly || (round2 && state === 'trial') ? `&desktop=${desktopId}` : '';
    await flow.page.goto(`http://localhost:4390/subscribe?qa=${state}${accountView ? '&view=subscription' : ''}${desktop}`);
    const titles = { closed: 'Your work, with Morrow.', loading: 'Getting your account ready.', error: 'Your account could not be loaded.', invite: 'Your invitation to Morrow.', ready: "You're in. Morrow is unlocking now." };
    await flow.page.getByRole('heading', { name: titles[state] || (accountView ? 'Your subscription' : ['trial-off','ineligible'].includes(state) ? 'Subscribe to Morrow.' : 'Start your 7-day free trial.'), exact: true }).waitFor();
    await capture(flow, state, width, `subscribe-${state}`);
    if (state === 'trial-off' && process.env.QA_OPTIONS_ONLY === '1') {
      await flow.page.getByText('Business invoice (optional)',{exact:true}).click();await flow.page.getByLabel('Add my business GSTIN').check();await capture(flow,state,width,'subscribe-business-invoice-options');
      await flow.page.getByLabel('Add my business GSTIN').uncheck();await flow.page.getByText('Business invoice (optional)',{exact:true}).click();
      await flow.page.getByText('Have a coupon?',{exact:true}).click();await flow.page.getByLabel('Coupon code',{exact:true}).fill('QA25');await flow.page.getByRole('button',{name:'Apply',exact:true}).click();await flow.page.getByLabel('Payment method',{exact:true}).waitFor();await capture(flow,state,width,'subscribe-coupon-upi');
      await flow.page.getByLabel('Payment method',{exact:true}).selectOption('card');await capture(flow,state,width,'subscribe-coupon-card');
    }
    if (state === 'error') { await flow.page.getByRole('button', { name: 'Try again', exact: true }).click(); await flow.page.getByRole('heading', { name: 'Start your 7-day free trial.' }).waitFor(); await capture(flow, state, width, 'subscribe-error-recovered'); }
    if (state === 'loading') { await flow.page.getByRole('heading', { name: 'Your account could not be loaded.' }).waitFor({timeout:25000}); await capture(flow, state, width, 'subscribe-auth-timeout'); }
    if (state === 'expired-checkout') { await flow.page.getByRole('button',{name:'Review free trial'}).click(); await flow.page.getByText('This checkout expired.',{exact:false}).waitFor(); await flow.page.getByRole('button',{name:'Set up UPI AutoPay'}).waitFor(); await capture(flow,state,width,'subscribe-checkout-expired'); await capture(flow,state,width,'subscribe-checkout-restarted'); if(flow.checkoutCount !== 2) throw new Error('Expired checkout did not restart once'); }
    if (['confirmation-failed','confirmation-timeout'].includes(state)) {
      if(state==='confirmation-timeout'){await flow.page.evaluate(()=>sessionStorage.setItem('morrow:payment-pending:qa-user:account-a',JSON.stringify({desktopRequest:'',subscriptionId:'sub_qa',startedAt:Date.now()-660000})));await flow.page.reload();}
      else{await flow.page.getByRole('button',{name:'Review free trial'}).click();await flow.page.getByRole('button',{name:'Set up UPI AutoPay'}).click();}
      await flow.page.getByRole('heading',{name:"We couldn't confirm this payment."}).waitFor();await capture(flow,state,width,`subscribe-${state}-recovery`);await flow.page.getByRole('button',{name:'Try again',exact:true}).click();await flow.page.getByRole('heading',{name:'Start your 7-day free trial.'}).waitFor();await flow.page.getByRole('button',{name:'Review free trial'}).waitFor();await capture(flow,state,width,`subscribe-${state}-retry`);
    }
    if (state === 'trial' || state === 'rejected-trial') {
      await flow.page.getByRole('button', { name: 'Review free trial' }).click();
      if (state === 'rejected-trial') { await flow.page.getByRole('button', { name: 'Subscribe', exact:true }).waitFor(); await capture(flow,state,width,'subscribe-paid-fallback'); }
      else {
        await flow.page.getByRole('button', { name: 'Set up UPI AutoPay' }).waitFor(); await capture(flow,state,width,'subscribe-trial-date');
        if (flow.checkoutCount !== 1) throw new Error('Trial prepared more than once');
        await flow.page.getByRole('button', { name: 'Set up UPI AutoPay' }).click();
        await flow.page.getByRole('heading', { name: 'Confirming with your bank.' }).waitFor(); await capture(flow,state,width,'subscribe-confirming');
        if (flow.checkoutCount !== 1) throw new Error('Authorization recreated checkout');
        flow.grant(); await flow.page.getByRole('heading', { name: desktopOnly || round2 || state === 'trial' ? "You're in. Morrow is unlocking now." : 'Your Morrow is ready.' }).waitFor({timeout:15000}); await capture(flow,state,width,'subscribe-success');
        if (desktopOnly || round2 || state === 'trial') { await flow.page.locator('a[href="morrow://auth-complete"]').waitFor(); if (flow.approvals !== 1) throw new Error('Trial desktop approval must happen once'); }
      }
    }
    if (state === 'cancel-failed') {
      await flow.page.getByRole('button',{name:'Cancel trial',exact:true}).click();
      await flow.page.getByRole('button',{name:'Cancel trial',exact:true}).click();
      await flow.page.getByText("We couldn't confirm the cancellation with Razorpay. Nothing changed. Try again in a minute.",{exact:true}).waitFor();
      if (await flow.page.getByText('Trial canceled',{exact:false}).count()) throw new Error('Failed cancellation falsely shown as canceled');
      await flow.page.getByRole('button',{name:'Retry cancellation',exact:true}).waitFor();
      await capture(flow,state,width,'subscribe-cancel-unconfirmed');
      await flow.page.getByRole('button',{name:'Retry cancellation',exact:true}).click();
      await flow.page.getByText('Trial canceled. Access until',{exact:false}).waitFor();
      await capture(flow,state,width,'subscribe-cancel-retried');
    }
    if (state === 'cancel') { await flow.page.getByRole('button', { name: 'Cancel trial', exact:true }).click(); await capture(flow,state,width,'subscribe-cancel-confirmation'); await flow.page.getByRole('button',{name:'Cancel trial',exact:true}).click(); await flow.page.getByText("Trial canceled. Access until",{exact:false}).waitFor(); await capture(flow,state,width,'subscribe-cancel-complete'); }
    if (state === 'ready') { await flow.page.locator('a[href="morrow://auth-complete"]').waitFor(); if(flow.approvals !== 1) throw new Error('Desktop must approve once'); }
    if(state==='company'){await flow.page.getByText('Manage team seats',{exact:true}).click();await capture(flow,state,width,'subscribe-team-seats');}
    if (state === 'paid') { await flow.page.getByText('Payments and invoices',{exact:true}).waitFor(); await flow.page.getByRole('button',{name:'Load invoices'}).click(); await flow.page.getByText('MOR-001').waitFor(); await capture(flow,state,width,'subscribe-invoices'); }
    await flow.context.close();
  }
  }
  if (desktopOnly || round2 || process.env.QA_SKIP_AUTH === '1' || process.env.QA_DOWNLOAD_ONLY === '1' || process.env.QA_OPTIONS_ONLY === '1') continue;
  const flow = await setup('signed-out',width); await flow.page.goto('http://localhost:4390/subscribe');
  await flow.page.getByLabel('Email address',{exact:true}).waitFor({timeout:60000}); await capture(flow,'signed-out',width,'subscribe-clerk-sign-up');
  await flow.page.getByRole('link',{name:'Sign in',exact:true}).click();await flow.page.getByRole('heading',{name:'Sign in to Morrow.'}).waitFor();await capture(flow,'signed-out',width,'subscribe-clerk-sign-in');
  await flow.page.goto('http://localhost:4390/activate');await flow.page.getByLabel('Email address',{exact:true}).waitFor({timeout:60000});await capture(flow,'activate',width,'activate');
  await flow.context.close();
}
}
} finally { await writeFile(`${evidence}/audit${process.env.QA_AUTH_ONLY === '1' ? '-auth' : process.env.QA_DOWNLOAD_ONLY === '1' ? '-download' : process.env.QA_OPTIONS_ONLY === '1' ? '-options' : desktopOnly ? '-desktop' : ''}.json`,JSON.stringify(report,null,2)); await browser.close(); }
console.log(`Captured ${report.length} responsive states in ${evidence}`);
