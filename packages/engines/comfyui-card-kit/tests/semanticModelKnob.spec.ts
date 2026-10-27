// semanticModelKnob — the served style enum's derivation arms
// (hand-built DECL slices drive every arm; the image-gen walls pin
// the real card — the same split params-emit.spec rides).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { semanticModelEntries, resolveSemanticModel } from "../src/semanticModelKnob.ts";
import type { SemanticModelDecl } from "../src/semanticModelKnob.ts";

type Slice = SemanticModelDecl;

const decl = (id: string, label: string, variants: Slice["variants"]): Slice =>
  ({ id, label, variants });

const vrow = (
  id: string,
  label: string,
  vroute: string,
  cells: Array<{ quant: string; label?: string; route?: string; hide?: boolean }>,
): Slice["variants"][number] =>
  ({
    id, label,
    route: vroute,
    cells: cells.map((cell) => ({
      quant: cell.quant,
      label: cell.label ?? "",
      route: cell.route ?? "",
      hide_from_dropdown: cell.hide ?? false,
    })),
  }) as Slice["variants"][number];

describe("semanticModelEntries (the derivation)", () => {
  // THE DECLARED-ORDER LAW (audit 013 cure 4): the qwen-img-edit-21
  // flip declared turbo FIRST with a stale `order: 1` beside base's
  // `order: 0` — the old derivation sorted by the numeric hint and
  // served base at the enum's head while every unstated compose
  // resolved turbo. These slices keep the hostile shape: declared
  // order disagrees with any numeric hint a DECL may still carry,
  // and the derivation must follow the DECLARATION.
  const famA = decl("fam-a", "Family A", [
    vrow("draft", "Draft", "fam-a:draft", [{ quant: "bf16" }]),
    vrow("fast", "Fast", "fam-a:fast", [
      { quant: "fp8", label: "Fast FP8" },
      { quant: "int8", hide: true },
    ]),
  ]);
  const famB = decl("fam-b", "Family B", [
    vrow("only", "", "fam-b:only", [{ quant: "q" }]),
  ]);

  it("board order, then DECLARED variant order, then declared cell order — and the default is entries[0]", () => {
    const out = semanticModelEntries([famA, famB]);
    assert.deepEqual(out.map((e) => e.value), [
      "fam-a:draft:bf16", "fam-a:fast:fp8", "fam-b:only:q",
    ]);
    assert.equal(out[0]!.family, "fam-a", "the declared-first variant heads the enum");
  });

  it("THE RE-SEAT LAW: a stale numeric hint beside the rows never re-seats the default pick (the order schism, firing)", () => {
    // the exact shape the audit burned: turbo declared first, the
    // numeric hints REVERSED (0 on the later row). Structural
    // slices tolerate extra keys, so the hints ride verbatim — and
    // the derivation must ignore them.
    const flipped = decl("qwen-img-edit-21", "Edit", [
      vrow("turbo", "Turbo", "q:turbo", [{ quant: "int8_convrot" }]),
      vrow("base", "Base", "q:base", [{ quant: "int8_convrot" }]),
    ]) as Slice & { variants: Array<Record<string, unknown>> };
    flipped.variants[1]!["order"] = 0;
    flipped.variants[0]!["order"] = 1;
    const out = semanticModelEntries([flipped]);
    assert.equal(out[0]!.value, "qwen-img-edit-21:turbo:int8_convrot",
      "entries[0] is variants[0]'s first visible cell — the same first-declared law the resolver pins; a numeric hint never re-seats the default pick");
  });

  it("label precedence is cell → variant → family; hidden cells never serve", () => {
    const out = semanticModelEntries([famA]);
    assert.deepEqual(out.map((e) => e.label), ["Draft", "Fast FP8"]);
    const [b] = semanticModelEntries([famB]);
    assert.equal(b!.label, "Family B", "an empty variant label falls to the family's");
  });

  it("a cell with no own route rides the variant route; both empty serves nothing", () => {
    const fam = decl("fam-c", "Fam C", [
      vrow("cell-routed", "CR", "c:cell-routed", [
        { quant: "x", route: "c:r:x" },
        { quant: "bare" },
      ]),
      vrow("no-route", "NR", "", [{ quant: "y" }]),
    ]);
    const out = semanticModelEntries([fam]);
    assert.deepEqual(out.map((e) => e.route), ["c:r:x", "c:cell-routed"]);
  });

  it("resolveSemanticModel hits served values by exact address and refuses everything else", () => {
    const out = semanticModelEntries([famA]);
    assert.equal(resolveSemanticModel(out, "fam-a:draft:bf16")?.route, "fam-a:draft");
    assert.equal(resolveSemanticModel(out, "fam-a"), null, "a bare family id is not a served style");
    assert.equal(resolveSemanticModel(out, "fam-a:fast:int8"), null, "hidden cells resolve nowhere");
  });
});
