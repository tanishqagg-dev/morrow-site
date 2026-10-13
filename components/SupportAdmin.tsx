"use client";
import { useEffect, useRef, useState } from "react";
import { billingRequest } from "@/lib/billing";

type Report={id:string;email:string;summary:string;category:string;status:string;created_at:string;description?:string;diagnostics?:Record<string,unknown>;screenshot?:string|null;logs?:string|null;reply?:string|null;reply_steps?:string[];replied_at?:string|null;reply_seen_at?:string|null;notes?:Array<{at:string;detail:{note:string;status:string}}>};
export function SupportAdmin({token}:{token:string}) {
  const [reports,setReports]=useState<Report[]>([]);
  const [selected,setSelected]=useState<Report|null>(null);
  const [status,setStatus]=useState("investigating");
  const [note,setNote]=useState("");
  const [reply,setReply]=useState("");
  const [steps,setSteps]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const scope=useRef(0);
  useEffect(()=>{scope.current+=1;setReports([]);setSelected(null);return()=>{scope.current+=1;};},[token]);
  const load=async(before?:string)=>{
    const current=scope.current;setBusy(true);setError("");
    try{const result=await billingRequest<{reports:Report[]}>("support-admin",{action:"list",before},token);if(current===scope.current)setReports(old=>before?[...old,...result.reports]:result.reports);}
    catch(e){if(current===scope.current)setError(String(e));}finally{if(current===scope.current)setBusy(false);}
  };
  const inspect=async(id:string)=>{
    const current=scope.current;setBusy(true);setSelected(null);setError("");
    try{const result=await billingRequest<Report>("support-admin",{action:"detail",id},token);if(current===scope.current){setSelected(result);setStatus(result.status);setNote("");setReply("");setSteps("");}}
    catch(e){if(current===scope.current)setError(String(e));}finally{if(current===scope.current)setBusy(false);}
  };
  const save=async()=>{
    if(!selected)return;const current=scope.current;setBusy(true);setError("");
    try{await billingRequest("support-admin",{action:"update",id:selected.id,status,note},token);if(current===scope.current){setSelected(null);await load();}}
    catch(e){if(current===scope.current)setError(String(e));}finally{if(current===scope.current)setBusy(false);}
  };
  // The customer's Morrow shows this as a pop-up with numbered steps, once, then keeps it in Help.
  const stepList=steps.split("\n").map(step=>step.replace(/^\s*(?:\d+[.)]|[-*•])\s*/,"").trim()).filter(Boolean);
  const sendReply=async()=>{
    if(!selected)return;const current=scope.current;setBusy(true);setError("");
    try{await billingRequest("support-admin",{action:"reply",id:selected.id,status,reply,steps:stepList},token);if(current===scope.current)await inspect(selected.id);}
    catch(e){if(current===scope.current)setError(String(e));}finally{if(current===scope.current)setBusy(false);}
  };
  return <section className="support-admin" aria-labelledby="support-admin-title">
    <header><div><h2 id="support-admin-title">Beta support inbox</h2><p>Review reports, reproduce problems and record the fix. Access requires an operator account and MFA.</p></div><button className="button button-secondary" disabled={busy} onClick={()=>void load()}>Load reports</button></header>
    {error && <p role="alert">{error}</p>}
    <div className="support-admin-layout"><div className="support-admin-list">{reports.map(report=><button className="support-admin-item" key={report.id} onClick={()=>void inspect(report.id)} disabled={busy} aria-pressed={selected?.id===report.id}><strong>{report.summary}</strong><span>{report.email}</span><span>{report.category.replaceAll('_',' ')} · {report.status.replaceAll('_',' ')} · {new Date(report.created_at).toLocaleDateString('en-IN')}</span></button>)}
      {!reports.length && <p>Load the inbox to see customer reports.</p>}{reports.length>0 && reports.length%50===0 && <button disabled={busy} onClick={()=>void load(reports.at(-1)?.created_at)}>Load older reports</button>}</div>
      <article className="support-admin-detail">{selected ? <><h3>{selected.summary}</h3><p>{selected.email} · Reference {selected.id}</p><p style={{whiteSpace:'pre-wrap'}}>{selected.description}</p>
        {selected.category==='account_deletion' && <p><strong>Deletion checklist:</strong> verify ownership, cancel renewal, settle refunds, revoke devices, delete the Clerk identity and unnecessary personal records, retain required tax records, then confirm completion. Closing this ticket does not perform deletion.</p>}
        <details open><summary>Diagnostics</summary><pre>{JSON.stringify(selected.diagnostics,null,2)}</pre></details>
        {selected.logs && <details><summary>Morrow log (last lines)</summary><pre style={{maxHeight:320,overflow:'auto',whiteSpace:'pre-wrap'}}>{selected.logs}</pre></details>}
        {selected.screenshot && <img src={selected.screenshot} alt="Customer-approved screenshot attached to this report" style={{width:'100%',borderRadius:12}}/>}
        <h4>Reply to the customer</h4>
        {selected.reply && <div className="support-admin-reply"><p style={{whiteSpace:'pre-wrap'}}>{selected.reply}</p>{selected.reply_steps?.length ? <ol>{selected.reply_steps.map((step,i)=><li key={i}>{step}</li>)}</ol> : null}<p>Sent {selected.replied_at ? new Date(selected.replied_at).toLocaleString() : ""} · {selected.reply_seen_at ? `Seen in Morrow ${new Date(selected.reply_seen_at).toLocaleString()}` : "Not seen yet"}</p></div>}
        <label>Message<textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={4000} rows={3} placeholder="What's wrong and what to do, in plain words."/></label>
        <label>Steps, one per line<textarea value={steps} onChange={e=>setSteps(e.target.value)} rows={5} placeholder={"Turn off your VPN or DNS filter.\nSet DNS to 1.1.1.1 and 8.8.8.8 in System Settings > Wi-Fi > Details > DNS.\nPress Speak again."}/></label>
        <p>{stepList.length>12 ? "Use 12 steps or fewer." : `${stepList.length} step${stepList.length===1?"":"s"}. The customer sees this in Morrow as a pop-up with numbered steps. The status below is sent with it.`}</p>
        <button className="button" disabled={busy||!reply.trim()||stepList.length>12||stepList.some(step=>step.length>400)} onClick={()=>void sendReply()}>Send to their Morrow</button>
        <h4>Investigation history</h4>{selected.notes?.map((entry,i)=><p key={i}>{entry.detail.status} · {new Date(entry.at).toLocaleString()}<br/>{entry.detail.note}</p>)}
        <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{['new','investigating','needs_info','fixed','closed'].map(value=><option value={value} key={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
        <label>Internal note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} rows={4} placeholder="Reproduction steps, cause, fix, affected version and verification."/></label><p>Internal notes stay in this inbox; the customer never sees them.</p><button className="button" disabled={busy||note.trim().length<3} onClick={()=>void save()}>Save investigation</button>
      </> : <p>Select a report to inspect its screenshot and technical details.</p>}</article></div>
  </section>;
}
