import { chromium } from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const root='/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/references';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
for(const [name,url] of [['openai-download','https://openai.com/chatgpt/download/'],['openai-pricing','https://openai.com/chatgpt/pricing/'],['openai-codex','https://openai.com/codex/'],['chatgpt-codex','https://chatgpt.com/codex'],['wispr-download','https://wisprflow.ai/download'],['wispr-pricing','https://wisprflow.ai/pricing'],['wispr-home','https://wisprflow.ai/'],['openai-sign-in','https://auth.openai.com/log-in'],['clerk-sign-in','https://dashboard.clerk.com/sign-in']]) {
 const context=await browser.newContext();const page=await context.newPage();
 for(const width of [1440,390]) {await page.setViewportSize({width,height:width===390?844:900});
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(name === 'clerk-sign-in' ? 10000 : 1500);await page.screenshot({path:`${root}/pages-${name}-${width}.png`});results.push({name,url,width,title:await page.title(),text:(await page.locator('body').innerText()).slice(0,900),metrics:await page.evaluate(()=>Array.from(document.querySelectorAll('h1,h2,button')).slice(0,8).map(el=>({text:el.textContent?.slice(0,80),size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight,radius:getComputedStyle(el).borderRadius}))) });}
 catch(error){results.push({name,url,width,error:String(error)});try{await page.screenshot({path:`${root}/pages-${name}-${width}-blocked.png`});}catch{}}
 }await context.close();console.log(name);
}await writeFile(`${root}/pages-study.json`,JSON.stringify(results,null,2));await browser.close();
