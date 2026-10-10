import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import type { SubscriptionStage } from "../lib/subscription-flow";
import styles from "./SubscriptionFlow.module.css";
import { siteConfig } from "../lib/site-config";

const help = `mailto:${siteConfig.supportEmail}`;

type Props = {
  stage: SubscriptionStage; email: string | null; desktopRequest: boolean; desktopConnected: boolean;
  busy: boolean; error: string; notice: string; signInAvailable: boolean; canConnect: boolean;
  onSignIn: () => void; onSignOut: () => void; onRefresh: () => void; onAccount: () => void;
  accountControl?: ReactNode; authContent?: ReactNode; authTitle?: string;
  onBack: () => void; onConnect: () => void; children?: ReactNode;
};

export function BillingJourney(props: Props) {
  const { stage, email, busy, desktopRequest, desktopConnected } = props;
  const activeStep = stage === "sign-in" || stage === "loading" || stage === "unavailable" ? 0 : stage === "invite" || stage === "plan" ? 1 : stage === "confirming" ? 2 : 3;
  return <div className={styles.site}>
    <header className={styles.header}>
      <a href="/" aria-label="Morrow home"><img src="/morrow/wordmark.png" alt="morrow" width="118" height="39" /></a>
      {email && <div className={styles.identity}><span>{email}</span>{props.accountControl || <button onClick={props.onSignOut} disabled={busy}>Sign out</button>}</div>}
    </header>
    <main id="main-content" className={styles.main}>
      {stage !== "account" && <ol className={styles.steps} aria-label="Subscription progress">
        {["Sign in", "Plan", "Payment", "Ready"].map((label, index) => <li key={label} aria-current={index === activeStep ? "step" : undefined} data-complete={index < activeStep}>
          <span aria-hidden="true">{index < activeStep ? <Check /> : index + 1}</span>{label}
        </li>)}
      </ol>}
      {stage === "account" && <button className={styles.back} onClick={props.onBack}><ArrowLeft /> Back to Morrow</button>}
      {props.error && <div role="alert" className={styles.error}>{props.error}</div>}
      {props.notice && <p role="status" className={styles.notice}>{props.notice}</p>}
      {stage === "unavailable" && <section className={styles.state}>
        <h1>Your account could not be loaded.</h1>
        <p>Check your connection and try again. If you already paid, check your account before starting another payment.</p>
        <button className={styles.secondary} onClick={props.onRefresh} disabled={busy}>{busy ? "Checking…" : "Try again"}</button>
        <a className={styles.supportNote} href={`${help}?subject=Morrow%20account%20loading`}>Get help</a>
      </section>}
      {stage === "loading" && <section className={styles.state} aria-busy="true" aria-live="polite">
        <SpinnerGap className={styles.spin} size={28} /><h1>Getting your account ready.</h1><p>This should only take a moment.</p>
        {props.error && <button className={styles.secondary} onClick={props.onRefresh} disabled={busy}>Try again</button>}
      </section>}
      {stage === "sign-in" && <section className={styles.state}>
        <img className={styles.mark} src="/morrow/mark-small.png" alt="" width="72" height="72" />
        <h1>{props.authTitle || "Create your Morrow account."}</h1>
        <p>Your account connects your Mac and subscription.</p>
        {props.authContent || <><button className={styles.primary} onClick={props.onSignIn} disabled={busy || !props.signInAvailable}>Sign in or create account <ArrowRight /></button>
        {!props.signInAvailable && <p role="status">Sign-in is unavailable right now. Please try again later.</p>}</>}
        {!props.authContent && <p className={styles.finePrint}>Already subscribed? Use the same account to pick up where you left off.</p>}
      </section>}
      {stage === "confirming" && <section className={styles.state} aria-live="polite">
        <SpinnerGap className={styles.spin} size={32} /><h1>Confirming with your bank.</h1>
        <p>We are checking your bank authorization. {desktopRequest ? "The Mac where you started sign-in will connect automatically once access is ready." : "Your subscription will appear here once access is ready."}</p>
        <p className={styles.finePrint}>Please don’t pay again. It’s safe to check back here.</p>
        <button className={styles.secondary} onClick={props.onRefresh} disabled={busy}>{busy ? "Checking…" : "Check payment status"}</button>
        <a className={styles.supportNote} href={`${help}?subject=Morrow%20payment%20confirmation`}>Get help with this payment</a>
      </section>}
      {stage === "ready" && <section className={styles.state}>
        <CheckCircle size={52} className={styles.success} weight="fill" />
        <h1>{desktopRequest ? "You're in. Morrow is unlocking now." : "Your Morrow is ready."}</h1>
        <p>{desktopConnected ? "Morrow is continuing on your Mac. You can close this tab." : desktopRequest ? "Continue to the Mac where you started sign-in." : "Open Morrow on your Mac and sign in with this account. Your subscription is ready."}</p>
        {desktopRequest && !desktopConnected && props.canConnect && <><button className={styles.primary} onClick={props.onConnect} disabled={busy}>{busy ? <><SpinnerGap className={styles.spin} /> Connecting…</> : <>Open Morrow <ArrowRight /></>}</button><p className={styles.finePrint}>Only continue if you started this sign-in on your own Mac.</p></>}
        {desktopRequest && !desktopConnected && !props.canConnect && <><p className={styles.finePrint}>Your access is active, but this email does not have an available seat. Check your account or contact support.</p><button className={styles.secondary} onClick={props.onRefresh} disabled={busy}>Check access again</button></>}
        {desktopRequest && desktopConnected && <a className={styles.primary} href="morrow://auth-complete">Open Morrow <ArrowRight /></a>}
        <button className={styles.textButton} onClick={props.onAccount}>Manage subscription</button>
      </section>}
      {props.children}
    </main>
    <footer className={styles.footer}><span>Morrow</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a><a href={help}>Help</a></footer>
  </div>;
}
