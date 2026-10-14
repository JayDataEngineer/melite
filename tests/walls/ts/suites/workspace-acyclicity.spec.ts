// workspace-acyclicity wall — THE ZERO-CYCLE GATE (acyclicity cure,
// 2026-10-13). pnpm's cyclic WARN surfaces only the cycles its own
// resolver trips over, on install, in someone's terminal — the
// 2026-10-13 cure spent the day chasing a WARN that reappeared
// because no standing judge existed. The law: the workspace manifest
// graph (dependencies + devDependencies + peerDependencies, the three
// sections pnpm counts) carries NO workspace-protocol cycle in either
// direction. The structural cure that earned the law: the plugin
// contracts (card definition, model decl, service faces) live in the
// leaf tier (@melite/comfyui-card-kit), so plugin packages import the
// owner directly and the engine's manifests never reach back into the
// tree that registers into it.
//
// Two arms, per the contract canon: the LIVE arm drives the judge on
// the real graph; the SYNTHETIC arm proves the judge refuses the
// smallest cycle on a two-cell tmp tree, so a defanged checker
// cannot pass silently.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const JUDGE = join(import.meta.dirname, "../../../../scripts/workspace-cycles.mjs");
const ROOT = join(import.meta.dirname, "../../../..");

describe("workspace-acyclicity — the zero-cycle gate", () => {
  it("the live workspace manifest graph has no cycle (all three dep sections)", () => {
    // THE LIVE RECEIPT: this arm was RED through the 2026-10-13 cure —
    // 38 cycles named (the anny pair, the catalog↔formats pair, and
    // every leaf↔cordis pair the roster wired) — and greened only
    // when the contracts moved to the kit tier and the manifests
    // were cut. A future manifest edge that rebuilds any of those
    // reddens this arm the same way.
    const out = execFileSync("node", [JUDGE], { encoding: "utf8", cwd: ROOT });
    expect(out).toMatch(/✓ workspace-cycles: none \(\d+ packages, \d+ workspace edges\)/);
  }, 60_000);

  it("a two-package cycle refuses by name (synthetic tmp tree)", () => {
    const root = mkdtempSync(join(tmpdir(), "acyclic-red-"));
    try {
      // smallest graph the law must refuse: a→b→a over workspace:*
      const mk = (dir: string, deps: Record<string, string>) => {
        mkdirSync(join(root, "packages", dir), { recursive: true });
        writeFileSync(
          join(root, "packages", dir, "package.json"),
          JSON.stringify({ name: `@t/${dir}`, dependencies: deps }, null, 2),
        );
      };
      mk("a", { "@t/b": "workspace:*" });
      mk("b", { "@t/a": "workspace:*" });
      // the judge derives ROOT from argv, so the original runs as-is
      let out = "";
      let refused = false;
      try {
        out = execFileSync("node", [JUDGE, root], { encoding: "utf8" });
      } catch (err) {
        refused = true;
        out = (err as { stdout?: string; stderr?: string }).stderr ?? String(err);
      }
      expect(refused, `judge exited 0 on a cyclic tree: ${out}`).toBe(true);
      expect(out).toMatch(/✗ workspace-cycles: \d+ cycle/);
      expect(out).toMatch(/@t\/a → @t\/b → @t\/a/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("the judge's own copy in a tmp tree still judges (script is self-contained)", () => {
    // Guards against the judge quietly depending on files outside
    // itself: a copied script must keep its refusal (dep-doctor's
    // self-containment arm, same judgment).
    const root = mkdtempSync(join(tmpdir(), "acyclic-copy-"));
    try {
      mkdirSync(join(root, "scripts"), { recursive: true });
      copyFileSync(JUDGE, join(root, "scripts", "workspace-cycles.mjs"));
      const mk = (dir: string, deps: Record<string, string>) => {
        mkdirSync(join(root, "packages", dir), { recursive: true });
        writeFileSync(
          join(root, "packages", dir, "package.json"),
          JSON.stringify({ name: `@t/${dir}`, dependencies: deps }, null, 2),
        );
      };
      mk("a", { "@t/b": "workspace:*" });
      mk("b", {});
      const out = execFileSync("node", [join(root, "scripts", "workspace-cycles.mjs"), root], { encoding: "utf8" });
      expect(out).toMatch(/✓ workspace-cycles: none/);
      expect(readFileSync(join(root, "scripts", "workspace-cycles.mjs"), "utf8")).toContain("workspace-cycles");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
