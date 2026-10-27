// canonicalize-sourcemaps.mjs — the canonical map form's builder-side
// half (sweep F5b; the wall half lives in client-bundle-freshness):
// tsdown races on the map's trailing byte; the canonical form is the
// repo's own file-end law (exactly one trailing newline). Run after
// any tsdown: node scripts/canonicalize-sourcemaps.mjs [paths...] —
// no args canonicalizes every tracked lib/*.map.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const files = args.length > 0
  ? args
  : execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter((f) => /\/lib\/.*\.map$/.test(f));
let fixed = 0;
for (const f of files) {
  const abs = join(ROOT, f);
  if (!existsSync(abs)) continue;
  const raw = readFileSync(abs, "utf8");
  const canonical = JSON.stringify(JSON.parse(raw)) + "\n";
  if (raw !== canonical) { writeFileSync(abs, canonical); fixed += 1; }
}
console.log(`canonicalize-sourcemaps: ${fixed} of ${files.length} maps normalized (compact + one trailing newline)`);
