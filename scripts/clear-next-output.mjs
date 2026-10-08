import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedOutputs = [
  resolve(websiteDirectory, ".next"),
  resolve(websiteDirectory, "out"),
];

for (const generatedOutput of generatedOutputs) {
  if (dirname(generatedOutput) !== websiteDirectory) {
    throw new Error("Refusing to clear generated output outside the website directory.");
  }
  await rm(generatedOutput, { recursive: true, force: true });
}
