import {z} from 'zod';
const id=z.string().min(1).max(160);
const bodySchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('cancel'),subscriptionId:id}),
 z.object({action:z.literal('change_quantity'),subscriptionId:id,quantity:z.number().int().min(1).max(100)}),
 z.object({action:z.literal('assign_seat'),accountId:id,email:z.email()}),
 z.object({action:z.literal('remove_seat'),seatId:id}),
 z.object({action:z.literal('revoke_device'),installationId:id}),
 z.object({action:z.literal('sign_out_everywhere')}),
 z.object({action:z.literal('approve_desktop'),requestId:id,seatId:id,replaceInstallationId:id}),
]);
const intentSchema=z.object({body:bodySchema,accountId:id,userId:id,attemptedAt:z.number().finite().nonnegative().optional()});
export type SignInIntent=z.infer<typeof intentSchema>;
export function makeSignInIntent(body:object,accountId:string,userId:string):SignInIntent {
 return intentSchema.parse({body,accountId,userId});
}
export function signInIntentUrl(current:string,intent:unknown) {
 const url=new URL(current,'https://morrow.aestrum.in');
 url.searchParams.set('billing_intent',JSON.stringify(intentSchema.parse(intent)));
 url.searchParams.set('view','subscription');url.hash='sign-in';
 return url.pathname+url.search+url.hash;
}
export function readSignInIntent(search:string):SignInIntent|null {
 try {const result=intentSchema.safeParse(JSON.parse(new URLSearchParams(search).get('billing_intent')||'null'));return result.success?result.data:null;}catch{return null;}
}
export function signInIntentVerb(body:{action:string}) {
 return ({cancel:'cancel',change_quantity:'change seats',assign_seat:'assign this seat',remove_seat:'remove this seat',revoke_device:'remove this Mac',sign_out_everywhere:'sign out everywhere',approve_desktop:'replace this Mac'} as Record<string,string>)[body.action] || 'continue';
}
export function isImmediateSignInRepeat(intent:{attemptedAt?:number}|null,now=Date.now()) {
 return Boolean(intent?.attemptedAt && now>=intent.attemptedAt && now-intent.attemptedAt<=120000);
}
