import styles from "./BillingPortal.module.css";

export function CheckoutUnavailable() {
  return <div className={styles.site}>
    <header className={styles.header}><a href="/" aria-label="Morrow home"><img src="/morrow/wordmark.png" alt="morrow" width="142" height="47" /></a><a href="/#features">Explore Morrow</a></header>
    <main className={styles.closedCheckout} id="main-content">
      <img src="/morrow/mark-small.png" alt="" width="100" height="100" />
      <p>MORROW PERSONAL</p><h1>Your work, with Morrow.</h1>
      <div className={styles.closedPrice}>Free <span>during beta</span></div>
      <div className={styles.pending} role="status"><strong>Morrow is in private beta.</strong><span>There is no checkout. You can't be charged from this page.</span></div>
      <p>Planned after the beta: ₹2,999/month + 18% GST for Morrow's voice workspace, Island on your Mac.</p>
      <p className={styles.taxLine}>AI usage runs on your own ChatGPT plan.</p>
      <a className={styles.darkButton} href="/#beta">Join the beta ↗</a>
    </main>
    <footer className={styles.footer}><span>Made by Aestrum</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></footer>
  </div>;
}
