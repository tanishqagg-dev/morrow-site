import {chromium} from '/Users/tanishqaggarwal/Documents/ChatGPT/3.0/nivra-vision-lab/node_modules/playwright/index.mjs';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
const root='/Users/tanishqaggarwal/Desktop/projects/morrow-glowup/qa/round3/pages';
await mkdir(`${root}/review`,{recursive:true});
const files=(await readdir(root)).filter(f=>/-(1440|390)\.png$/.test(f)&&!f.includes('debug'));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1480,height:1000}});
for(const width of [1440,390])for(const reduced of [false,true]){
 const group=files.filter(f=>f.endsWith(`-${width}.png`)&&f.includes('-reduced')===reduced).sort();
 for(let i=0;i<group.length;i+=8){const chunk=group.slice(i,i+8);const items=await Promise.all(chunk.map(async f=>`<figure><figcaption>${f}</figcaption><img src="data:image/png;base64,${(await readFile(`${root}/${f}`)).toString('base64')}"></figure>`));await page.setContent(`<style>body{margin:20px;background:#fff;font:13px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}figure{margin:0}figcaption{height:40px;overflow-wrap:anywhere}img{width:100%;border:1px solid #ddd}</style><main>${items.join('')}</main>`);await page.screenshot({path:`${root}/review/${width}-${reduced?'reduced':'normal'}-${i/8+1}.png`,fullPage:true});}
}
await writeFile(`${root}/index.html`,`<!doctype html><meta charset="utf-8"><title>Morrow page QA</title><style>body{font:16px Arial;padding:24px;background:white}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}figure{margin:0}img{width:100%;border:1px solid #ddd}figcaption{padding:12px 0}</style><h1>Morrow page QA</h1><main>${files.sort().map(f=>`<figure><a href="${f}"><img loading="lazy" src="${f}"></a><figcaption>${f} · <a href="${f.replace('.png','-full.png')}">Full page</a></figcaption></figure>`).join('')}</main>`);
await browser.close();console.log(`Gallery: ${files.length} viewport screenshots`);
