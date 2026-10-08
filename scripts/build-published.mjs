import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preservePublishedHome } from "./preserve-published-home.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const closed=process.argv.includes("--closed");
try { process.loadEnvFile(`${root}/.env.local`); } catch (error) { if(error.code!=="ENOENT") throw error; }
const env={...process.env,NETLIFY:"true",CONTEXT:"production",JARVIS_SITE_ORIGIN:"https://morrow.aestrum.in",
  NEXT_PUBLIC_CHECKOUT_ENABLED:closed?"false":"true"};
if(closed){env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="";env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL="";}
else {
  const base=env.NEXT_PUBLIC_LICENSE_API_URL || `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
  const response=await fetch(`${base}/billing-catalog`,{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||""}});
  const catalog=await response.json();
  if(!response.ok || catalog.mode!=="live" || !catalog.plans?.length) throw new Error("Live checkout requires a live billing backend with published plans.");
}
env.NEXT_PUBLIC_LICENSE_API_URL ||= `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const build=spawnSync("npm",["run","build"],{cwd:root,env,stdio:"inherit"});
if(build.status!==0) process.exit(build.status||1);
await preservePublishedHome();
console.log(`Published homepage preserved. Checkout ${closed ? "closed" : "live with server-side beta invitation checks"}.`);
