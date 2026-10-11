import {z} from 'zod';
import type {CheckoutReply} from './billing';
import type {InvoiceProfile} from './invoice-profile';
const money=z.number().int().nonnegative();
const quoteSchema=z.object({amountPaise:money,chargeAmountPaise:money.optional(),renewalAmountPaise:money,
 baseAmountPaise:money,gstAmountPaise:money,currency:z.literal('INR'),quantity:z.number().int().positive(),
 period:z.enum(['monthly','yearly']),duration:z.string().nullable().optional(),merchantPromotion:z.unknown().optional(),
 maximumQuantity:z.number().int().min(1).max(100),paymentMethods:z.array(z.enum(['upi','card'])).optional()});
export type CheckoutQuote=z.infer<typeof quoteSchema>;
export function parseCheckoutQuote(value:unknown):CheckoutQuote {
 const result=quoteSchema.safeParse(value);
 if(!result.success) throw new Error("Your checkout price could not be confirmed. Refresh the quote before paying.");
 return result.data;
}
export async function loadCheckoutQuote(request:(body:object)=>Promise<unknown>, selection:{accountId:string;planId:string;quantity:number;couponCode?:string}, invoiceProfile:InvoiceProfile, isCurrent:()=>boolean) {
 if(!isCurrent())return null;
 await request({action:'save_invoice_profile',accountId:selection.accountId,invoiceProfile});
 if(!isCurrent())return null;
 const quote=parseCheckoutQuote(await request({action:'quote_checkout',...selection}));
 if(!isCurrent())return null;
 if(quote.quantity!==selection.quantity) throw new Error('Your seat count changed. Refresh the quote before paying.');
 return quote;
}

export function assertCheckoutPrice(reply:CheckoutReply, quote:CheckoutQuote) {
 const amount=reply.amountPaise ?? reply.chargeAmountPaise;
 if(amount!==quote.amountPaise) throw new Error('The checkout price changed. Cancel this checkout and refresh your quote before paying.');
}
