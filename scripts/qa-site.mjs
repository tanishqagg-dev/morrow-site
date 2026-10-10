import { chromium } from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const evidence = '/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/site';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const plan = { id: 'qa-plan', code: 'PERSONAL_MONTHLY', name: 'Morrow Personal', audience: 'personal', period: 'monthly', amountPaise: 299900, chargeAmountPaise: 353882, currency: 'INR', minimumQuantity: 1 };
const account = { id: 'account-a', kind: 'personal', name: 'Personal', billing_email: 'qa@example.test', owner_user_id: 'qa-user', created_at: '2026-10-11T00:00:00Z' };
const date = '2026-10-18T10:00:00Z';
const report = [];
const desktopOnly = process.env.QA_DESKTOP_ONLY === '1';
const desktopId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function setup(state, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultNavigationTimeout(15000);
  const goto = page.goto.bind(page); page.goto = (url, options) => goto(url, { waitUntil: 'domcontentloaded', ...options });
  console.log(`Audit ${state} ${width}`);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let purchased = false, granted = false, canceled = false, snapshotCount = 0, checkoutCount = 0, approvals = 0, options;
  const paid = ['trialing','trial-canceled','paid','ready','cancel'].includes(state);
  const subscription = () => ({ id: 'sub-a', account_id: 'account-a', plan_id: 'qa-plan', razorpay_subscription_id: 'sub_qa', access_source: state === 'paid' ? 'payment' : 'trial',
    status: state === 'paid' ? 'active' : state === 'trial-canceled' || canceled ? 'trial_canceled' : state === 'expired' ? 'expired' : 'trialing',
    quantity: 1, scheduled_quantity: null, paid_until: state === 'expired' ? '2026-10-01T00:00:00Z' : date, trial_ends_at: state === 'paid' ? null : date, cancel_at_period_end: false,
    plan: { name: 'Morrow Personal', period: 'monthly', amount_paise: 299900, charge_amount_paise: 353882 } });
  const snapshot = () => ({ accounts: [account], subscriptions: paid || granted || state === 'expired' ? [subscription()] : [],
    seats: paid || granted ? [{ id: 'seat-a', account_id: 'account-a', email: 'qa@example.test', hasLicense: true, licenseId: 'license-a', licenseStatus: 'active', expiresAt: date }] : [], payments: [],
    betaInviteRequired: state === 'invite', trial: { enabled: state !== 'trial-off', days: 7, eligible: !paid && state !== 'expired' && state !== 'ineligible', reason: state === 'ineligible' ? 'used' : null } });
  await page.route('**/functions/v1/**', async route => {
    const request = route.request(), body = request.postDataJSON() || {}, action = body.action;
    let payload = {};
    if (request.url().endsWith('/billing-catalog')) payload = { mode: 'live', plans: state === 'empty' ? [] : [plan], betaInviteRequired: state === 'invite', trial: { enabled: state !== 'trial-off', days: 7 } };
    else if (action === 'snapshot') {
      snapshotCount++;
      if (desktopOnly && body.desktopRequestId !== desktopId) throw new Error('Snapshot lost desktop installation eligibility');
      if (state === 'error' && snapshotCount === 1) return route.fulfill({ status: 503, json: { error: { message: 'Your account is temporarily unavailable. Please try again.' } } });
      payload = snapshot();
    } else if (action === 'checkout') {
      checkoutCount++;
      if (desktopOnly && (body.desktopRequestId !== desktopId || body.requestId === desktopId || body.trial !== true)) throw new Error('Checkout lost the separate desktop request or trial flag');
      if (state === 'expired-checkout' && checkoutCount === 1) return route.fulfill({ status: 410, json: { error: { code: 'TRIAL_CHECKOUT_EXPIRED', message: 'Checkout expired.' } } });
      if (state === 'rejected-trial') return route.fulfill({ status: 409, json: { error: { code: 'TRIAL_NOT_AVAILABLE', message: 'This trial is unavailable.' } } });
      payload = { subscriptionId: 'sub_qa', keyId: 'rzp_test_qa', email: 'qa@example.test', name: 'QA', trialEndsAt: body.trial ? date : null, amountPaise: 353882 };
    } else if (action === 'confirm_checkout') { purchased = true; payload = {}; }
    else if (action === 'approve_desktop') { approvals++; payload = {}; }
    else if (action === 'cancel') { canceled = true; payload = {}; }
    else if (action === 'invoices') payload = { invoices: [{ id: 'invoice-a', number: 'MOR-001', status: 'paid', amountPaise: 353882, paidAt: date, url: 'https://example.test/invoice' }] };
    await route.fulfill({ json: payload });
  });
  await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.Razorpay = class { constructor(options) { window.__qaCheckout = options; } open() { window.__qaCheckout.handler({razorpay_subscription_id:'sub_qa',razorpay_payment_id:'pay_qa',razorpay_signature:'qa'}); } on() {} }` }));
  await page.route('https://github.com/**/releases/download/**', route => route.fulfill({ status: 200, headers: { 'Content-Disposition': 'attachment; filename="Morrow.dmg"' }, contentType: 'application/octet-stream', body: 'local QA installer fixture, never shipped' }));
  return { page, context, errors, get checkoutCount() { return checkoutCount; }, get approvals() { return approvals; }, grant: () => { granted = true; }, purchased: () => purchased };
}
async function capture(flow, state, width, label = state) {
  if (desktopOnly) label = `${label}-desktop`;
  await flow.page.evaluate(() => document.fonts.ready);
  await flow.page.screenshot({ path: `${evidence}/${label}-${width}.png`, fullPage: true });
  const overflow = await flow.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  report.push({ state: label, width, overflow, errors: flow.errors });
  if (overflow) throw new Error(`${label} overflows at ${width}`);
}
try {
for (const width of [1440, 390]) {
  for (const state of desktopOnly ? [] : ['trial-on', 'trial-off']) {
    const flow = await setup(state, width); await flow.page.goto('http://localhost:4390/');
    await flow.page.locator('[data-plan-price]').filter({ hasText: '2,999' }).waitFor();
    await capture(flow, state, width, `home-${state}`);
    await flow.context.close();
  }
  for (const state of desktopOnly ? [] : ['download', 'download-started']) {
    const flow = await setup(state, width); await flow.page.goto(`http://localhost:4390/download${state === 'download-started' ? '?start=1' : ''}`);
    await flow.page.getByRole('heading', { name: state === 'download-started' ? 'Your download has started' : 'Download Morrow for Mac', exact: true }).waitFor();
    await capture(flow, state, width); await flow.page.getByText('Verify your download (SHA-256)').click(); await capture(flow, state, width, `${state}-checksum`);
    if (state === 'download-started') { await flow.page.reload(); await flow.page.getByText('Already started in this session.', { exact: false }).waitFor(); }
    await flow.context.close();
  }
  for (const state of desktopOnly ? ['trial'] : ['closed','loading','error','invite','trial-off','trial','ineligible','empty','trialing','trial-canceled','paid','expired','ready','cancel','rejected-trial','expired-checkout']) {
    const flow = await setup(state, width);
    const accountView = ['trialing','trial-canceled','paid','expired','cancel'].includes(state);
    const desktop = state === 'ready' || desktopOnly ? `&desktop=${desktopId}` : '';
    await flow.page.goto(`http://localhost:4390/subscribe?qa=${state}${accountView ? '&view=subscription' : ''}${desktop}`);
    const titles = { closed: 'Your work, with Morrow.', loading: 'Getting your account ready.', error: 'Your account could not be loaded.', invite: 'Your invitation to Morrow.', ready: "You're in. Morrow is unlocking now." };
    await flow.page.getByRole('heading', { name: titles[state] || (accountView ? 'Your subscription' : ['trial-off','ineligible'].includes(state) ? 'Subscribe to Morrow.' : 'Start your 7-day free trial.'), exact: true }).waitFor();
    await capture(flow, state, width, `subscribe-${state}`);
    if (state === 'error') { await flow.page.getByRole('button', { name: 'Try again', exact: true }).click(); await flow.page.getByRole('heading', { name: 'Start your 7-day free trial.' }).waitFor(); await capture(flow, state, width, 'subscribe-error-recovered'); }
    if (state === 'loading') { await flow.page.getByRole('heading', { name: 'Your account could not be loaded.' }).waitFor({timeout:25000}); await capture(flow, state, width, 'subscribe-auth-timeout'); }
    if (state === 'expired-checkout') { await flow.page.getByRole('button',{name:'Review free trial'}).click(); await flow.page.getByText('This checkout expired.',{exact:false}).waitFor(); await capture(flow,state,width,'subscribe-checkout-expired'); await flow.page.getByRole('button',{name:'Review free trial'}).click(); await flow.page.getByRole('button',{name:'Set up UPI AutoPay'}).waitFor(); await capture(flow,state,width,'subscribe-checkout-restarted'); if(flow.checkoutCount !== 2) throw new Error('Expired checkout did not restart once'); }
    if (state === 'trial' || state === 'rejected-trial') {
      await flow.page.getByRole('button', { name: 'Review free trial' }).click();
      if (state === 'rejected-trial') { await flow.page.getByRole('button', { name: 'Subscribe', exact:true }).waitFor(); await capture(flow,state,width,'subscribe-paid-fallback'); }
      else {
        await flow.page.getByRole('button', { name: 'Set up UPI AutoPay' }).waitFor(); await capture(flow,state,width,'subscribe-trial-date');
        if (flow.checkoutCount !== 1) throw new Error('Trial prepared more than once');
        await flow.page.getByRole('button', { name: 'Set up UPI AutoPay' }).click();
        await flow.page.getByRole('heading', { name: 'Confirming with your bank.' }).waitFor(); await capture(flow,state,width,'subscribe-confirming');
        if (flow.checkoutCount !== 1) throw new Error('Authorization recreated checkout');
        flow.grant(); await flow.page.getByRole('heading', { name: desktopOnly ? "You're in. Morrow is unlocking now." : 'Your Morrow is ready.' }).waitFor({timeout:15000}); await capture(flow,state,width,'subscribe-success');
        if (desktopOnly) { await flow.page.locator('a[href="morrow://auth-complete"]').waitFor(); if (flow.approvals !== 1) throw new Error('Trial desktop approval must happen once'); }
      }
    }
    if (state === 'cancel') { await flow.page.getByRole('button', { name: 'Cancel trial', exact:true }).click(); await capture(flow,state,width,'subscribe-cancel-confirmation'); await flow.page.getByRole('button',{name:'Cancel trial',exact:true}).click(); await flow.page.getByText("Trial canceled. Access until",{exact:false}).waitFor(); await capture(flow,state,width,'subscribe-cancel-complete'); }
    if (state === 'ready') { await flow.page.locator('a[href="morrow://auth-complete"]').waitFor(); if(flow.approvals !== 1) throw new Error('Desktop must approve once'); }
    if (state === 'paid') { await flow.page.getByText('Payments and invoices',{exact:true}).click(); await flow.page.getByRole('button',{name:'Load invoices'}).click(); await flow.page.getByText('MOR-001').waitFor(); await capture(flow,state,width,'subscribe-invoices'); }
    await flow.context.close();
  }
  if (desktopOnly) continue;
  const flow = await setup('signed-out',width); await flow.page.goto('http://localhost:4390/subscribe');
  await flow.page.waitForTimeout(8000); await capture(flow,'signed-out',width,'subscribe-clerk');
  await flow.context.close();
}
} finally { await writeFile(`${evidence}/audit${desktopOnly ? '-desktop' : ''}.json`,JSON.stringify(report,null,2)); await browser.close(); }
console.log(`Captured ${report.length} responsive states in ${evidence}`);
