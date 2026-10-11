import {expect,it,vi} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {parseBillingSnapshot} from '../lib/billing';
import {selectOpenCheckout,openCheckoutReceipt,changeOpenCheckout} from '../lib/open-checkout';
import {OpenCheckoutPanel} from '../components/OpenCheckoutPanel';
export const open={id:'local-open',subscriptionId:'sub_open',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',accountId:'account',planId:'monthly',planName:'Personal monthly',period:'monthly' as const,quantity:1,couponCode:'INTRO',paymentMethod:'upi' as const,trial:false,amountPaise:11800,currency:'INR' as const,keyId:'rzp_test_fixture',expiresAt:new Date(Date.now()+3600000).toISOString(),resumable:true};
it('BROWSER-05 preserves server open checkouts and shows them in a fresh tab without a receipt',()=>{
 const snapshot=parseBillingSnapshot({accounts:[],subscriptions:[],seats:[],payments:[],openCheckouts:[open]});expect(selectOpenCheckout(snapshot,null,'account')).toEqual(open);
 const html=renderToStaticMarkup(createElement(OpenCheckoutPanel,{checkout:open,busy:false,onResume(){},onChangePlan(){}}));expect(html).toContain('You have an unfinished checkout');expect(html).toContain('Personal monthly');expect(html).toContain('INTRO');expect(html).toContain('₹118');expect(html).toContain('Resume');
});
it('BROWSER-05 shows OPEN_CHECKOUT details and the snapshot wins over a local hint',()=>{
 expect(selectOpenCheckout({openCheckouts:[]},open,'account')).toEqual(open);expect(selectOpenCheckout({openCheckouts:[{...open,subscriptionId:'sub_server'}]},open,'account')?.subscriptionId).toBe('sub_server');expect(selectOpenCheckout({openCheckouts:[open]},null,'other')).toBeNull();
});
it('BROWSER-05 Resume uses the server subscription and account prefill',()=>{
 const receipt=openCheckoutReceipt(open,{billing_email:'buyer@example.test',name:'Buyer'},'clerk-user','');expect(receipt).toMatchObject({subscriptionId:'sub_open',userId:'clerk-user',checkout:{priceConfirmed:true,reply:{subscriptionId:'sub_open',keyId:'rzp_test_fixture',amountPaise:11800,email:'buyer@example.test',name:'Buyer',paymentMethod:'upi'}}});
});
it('BROWSER-05 hides Resume when the server says it is not resumable',()=>{
 const html=renderToStaticMarkup(createElement(OpenCheckoutPanel,{checkout:{...open,resumable:false},busy:false,onResume(){},onChangePlan(){}}));expect(html).not.toContain('>Resume<');expect(html).toContain('expired at Razorpay');expect(html).toContain('Change plan');expect(()=>openCheckoutReceipt({...open,resumable:false},{billing_email:'buyer@example.test',name:'Buyer'},'user','')).toThrow();
});
it('BROWSER-05 abandons the server checkout, refreshes, then retries the chosen plan',async()=>{
 const order:string[]=[];const send=vi.fn(async body=>{expect(body).toEqual({action:'abandon_checkout',subscriptionId:'sub_open'});order.push('abandon');return {abandoned:true};});
 await changeOpenCheckout(open,send,()=>order.push('clear'),async()=>{order.push('refresh');return {openCheckouts:[]};},()=>order.push('retry-yearly'),()=>true);expect(order).toEqual(['abandon','clear','refresh','retry-yearly']);
});
it('BROWSER-05 keeps the checkout and never retries a plan on an unverified cancellation',async()=>{
 const clear=vi.fn(),retry=vi.fn();await expect(changeOpenCheckout(open,async()=>({abandoned:false}),clear,async()=>({openCheckouts:[]}),retry,()=>true)).rejects.toThrow();expect(clear).not.toHaveBeenCalled();expect(retry).not.toHaveBeenCalled();
});

it('BROWSER-05 an empty server list leaves receipt-based fallback available',()=>{
 expect(selectOpenCheckout({openCheckouts:[]},null,'account')).toBeNull();
});
