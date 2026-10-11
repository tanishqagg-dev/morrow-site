import type {SignInIntent} from '../lib/sign-in-intent';
import {signInIntentVerb} from '../lib/sign-in-intent';
import {siteConfig} from '../lib/site-config';
import styles from './SubscriptionFlow.module.css';
export function SignInAgainStep({intent,mode,busy,onSignIn,onConfirm,onDismiss}:{intent:SignInIntent;mode:'sign-in'|'confirm'|'support';busy:boolean;onSignIn:()=>void;onConfirm:()=>void;onDismiss:()=>void}) {
 const verb=signInIntentVerb(intent.body);
 return <section className={styles.state} aria-live="polite">
  <h2>{mode==='sign-in'?`For your security, sign in again to ${verb}.`:mode==='support'?"We couldn't verify your new sign-in.":`Confirm you want to ${verb}.`}</h2>
  {mode==='support' && <p>Nothing changed. Try again, or contact support if this keeps happening.</p>}
  {mode==='confirm' && <p>Signing in did not change anything. {intent.body.action==='approve_desktop'?'Confirm the Mac connection below.':'Confirm below to continue.'}</p>}
  {mode==='sign-in'?<button className={styles.primary} disabled={busy} onClick={onSignIn}>Sign in again</button>:intent.body.action==='approve_desktop' && mode==='confirm'?null:<button className={styles.primary} disabled={busy} onClick={onConfirm}>{mode==='support'?'Try again':`Confirm: ${verb}`}</button>}
  {mode==='support' && <a className={styles.supportNote} href={`mailto:${siteConfig.supportEmail}`}>Contact support</a>}
  <button className={styles.textButton} disabled={busy} onClick={onDismiss}>Keep things as they are</button>
 </section>;
}
