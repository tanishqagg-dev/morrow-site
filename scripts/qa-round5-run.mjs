// Scrub inherited credentials and disable environment files before Next/Vite starts.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TERM'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
Object.assign(env,{
 NODE_OPTIONS:`--require=${fileURLToPath(new URL('./qa-round5-no-env.cjs',import.meta.url))}`,
 NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
 NEXT_PUBLIC_LICENSE_API_URL:'https://abcdefghijklmnopqrst.supabase.co/functions/v1',
 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(32),
 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'',
 NEXT_PUBLIC_CLERK_FRONTEND_API_URL:'https://morrow.clerk.accounts.dev',
});
function run(command,args) {
 return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));});
}
if(process.argv.includes('--check')) {
 await run('npm',['test']);await run('npm',['run','typecheck']);await run('npm',['run','build']);
} else {
 let existing=false;
 try {await fetch('http://127.0.0.1:4395/subscribe');existing=true;}catch{}
 if(existing)throw new Error('Port 4395 is already in use. Stop that server before running the isolated fixture.');
 await run(process.execPath,['scripts/clear-next-output.mjs']);
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','4395'],{cwd,env,stdio:'inherit',detached:true});
 try {
  let ready=false;
  for(let attempt=0;attempt<60;attempt++) {
   try {ready=(await fetch('http://127.0.0.1:4395/subscribe')).ok;}catch{}
   if(ready)break;
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready)throw new Error('Local Next fixture did not become ready');
  if(process.argv.includes('--all')) {
   await run(process.execPath,['scripts/qa-round5-site.mjs']);
   await run(process.execPath,['scripts/qa-round5-pairing.mjs']);
   await run(process.execPath,['scripts/qa-round5-gst.mjs','--recipients']);
  } else await run(process.execPath,[process.argv.includes('--pairing')?'scripts/qa-round5-pairing.mjs':process.argv.includes('--gst')?'scripts/qa-round5-gst.mjs':'scripts/qa-round5-site.mjs',...(process.argv.includes('--recipients')?['--recipients']:[])]);
 } finally {try{process.kill(-server.pid,'SIGTERM');}catch{}}
}
