import styles from './SubscriptionFlow.module.css';
import {siteConfig} from '../lib/site-config';
export function SubscriptionRecoveryGuidance({status, hasPaidAccess}: {status: string; hasPaidAccess: boolean}) {
  if (!['pending','halted','paused'].includes(status)) return null;
  return <div className={styles.notice} role="status">
    <h3>{status === 'pending' ? 'A renewal payment failed' : status === 'halted' ? 'Renewal payments have stopped' : 'Your subscription is paused'}</h3>
    {status === 'pending' && <><p>Razorpay will retry the failed renewal while retries remain. Check your balance and Razorpay's payment failure email for the recovery options available to your payment method.</p><p>Morrow will check the subscription status when you refresh. Please recover the existing subscription before starting another one.</p></>}
    {status === 'halted' && <><p>Razorpay has exhausted its retries. Automatic debits have stopped, but invoices can still be issued. Check Razorpay's payment failure email for supported payment method recovery.</p><p>Previously unpaid invoices are not automatically settled when future billing resumes. Contact support to review them. Morrow will check the subscription status when you refresh.</p></>}
    {status === 'paused' && <><p>Renewal billing is paused. If you paused the mandate yourself, resume it in the same UPI app. Morrow cannot resume it for you.</p><p>If you did not pause it, or cannot resume it, contact support. Morrow will check the subscription status when you refresh.</p></>}
    <p>{hasPaidAccess ? 'You can keep using Morrow until the access date shown here. Recovery does not extend that date until billing is confirmed.' : 'Morrow access resumes once the server confirms a paid term. Your files and payment history remain available.'}</p>
    <a href={`mailto:${siteConfig.supportEmail}?subject=Morrow%20subscription%20recovery`}>Contact support</a>
  </div>;
}
