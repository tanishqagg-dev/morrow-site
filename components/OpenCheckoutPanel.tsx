import {rupees,type OpenCheckout} from '../lib/billing';
import styles from './SubscriptionFlow.module.css';
export function OpenCheckoutPanel({checkout,busy,onResume,onChangePlan}:{checkout:OpenCheckout;busy:boolean;onResume:()=>void;onChangePlan:()=>void}) {
 const resumable=checkout.resumable && Boolean(checkout.keyId) && (!checkout.expiresAt || Date.parse(checkout.expiresAt)>Date.now()+60_000);
 return <section className={`${styles.accountSummary} ${styles.checkoutRecovery}`} aria-label="Unfinished checkout" aria-live="polite">
  <h2>You have an unfinished checkout</h2>
  <p>{checkout.planName} · {checkout.period} · {checkout.quantity} {checkout.quantity===1?'seat':'seats'}</p>
  <p>{rupees(checkout.amountPaise)}{checkout.trial?' first charge after your trial':' first payment'}{checkout.couponCode?`. Coupon: ${checkout.couponCode}`:''}.</p>
  {checkout.expiresAt && <p>Authorization expires {new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(checkout.expiresAt))} IST.</p>}
  <p>{resumable?'Resume this checkout, or change plan to cancel it and continue with your chosen plan.':'This checkout expired at Razorpay. Change plan to start again.'}</p>
  <div className={styles.checkoutActions}>
   {resumable && <button className={styles.primary} disabled={busy} onClick={onResume}>Resume</button>}
   <button className={resumable?styles.quietButton:styles.primary} disabled={busy} onClick={onChangePlan}>Change plan</button>
  </div>
 </section>;
}
