/* The billing catalog owns both the price and trial rollout. Unknown means trial off. */
(async function () {
  const base = document.querySelector('meta[name="morrow-billing-base"]')?.content;
  const key = document.querySelector('meta[name="morrow-billing-key"]')?.content;
  if (!base || base.startsWith('__')) return;
  try {
    const response = await fetch(`${base}/billing-catalog`, { headers: { apikey: key || '' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return;
    const catalog = await response.json();
    const plan = catalog.plans?.find(plan => plan.audience === 'personal' && plan.period === 'monthly');
    const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value / 100);
    if (plan && Number.isSafeInteger(plan.amountPaise) && plan.amountPaise >= 0) {
      document.querySelectorAll('[data-plan-price]').forEach(el => { el.textContent = money(plan.amountPaise); });
      const total = plan.chargeAmountPaise ?? plan.amountPaise + Math.round(plan.amountPaise * .18);
      document.querySelectorAll('[data-plan-total]').forEach(el => { el.textContent = `${money(total)}/month including 18% GST. Cancel renewal anytime.`; });
    }
    const trial = catalog.trial;
    const confirmedTrial = trial?.enabled === true && Number.isInteger(trial.days) && trial.days >= 1 && trial.days <= 30;
    document.querySelectorAll('[data-trial-message]').forEach(el => { el.textContent = confirmedTrial ? `Free for ${trial.days} days. Apple silicon.` : 'Apple silicon. Download first, choose your plan in Morrow.'; });
  } catch { /* Keep the honest, non-priced fallback and the download CTA. */ }
})();
