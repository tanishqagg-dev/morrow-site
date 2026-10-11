import type { DesktopRequest } from "../lib/desktop-consent";
import { desktopRequestExpired, formatUserCode } from "../lib/desktop-consent";
import styles from "./SubscriptionFlow.module.css";
export function DesktopConsent({ request, problem, confirmed, busy, canConnect, now, onConfirm, onConnect, onForget }: {
  problem?: string; request: DesktopRequest | null; confirmed: boolean; busy: boolean; canConnect: boolean; now: number;
  onConfirm: (value: boolean) => void; onConnect: (replace: boolean) => void; onForget: () => void;
}) {
  if (!request) return <section className={`${styles.state} ${styles.desktopConsent}`}><h1>{problem || "Checking this Mac…"}</h1>{problem && <p>Open Morrow on your Mac and start sign-in again.</p>}<button className={styles.textButton} onClick={onForget}>This isn't my Mac</button></section>;
  const expired = desktopRequestExpired(request, now);
  if (request.status === "connected") return <section className={`${styles.state} ${styles.desktopConsent}`} aria-live="polite"><h1>Connected</h1><p>Morrow is continuing on your Mac. You can close this tab.</p><a className={styles.primary} href="morrow://auth-complete">Open Morrow</a></section>;
  if (expired) return <section className={`${styles.state} ${styles.desktopConsent}`}><h1>This connection request expired.</h1><p>Open Morrow on your Mac and start sign-in again.</p><button className={styles.textButton} onClick={onForget}>Forget this connection</button></section>;
  if (request.status === "approved") return <section className={`${styles.state} ${styles.desktopConsent}`} aria-live="polite"><h1>Waiting for your Mac…</h1><p>Keep Morrow open on your Mac to finish connecting.</p><button className={styles.textButton} onClick={onForget}>Forget this connection</button></section>;
  return <section className={`${styles.state} ${styles.desktopConsent}`} aria-labelledby="desktop-consent-title">
    <h1 id="desktop-consent-title">Connect this Mac?</h1>
    <p>{request.deviceName || "Mac"}{request.deviceModel ? ` · ${request.deviceModel}` : ""}</p>
    <p className={styles.finePrint}>App version {request.appVersion || "unavailable"} · Requested around {new Date(request.requestedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
    <p className={styles.pairingCode} aria-label={`Pairing code ${formatUserCode(request.userCode)}`}>{formatUserCode(request.userCode)}</p>
    <label className={styles.codeConfirmation}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => onConfirm(event.target.checked)} /> This code matches what Morrow shows on my Mac</label>
    {request.seatInUse && <p>Your seat is connected to {request.seatInUse.deviceName || "another Mac"}. Replacing it signs that Mac out.</p>}
    {!canConnect && <p>Your access is active, but this email has no available seat. Check your subscription.</p>}
    <button className={styles.primary} disabled={busy || !confirmed || !canConnect} onClick={() => onConnect(Boolean(request.seatInUse))}>{busy ? "Connecting…" : request.seatInUse ? "Replace that Mac" : "Connect this Mac"}</button>
    <button className={styles.textButton} onClick={onForget} disabled={busy}>This isn't my Mac</button>
  </section>;
}
