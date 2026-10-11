"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { billingRequest, parseBillingCatalog } from '@/lib/billing';
import styles from '@/app/download/download.module.css';

gsap.registerPlugin(useGSAP);
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
function WindowBar({ title }: { title: string }) {
  return <div className={styles.windowBar} aria-hidden="true"><span className={styles.windowControls}><i /><i /><i /></span><span>{title}</span><span className={styles.windowTools}>⌘</span></div>;
}
function Folder() {
  return <svg viewBox="0 0 100 84" fill="none" aria-hidden="true"><path d="M4 20a8 8 0 0 1 8-8h24l10 10h42a8 8 0 0 1 8 8v42a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8Z" fill="#D4D4D4"/><path d="M4 30a8 8 0 0 1 8-8h76a8 8 0 0 1 8 8v42a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8Z" fill="#EBEBEB" stroke="#A3A3A3"/><path d="m38 60 12-24 12 24M41 54h18" stroke="#737373" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function DownloadSteps() {
  const enabled = useContext(DownloadTrial);
  const action = enabled === true ? 'Start free trial' : 'Subscribe';
  const [step, setStep] = useState(1);
  const [replay, setReplay] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (step !== 1) return;
      const moving = root.current?.querySelector('[data-drag-app]');
      const destination = root.current?.querySelector('[data-applications]');
      if (!moving || !destination) return;
      const start = moving.getBoundingClientRect(), end = destination.getBoundingClientRect();
      const distance = end.left + end.width / 2 - start.left - start.width / 2;
      gsap.timeline({ defaults: { ease: 'power3.inOut' }, delay: .6 })
        .to('[data-install-pointer]', { opacity: 1, duration: .2 })
        .to('[data-install-source]', { opacity: .25, duration: .2 })
        .to(moving, { x: distance, y: -10, scale: .85, duration: 1.3 }, '<')
        .to('[data-install-pointer]', { x: distance, y: -10, duration: 1.3 }, '<')
        .to(moving, { opacity: 0, duration: .25 })
        .to('[data-install-complete]', { opacity: 1, duration: .3 }, '<')
        .to('[data-install-pointer]', { opacity: 0, duration: .2 });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [step, replay], revertOnUpdate: true });
  return <div className={styles.installGuide} ref={root}>
    <div className={styles.installStage} id="install-scene" aria-label={`Installation illustration: ${['Open Morrow.dmg','Drag into Applications','Open Morrow'][step]}`}>
      <div className={styles.macWindow}>
        <WindowBar title={step === 0 ? 'Downloads' : 'Morrow'} />
        {step === 0 ? <div className={styles.openDisk}>
          <div className={styles.drive} aria-hidden="true"><svg viewBox="0 0 80 88"><rect x="12" y="6" width="56" height="72" rx="8" fill="#EBEBEB" stroke="#A3A3A3"/><path d="M20 60h40v10H20Z" fill="#D4D4D4"/><path d="M40 24v24m-10-10 10 10 10-10" fill="none" stroke="#525252" strokeWidth="3"/></svg></div>
          <strong>Morrow.dmg</strong><p>Double-click to open</p>
        </div> : step === 1 ? <div className={styles.dragScene}>
          <div className={styles.appSource}><img data-install-source className={styles.sourceIcon} src="/morrow/mark-small.png" alt="" width="88" height="88" /><div data-drag-app className={styles.dragApp}><img src="/morrow/mark-small.png" alt="" width="88" height="88" /></div><svg data-install-pointer className={styles.installPointer} viewBox="0 0 24 32"><path d="m2 2 19 18-9 1-4 8Z" fill="#0A0A0A" stroke="#FFF" strokeWidth="2"/></svg><span>Morrow</span></div>
          <svg className={styles.dragArrow} viewBox="0 0 80 24" aria-hidden="true"><path d="M2 12h72M63 3l12 9-12 9" stroke="#A3A3A3" strokeWidth="2" fill="none"/></svg>
          <div className={styles.folderTarget}><div data-applications><Folder /></div><span>Applications</span><span className={styles.installComplete} data-install-complete aria-hidden="true">✓ Copied</span></div>
        </div> : <img className={styles.appCapture} src="/screens/install-welcome.png" alt="Morrow's welcome screen, with the Get started button" width="1440" height="900" />}
      </div>
      {step === 1 && <button className={styles.replay} onClick={() => setReplay(value => value + 1)} aria-label="Replay drag-to-Applications animation">Replay ↻</button>}
    </div>
    <ol className={styles.steps} aria-label="Install Morrow">
      {[['Open Morrow.dmg', 'Find it in your Downloads folder.'], ['Drag into Applications', 'Move Morrow into the Applications folder.'], ['Open Morrow', `Press "${action}". Your browser handles your account and plan.`]].map(([title, description], index) => <li key={title}>
        <button aria-pressed={step === index} aria-controls="install-scene" onClick={() => setStep(index)}><span className={styles.stepNumber}>{index + 1}</span><span><strong>{title}</strong><span className={styles.stepDescription}>{description}</span></span></button>
      </li>)}
    </ol>
    <div className={styles.nextStep}><p>Next, open Morrow <span aria-hidden="true">→</span> <strong>{action}</strong></p><a href="/subscribe">Continue in browser <span aria-hidden="true">↗</span></a></div>
  </div>;
}
export function LegacySetupVideo() {
  const enabled = useContext(DownloadTrial);
  if (enabled !== false) return null;
  return <details className={styles.fix}><summary>Setup walkthrough.<span aria-hidden="true">+</span></summary><div className={styles.fixContent}>
    <p>This walkthrough shows the older paid checkout. Use the current plan shown in your account.</p>
    <div className={styles.player}><video controls playsInline preload="none" poster="/media/morrow-install-poster.jpg" width={1920} height={1080}><source src="/media/morrow-install-1080.mp4" type="video/mp4" />Your browser can&apos;t play this video. <a href="/media/morrow-install-1080.mp4">Download the setup video</a>.</video></div>
    <p className={styles.note}>Real Morrow screens with recreated macOS prompts and checkout. AI narration. Music: &quot;Voxel Revolution&quot; Kevin MacLeod, CC BY 4.0.</p>
  </div></details>;
}
