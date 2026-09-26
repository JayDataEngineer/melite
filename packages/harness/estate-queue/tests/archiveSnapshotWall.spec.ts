// archiveSnapshotWall.spec.ts — THE ARCHIVE WALL (the operator's
// order, 2026-09-26: "the saving should 100% be a schemamaster
// contract, that way we know 100% if it will load again"). The
// contract is only a guarantee if the ARCHIVE passes it: this wall
// walks every real `_flow.json` sidecar under the repo's runs tree
// and proves each `bench_snapshot` / `card_snapshot` parses under
// the load-side contract — the exact population the wand restores
// from. A failure here names the run and the problem; the wall
// never self-skips (an empty runs tree FAILS — the archive is the
// subject, not an optional fixture).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { parseBenchSnapshot, parseCardSnapshot } from "@melite/contracts/benchSnapshot";

interface Tally {
  sidecars: number;
  benchSnapshots: number;
  cardSnapshots: number;
  failures: string[];
}

function walk(dir: string, tally: Tally): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) {
      walk(full, tally);
      continue;
    }
    if (name !== "_flow.json") continue;
    tally.sidecars += 1;
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(full, "utf8")) as unknown;
    } catch (e) {
      tally.failures.push(`${full}: sidecar is not JSON (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    if (!isRecord(doc)) continue;
    if (doc["bench_snapshot"] !== undefined) {
      tally.benchSnapshots += 1;
      const parsed = parseBenchSnapshot(doc["bench_snapshot"]);
      if (!parsed.ok) {
        tally.failures.push(`${full}: bench_snapshot — ${parsed.problems.join("; ")}`);
      }
    }
    if (doc["card_snapshot"] !== undefined) {
      tally.cardSnapshots += 1;
      const parsed = parseCardSnapshot(doc["card_snapshot"]);
      if (!parsed.ok) {
        tally.failures.push(`${full}: card_snapshot — ${parsed.problems.join("; ")}`);
      }
    }
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

describe("THE ARCHIVE WALL — every real sidecar's snapshot parses under the contract", () => {
  it("the runs tree's bench/card snapshots all parse (the wand's whole restore population)", () => {
    const tally: Tally = { sidecars: 0, benchSnapshots: 0, cardSnapshots: 0, failures: [] };
    walk(join(resolveRepoRoot(), "data", "runs"), tally);
    assert.ok(
      tally.sidecars > 0,
      "the runs tree under data/ carries sidecars — an empty tree is a broken fixture, not a pass",
    );
    // Snapshot coverage: the archive predates the contract, so
    // bench_snapshot presence is historical (card-only eras). What
    // this wall pins is the ZERO on failures — every snapshot the
    // wand could ever offer the user LOADS.
    assert.equal(
      tally.failures.length,
      0,
      `unloadable snapshots in the archive:\n${tally.failures.slice(0, 20).join("\n")}`,
    );
    console.log(
      `[archive-snapshot-wall] ${tally.sidecars} sidecars, ` +
        `${tally.benchSnapshots} bench snapshots, ${tally.cardSnapshots} card snapshots — all parse`,
    );
  });
});
