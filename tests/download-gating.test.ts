import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function sourceFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return sourceFiles(url);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [url] : [];
  }));
  return files.flat();
}

describe("customer download gating", () => {
  it("routes public CTAs to the install guide without requiring an account", async () => {
    const [button, home, download] = await Promise.all([
      readFile(new URL("../components/DownloadButton.tsx", import.meta.url), "utf8"),
      readFile(new URL("../published-home/index.html", import.meta.url), "utf8"),
      readFile(new URL("../components/MacDownload.tsx", import.meta.url), "utf8"),
    ]);
    expect(button).toContain('href="/download?start=1"');
    expect(home).toContain('href="/download?start=1"');
    expect(download).toContain("release.downloadUrl");
    expect(download).toContain("morrow:download-started");
    expect(download).not.toContain("getToken");
  });

  it("contains no direct public desktop installer link or public installer environment bypass", async () => {
    const sourceRoots = ["app/", "components/", "lib/"].map((path) => new URL(`../${path}`, import.meta.url));
    const files = (await Promise.all(sourceRoots.map(sourceFiles))).flat();
    files.push(
      new URL("../next.config.ts", import.meta.url),
      new URL("../.env.example", import.meta.url),
    );
    const sources = await Promise.all(files.map(async (file) => ({
      file: file.pathname,
      source: await readFile(file, "utf8"),
    })));

    for (const { file, source } of sources) {
      expect(source, file).not.toContain("NEXT_PUBLIC_JARVIS_DOWNLOAD_URL");
      expect(source, file).not.toMatch(/href\s*=\s*["'`]https?:\/\/[^"'`\s]+\.(?:dmg|exe|msi|msix)/i);
      expect(source, file).not.toContain("fallbackDownloadUrl");
    }
  });

  it("drops malformed public origins instead of copying them into the CSP", async () => {
    const headerWriter = await readFile(new URL("../scripts/write-static-headers.mjs", import.meta.url), "utf8");
    expect(headerWriter).toContain("safeConnectOrigin");
    expect(headerWriter).not.toContain("return value as string");
  });
});
