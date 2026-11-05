// repo-path-derivation.spec.ts — THE OS-ABSOLUTE PATH DERIVATION WALL
// (windows CI census 2026-10-31, CLASS C).
//
// THE BURN (unit windows-latest, run 41149128162): fifteen sites
// derived repo paths off the module URL's `.pathname` property
// (`new URL(…, <module url>)` + the pathname read). On a windows
// file URL that string is '/D:/a/melite/melite/…' — win32 reads a
// leading-separator path as CURRENT-DRIVE-ROOTED, so fs resolution
// mounts it on the cwd's drive and the drive-letter-looking 'D:'
// segment becomes a literal directory name:
//   ENOENT … open 'D:\D:\a\melite\melite\tests\walls\ts\fixtures\bench-…'
//
// THE LAW: a path derived from import.meta.url crosses into the fs
// only through fileURLToPath — the URL standard's own file-URL door,
// absolute on every OS. This wall pins the mechanism (ARM 1, the
// win32 shape over the tree's real derivation forms) and refuses the
// class's return (ARM 2, a census over the executable tree — any new
// `.pathname` derivation off import.meta.url reds by file and line).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { isAbsolute, join, win32 } from "node:path";
import { fileURLToPath } from "node:url";

// The tree's real derivation shape, judged under a windows-shaped
// file URL (what a windows checkout hands import.meta.url).
const WIN_SPEC_URL = "file:///D:/a/melite/melite/tests/walls/ts/suites/this.spec.ts";

describe("THE OS-ABSOLUTE PATH DERIVATION LAW (windows CI class C, 2026-10-31)", () => {
  it("ARM 1 — the mechanism: a URL pathname resolves doubled on win32; fileURLToPath resolves platform-true", () => {
    // the exact broken shape the tree carried (a directory derivation
    // off a windows file URL), resolved the way every fs call resolves
    const pathname = new URL("../../../../", new URL(WIN_SPEC_URL, "file:///")).pathname;
    const resolved = win32.resolve("D:\\a\\melite\\melite", win32.join(pathname, "tests"));
    assert.ok(
      resolved.includes("D:\\D:"),
      `the URL pathname '${pathname}' is CURRENT-DRIVE-ROOTED on win32 — resolve mounts it on the cwd's drive and doubles the drive segment (got '${resolved}')`,
    );
    // the fixed shape over THIS suite's own URL: fileURLToPath is the
    // stdlib's platform-true door — absolute on the running platform
    // (the windows fileURLToPath conversion itself is node's contract,
    // not this wall's to restate; the census arm enforces the door's
    // presence at every derivation site).
    const fixed = fileURLToPath(new URL("../../../../", import.meta.url)).replace(/[\\/]$/, "");
    assert.equal(isAbsolute(fixed), true, "fileURLToPath derives an absolute path on the running platform");
    // THE REPO, NOT A DIRECTORY NAME (the 2026-11-16 CI cure — this
    // arm red on every runner whose checkout directory is not the dev
    // box's). The derivation's law is that it names THIS repo's root,
    // judged by the repo's own markers, never a frozen checkout-dir
    // literal.
    assert.ok(existsSync(join(fixed, "pnpm-workspace.yaml")), `the derivation names the real repo root (got '${fixed}')`);
  });

  it("ARM 2 — the census: no import.meta.url .pathname derivation remains in the executable tree", () => {
    // The census walks the real tree — never a frozen list. Built from
    // fragments so this wall's own source is not a false positive.
    const needle = ["import", ".meta", ".url)", ".path", "name"].join("");
    const roots = ["tests", "packages", "tools", "scripts"];
    const skip = new Set(["node_modules", "references", "lib", "dist", "data", "coverage", ".git"]);
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (!skip.has(ent.name)) walk(join(dir, ent.name));
          continue;
        }
        if (!/\.(ts|tsx|mts|mjs)$/.test(ent.name)) continue;
        if (ent.name.endsWith(".d.ts")) continue;
        const file = join(dir, ent.name);
        if (readFileSync(file, "utf8").includes(needle)) offenders.push(file);
      }
    };
    const repo = fileURLToPath(new URL("../../../../", import.meta.url)).replace(/[\\/]$/, "");
    for (const root of roots) walk(join(repo, root));
    for (const cfg of readdirSync(repo)) {
      if (/^vitest\..*\.config\.ts$/.test(cfg) && readFileSync(join(repo, cfg), "utf8").includes(needle)) {
        offenders.push(join(repo, cfg));
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `URL.pathname derivations off import.meta.url are the windows doubled-drive class — route them through fileURLToPath:\n${offenders.join("\n")}`,
    );
  });
});
