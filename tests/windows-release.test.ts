import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
// @ts-expect-error The release build helper is a Node module.
import { prepareWindowsDownload, verifyPublishedWindowsDownload } from '../scripts/prepare-windows-download.mjs';
import release from '../lib/windows-release.json';

it('requires the published Windows setup digest and URL to match before a CI website build', () => {
  const asset={name:release.filename,state:'uploaded',size:release.bytes,digest:`sha256:${release.sha256}`,browser_download_url:release.downloadUrl};
  const published={draft:false,tag_name:`v${release.version}`,assets:[asset]};
  expect(()=>verifyPublishedWindowsDownload(release,published)).not.toThrow();
  expect(()=>verifyPublishedWindowsDownload(release,{...published,draft:true})).toThrow();
  expect(()=>verifyPublishedWindowsDownload(release,{...published,assets:[]})).toThrow();
  expect(()=>verifyPublishedWindowsDownload(release,{...published,assets:[{...asset,digest:'sha256:'+'0'.repeat(64)}]})).toThrow();
  expect(()=>verifyPublishedWindowsDownload(release,{...published,assets:[{...asset,browser_download_url:'https://example.com/other.exe'}]})).toThrow();
});

it('links only the exact reviewed setup and rejects modified or linked files', async () => {
  const root=await mkdtemp(join(tmpdir(),'morrow-windows-release-test-'));
  try {
    const source=join(root,'setup.exe');
    const bytes=Buffer.from('reviewed fixture');
    const fixture={version:'0.3.0',filename:'Morrow-Setup-0.3.0.exe',downloadUrl:'https://github.com/harshofficial951641/Morrow-WIndows-Release/releases/download/v0.3.0/Morrow-Setup-0.3.0.exe',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    await writeFile(source,bytes);await expect(prepareWindowsDownload(source,fixture)).resolves.toBeUndefined();
    await writeFile(source,Buffer.from('modified fixture'));
    await expect(prepareWindowsDownload(source,fixture)).rejects.toThrow('checksum');
    await expect(prepareWindowsDownload(source,{...fixture,filename:'../other.exe'})).rejects.toThrow('manifest');
    await expect(prepareWindowsDownload(source,{...fixture,downloadUrl:'https://example.com/unreviewed.exe'})).rejects.toThrow('manifest');
    try { await symlink(source,join(root,'linked.exe')); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EPERM') return; throw error; } // Windows needs Developer Mode for symlinks.
    await expect(prepareWindowsDownload(join(root,'linked.exe'),fixture)).rejects.toThrow('file type');
  } finally {await rm(root,{recursive:true,force:true});}
});

it('points every Windows download button at the reviewed setup', async () => {
  const [home, component] = await Promise.all([
    readFile(new URL('../published-home/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../components/WindowsDownload.tsx', import.meta.url), 'utf8'),
  ]);
  const links=[...home.matchAll(/href="([^"]+\.exe)"/g)].map(match=>match[1]);
  for (const link of links) expect(link).toBe(release.downloadUrl);
  expect(home).toContain('href="/download?os=windows&amp;start=1"');
  expect(component).toContain('windows-release.json');
  expect(component).toContain('release.downloadUrl');
});
