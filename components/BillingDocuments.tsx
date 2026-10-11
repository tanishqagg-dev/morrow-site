import type {GatewayReceipt, GstDocument} from '../lib/billing-documents';
import {rupees} from '../lib/billing';
import {siteConfig} from '../lib/site-config';
import styles from './SubscriptionFlow.module.css';
function date(value: string) {
  return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value));
}
function receiptUrl(value: string | null) {
  try {const url=new URL(value || '');return url.protocol==='https:' && !url.username && !url.password ? url.href : null;}catch{return null;}
}
export function BillingDocuments({invoices,receipts,receiptsStatus,busy,loading,onPrint,onReload}: {
  invoices:GstDocument[];receipts:GatewayReceipt[];receiptsStatus:'available'|'unavailable'|null;
  busy:boolean;loading:boolean;onPrint:(document:GstDocument)=>void;onReload:()=>void;
}) {
  return <div className={styles.billingDocuments}>
    <button className={styles.quietButton} onClick={onReload} disabled={busy}>Refresh documents</button>
    {loading && <p role="status">Loading documents…</p>}
    {receiptsStatus === null ? !loading && <p>Documents have not loaded yet. Refresh the list to try again.</p> : <>
      <section aria-label="GST tax invoices and credit notes">
        <h3>GST tax invoices and credit notes</h3>
        {invoices.length === 0 && <p>No GST documents are available yet. Contact support if you need a document for an earlier payment.</p>}
        {invoices.map(document => <article className={styles.documentRow} key={document.id}>
          <div>
            <h4>{document.kind === 'credit_note' ? 'Credit note' : 'GST tax invoice'}{document.status === 'issued' && document.number ? ` · ${document.number}` : ''}</h4>
            <p>{date(document.issuedOn)} · {rupees(document.amountPaise)}{document.kind === 'credit_note' ? ' reversed' : ''}</p>
            {document.kind === 'credit_note' && document.originalInvoiceNumber && <p>Reverses invoice {document.originalInvoiceNumber}</p>}
            <p className={styles.documentStatus}>{document.status === 'issued' ? 'Issued' : document.status === 'not_configured' ? 'Being prepared' : document.status === 'failed' ? 'Document could not be prepared' : 'Billing details needed'}</p>
            {document.status === 'not_configured' && <p>Your {document.kind === 'credit_note' ? 'credit note' : 'GST invoice'} is being prepared. Check here again or contact support if you need it now.</p>}
            {document.status === 'failed' && <p>We couldn't prepare this document. Refresh documents to try again, or contact support if you need help.</p>}
            {document.status === 'billing_details_required' && <p>Some billing details were missing when this payment was made. Contact support to correct this document.</p>}
            {document.status !== 'issued' && <a href={`mailto:${siteConfig.supportEmail}?subject=Morrow%20GST%20document`}>Contact support</a>}
          </div>
          {document.status === 'issued' && document.printable && <button className={styles.quietButton} onClick={()=>onPrint(document)} disabled={busy}>Print or save as PDF</button>}
        </article>)}
      </section>
      <section aria-label="Razorpay receipts">
        <h3>Razorpay receipts</h3>
        <p>Payment receipts from Razorpay.</p>
        {receiptsStatus === 'unavailable' && <p role="status">{receipts.length ? 'Some Razorpay receipts are unavailable right now.' : 'Razorpay receipts are unavailable right now.'} Your Morrow GST documents remain available here.</p>}
        {receipts.length === 0 && receiptsStatus === 'available' && <p>No Razorpay receipts yet.</p>}
        {receipts.map(receipt=><article className={styles.documentRow} key={receipt.id}>
          <div><h4>Receipt{receipt.number ? ` · ${receipt.number}` : ''}</h4><p>{receipt.paidAt ? date(receipt.paidAt) : 'Payment date unavailable'} · {rupees(receipt.amountPaise)}</p><p className={styles.documentStatus}>{receipt.status}</p></div>
          {receiptUrl(receipt.url) ? <a className={styles.quietButton} href={receiptUrl(receipt.url)!} target="_blank" rel="noopener noreferrer">View receipt</a> : <p>Receipt link unavailable</p>}
        </article>)}
      </section>
    </>}
  </div>;
}
