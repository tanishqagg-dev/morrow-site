"use client";
import { useContext, useState } from 'react';
import release from '@/lib/windows-release.json';
import { DownloadTrial } from '@/components/DownloadGuide';
import styles from '@/app/download/download.module.css';

function WindowBar({ title }: { title: string }) {
  return <div className={`${styles.windowBar} ${styles.winBar}`} aria-hidden="true"><span>{title}</span><span className={styles.winControls}><i>&#8212;</i><i>&#9633;</i><i>&#10005;</i></span></div>;
}
// Three steps for Windows, drawn in the same window style as the Mac guide. The SmartScreen dialog is recreated, not a screenshot.
export function WindowsSteps() {
  const enabled = useContext(DownloadTrial);
  const action = enabled === true ? 'Start free trial' : 'Subscribe';
  const [step, setStep] = useState(1);
  const titles = ['Run the setup', 'If Windows warns you', 'Open Morrow'];
  return <div className={styles.installGuide}>
    <div className={styles.installStage} id="install-scene" aria-label={`Installation illustration: ${titles[step]}`}>
      <div className={styles.macWindow}>
        <WindowBar title={step === 0 ? 'Downloads' : step === 1 ? 'Windows protected your PC' : 'Morrow'} />
        {step === 0 ? <div className={styles.openDisk}>
          <div className={styles.drive} aria-hidden="true"><svg viewBox="0 0 80 88"><rect x="12" y="6" width="56" height="72" rx="6" fill="#EBEBEB" stroke="#A3A3A3"/><path d="M24 24h32M24 36h32M24 48h20" stroke="#A3A3A3" strokeWidth="3" strokeLinecap="round"/><path d="M40 56v18m-8-8 8 8 8-8" fill="none" stroke="#525252" strokeWidth="3"/></svg></div>
          <strong>{release.filename}</strong><p>Double-click to run it</p>
        </div> : step === 1 ? <div className={styles.smartScreen}>
          <p className={styles.smartTitle}>Windows protected your PC</p>
          <p>Microsoft Defender SmartScreen prevented an unrecognised app from starting. Running this app might put your PC at risk.</p>
          <p className={styles.smartMore}><u>More info</u> <span aria-hidden="true">→</span> App: <strong>{release.filename}</strong></p>
          <div className={styles.smartButtons}><span className={styles.smartPrimary}>Run anyway</span><span>Don&apos;t run</span></div>
        </div> : <img className={styles.appCapture} src="/screens/install-welcome.png" alt="Morrow's welcome screen, with the Get started button" width="1440" height="900" />}
      </div>
    </div>
    <ol className={styles.steps} aria-label="Install Morrow on Windows">
      {[['Run the setup', `Open ${release.filename} from your Downloads folder.`], ['If Windows warns you', 'Choose More info, check the file name, then Run anyway. No Run anyway option? Never switch off Smart App Control; contact support instead.'], ['Open Morrow', `From the Start menu. Press "${action}". Your browser handles your account and plan.`]].map(([title, description], index) => <li key={title}>
        <button aria-pressed={step === index} aria-controls="install-scene" onClick={() => setStep(index)}><span className={styles.stepNumber}>{index + 1}</span><span><strong>{title}</strong><span className={styles.stepDescription}>{description}</span></span></button>
      </li>)}
    </ol>
    <div className={styles.nextStep}><p>Next, open Morrow <span aria-hidden="true">→</span> <strong>{action}</strong></p><a href="/subscribe">Continue in browser <span aria-hidden="true">↗</span></a></div>
  </div>;
}
