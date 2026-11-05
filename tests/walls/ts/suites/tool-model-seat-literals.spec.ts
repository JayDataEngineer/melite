// tool-model-seat-literals.spec.ts — THE MODEL-SEAT LITERAL WALL
// (friction F3 D3-08, seated 2026-11-15): every model-id literal a
// melite-tools tool TEACHES must resolve against the real registry —
// a description teaching an id the compose door refuses is an agent
// instruction that burns on first use.
//
// THE BURN: melite-load's card-mode grammar taught
// `params {model: 'qwen3-tts-large'}` for a full month after the
// 2026-10-26 size-at-quant fold killed that id — every agent that
// pasted the teaching hit the compose door's unknown-model refusal,
// and the tool's own text was the misteacher. The literal's fix is
// one string; this wall is the class cure: the seats the tools teach
// as pasteable selector values (`model: '…'`, `variant: '…'`,
// `quant: '…'`) are swept from the TOOL SOURCES (the strings the
// render path concatenates — the truth agents read) and each must
// resolve in the booted registry:
//   model  → an ADDRESS (family id or minted flat route — what the
//            compose door's model resolution accepts)
//   variant → a VARIANT id of some family (variants state inside a
//            family; the flat namespace does not apply)
//   quant   → a CELL id of some variant (the quant axis)
// The roster is derived (registryIds/registryModel over the booted
// families), never a hand list — a family added tomorrow is covered
// with no edit here.
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registryIds, registryModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const TOOLS_DIR = fileURLToPath(new URL("../../../../packages/harness/melite-tools/src/tools/", import.meta.url));

/** The teaching pattern: a seat key with a quoted literal value, in
 * either the plain (`model: 'x'`) or the escaped (`model: \'x\'`)
 * spelling — the render path's strings carry the escape inside
 * single-quoted JS. */
const SEAT_RE = /(model|variant|quant)\s*:\s*\\?'([a-zA-Z0-9][a-zA-Z0-9._/-]*)\\?'/g;

/** The derived roster: addresses, variant ids, and quant cell ids the
 * booted registry actually serves. */
function roster(): { addresses: Set<string>; variants: Set<string>; quants: Set<string> } {
  const addresses = new Set(modelIds());
  const variants = new Set<string>();
  const quants = new Set<string>();
  for (const fam of registryIds()) {
    const row = registryModel(fam);
    for (const variant of row.variants ?? []) {
      variants.add(variant.id);
      for (const cell of variant.cells ?? []) quants.add(cell.id);
    }
  }
  return { addresses, variants, quants };
}

/** Every seat literal taught by every tool source, with file + the
 * taught id. The sweep reads the SOURCE strings (what the render
 * concatenates), so a teaching can never dodge by moving between the
 * static description and the rendered grammar. */
function taughtSeatLiterals(): Array<{ file: string; seat: string; id: string }> {
  const out: Array<{ file: string; seat: string; id: string }> = [];
  for (const name of readdirSync(TOOLS_DIR).sort()) {
    if (!name.endsWith(".ts")) continue;
    const text = readFileSync(join(TOOLS_DIR, name), "utf8");
    for (const m of text.matchAll(SEAT_RE)) {
      out.push({ file: name, seat: m[1] as string, id: m[2] as string });
    }
  }
  return out;
}

describe("THE MODEL-SEAT LITERAL WALL (every model id a tool teaches resolves)", () => {
  it("every taught model/variant/quant literal resolves in the booted registry — a teaching the compose door refuses reds here", () => {
    const { addresses, variants, quants } = roster();
    const taught = taughtSeatLiterals();
    // the sweep is LIVE (the burn's own face: two seats taught today
    // — the variant example and the tts exception). A zero-length
    // sweep means the pattern drifted from the render path, not that
    // the estate went clean: this floor reds so the drift is seen.
    assert.ok(
      taught.some((t) => t.seat === "variant"),
      "the sweep still sees the variant seat teachings (a zero catch means the pattern drifted, never that the tools went clean)",
    );
    const offenders = taught.filter((t) => {
      if (t.seat === "model") return !addresses.has(t.id);
      if (t.seat === "variant") return !variants.has(t.id);
      return !quants.has(t.id);
    });
    assert.deepEqual(
      offenders.map((t) => `${t.file}: ${t.seat}: '${t.id}'`),
      [],
      "TOOL TEACHINGS NAME UNRESOLVABLE MODEL SEATS — every literal a tool teaches as a pasteable selector must resolve in the registry (the D3-08 class: melite-load taught 'qwen3-tts-large' for a month after the fold killed it)",
    );
  });

  it("the law FIRES (the stale predicate reds on the burn's own literal, greens on the folded id)", () => {
    const { addresses } = roster();
    // the burn verbatim: 'qwen3-tts-large' resolves nowhere
    assert.ok(!addresses.has("qwen3-tts-large"), "the dead pre-fold id stays dead");
    // the lawful spelling the fix teaches resolves
    assert.ok(addresses.has("qwen3-tts"), "the family's one id resolves");
  });
});
