"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import release from '@/lib/mac-release.json';
import styles from '@/app/download/download.module.css';

export function MacDownload() {
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
      setMessage('Check your browser downloads. Open the DMG when it finishes.');
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
    <p className={styles.meta}>Apple silicon · macOS 13 or later</p>
    <h1 className={styles.title}>{started ? 'Your download has started' : 'Download Morrow for Mac'}</h1>
    <p className={styles.downloadIntro}>A little setup. Then a lot less busywork.</p>
    <div className={styles.downloadActions}>
      {started ? <p>Download didn&apos;t start? <button className={styles.retry} onClick={download}>Try again</button></p> : <button className={styles.downloadButton} onClick={download}>Download for Mac ↓</button>}
      <p role="status" className={styles.downloadStatus}>{message}</p>
      <p><a href={release.zipDownloadUrl}>Download ZIP instead</a><span className={styles.releaseInfo}>Morrow {release.version} · {Math.round(release.bytes / 1_000_000)} MB</span></p>
      <details className={styles.checksum}><summary>Verify your download (SHA-256)</summary><p>DMG</p><code>{release.sha256}</code><p>ZIP (contains the DMG)</p><code>{release.zipSha256}</code></details>
    </div>
  </>;
}
