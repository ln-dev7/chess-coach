// Copies a single-threaded Stockfish WASM build from node_modules/stockfish
// into public/stockfish/ and writes manifest.json with the worker entry file.
// Runs on postinstall. Single-threaded build = no SharedArrayBuffer, so no
// COOP/COEP headers are needed.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(process.cwd(), "node_modules", "stockfish");
// stockfish >= 17 ships engines in bin/, older versions in src/.
const src = ["bin", "src"].map((d) => join(pkgRoot, d)).find((p) => existsSync(p));
const dest = join(process.cwd(), "public", "stockfish");

if (!src) {
  console.log("[copy-stockfish] stockfish package not found, skipping");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
const files = readdirSync(src);

// Prefer a lite single-threaded build (small download, no threading headers).
const entry =
  files.find((f) => f.includes("lite-single") && f.endsWith(".js")) ??
  files.find((f) => f.includes("-single") && f.endsWith(".js")) ??
  files.find((f) => f.endsWith(".js"));

if (!entry) {
  console.error("[copy-stockfish] no engine js found in", src);
  process.exit(0);
}

const base = entry.replace(/\.js$/, "");
let copied = 0;
for (const f of files) {
  if (f.startsWith(base)) {
    cpSync(join(src, f), join(dest, f));
    copied++;
  }
}
writeFileSync(join(dest, "manifest.json"), JSON.stringify({ js: entry }));
console.log(`[copy-stockfish] copied ${copied} file(s), entry: ${entry}`);
