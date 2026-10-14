// Points the website at a newer published Windows setup:
//   node scripts/bump-windows-release.mjs 0.3.28
// Upload Morrow-Setup-<version>.exe to the matching Morrow-WIndows-Release tag first.
import { readFile, writeFile } from "node:fs/promises";
import { verifyPublishedWindowsDownload } from "./prepare-windows-download.mjs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) throw new Error("Usage: node scripts/bump-windows-release.mjs <version>");

const manifestUrl = new URL("../lib/windows-release.json", import.meta.url);
const homeUrl = new URL("../published-home/index.html", import.meta.url);
const previous = JSON.parse(await readFile(manifestUrl, "utf8"));

const response = await fetch(`https://api.github.com/repos/harshofficial951641/Morrow-WIndows-Release/releases/tags/v${version}`, {
  headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Release v${version} not found (${response.status}).`);
const published = await response.json();
const filename = `Morrow-Setup-${version}.exe`;
const asset = published.assets?.find(item => item.name === filename);
if (!asset?.digest?.startsWith("sha256:")) throw new Error(`${filename} is not uploaded to v${version}.`);

const release = { version, filename, downloadUrl: asset.browser_download_url, sha256: asset.digest.slice(7), bytes: asset.size };
verifyPublishedWindowsDownload(release, published);

const home = await readFile(homeUrl, "utf8");
if (!home.includes(previous.downloadUrl)) throw new Error("The homepage does not link the current Windows setup.");
await writeFile(homeUrl, home.replaceAll(previous.downloadUrl, release.downloadUrl));
await writeFile(manifestUrl, `${JSON.stringify(release, null, 2)}\n`);
console.log(`Windows download now points at ${filename} (sha256 ${release.sha256}).`);
