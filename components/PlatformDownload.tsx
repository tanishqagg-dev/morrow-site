"use client";
import { useEffect, useState } from 'react';
import { MacDownload } from '@/components/MacDownload';
import { WindowsDownload } from '@/components/WindowsDownload';
import { DownloadSteps } from '@/components/DownloadGuide';
import { WindowsSteps } from '@/components/WindowsSteps';
import styles from '@/app/download/download.module.css';

export type OS = 'mac' | 'windows';
export function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'mac';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || '';
  const ua = navigator.userAgent || '';
  if (/Win/i.test(platform) || /Windows/i.test(ua) || /Android/i.test(ua)) return 'windows';
  return 'mac';
}
export function readOS(): OS {
  try {
    const query = new URLSearchParams(window.location.search).get('os');
    if (query === 'mac' || query === 'windows') { localStorage.setItem('morrow-os', query); return query; }
    const saved = localStorage.getItem('morrow-os');
    if (saved === 'mac' || saved === 'windows') return saved;
  } catch {}
  return detectOS();
}
// The install guide for the computer the visitor is on, with the other one a click away.
export function PlatformDownload() {
  const [os, setOS] = useState<OS | null>(null);
  useEffect(() => { setOS(readOS()); }, []);
  const choose = (next: OS) => {
    setOS(next);
    try { localStorage.setItem('morrow-os', next); } catch {}
    try { const url = new URL(window.location.href); url.searchParams.set('os', next); url.searchParams.delete('start'); window.history.replaceState(null, '', url); } catch {}
  };
  if (os === null) return <div className={styles.hero}><h1 className={styles.title}>Download Morrow</h1><p className={styles.meta}>Checking which computer you are on.</p></div>;
  return <>
    <div className={styles.hero}>
      {os === 'windows' ? <WindowsDownload /> : <MacDownload />}
      <p className={styles.platformSwitch}>{os === 'windows' ? 'Not on Windows?' : 'Not on a Mac?'} <button type="button" className={styles.retry} onClick={() => choose(os === 'windows' ? 'mac' : 'windows')}>{os === 'windows' ? 'Get Morrow for Mac instead' : 'Get Morrow for Windows instead'}</button></p>
    </div>
    {os === 'windows' ? <WindowsSteps /> : <DownloadSteps />}
  </>;
}
