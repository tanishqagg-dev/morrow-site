"use client";
import { useState } from 'react';
import release from '@/lib/mac-release.json';
export function MacDownload(){
 const zipUrl=(release as typeof release & {zipDownloadUrl?:string}).zipDownloadUrl;
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [checksum,setChecksum]=useState('');
 const download=async()=>{setBusy(true);setMessage('');try{
  const url=new URL(release.downloadUrl);
  setChecksum(release.sha256||'');setMessage(`Morrow ${release.version} download started. Open the DMG, then drag Morrow to Applications.`);window.location.assign(url.href);
 }catch(e){setMessage(e instanceof Error?e.message:'Download unavailable. Try again.');}finally{setBusy(false);}};
 return <><button className="button" onClick={()=>void download()} disabled={busy}>{busy?'Preparing download…':'Download Morrow for Mac'}</button>{zipUrl&&<p><a href={zipUrl}>Download ZIP containing the full DMG</a></p>}<p role="status">{message}</p>{checksum&&<details><summary>Verify your download</summary><code style={{overflowWrap:'anywhere'}}>SHA-256 {checksum}</code></details>}</>;
}
