import styles from "./BillingPortal.module.css";

export function CheckoutUnavailable() {
  return <div className={styles.site}>
    <header className={styles.header}><a href="/" aria-label="Morrow home"><img src="/morrow/wordmark.png" alt="morrow" width="142" height="47" /></a><a href="/#say-it">Explore Morrow</a></header>
    <main className={styles.closedCheckout} id="main-content">
      <img src="/morrow/mark-small.png" alt="" width="100" height="100" />
      <p>MORROW PERSONAL</p><h1>Your work, with Morrow.</h1>

      <div className={styles.pending} role="status"><strong>Checkout is unavailable right now.</strong><span>You have not been charged from this page. Try again later or contact Morrow support.</span></div>
      <p>Your plan and any trial offer will appear when checkout is available.</p>
      <p className={styles.taxLine}>AI usage runs on your own ChatGPT plan.</p>
      <a className={styles.darkButton} href="/download?start=1">Download for Mac</a>
    </main>
    <footer className={styles.footer}><span>Morrow</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></footer>
  </div>;
}
