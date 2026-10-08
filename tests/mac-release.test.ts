import { createHash } from 'node:crypto';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
// @ts-expect-error The release build helper is a Node module.
import { prepareMacDownload, verifyPublishedMacDownload } from '../scripts/prepare-mac-download.mjs';
import release from '../lib/mac-release.json';

it('requires the published release digest and URL to match before a CI website build', () => {
  const asset={name:release.filename,state:'uploaded',size:release.bytes,digest:`sha256:${release.sha256}`,browser_download_url:release.downloadUrl};
  const published={draft:false,tag_name:`v${release.version}`,assets:[asset,...((release as {zipDownloadUrl?:string}).zipDownloadUrl ? [{name:release.filename.replace(/\.dmg$/, ".zip"),state:"uploaded",size:(release as unknown as {zipBytes:number}).zipBytes,digest:`sha256:${(release as unknown as {zipSha256:string}).zipSha256}`,browser_download_url:(release as unknown as {zipDownloadUrl:string}).zipDownloadUrl}] : [])]};
  expect(()=>verifyPublishedMacDownload(release,published)).not.toThrow();
  expect(()=>verifyPublishedMacDownload(release,{...published,draft:true})).toThrow();
  expect(()=>verifyPublishedMacDownload(release,{...published,assets:[{...asset,digest:'sha256:'+'0'.repeat(64)}]})).toThrow();
  expect(()=>verifyPublishedMacDownload(release,{...published,assets:[{...asset,browser_download_url:'https://example.com/other.dmg'}]})).toThrow();
});

it('publishes only the exact reviewed installer and rejects modified or linked files', async () => {
  const root=await mkdtemp(join(tmpdir(),'morrow-release-test-'));
  try {
    const source=join(root,'installer.dmg');
    const bytes=Buffer.from('reviewed fixture');
    const release={version:'0.3.0',filename:'Morrow-0.3.0-Apple-Silicon.dmg',downloadUrl:'https://github.com/tanishqagg-dev/morrow-releases/releases/download/v0.3.0/Morrow-0.3.0-Apple-Silicon.dmg',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    await writeFile(source,bytes);await expect(prepareMacDownload(source,release)).resolves.toBeUndefined();
    await writeFile(source,Buffer.from('modified fixture'));
    await expect(prepareMacDownload(source,release)).rejects.toThrow('checksum');
    await symlink(source,join(root,'linked.dmg'));
    await expect(prepareMacDownload(join(root,'linked.dmg'),release)).rejects.toThrow('file type');
    await expect(prepareMacDownload(source,{...release,filename:'../other.dmg'})).rejects.toThrow('manifest');
    await expect(prepareMacDownload(source,{...release,downloadUrl:'https://example.com/unreviewed.dmg'})).rejects.toThrow('manifest');
  } finally {await rm(root,{recursive:true,force:true});}
});

it('rejects a missing or altered ZIP asset before publishing its download link', () => {
  const bundle={...release,zipDownloadUrl:release.downloadUrl.replace(/\.dmg$/, '.zip'),zipSha256:'a'.repeat(64),zipBytes:release.bytes+1000};
  const dmg={name:bundle.filename,state:'uploaded',size:bundle.bytes,digest:`sha256:${bundle.sha256}`,browser_download_url:bundle.downloadUrl};
  const zip={name:bundle.filename.replace(/\.dmg$/, '.zip'),state:'uploaded',size:bundle.zipBytes,digest:`sha256:${bundle.zipSha256}`,browser_download_url:bundle.zipDownloadUrl};
  const published={draft:false,tag_name:`v${bundle.version}`,assets:[dmg,zip]};
  expect(()=>verifyPublishedMacDownload(bundle,published)).not.toThrow();
  expect(()=>verifyPublishedMacDownload(bundle,{...published,assets:[dmg]})).toThrow('ZIP');
  expect(()=>verifyPublishedMacDownload(bundle,{...published,assets:[dmg,{...zip,digest:'sha256:'+'0'.repeat(64)}]})).toThrow('ZIP');
});
