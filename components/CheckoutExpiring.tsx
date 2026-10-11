import type {CheckoutExpiryState} from '../lib/checkout-expiring';
import styles from './SubscriptionFlow.module.css';
export function CheckoutExpiring({onRetry,busy}:{state:CheckoutExpiryState;onRetry:()=>void;busy:boolean}) {
 return <section className={`${styles.accountSummary} ${styles.checkoutRecovery}`} aria-label="Last checkout" aria-live="polite">
  <h2>Finishing up your last checkout…</h2>
  <p>Your previous checkout is still being checked. Retry to request a checkout.</p>
  <div className={styles.checkoutActions}><button className={styles.primary} disabled={busy} onClick={onRetry}>Retry</button></div>
 </section>;
}
