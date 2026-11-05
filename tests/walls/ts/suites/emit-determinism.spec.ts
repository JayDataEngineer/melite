// emit-determinism.spec.ts — THE STAMP DETERMINISM LAW (CI classes
// B/D, 2026-10-31: the src-stamp recipe shelled out — build-plane
// writeSrcStamp spawnSync'd `bash -c "find src ... | LC_ALL=C sort |
// xargs sha256sum ..."` per package — and the shell collation made
// the stamp builder-dependent: an en_US-built stamp never matched a
// CI recompute (tiers lib-drift), and on windows the pipeline died
// outright (cmd.exe parse death, windows find.exe), degrading the
// estate-singleton floor to 3-of-5 stamped bundles. The derivation
// is node-native now (tools/src-stamp.mjs deriveSrcStamp,
// in-process crypto over the deterministic input set). These walls
// prove the derivation is deterministic and byte-identical to the
// shell oracle it replaced, on every leg:
//
//   1. DETERMINISM — the same tree derives the same stamp twice,
//      in-process (plus a mutation arm: a changed tree MUST change
//      the stamp — a constant function would pass determinism
//      vacuously).
//   2. SHELL PARITY — the native derivation equals the shell recipe
//      byte-for-byte (the ship lane's verifier still runs the shell
//      original, so a drift between them would refuse every ship).
//      Shell-gated: skipped on win32 with the reason named — the
//      recipe under test is the one that never shells.
//   3. NO-SPAWN — the derivation path carries no child_process: a
//      re-added shell reds here before it can degrade a stamp.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { deriveSrcStamp } from "../../../../tools/src-stamp.mjs";
import { emitProgram, indexLibFiles, indexReader, packageTsc } from "../lib/models-lib-sync-judge.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** A synthetic src tree engineered to sort differently under a
 *  locale collation than under bytes: `B.ts` (0x42) sorts BEFORE
 *  `a.ts` (0x61) in LC_ALL=C but AFTER it in en_US — the exact
 *  tiers lib-drift class. Subdirs, a .tsx, a dotfile, and a CRLF
 *  body complete the trap set. */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "stamp-det-"));
  const src = join(dir, "src");
  mkdirSync(join(src, "sub"), { recursive: true });
  writeFileSync(join(src, "B.ts"), "export const B = 1;\n");
  writeFileSync(join(src, "a.ts"), "export const a = 1;\n");
  writeFileSync(join(src, "sub", "c.ts"), "export const c = 1;\n");
  writeFileSync(join(src, "sub", "D.tsx"), "export const D = 1;\n");
  writeFileSync(join(src, ".hidden.ts"), "export const hidden = 1;\n");
  writeFileSync(join(src, "crlf.ts"), "export const crlf = 1;\r\n");
  return dir;
}

/** The shell oracle, verbatim (scripts/ship-lane.sh stamp_src): the
 *  recipe the native derivation must stay byte-identical to. */
function shellStamp(pkgDir: string): string {
  return execFileSync(
    "bash",
    ["-c", "find src \\( -name '*.ts' -o -name '*.tsx' \\) | LC_ALL=C sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16"],
    { cwd: pkgDir, encoding: "utf8" },
  ).trim();
}

describe("THE STAMP DETERMINISM LAW (the derivation is in-process and byte-faithful)", () => {
  it("determinism: the same tree derives the same stamp twice, in-process (synthetic trap tree + a real package src)", () => {
    // MUTATION KILLED: a derivation that reads the clock, a pid, or
    // readdir order instead of the tree — the second derive would
    // drift and this arm would name it.
    const dir = fixtureTree();
    try {
      const first = deriveSrcStamp(dir);
      const second = deriveSrcStamp(dir);
      expect(first, "the same tree must derive the same stamp twice").toBe(second);
      expect(first, "the stamp is 16 lowercase hex chars").toMatch(/^[0-9a-f]{16}$/);
      const real = join(ROOT, "packages/web/card-base");
      expect(deriveSrcStamp(real), "a real package src derives deterministically too").toBe(deriveSrcStamp(real));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sensitivity: a changed tree MUST change the stamp (the derivation reads the tree, not a constant)", () => {
    // MUTATION KILLED: a constant (or tree-blind) derivation passes
    // determinism vacuously and stamps every build identical — the
    // ship would then serve stale lib under a fresh-looking stamp.
    const dir = fixtureTree();
    try {
      const before = deriveSrcStamp(dir);
      writeFileSync(join(dir, "src", "sub", "c.ts"), "export const c = 2;\n");
      expect(deriveSrcStamp(dir), "an edited src byte must move the stamp").not.toBe(before);
      writeFileSync(join(dir, "src", "added.ts"), "export const added = 1;\n");
      const grown = deriveSrcStamp(dir);
      expect(grown, "an added src file must move the stamp").not.toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(process.platform === "win32")("shell parity: node === the ship oracle byte-for-byte, on the trap tree and a real package (skipped on win32: the recipe under test never shells, and cmd.exe cannot run the oracle)", () => {
    // MUTATION KILLED: a derivation drift (JS default sort instead
    // of byte order, one-space separators, LF-normalized reads) —
    // the ship's shell verifier would refuse every build while the
    // builder's stamps looked fine. The trap tree's B.ts/a.ts pair
    // is the drift detector: any locale-collated sort flips the
    // order and the stamps diverge.
    const dir = fixtureTree();
    try {
      expect(deriveSrcStamp(dir), "trap tree: native must equal the shell oracle").toBe(shellStamp(dir));
      const real = join(ROOT, "packages/web/card-base");
      expect(deriveSrcStamp(real), "real package: native must equal the shell oracle").toBe(shellStamp(real));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no-spawn: the derivation path carries no child_process — the class-B shell cannot regrow unjudged", () => {
    // MUTATION KILLED: re-adding a spawn to the stamp path (the
    // exact 2026-10-31 shape: spawnSync('bash', ...) in
    // writeSrcStamp) — the stamp would degrade on windows again
    // while every byte wall stayed green on linux.
    // The arm judges the CALL surface, not prose: the header comment
    // above narrates the shelled shape this module replaced, so bare
    // substring matching would false-red on its own history. A
    // regrown spawn reds here by its import and its call spelling.
    const derivation = readFileSync(join(ROOT, "tools/src-stamp.mjs"), "utf8");
    expect(derivation.includes("node:child_process"), "tools/src-stamp.mjs must never import child_process").toBe(false);
    expect(derivation.includes("spawnSync("), "tools/src-stamp.mjs must never spawn").toBe(false);
    expect(derivation.includes("execFileSync("), "tools/src-stamp.mjs must never exec").toBe(false);
    expect(derivation.includes("execSync("), "tools/src-stamp.mjs must never exec").toBe(false);
    expect(derivation.includes("spawn("), "tools/src-stamp.mjs must never spawn").toBe(false);
    const buildPlane = readFileSync(join(ROOT, "tools/build-plane.mjs"), "utf8");
    const stampFn = buildPlane.slice(buildPlane.indexOf("function writeSrcStamp"));
    expect(stampFn.includes("spawnSync('bash'"), "writeSrcStamp must never shell to bash").toBe(false);
    expect(stampFn.includes('spawnSync("bash"'), "writeSrcStamp must never shell to bash").toBe(false);
    expect(stampFn.includes("deriveSrcStamp"), "writeSrcStamp must ride the shared native derivation").toBe(true);
  });
});

describe("THE INDEX-BYTE SERVED PLANE (class B D4: the lib-sync judge reads what a clone checks out)", () => {
  it("the EOL census: every tracked family-lib row is i/lf AND w/lf (the index law the judge's bytes ride)", () => {
    // MUTATION KILLED: a CRLF commit (a windows emit without the
    // --newLine pin) lands i/crlf rows — the index bytes the judge
    // hashes then differ per committer, and the manifest hash stops
    // being a shared truth. w/lf judges the checkout: a CRLF
    // checkout reds loudly instead of silently diverging from the
    // index the walls read.
    const rows = execFileSync("git", ["ls-files", "--eol", "--", "packages/models"], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    }).split("\n").filter((l) => /lib\/.*\.(js|d\.ts)$/.test(l));
    expect(rows.length, "the census must see the tracked family-lib plane, not zero rows").toBeGreaterThan(100);
    // columns are space-padded, tab before the path only: the eol
    // pair must lead the row (`i/lf w/lf`) whatever attributes say.
    const offenders = rows.filter((l) => !/^i\/lf\s+w\/lf\s/u.test(l));
    expect(offenders, `non-LF lib rows (index and worktree must both be lf): ${offenders.join(" | ")}`).toEqual([]);
  });

  it("the index reader serves the COMMITTED bytes: a dirty worktree never bleeds in, an untracked file does not exist", () => {
    // MUTATION KILLED: a working-tree reader (readFileSync) passes a
    // judge on an uncommitted rebuild while the committed plane
    // drifts — the manifest then blesses bytes no clone will ever
    // check out. The throwaway repo makes the gap observable: the
    // tree and the index are forced apart, and the reader must take
    // the index's side every time.
    const repo = mkdtempSync(join(tmpdir(), "index-judge-"));
    try {
      const run = (args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
      run(["init", "-q", "-b", "main"]);
      mkdirSync(join(repo, "pkg/lib"), { recursive: true });
      writeFileSync(join(repo, "pkg/lib/index.js"), "export const committed = 1;\n");
      run(["add", "."]);
      run(["-c", "user.email=w@w", "-c", "user.name=w", "commit", "-q", "-m", "lib"]);
      const libDir = join(repo, "pkg/lib");
      const read = indexReader(libDir, repo);
      expect(read("index.js")).toBe("export const committed = 1;\n");
      // force the tree and the index apart
      writeFileSync(join(repo, "pkg/lib/index.js"), "export const dirty = 2;\n");
      expect(read("index.js"), "a dirty worktree must not bleed into the served bytes").toBe("export const committed = 1;\n");
      // an untracked file is not part of any clone's checkout
      writeFileSync(join(repo, "pkg/lib/extra.js"), "export const untracked = 3;\n");
      expect(read("extra.js"), "an untracked lib file is not served bytes").toBeNull();
      expect(indexLibFiles(libDir, repo), "the enumeration is tracked-only too").toEqual(["index.js"]);
      // a tracked file missing from DISK still reads — the judge
      // survives a mid-rebuild tree (the 2026-10-20 ENOENT class)
      rmSync(join(repo, "pkg/lib/index.js"));
      expect(read("index.js"), "the index carries the bytes even when the tree deleted the file").toBe("export const committed = 1;\n");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("the emit is host-independent: --newLine lf pins the judge and the build plane, and beats a crlf tsconfig", () => {
    // MUTATION KILLED: tsc's default newLine is the HOST os — a
    // windows emit CRLFs the disk lib against the LF index law and
    // every linux-built face, so parity arms diverge per machine.
    // The behavioral half proves the CLI flag BEATS a project
    // config that demands crlf; the source pins hold both seats to
    // the flag so the behavior cannot silently regrow.
    const judge = readFileSync(join(ROOT, "tests/walls/ts/lib/models-lib-sync-judge.ts"), "utf8");
    expect(judge, "the judge's emitProgram pins --newLine lf").toContain('"--newLine", "lf"');
    const plane = readFileSync(join(ROOT, "tools/build-plane.mjs"), "utf8");
    expect(plane, "the build plane's face emit pins --newLine lf").toContain("'--newLine', 'lf'");
    // behavioral: a crlf-configured fixture still emits LF
    const dir = mkdtempSync(join(tmpdir(), "newline-pin-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src/index.ts"), "export const pin = 1;\n");
      writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
          outDir: "lib", rootDir: "src", newLine: "crlf", strict: false, skipLibCheck: true,
          target: "es2022", module: "nodenext", moduleResolution: "nodenext",
        },
        files: ["src/index.ts"],
      }));
      const tsc = packageTsc(join(ROOT, "packages/web/card-base"));
      const out = emitProgram(dir, "tsconfig.json", tsc);
      try {
        const body = readFileSync(join(out, "index.js"), "utf8");
        expect(body.includes("\r"), "a crlf tsconfig must still emit LF — the CLI pin wins").toBe(false);
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
