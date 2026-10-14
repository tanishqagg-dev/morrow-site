"use client";
import { useEffect, useState } from 'react';

type OS = 'mac' | 'windows';
function readOS(): OS {
  try {
    const query = new URLSearchParams(window.location.search).get('os');
    if (query === 'mac' || query === 'windows') return query;
    const saved = localStorage.getItem('morrow-os');
    if (saved === 'mac' || saved === 'windows') return saved;
  } catch {}
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || '';
  return /Win/i.test(platform) || /Windows|Android/i.test(navigator.userAgent || '') ? 'windows' : 'mac';
}
// The header's download button follows the visitor's computer. Server-rendered as Mac, corrected on the client.
export function HeaderDownload() {
  const [os, setOS] = useState<OS>('mac');
  useEffect(() => { setOS(readOS()); }, []);
  return <a className="button button-primary" href={os === 'windows' ? '/download?os=windows&start=1' : '/download?start=1'}>{os === 'windows' ? 'Download for Windows' : 'Download for Mac'}</a>;
}
