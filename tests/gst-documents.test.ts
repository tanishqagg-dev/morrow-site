import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {BillingDocuments} from '../components/BillingDocuments';
import type {GstDocument} from '../lib/billing-documents';
const document={id:'doc-test',subscriptionId:'sub-test',kind:'tax_invoice',status:'issued',number:'MI2627/000000001',issuedOn:'2026-10-11',amountPaise:11800,printable:true} as GstDocument;
function render(invoices:GstDocument[],receiptsStatus:'available'|'unavailable'='available') {
 return renderToStaticMarkup(createElement(BillingDocuments,{invoices,receipts:[{id:'receipt',number:'RZP-1',amountPaise:11800,status:'paid',paidAt:'2026-10-11T12:00:00Z',url:'https://razorpay.example/receipt'}],receiptsStatus,busy:false,loading:false,onPrint(){},onReload(){}}));
}
describe('MONEY-06 GST documents and gateway receipts',()=>{
 it('shows an issued tax invoice number, date, amount and print action separately from receipts',()=>{
  const html=render([document]);expect(html).toContain('GST tax invoice');expect(html).toContain('MI2627/000000001');expect(html).toContain('11 Oct 2026');expect(html).toContain('₹118');expect(html).toContain('Issued');expect(html).toContain('Print or save as PDF');expect(html).toContain('Razorpay receipts');expect(html).toContain('View receipt');expect(html).not.toContain('View invoice');
 });
 it.each(['not_configured','billing_details_required'] as const)('keeps %s honest without fake serials or printing',status=>{
  const html=render([{...document,status,number:'must-not-show',printable:true}]);expect(html).not.toContain('must-not-show');expect(html).not.toContain('Print or save as PDF');expect(html).toContain(status==='not_configured'?'Your GST invoice is being prepared':'missing when this payment was made');
 });
 it('shows a credit note as a reversal linked to its original invoice',()=>{
  const html=render([{...document,kind:'credit_note',number:'MC2627/000000001',originalInvoiceNumber:'MI2627/000000001'}]);expect(html).toContain('Credit note');expect(html).toContain('₹118 reversed');expect(html).toContain('MI2627/000000001');expect(html).toContain('MC2627/000000001');
 });
 it('preserves Morrow documents during a receipt outage',()=>{
  const html=render([document],'unavailable');expect(html).toContain('MI2627/000000001');expect(html).toContain('Razorpay receipts');expect(html).toContain('unavailable');expect(html).toContain('Print or save as PDF');
 });
});
it('shows failed issuance honestly without a serial or print action and offers retry',()=>{
 const html=render([{...document,status:'failed',number:null,printable:false,errorCode:'GST_DOCUMENT_FAILED'}]);
 expect(html).toContain('Document could not be prepared'); expect(html).toContain('Refresh documents to try again');
 expect(html).not.toContain('MI2627/000000001');expect(html).not.toContain('Print or save as PDF');
});
