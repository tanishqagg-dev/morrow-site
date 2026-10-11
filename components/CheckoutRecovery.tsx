import type {CheckoutRecoveryState} from '../lib/checkout-recovery';
import styles from './SubscriptionFlow.module.css';
export function CheckoutRecovery({state,reason,busy,canResume,onResume,onChangePlan,onRefresh}: {
  state:CheckoutRecoveryState;reason?:string;busy:boolean;canResume:boolean;
  onResume:()=>void;onChangePlan:()=>void;onRefresh:()=>void;
}) {
  return <section className={`${styles.accountSummary} ${styles.checkoutRecovery}`} aria-label="Checkout recovery" aria-live="polite">
    <h2>{state==='closed' ? 'Checkout closed. Nothing was charged.' : state==='failed' ? 'Payment failed' : 'Payment status is not confirmed'}</h2>
    <p>{state==='closed' ? canResume ? 'Resume this checkout, or cancel it to choose a different plan.' : 'Cancel this checkout to choose a different plan and review a new price.' : state==='failed' ? reason || 'Your bank did not complete this payment.' : 'A payment may still be processing. Check its status before paying again.'}</p>
    {!canResume && state!=='uncertain' && <p>This checkout can no longer be resumed. Change plan to cancel it before starting again.</p>}
    <div className={styles.checkoutActions}>
      {state!=='uncertain' && canResume && <button className={styles.primary} onClick={onResume} disabled={busy}>{state==='failed' ? 'Try again' : 'Resume'}</button>}
      {state==='uncertain' && <button className={styles.primary} onClick={onRefresh} disabled={busy}>Check payment status</button>}
      <button className={state!=='uncertain' && !canResume ? styles.primary : styles.quietButton} onClick={onChangePlan} disabled={busy}>{state==='failed' ? 'Use another method' : 'Change plan'}</button>
    </div>
    <p className={styles.finePrint}>Changing plan checks Razorpay first. Your checkout stays reserved until cancellation is confirmed.</p>
  </section>;
}
