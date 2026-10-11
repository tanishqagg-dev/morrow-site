import type {CheckoutExpiryState} from '../lib/checkout-expiring';
import styles from './SubscriptionFlow.module.css';
export function CheckoutExpiring({state,onRetry,busy}:{state:CheckoutExpiryState;onRetry:()=>void;busy:boolean}) {
 return <section className={`${styles.accountSummary} ${styles.checkoutRecovery}`} aria-label="Last checkout" aria-live="polite">
  <h2>{state==='waiting' ? 'Finishing up your last checkout…' : 'Your last checkout is still being checked'}</h2>
  <p>{state==='waiting' ? 'Razorpay is checking the previous authorization. We will check again shortly.' : 'This is taking longer than expected. Retry to check its status before starting a new checkout.'}</p>
  {state==='timeout' && <div className={styles.checkoutActions}><button className={styles.primary} disabled={busy} onClick={onRetry}>Retry</button></div>}
 </section>;
}
