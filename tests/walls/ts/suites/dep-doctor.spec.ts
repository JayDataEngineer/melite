// dep-doctor wall — THE ONE-VERSION GATE (li-bg, 2026-10-11).
//
// The gate that was missing on 2026-10-11, paid for in hours: pnpm
// keys instance dirs by peer-set, so "one version in every manifest"
// can still mean TWO type identities in one program — the owning
// package compiles green while every consumer reds with variance
// errors that name no file you own. It happened twice in one bump
// (schemastery 3.18.2/3.18.4 dual dts; cordis 4.0.2/4.0.4 dual
// dsh-llm), and on its first run the tool caught a THIRD live drift
// (react 18.3.1 exact beside the documented single-react-19 law —
// that red output was this wall's first receipt).
//
// The wall drives the tool on the LIVE graph and proves its SPLIT
// judgment on a synthetic two-cell tree, so a future edit that
// defangs the checker cannot pass silently.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DOCTOR = join(import.meta.dirname, "../../../../scripts/dep-doctor.mjs");

describe("dep-doctor — the one-version gate", () => {
  it("the live workspace graph passes (one instance per dep, dsh lockstep, bundle peer floors)", () => {
    // THE LIVE RECEIPT: this arm was RED for the react 18.3.1/19.2.8
    // split (and the schemastery/cordis splits) before the
    // unification landed; a future split must redden it the same way.
    const out = execFileSync("node", [DOCTOR], { encoding: "utf8", cwd: import.meta.dirname });
    expect(out).toMatch(/✓ dep-doctor:/);
  }, 120_000);

  it("a split graph refuses by name (synthetic: two store cells for one dep)", () => {
    // Synthetic proof of judgment: the smallest graph the SPLIT law
    // must refuse — one dep name, two .pnpm cells (peer hash differs).
    const root = mkdtempSync(join(tmpdir(), "depdoc-red-"));
    try {
      const a = join(root, "packages", "g", "a");
      const b = join(root, "packages", "g", "b");
      for (const dir of [a, b]) {
        mkdirSync(join(dir, "node_modules", "@deepseek-ai"), { recursive: true });
        writeFileSync(join(dir, "package.json"), JSON.stringify({
          name: dir === a ? "@t/a" : "@t/b",
          dependencies: { "@deepseek-ai/thing": "1.0.0" },
        }));
      }
      const store = join(root, "node_modules", ".pnpm");
      const cells = ["@deepseek-ai+thing@1.0.0_cordis@4.0.2", "@deepseek-ai+thing@1.0.0_cordis@4.0.4"];
      for (const cell of cells) {
        const cellDir = join(store, cell, "node_modules", "@deepseek-ai", "thing");
        mkdirSync(cellDir, { recursive: true });
        writeFileSync(join(cellDir, "package.json"), JSON.stringify({ name: "@deepseek-ai/thing", version: "1.0.0" }));
      }
      symlinkSync(join(store, cells[0]!, "node_modules", "@deepseek-ai", "thing"), join(a, "node_modules", "@deepseek-ai", "thing"), "dir");
      symlinkSync(join(store, cells[1]!, "node_modules", "@deepseek-ai", "thing"), join(b, "node_modules", "@deepseek-ai", "thing"), "dir");
      // the doctor derives ROOT from its own URL — copy it with ROOT pinned
      mkdirSync(join(root, "scripts"), { recursive: true });
      const real = readFileSync(DOCTOR, "utf8");
      writeFileSync(
        join(root, "scripts", "dep-doctor.mjs"),
        real.replace(
          'const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
          `const ROOT = ${JSON.stringify(root)};`,
        ),
      );
      let status = 0;
      let out = "";
      try {
        out = execFileSync("node", [join(root, "scripts", "dep-doctor.mjs")], { encoding: "utf8" });
      } catch (e) {
        status = (e as { status: number }).status ?? 1;
        out = String((e as { stdout?: string }).stdout ?? "") + String((e as { stderr?: string }).stderr ?? "");
      }
      expect(status).toBe(1);
      expect(out).toMatch(/SPLIT: @deepseek-ai\/thing resolves to 2 store instances/);
      expect(out).toMatch(/pnpm -r up/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 120_000);
});
