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
//   SANITATION  the census is a live machine capture; the double it
//               feeds is a tracked file (the exposure-audit cure,
//               2026-11-15). Three byte-level arms: no combo roster
//               rides a media filename (a machine disk listing is
//               boot state, never schema truth); every upload-marker
//               combo (image/audio/video — the disk-enumeration flag)
//               emits an empty roster (the sanitized-boot premise:
//               an EMPTY media-input tree); every non-melite
//               custom-node row serves no option bytes and no tooltip
//               prose (upstream pack content never re-enters the
//               tracked tree — the JJC_JoyCaption extra_option lists
//               the audit caught). The regen's sanitize step is the
//               mechanism; these arms are its enforcement.
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

  // THE CLONE SHAPE (the 2026-11-09 CI cure, the contracts-registry
  // REGISTRY_PRESENT pattern): the census input is a live machine
  // harvest (data/tmp is untracked) — absent on every fresh clone and
  // on CI, present on every development machine, which is the machine
  // class this arm guards (a moved census must red as regen owed).
  // Absence skips LOUD with the harvest command; the provenance arm
  // below owns the same absence with its early return.
  const CENSUS_PRESENT = existsSync(CENSUS);

  it.skipIf(!CENSUS_PRESENT)("the receipt's census stamp is fresh — a moved census reds as regen owed (skipped on a clone: the census input is not harvested — scripts/regen-node-vocab.mjs --boot --live harvests it)", () => {
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

// THE SANITATION ARMS (the exposure-audit cure, 2026-11-15): the mask
// twins below mirror scripts/regen-node-vocab.mjs's sanitize step —
// the two implementations enforce each other (the ensureAsciiJson
// twin precedent). Toggle-out proof: the pre-cure fixture bytes (the
// census capture's verbatim rosters — machine media filenames in the
// upload-flag combos, upstream option/tooltip prose in the
// third-party rows) red all three arms named.
const MEDIA_EXT = /\.(mp3|wav|flac|ogg|m4a|mp4|webm|mov|mkv|avi|png|jpe?g|gif|webp)$/i;
const isThirdPartyPack = (pythonModule: unknown): boolean =>
  typeof pythonModule === "string" && pythonModule.startsWith("custom_nodes.") &&
  !pythonModule.startsWith("custom_nodes.melite-");
/** Both /object_info combo spellings: a legacy array roster head, or
 *  a string head with the roster in the detail object. */
const comboRoster = (spec: unknown): unknown[] | null => {
  if (Array.isArray(spec) && Array.isArray(spec[0])) return spec[0];
  if (Array.isArray(spec) && typeof spec[0] === "string" && spec[1] !== null &&
      typeof spec[1] === "object" && Array.isArray((spec[1] as Record<string, unknown>).options)) {
    return (spec[1] as Record<string, unknown>).options as unknown[];
  }
  return null;
};
const hasUploadMarker = (detail: unknown): boolean => {
  if (detail === null || typeof detail !== "object") return false;
  return Object.keys(detail as Record<string, unknown>).some((k) =>
    /upload/i.test(k) && ((detail as Record<string, unknown>)[k] === true ||
      typeof (detail as Record<string, unknown>)[k] === "string"));
};
const comboSpecs = (fixture: Record<string, unknown>): Array<{ site: string; spec: unknown; detail: unknown; row: Record<string, unknown> }> => {
  const out: Array<{ site: string; spec: unknown; detail: unknown; row: Record<string, unknown> }> = [];
  for (const [cls, raw] of Object.entries(fixture)) {
    const row = raw as Record<string, unknown>;
    const input = row.input as Record<string, Record<string, unknown>> | undefined;
    for (const group of ["required", "optional"] as const) {
      const inputs = input?.[group];
      if (inputs === null || typeof inputs !== "object") continue;
      for (const [key, spec] of Object.entries(inputs)) {
        let detail: unknown = null;
        if (Array.isArray(spec) && spec.length > 1 && spec[1] !== null && typeof spec[1] === "object") detail = spec[1];
        out.push({ site: `${cls}.${key}`, spec, detail, row });
      }
    }
  }
  return out;
};

describe("THE BOOT FIXTURE, SANITIZED (the census capture is machine state; the double is tracked)", () => {
  it("no combo roster rides a media filename — a machine disk listing never re-enters", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const offenders: string[] = [];
    for (const { site, spec } of comboSpecs(fixture)) {
      const roster = comboRoster(spec);
      if (roster === null) continue;
      const media = roster.filter((o) => typeof o === "string" && MEDIA_EXT.test(o));
      if (media.length > 0) offenders.push(`${site} (${media.length} media entries, e.g. ${String(media[0])})`);
    }
    assert.deepEqual(
      offenders, [],
      `the boot fixture carries machine media filenames in ${offenders.length} combo roster(s) — ` +
      `a disk listing is boot state, never schema truth; regen with scripts/regen-node-vocab.mjs --boot:\n  ${offenders.slice(0, 8).join("\n  ")}`,
    );
  });

  it("every upload-marker combo emits an empty roster — the sanitized-boot premise held", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const offenders: string[] = [];
    for (const { site, spec, detail } of comboSpecs(fixture)) {
      if (!hasUploadMarker(detail)) continue;
      const roster = comboRoster(spec);
      if (roster !== null && roster.length > 0) offenders.push(`${site} (${roster.length} entries survive the mask)`);
    }
    assert.deepEqual(
      offenders, [],
      `${offenders.length} upload-marker combo roster(s) in the boot fixture are non-empty — the regen's ` +
      `media-input mask (an EMPTY media-input tree at capture) is toggled out or drifted:\n  ${offenders.join("\n  ")}`,
    );
  });

  it("non-melite custom-node rows serve no roster bytes and no tooltip prose — the third-party mask held (declared V3 grids ride: they are schema, not prose)", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const offenders: string[] = [];
    const V3_COMBO_HEAD = "COMFY_DYNAMICCOMBO_V3";
    const v3Tooltips = (detail: unknown): string[] => {
      if (detail === null || typeof detail !== "object") return [];
      const options = Array.isArray((detail as Record<string, unknown>).options)
        ? (detail as Record<string, unknown>).options as unknown[] : [];
      const hits: string[] = [];
      for (const opt of options) {
        if (opt === null || typeof opt !== "object") continue;
        const inputs = (opt as Record<string, unknown>).inputs;
        if (inputs === null || typeof inputs !== "object") continue;
        for (const group of ["required", "optional"] as const) {
          const groupInputs = (inputs as Record<string, Record<string, unknown>>)[group];
          if (groupInputs === null || typeof groupInputs !== "object") continue;
          for (const [name, inputSpec] of Object.entries(groupInputs)) {
            if (Array.isArray(inputSpec) && inputSpec[1] !== null && typeof inputSpec[1] === "object" &&
                "tooltip" in (inputSpec[1] as Record<string, unknown>)) {
              hits.push(name);
            }
          }
        }
      }
      return hits;
    };
    for (const [cls, raw] of Object.entries(fixture)) {
      const row = raw as Record<string, unknown>;
      if (!isThirdPartyPack(row.python_module)) continue;
      for (const { site, spec } of comboSpecs({ [cls]: row })) {
        const isV3 = Array.isArray(spec) && spec[0] === V3_COMBO_HEAD;
        if (isV3) {
          // the DECLARED V3 option grid is the node's schema row —
          // it rides verbatim; only its tooltip prose bytes die
          const detail = Array.isArray(spec) && spec[1] !== null && typeof spec[1] === "object" ? spec[1] : null;
          const prose = v3Tooltips(detail);
          if (prose.length > 0) offenders.push(`${site} (${prose.length} tooltip bytes survive the grid strip, e.g. ${prose[0]})`);
          continue;
        }
        const roster = comboRoster(spec);
        if (roster !== null && roster.length > 0) offenders.push(`${site} (${roster.length} option entries)`);
      }
      if (typeof row.description === "string" && row.description !== "") offenders.push(`${cls}.description (tooltip prose)`);
    }
    assert.deepEqual(
      offenders, [],
      `${offenders.length} third-party pack byte row(s) in the boot fixture — upstream option/tooltip content ` +
      `never re-enters the tracked tree (the JJC_JoyCaption extra_option lists the audit caught); ` +
      `regen with scripts/regen-node-vocab.mjs --boot:\n  ${offenders.slice(0, 8).join("\n  ")}`,
    );
  });
});
