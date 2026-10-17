// boot-fixture-derivation.spec.ts — THE DERIVATION ARM (journey-closure
// E8; closes upstream-parity F3 "derive the boot fixture from a live
// census" + the layera-globals open thread).
//
// The lesion: tests/walls/fixtures/object_info.boot.json rode as a
// FROZEN LITERAL — rows hand-harvested at each growth (B1's 58→99
// append), so the double drifted from the engine it doubles while
// every suite stayed green. F1's H3SLAAttention value-blindness was
// exactly this class: no fixture row, no judge, no red.
//
// THE LAW, one arm per judged direction (canon axis 3):
//   FORMAT      the fixture bytes ARE the canonical emit — sorted keys
//               at every level, one-space indent, ensure_ascii, one
//               trailing newline (the serializer the regen leg emits
//               with, byte-judged here by its twin). A hand edit reds.
//   FRESHNESS   the receipt's census stamp matches the census on disk
//               — a moved census reds "regen owed" (the fixture is a
//               derived artifact; its source moved, so it is stale).
//   PROVENANCE  every fixture class exists in the census (a phantom
//               class — a census that dropped the class — reds named).
//   COVERAGE    every class the composes address (the probe address
//               set: every facts row's card, composed through the
//               dead-card wall's probe law) exists in the fixture —
//               a stale fixture reds naming the class and its rows.
//   COMPLETENESS the derivation refused no row (a dead card would
//               under-cover the fixture silently otherwise).
//   MINIMALITY  every fixture class is the address set OR a receipted
//               bootstrap-residue row (the walls' lane-gated film
//               composes, receipted with a justification in
//               object_info.boot.bootstrap.json) — an unreceipted
//               extra reds naming the corpse.
//
// The regen leg is scripts/regen-node-vocab.mjs --boot (census input
// in, fixture + receipt out; --live harvests the engine first). The
// arm judges; the script cures; the red-proof lives in the audit.
//
// Run: npx vitest run tests/walls/ts/suites/boot-fixture-derivation.spec.ts
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { deriveBootAddressSet, type BootAddressManifest } from "../../../../packages/engines/comfyui-cordis/scripts/boot-address-set.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const FIXTURE = join(ROOT, "tests/walls/fixtures/object_info.boot.json");
const RECEIPT = join(ROOT, "tests/walls/fixtures/object_info.boot.receipt.json");
const BOOTSTRAP = join(ROOT, "tests/walls/fixtures/object_info.boot.bootstrap.json");
const CENSUS = join(ROOT, "data/tmp/object_info_prod.json");
const FACTS = join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json");

const sha256 = (buf: string): string => createHash("sha256").update(buf).digest("hex");

/** The emit serializer's byte-judge twin (scripts/regen-node-vocab.mjs
 *  ensureAsciiJson — the two implementations enforce each other: if
 *  they drift, this arm reds on the bytes). */
const ensureAsciiJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k] as unknown]));
    }
    return v;
  }, 1).replace(/[\u007f-\uffff]/g, (c) =>
    `\\u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`) + "\n";

interface Receipt {
  source: { path: string; sha256: string; class_count: number; origin: string };
  derivation: { fixture_class_count: number; addressed_class_count: number; bootstrap_class_count: number };
  bootstrap_seed: { path: string; sha256: string; rows: number };
}

describe("THE BOOT FIXTURE, DERIVED (E8: the double is a census-derived artifact, never a frozen literal)", () => {
  let manifest: BootAddressManifest;
  beforeAll(async () => {
    manifest = await deriveBootAddressSet({ facts_path: FACTS });
  }, 240_000);

  it("the fixture bytes are the canonical emit — a hand edit reds", () => {
    const raw = readFileSync(FIXTURE, "utf8");
    const out = ensureAsciiJson(JSON.parse(raw));
    assert.equal(
      out, raw,
      "the boot fixture is not the canonical emit (sorted keys, one-space indent, ensure_ascii, one trailing newline) — " +
      "hand-edited bytes; regen with scripts/regen-node-vocab.mjs --boot",
    );
  });

  it("the receipt's census stamp is fresh — a moved census reds as regen owed", () => {
    assert.ok(existsSync(RECEIPT), "no regen receipt beside the fixture — the fixture is still a frozen literal; regen with scripts/regen-node-vocab.mjs --boot");
    const receipt = JSON.parse(readFileSync(RECEIPT, "utf8")) as Receipt;
    if (!existsSync(CENSUS)) {
      assert.fail(`the census input ${receipt.source.path} is absent — the fixture's source cannot be judged; harvest with scripts/regen-node-vocab.mjs --boot --live`);
    }
    const censusRaw = readFileSync(CENSUS, "utf8");
    assert.equal(
      receipt.source.sha256, sha256(censusRaw),
      `the census moved past the fixture's receipt (receipt stamped ${receipt.source.sha256.slice(0, 12)}, disk is ${sha256(censusRaw).slice(0, 12)}) — the derived fixture is stale: regen owed`,
    );
  });

  it("every fixture class exists in the census — a phantom class reds named", () => {
    if (!existsSync(CENSUS)) return; // provenance needs its source; freshness names the absence
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const census = JSON.parse(readFileSync(CENSUS, "utf8")) as Record<string, unknown>;
    const phantoms = Object.keys(fixture).filter((c) => !(c in census));
    assert.deepEqual(
      phantoms, [],
      `the boot fixture carries ${phantoms.length} class(es) the census does not serve — regen with scripts/regen-node-vocab.mjs --boot: ${phantoms.join(", ")}`,
    );
  });

  it("every class the composes address exists in the fixture — a stale fixture reds named", () => {
    assert.deepEqual(
      manifest.refused, [],
      `the address-set derivation is incomplete (${manifest.refused.length} rows never composed) — the dead-card wall owns these; a fixture derived over them would under-cover:\n  ${manifest.refused.join("\n  ")}`,
    );
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const missing = Object.keys(manifest.classes).filter((c) => !(c in fixture));
    assert.deepEqual(
      missing, [],
      `the boot fixture is STALE — ${missing.length} class(es) the card composes address are not booted by the double ` +
      `(regen with scripts/regen-node-vocab.mjs --boot): ` +
      missing.map((c) => `${c} [addressed by ${manifest.classes[c]!.slice(0, 3).join("; ")}]`).join(", "),
    );
  });

  it("every fixture class is the address set or a receipted residue — over-growth reds named", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const seed = JSON.parse(readFileSync(BOOTSTRAP, "utf8")) as { bootstrap?: Record<string, string> };
    const residue = seed.bootstrap ?? {};
    const addressed = new Set(Object.keys(manifest.classes));
    const corpses = Object.keys(fixture).filter((c) => !addressed.has(c) && !(c in residue));
    assert.deepEqual(
      corpses, [],
      `the boot fixture carries ${corpses.length} class(es) no compose addresses and no receipt justifies — ` +
      `over-growth (the bootstrap stays minimal): receipt them in object_info.boot.bootstrap.json with a named consumer, or prune: ${corpses.join(", ")}`,
    );
    for (const [cls, why] of Object.entries(residue)) {
      assert.ok(
        typeof why === "string" && why.trim().length > 0,
        `bootstrap residue row ${cls} carries no justification — a receipted row names the consumer that needs it`,
      );
    }
  });

  it("the receipt's derivation counts agree with a fresh derivation", () => {
    const receipt = JSON.parse(readFileSync(RECEIPT, "utf8")) as Receipt;
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    assert.equal(
      receipt.derivation.addressed_class_count, manifest.class_count,
      `the receipt's address count (${receipt.derivation.addressed_class_count}) disagrees with a fresh derivation (${manifest.class_count}) — the tier moved since the regen; regen owed`,
    );
    assert.equal(
      Object.keys(fixture).length, receipt.derivation.fixture_class_count,
      "the fixture's class count disagrees with its own receipt — hand-edited after the regen",
    );
  });
});
