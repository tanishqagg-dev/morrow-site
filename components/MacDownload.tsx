"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import release from '@/lib/mac-release.json';
import styles from '@/app/download/download.module.css';

gsap.registerPlugin(useGSAP);
export function MacDownload() {
  const title = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(title.current, { y: 12, clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.out' });
    });
    return () => media.revert();
  }, { scope: title });
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState('');
  const attempted = useRef(false);
  const download = useCallback(() => {
    try {
      const link = document.createElement('a');
      link.href = release.downloadUrl;
      link.download = release.filename;
      document.body.appendChild(link);
      link.click(); link.remove();
      setStarted(true);
      setMessage('');
    } catch { setMessage('Your browser could not start the download. Use the link below.'); }
  }, []);
  useEffect(() => {
    if (attempted.current || new URLSearchParams(window.location.search).get('start') !== '1') return;
    attempted.current = true;
    try {
      if (sessionStorage.getItem('morrow:download-started')) {
        setStarted(true); setMessage('Already started in this session. Use Try again if you need another copy.'); return;
      }
      sessionStorage.setItem('morrow:download-started', '1');
    } catch { /* The in-memory guard still prevents duplicate starts on this mount. */ }
    download();
  }, [download]);
  return <>
    <h1 ref={title} className={styles.title}>{started ? 'Your download has started' : 'Download Morrow for Mac'}</h1>
    <p className={styles.meta}>Apple silicon · macOS 13 or later</p>
    <div className={styles.downloadActions}>
      {!started && <button className={styles.downloadButton} onClick={download}>Download for Mac ↓</button>}
      <p className={styles.downloadLinks}>{started && <>Download didn&apos;t start? <button className={styles.retry} onClick={download}>Try again</button><span aria-hidden="true"> · </span></>}<a href={release.zipDownloadUrl}>Download ZIP instead</a></p>
      {message && <p role="status" className={styles.downloadStatus}>{message}</p>}
      <details className={styles.checksum}><summary>Release details and SHA-256</summary><p>Morrow {release.version} · {Math.round(release.bytes / 1_000_000)} MB</p><p>DMG</p><code>{release.sha256}</code><p>ZIP (contains the DMG)</p><code>{release.zipSha256}</code></details>
    </div>
  </>;
}
