import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "generated");

await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [path.join(root, "src", "workers", "save-parser.worker.ts")],
  outfile: path.join(outputDirectory, "save-parser.worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: false,
  logLevel: "info",
});
