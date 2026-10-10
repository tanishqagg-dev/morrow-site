"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { billingRequest, parseBillingCatalog } from '@/lib/billing';
import styles from '@/app/download/download.module.css';

const DownloadTrial = createContext<boolean | null>(null);
export function DownloadTrialProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void billingRequest<unknown>('billing-catalog').then(value => {
      if (active) setEnabled(parseBillingCatalog(value).trial.enabled);
    }).catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, []);
  return <DownloadTrial.Provider value={enabled}>{children}</DownloadTrial.Provider>;
}
export function DownloadSteps() {
  const enabled = useContext(DownloadTrial);
  const action = enabled === true ? 'Start free trial' : 'Subscribe';
  return (
    <ol className={styles.steps} aria-label="Install Morrow">
      <li><div className={styles.installVisual} aria-hidden="true"><div className={styles.finderBar}><i /><i /><i /><span>Downloads</span></div><div className={styles.disk}><span>↓</span></div><strong>Morrow.dmg</strong><span className={styles.pointer}>↖</span></div><h2>Open Morrow.dmg</h2><p>Find it in your Downloads folder.</p></li>
      <li><div className={styles.installVisual} aria-hidden="true"><div className={styles.finderBar}><i /><i /><i /><span>Morrow</span></div><div className={styles.dragScene}><img src="/morrow/mark-small.png" alt="" width="58" height="58" /><span className={styles.dragArrow}>→</span><div className={styles.folder}>A</div></div><div className={styles.fileLabels}><span>Morrow</span><span>Applications</span></div></div><h2>Drag into Applications</h2><p>Keep one copy of Morrow on your Mac.</p></li>
      <li><div className={`${styles.installVisual} ${styles.welcomeVisual}`} aria-hidden="true"><div className={styles.finderBar}><i /><i /><i /><span>Morrow</span></div><img src="/morrow/mark-small.png" alt="" width="52" height="52" /><strong>Welcome to Morrow</strong><span className={styles.miniButton}>{action}</span></div><h2>Open Morrow</h2><p>Press &quot;{action}&quot;. Your browser handles your account and plan.</p></li>
    </ol>
  );
}
export function LegacySetupVideo() {
  const enabled = useContext(DownloadTrial);
  // Never flash the old checkout before the current catalog is known.
  if (enabled !== false) return null;
  return (
    <section className={styles.setup} aria-labelledby="setup-title">
      <div className={styles.wrap}>
        <h2 className={styles.h2} id="setup-title">Setup walkthrough.</h2>
        <div className={styles.player}>
          <video controls playsInline preload="none" poster="/media/morrow-install-poster.jpg" width={1920} height={1080}>
            <source src="/media/morrow-install-1080.mp4" type="video/mp4" />
            Your browser can&apos;t play this video. <a href="/media/morrow-install-1080.mp4">Download the setup video</a>.
          </video>
        </div>
        <p className={styles.note}>This video shows the older paid checkout. Morrow app and website screens are real. macOS prompts, System Settings, the Razorpay checkout and Morrow Island are recreated. Narration is an AI voice. Music: &quot;Voxel Revolution&quot; Kevin MacLeod (incompetech.com), CC BY 4.0.</p>
      </div>
    </section>
  );
}
