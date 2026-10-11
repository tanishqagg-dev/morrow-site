// Local launch UI fixtures. No Clerk, Razorpay, or remote backend connections.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
let state='price';
const accountId='account-test',requestId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const recent=new Date(Date.now()-60000).toISOString(),future=new Date(Date.now()+7*86400000).toISOString();
const plan={id:'personal',code:'PERSONAL_MONTHLY',name:'Morrow Personal',audience:'personal',period:'monthly',amountPaise:299900,chargeAmountPaise:353882,currency:'INR',minimumQuantity:1};
const api=createServer(async(req,res)=>{
 res.setHeader('access-control-allow-origin','http://127.0.0.1:4395');res.setHeader('access-control-allow-headers','*');res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.url.startsWith('/control?')){state=new URL(req.url,'http://localhost').searchParams.get('state');res.end(state);return;}
 let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):{};let payload,status=200;
 if(req.url.endsWith('billing-catalog'))payload={mode:'test',plans:[plan],trial:{enabled:true,days:7},betaInviteRequired:false};
 else if(body.action==='snapshot')payload={accounts:[{id:accountId,kind:'personal',name:'Personal account',billing_email:'qa@example.test',owner_user_id:'qa-user',created_at:recent}],subscriptions:state==='price'?[]:[{id:'local',account_id:accountId,plan_id:plan.id,razorpay_subscription_id:'sub_test',status:'trialing',quantity:1,paid_until:future,trial_ends_at:future,cancel_at_period_end:false,plan:{name:plan.name,period:'monthly',amount_paise:299900,charge_amount_paise:353882}}],seats:state==='price'?[]:[{id:'seat-test',account_id:accountId,email:'qa@example.test',hasLicense:true,licenseId:'license-test',licenseStatus:'active',expiresAt:future}],payments:[],trial:{enabled:true,eligible:state==='price',days:7}};
 else if(body.action==='devices')payload={devices:[]};
 else if(body.action==='invoices')payload={invoices:[],receipts:[],receiptsStatus:'available'};
 else if(body.action==='desktop_request')payload={request:{id:requestId,status:'pending',deviceName:'QA MacBook Air',deviceModel:'MacBook Air',appVersion:'0.3.14',requestedAt:recent,expiresAt:future,codeRequired:false,seatInUse:null}};
 else if(body.action==='approve_desktop'){status=400;payload={error:{code:'DEVICE_CODE_REQUIRED',message:'Enter the code shown in Morrow on your Mac. If your Mac shows no code, download the latest Morrow and sign in again.'}};}
 else if(body.action==='cancel'){status=403;payload={sign_in_again:true,clerk_error:{type:'forbidden',reason:'reverification-error',metadata:{reverification:{level:'first_factor',afterMinutes:10}}},error:{code:'REVERIFICATION_REQUIRED',message:"Confirm it's you to continue."}};}
 else {status=400;payload={error:{message:'Unstubbed local fixture action: '+body.action}};}
 console.log('Fixture',body.action||'catalog',status);res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(payload));
});
await new Promise(resolve=>api.listen(4396,'127.0.0.1',resolve));
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
Object.assign(env,{NODE_OPTIONS:`--require=${process.cwd()}/scripts/qa-round5-no-env.cjs`,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:4396',NEXT_PUBLIC_LICENSE_API_URL:'http://127.0.0.1:4396/functions/v1',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(32),NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:''});
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','4395'],{env,stdio:'inherit'});
const close=()=>{next.kill('SIGTERM');api.close();};process.on('SIGTERM',close);process.on('SIGINT',close);next.on('exit',()=>api.close());
