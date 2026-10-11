import {rupees} from './billing';
export function trialPriceLine(plan:{amountPaise:number;chargeAmountPaise?:number;period:string}|null|undefined,quote:{baseAmountPaise:number;amountPaise:number;period:string}|null) {
 if(!quote && (!plan || plan.chargeAmountPaise === undefined))return 'Price unavailable';
 const base=quote?.baseAmountPaise ?? plan!.amountPaise,total=quote?.amountPaise ?? plan!.chargeAmountPaise!;
 const period=(quote?.period ?? plan!.period)==='yearly'?'year':'month';
 return `${rupees(base)} + GST (${rupees(total)}) per ${period} after the trial`;
}
