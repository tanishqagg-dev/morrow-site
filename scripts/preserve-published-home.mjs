import { cp, readFile, access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
const root = new URL("../", import.meta.url);
export async function preservePublishedHome() {
  await access(new URL("out/subscribe.html", root));
  await access(new URL("out/operator.html", root));
  await cp(fileURLToPath(new URL("published-home/",root)),fileURLToPath(new URL("out/",root)),{recursive:true});
  nextEnv.loadEnvConfig(fileURLToPath(root));
  const attr = value => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const base = process.env.NEXT_PUBLIC_LICENSE_API_URL || (process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1` : "");
  const html=await readFile(new URL("out/index.html",root),"utf8").then(html => html.replace("__MORROW_BILLING_BASE__", attr(base.replace(/\/$/, ""))).replace("__MORROW_BILLING_KEY__", attr(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)));
  await writeFile(new URL("out/index.html", root), html);
  if(!html.includes('id="animated-mascot"') || !html.includes('name="morrow-beta"') || !html.includes('href="#beta"')) throw new Error("Published homepage or beta form is missing.");
  if(!html.includes('href="/subscribe"')) throw new Error("Published homepage is missing the invited-customer sign-in link.");
  await writeFile(new URL("out/_redirects", root), [
    "/subscribe /subscribe.html 200",
    "/download /download.html 200",
    "/operator /operator.html 200",
    "/admin /operator 302",
    "/activate /activate.html 200",
    "/privacy /privacy.html 200",
    "/terms /terms.html 200",
    "/refunds /refunds.html 200",
    "/contact /contact.html 200",
    "/thanks /thanks.html 200",
    "/open-source /open-source.html 200",
    "/windows-setup /windows-setup.html 200",
    "",
  ].join("\n"));
}
if(process.argv[1] === fileURLToPath(import.meta.url)) await preservePublishedHome();
