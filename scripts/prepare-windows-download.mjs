import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const releases = "https://github.com/harshofficial951641/Morrow-WIndows-Release";

function validateManifest(release) {
  if (!/^\d+\.\d+\.\d+$/.test(release.version)
    || release.filename !== `Morrow-Setup-${release.version}.exe`
    || release.downloadUrl !== `${releases}/releases/download/v${release.version}/${release.filename}`
    || !/^[a-f0-9]{64}$/.test(release.sha256)
    || !Number.isSafeInteger(release.bytes) || release.bytes <= 0) throw new Error("Invalid Windows release manifest.");
}

// Only the reviewed setup bytes named in the release manifest are linked.
export async function prepareWindowsDownload(source, release) {
  validateManifest(release);
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== release.bytes) throw new Error("Windows installer size or file type does not match the reviewed release.");
  const digest = createHash("sha256").update(await readFile(source)).digest("hex");
  if (digest !== release.sha256) throw new Error("Windows installer checksum does not match the reviewed release.");
}

export function verifyPublishedWindowsDownload(release, published) {
  validateManifest(release);
  const asset = published.assets?.find(item => item.name === release.filename);
  if (published.draft !== false || published.tag_name !== `v${release.version}`
    || asset?.state !== "uploaded" || asset.size !== release.bytes
    || asset.digest !== `sha256:${release.sha256}` || asset.browser_download_url !== release.downloadUrl) {
    throw new Error("Published Windows installer does not match the reviewed release.");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const release = JSON.parse(await readFile(new URL("../lib/windows-release.json", import.meta.url), "utf8"));
  if (process.env.MORROW_WINDOWS_INSTALLER) {
    await prepareWindowsDownload(process.env.MORROW_WINDOWS_INSTALLER, release);
  } else {
    // Website CI does not carry the installer binary. GitHub supplies its upload digest.
    validateManifest(release);
    const response = await fetch(`https://api.github.com/repos/harshofficial951641/Morrow-WIndows-Release/releases/tags/v${release.version}`, {
      headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Could not verify the public Windows release (${response.status}).`);
    verifyPublishedWindowsDownload(release, await response.json());
  }
  console.log(`Verified ${release.filename} for the public download.`);
}
