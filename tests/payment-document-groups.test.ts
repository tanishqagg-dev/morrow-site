import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {groupPaymentDocuments,type GstDocument} from '../lib/billing-documents';
import {BillingDocuments} from '../components/BillingDocuments';
const tax={id:'tax',kind:'tax_invoice',paymentId:'pay_match',status:'issued',number:'MI2627/1',issuedOn:'2026-10-11',amountPaise:11800,printable:true} as GstDocument;
const receipt={id:'inv_match',paymentId:'pay_match',status:'paid',amountPaise:11800,url:'https://rzp.io/test'};
describe('BROWSER-02 payment document grouping',()=>{
 it('groups only exact payment IDs and leaves credit notes and missing IDs separate',()=>{
  const credit={...tax,id:'credit',kind:'credit_note'} as GstDocument;
  const unrelated={...tax,id:'other',paymentId:'pay_other'};
  const unknown={...receipt,id:'inv_unknown',paymentId:null};
  const result=groupPaymentDocuments([tax,credit,unrelated],[receipt,unknown]);
  expect(result.groups).toEqual([{paymentId:'pay_match',invoices:[tax],receipts:[receipt]}]);expect(result.invoices).toEqual([credit,unrelated]);expect(result.receipts).toEqual([unknown]);
 });
 it('never guesses a match from the amount or date',()=>{
  expect(groupPaymentDocuments([tax],[{...receipt,paymentId:'pay_other'}]).groups).toEqual([]);
  expect(groupPaymentDocuments([tax],[{...receipt,paymentId:null}]).receipts).toHaveLength(1);
 });
 it('renders both labelled documents in one payment group without duplicating either',()=>{
  const html=renderToStaticMarkup(createElement(BillingDocuments,{invoices:[tax],receipts:[receipt],receiptsStatus:'available',busy:false,loading:false,onPrint(){},onReload(){}}));
  expect(html).toContain('Documents for each payment');expect(html).toContain('data-payment-id="pay_match"');expect(html).toContain('Tax invoice');expect(html).toContain('Payment receipt');expect((html.match(/View receipt/g)||[]).length).toBe(1);expect((html.match(/Print or save as PDF/g)||[]).length).toBe(1);
 });
});
