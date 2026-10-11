/* The billing catalog owns both the price and trial rollout. Unknown means trial off. */
(async function () {
  const base = document.querySelector('meta[name="morrow-billing-base"]')?.content;
  const key = document.querySelector('meta[name="morrow-billing-key"]')?.content;
  if (!base || base.startsWith('__')) return;
  try {
    const response = await fetch(`${base}/billing-catalog`, { headers: { apikey: key || '' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return;
    const catalog = await response.json();
    const plan = Array.isArray(catalog.plans) ? catalog.plans.find(plan => plan?.audience === 'personal' && plan.period === 'monthly' && plan.currency === 'INR') : null;
    const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: value % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(value / 100);
    if (plan && Number.isSafeInteger(plan.amountPaise) && plan.amountPaise >= 0 && (plan.chargeAmountPaise === undefined || Number.isSafeInteger(plan.chargeAmountPaise) && plan.chargeAmountPaise >= 0)) {
      document.querySelectorAll('[data-plan-price]').forEach(el => { el.textContent = money(plan.amountPaise); });
      const total = plan.chargeAmountPaise ?? plan.amountPaise + Math.round(plan.amountPaise * .18);
      document.querySelectorAll('[data-plan-total]').forEach(el => { el.textContent = `${money(total)}/month including 18% GST.`; });
    }
    const trial = catalog.trial;
    const confirmedTrial = trial?.enabled === true && Number.isInteger(trial.days) && trial.days >= 1 && trial.days <= 30;
    document.querySelectorAll('[data-trial-message]').forEach(el => { el.textContent = confirmedTrial ? `Free for ${trial.days} days. Apple silicon.` : 'Apple silicon. Download first, choose your plan in Morrow.'; });
    document.querySelectorAll('[data-trial-detail]').forEach(el => {
      el.textContent = confirmedTrial ? `${trial.days} days free for eligible accounts. Authorize AutoPay first. Cancel before your first charge to avoid it.` : 'Download Morrow, then review your plan before you subscribe. Cancel renewal anytime.';
    });
    document.querySelectorAll('[data-trial-faq]').forEach(el => {
      el.textContent = confirmedTrial ? `Eligible accounts can try Morrow free for ${trial.days} days after authorizing UPI AutoPay or a card. Checkout shows your first charge date. Cancel before that date to avoid the charge.` : 'A free trial is not currently offered. Download Morrow, then review the current plan in the app before subscribing.';
    });
    window.dispatchEvent(new CustomEvent('morrow:catalog-ready'));
  } catch { /* Keep the honest, non-priced fallback and the download CTA. */ }
})();
