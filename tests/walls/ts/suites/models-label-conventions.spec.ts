// THE LABEL CONVENTIONS WALL (2026-11-05, the operator's governance
// question: "Is there actual enforced conventions for the model,
// quant, labels etc?"). Three laws, each with its own firing arm —
// derived from DSH's own seams, not invented:
//
// 1. LABELS ARE FACES, NOT SENTENCES. DSH renders provider-owned
//    model ids verbatim (references/deepseek-harness/packages/core/
//    agent/src/model-selection.ts:27 — "Provider-owned model id",
//    no display-name translation layer); prose belongs to the hint
//    seat, which every label-bearing row already carries. A label
//    with sentence prose (" — " chains, trailing periods) or one
//    longer than the face's bound (48 — today's tree max is 46,
//    florence2's upstream repo paths) is a HINT wearing a LABEL.
//    The overflow-pill defect the operator hit on 2026-11-05 is
//    the display-side evidence; this wall refuses the DECL side.
// 2. THE SHARED BAG RESOLVES. The fold law seats mods at FAMILY
//    level (make-model §1c: "Mods stay family-level — the bag
//    serves every lane that fires it"); a recipe row's
//    wire_defaults.loras[].id is a REFERENCE, and a reference to
//    an id the family never declared is a phantom — the TTS
//    admission law ("a lane a mod fires nothing on refuses LOUD,
//    never silently skips") applied at the DECL door, where the
//    phantom is catchable before any compose.
// 3. IDS ARE UPSTREAM NAMES. DSH's ModelSelection carries the
//    provider's own id; our family ids mirror that (h3, krea-2,
//    qwen-img-21 — the upstream family's name, lowercase
//    alnum-hyphen). A camelCase or underscore id is a local
//    invention, not an upstream name. (seedvr2_ema predates the
//    law and is grandfathered here, dated; renaming it moves
//    route strings and owes its own stroke.)
//
// DEPTH: the arms walk the REAL registry (boot-models + the
// engine's own roster) and each family's own tree — no frozen
// census, no copy of the truth.

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const REPO_ROOT = new URL("../../../../", import.meta.url).pathname;

/** The label face's bound: the longest honest id in today's tree is
 *  46 (florence2's upstream repo paths — provider-owned, kept). A
 *  label past 48 cannot render in the face; its prose belongs in
 *  the hint seat. */
const LABEL_MAX = 48;

/** Prose markers that name a HINT wearing a LABEL: the em-dash
 *  chain the tree's own hints use for asides, and sentence
 *  punctuation. Upstream ids never carry them. */
function labelIsProse(label: string): boolean {
  return label.includes(" — ") || /[.!?]$/.test(label);
}

/** Every label-bearing row of a family's DECL, as the registry
 *  serves it: the family's own label, its variant rows' labels,
 *  and every cell label. (Recipe rows ride the same variants
 *  array — group "Recipe" — per the recipe law.) */
interface LabelRow {
  family: string;
  where: string;
  label: string;
}

function labelRowsOf(family: string): LabelRow[] {
  const d = registryModel(family);
  const rows: LabelRow[] = [
    { family, where: "family label", label: String(d.label ?? family) },
  ];
  for (const v of d.variants) {
    rows.push({ family, where: `variant ${String(v.id)}`, label: String(v.label) });
    for (const c of v.cells) {
      if (c.label !== undefined) rows.push({ family, where: `cell ${String(c.id)}`, label: String(c.label) });
    }
  }
  return rows;
}

/** One family's declared mod vocabulary, from its own tree: the
 *  DECL's provisions (the h3 in-tree precedent) ∪ its mods/*.ts
 *  row ids (the krea-2/z-image picker vocabulary). Files are read
 *  as text and id-extracted — the same literal shape every other
 *  tree-reading wall (models-registry's declaredFamilyIds) uses. */
function declaredModIds(family: string): Set<string> {
  const ids = new Set<string>();
  const d = registryModel(family);
  for (const p of d.provisions ?? []) {
    if (p.id !== undefined) ids.add(String(p.id));
  }
  const modsDir = join(REPO_ROOT, "packages", "models", family, "mods");
  if (existsSync(modsDir)) {
    for (const f of readdirSync(modsDir)) {
      if (!f.endsWith(".ts")) continue;
      const src = readFileSync(join(modsDir, f), "utf8");
      // The rows are TS object literals — single- or double-quoted,
      // bare or quoted key (both spellings live in today's tree).
      for (const m of src.matchAll(/"?id"?\s*:\s*['"]([^'"]+)['"]/g)) ids.add(m[1] as string);
    }
  }
  return ids;
}

/** Every recipe/variant bag row (wire_defaults.loras[].id) the
 *  family's DECL mints, with its owning row named for the error.
 *  (Recipe rows stamp wire_defaults per the recipe law; route
 *  variants stamp resolver_defaults — the walk judges BOTH seats,
 *  the union the compose can actually receive.) */
function bagRowsOf(family: string): Array<{ row: string; id: string }> {
  const d = registryModel(family);
  const out: Array<{ row: string; id: string }> = [];
  for (const v of d.variants) {
    const seats: Array<Record<string, unknown>> = [];
    for (const key of ["wire_defaults", "resolver_defaults", "defaults"] as const) {
      const seat = (v as unknown as Record<string, unknown>)[key];
      if (seat !== null && seat !== undefined && typeof seat === "object") {
        seats.push(seat as Record<string, unknown>);
      }
    }
    for (const seat of seats) {
      const bag = seat["loras"];
      if (!Array.isArray(bag)) continue;
      for (const entry of bag) {
        if (entry !== null && typeof entry === "object" && "id" in entry) {
          out.push({ row: String(v.id), id: String((entry as Record<string, unknown>)["id"]) });
        }
      }
    }
  }
  return out;
}

describe("the label conventions wall (2026-11-05)", () => {
  it("LABELS ARE FACES: every family/variant/cell label is short and carries no sentence prose — prose belongs to the hint seat", () => {
    const offenders: string[] = [];
    let judged = 0;
    for (const fam of registryIds()) {
      for (const row of labelRowsOf(fam)) {
        judged += 1;
        if (labelIsProse(row.label) || row.label.length > LABEL_MAX) {
          offenders.push(`${row.family} ${row.where}: "${row.label}" (${String(row.label.length)} chars)`);
        }
      }
    }
    assert.ok(judged > 100, `the walk judged the label-bearing rows (judged ${String(judged)})`);
    assert.deepEqual(offenders, [],
      "a label with prose or past 48 chars is a HINT wearing a LABEL — move the sentence to the row's hint seat");
  });

  it("THE SHARED BAG RESOLVES: every wire_defaults loras id resolves against its own family's declared vocabulary", () => {
    const offenders: string[] = [];
    let judged = 0;
    for (const fam of registryIds()) {
      const vocab = declaredModIds(fam);
      for (const { row, id } of bagRowsOf(fam)) {
        judged += 1;
        if (!vocab.has(id)) {
          offenders.push(`${fam} recipe "${row}" carries loras id "${id}" — not in the family's provisions or mods/*.ts`);
        }
      }
    }
    assert.ok(judged >= 3, `the walk judged the bag-bearing rows (judged ${String(judged)})`);
    assert.deepEqual(offenders, [],
      "a phantom bag id is a silent dead write at compose — the TTS admission law applied at the DECL door");
  });

  it("IDS ARE UPSTREAM NAMES: family ids are lowercase alnum-hyphen, the provider's own naming (seedvr2_ema grandfathered, dated)", () => {
    // The pre-law underscore spellings; renaming each moves route
    // strings and owes its own stroke (the fold-law migration door).
    const GRANDFATHER = new Set(["seedvr2_ema", "gem_soma", "transfer_rig"]);
    const offenders: string[] = [];
    for (const fam of registryIds()) {
      if (GRANDFATHER.has(fam)) continue;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(fam)) offenders.push(fam);
    }
    assert.deepEqual(offenders, [],
      "a camelCase or underscore family id is a local invention — DSH carries provider-owned ids (model-selection.ts:27)");
  });
});
