import { createHash } from "node:crypto";
import { lstat, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

function validateManifest(release) {
  if (!/^\d+\.\d+\.\d+$/.test(release.version)
    || release.filename !== `Morrow-${release.version}-Apple-Silicon.dmg`
    || release.downloadUrl !== `https://github.com/tanishqagg-dev/morrow-releases/releases/download/v${release.version}/${release.filename}`
    || !/^[a-f0-9]{64}$/.test(release.sha256)
    || (release.zipDownloadUrl && (release.zipDownloadUrl !== release.downloadUrl.replace(/\.dmg$/, ".zip")
      || !/^[a-f0-9]{64}$/.test(release.zipSha256) || !Number.isSafeInteger(release.zipBytes) || release.zipBytes <= release.bytes))) throw new Error("Invalid Mac release manifest.");
}

// Only the reviewed, notarized bytes named in the release manifest are published.
export async function prepareMacDownload(source, release) {
  validateManifest(release);
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== release.bytes) throw new Error("Mac installer size or file type does not match the reviewed release.");
  const digest = createHash("sha256").update(await readFile(source)).digest("hex");
  if (digest !== release.sha256) throw new Error("Mac installer checksum does not match the reviewed release.");
}

export function verifyPublishedMacDownload(release, published) {
  validateManifest(release);
  const asset = published.assets?.find(item => item.name === release.filename);
  if (published.draft !== false || published.tag_name !== `v${release.version}`
    || asset?.state !== "uploaded" || asset.size !== release.bytes
    || asset.digest !== `sha256:${release.sha256}` || asset.browser_download_url !== release.downloadUrl) {
    throw new Error("Published Mac installer does not match the reviewed release.");
  }
  if (release.zipDownloadUrl) {
    const zip = published.assets?.find(item => item.browser_download_url === release.zipDownloadUrl);
    if (zip?.state !== "uploaded" || zip.size !== release.zipBytes || zip.digest !== `sha256:${release.zipSha256}`) {
      throw new Error("Published Mac ZIP does not match the reviewed release.");
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const release = JSON.parse(await readFile(new URL("../lib/mac-release.json", import.meta.url), "utf8"));
  const source = process.env.MORROW_MAC_INSTALLER || fileURLToPath(new URL(`../../output/morrow-paid-beta/release/${release.filename}`, import.meta.url));
  try {
    await prepareMacDownload(source, release);
  } catch (error) {
    if (error.code !== "ENOENT" || process.env.MORROW_MAC_INSTALLER) throw error;
    // Website CI need not carry the installer binary. GitHub supplies its upload digest.
    validateManifest(release);
    const response = await fetch(`https://api.github.com/repos/tanishqagg-dev/morrow-releases/releases/tags/v${release.version}`, {
      headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Could not verify the public Mac release (${response.status}).`);
    verifyPublishedMacDownload(release, await response.json());
  }
  // Remove the earlier CDN staging copy. Customers download the verified release asset.
  await rm(new URL(`../public/releases/${release.filename}`, import.meta.url), { force: true });
  console.log(`Verified ${release.filename} for the public download.`);
}
