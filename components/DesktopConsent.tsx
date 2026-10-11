import { useEffect, useRef, useState } from "react";
import type { DesktopRequest } from "../lib/desktop-consent";
import { desktopRequestExpired, normalizeDesktopCode } from "../lib/desktop-consent";
import styles from "./SubscriptionFlow.module.css";
export function DesktopConsent({ request, problem, resetCode = 0, busy, canConnect, now, onConnect, onForget }: {
  problem?: string; request: DesktopRequest | null; resetCode?: number; busy: boolean; canConnect: boolean; now: number;
  onConnect: (code: string, replace: boolean) => void; onForget: () => void;
}) {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const lastReset = useRef(resetCode);
  useEffect(() => { setCode(Array(6).fill("")); }, [request?.id]);
  useEffect(() => {
    if (resetCode !== lastReset.current && !busy) {
      lastReset.current = resetCode; setCode(Array(6).fill("")); inputs.current[0]?.focus();
    }
  }, [resetCode, busy]);
  const fill = (value: string, index: number, paste = false) => {
    const normalized = normalizeDesktopCode(value);
    if (value && !normalized) return;
    const start = paste && normalized.length === 6 ? 0 : index;
    if (normalized.length > 6 - start) return;
    setCode(current => {
      const next = [...current];
      if (!normalized) next[index] = "";
      else [...normalized].forEach((character, offset) => { next[start + offset] = character; });
      return next;
    });
    if (normalized) inputs.current[Math.min(5, start + normalized.length)]?.focus();
  };
  if (!request) return <section className={`${styles.state} ${styles.desktopConsent}`}><h1>{problem || "Checking this Mac…"}</h1>{problem && <p>Open Morrow on your Mac and start sign-in again.</p>}<button className={styles.textButton} onClick={onForget}>This isn't my Mac</button></section>;
  const expired = desktopRequestExpired(request, now);
  if (request.status === "connected") return <section className={`${styles.state} ${styles.desktopConsent}`} aria-live="polite"><h1>Connected</h1><p>Morrow is continuing on your Mac. You can close this tab.</p><a className={styles.primary} href="morrow://auth-complete">Open Morrow</a></section>;
  if (expired) return <section className={`${styles.state} ${styles.desktopConsent}`}><h1>{problem === "Too many tries. Start again from Morrow on your Mac." ? "Too many tries." : "This connection request expired."}</h1><p>{problem === "Too many tries. Start again from Morrow on your Mac." ? problem : "Open Morrow on your Mac and start sign-in again."}</p><button className={styles.textButton} onClick={onForget}>Forget this connection</button></section>;
  if (request.status === "approved") return <section className={`${styles.state} ${styles.desktopConsent}`} aria-live="polite"><h1>Waiting for your Mac…</h1><p>Keep Morrow open on your Mac to finish connecting.</p><button className={styles.textButton} onClick={onForget}>Forget this connection</button></section>;
  return <section className={`${styles.state} ${styles.desktopConsent}`} aria-labelledby="desktop-consent-title">
    <h1 id="desktop-consent-title">Connect this Mac?</h1>
    <p>{request.deviceName || "Mac"}{request.deviceModel ? ` · ${request.deviceModel}` : ""}</p>
    <p className={styles.finePrint}>App version {request.appVersion || "unavailable"} · Requested around {new Date(request.requestedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
    <div className={styles.codeEntry} role="group" aria-labelledby="desktop-code-label">
      <p id="desktop-code-label">Enter the code shown in Morrow</p>
      <div className={styles.codeBoxes}>{code.map((character, index) => <input key={index} ref={element => { inputs.current[index] = element; }}
        aria-label={`Code character ${index + 1}`} aria-invalid={Boolean(problem)} aria-describedby={problem ? "desktop-code-error" : undefined}
        onFocus={event => event.target.select()} value={character} disabled={busy} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text"
        onChange={event => fill(event.target.value, index)}
        onPaste={event => { event.preventDefault(); fill(event.clipboardData.getData("text"), index, true); }}
        onKeyDown={event => {
          if (event.key === "Backspace") {
            event.preventDefault(); const target = character ? index : Math.max(0, index - 1);
            setCode(current => current.map((value, position) => position === target ? "" : value)); inputs.current[Math.max(0, index - 1)]?.focus();
          } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); inputs.current[Math.max(0, Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)))]?.focus();
          }
        }} />)}</div>
      {problem && <p id="desktop-code-error" role="alert">{problem}</p>}
    </div>
    {request.seatInUse && <p>Your seat is connected to {request.seatInUse.deviceName || "another Mac"}. Replacing it signs that Mac out.</p>}
    {!canConnect && <p>Your access is active, but this email has no available seat. Check your subscription.</p>}
    <button className={styles.primary} disabled={busy || code.some(character => !character) || !canConnect} onClick={() => onConnect(code.join(""), Boolean(request.seatInUse))}>{busy ? "Connecting…" : request.seatInUse ? "Replace that Mac" : "Connect this Mac"}</button>
    <button className={styles.textButton} onClick={onForget} disabled={busy}>This isn't my Mac</button>
  </section>;
}
