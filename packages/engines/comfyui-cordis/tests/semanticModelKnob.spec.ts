// semanticModelKnob — the served style enum's derivation arms
// (hand-built DECL slices drive every arm; the image-gen walls pin
// the real card — the same split params-emit.spec rides).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { semanticModelEntries, resolveSemanticModel } from "../src/semanticModelKnob.ts";
import type { ModelDecl } from "../src/models/families/contract.ts";

type Slice = Pick<ModelDecl, "id" | "label" | "variants">;

const decl = (id: string, label: string, variants: Slice["variants"]): Slice =>
  ({ id, label, variants });

const vrow = (
  id: string,
  label: string,
  vroute: string,
  order: number | undefined,
  cells: Array<{ quant: string; label?: string; route?: string; hide?: boolean }>,
): Slice["variants"][number] =>
  ({
    id, label,
    route: vroute,
    ...(order === undefined ? {} : { order }),
    cells: cells.map((cell) => ({
      quant: cell.quant,
      label: cell.label ?? "",
      route: cell.route ?? "",
      hide_from_dropdown: cell.hide ?? false,
    })),
  }) as Slice["variants"][number];

describe("semanticModelEntries (the derivation)", () => {
  const famA = decl("fam-a", "Family A", [
    vrow("draft", "Draft", "fam-a:draft", 1, [{ quant: "bf16" }]),
    vrow("fast", "Fast", "fam-a:fast", 0, [
      { quant: "fp8", label: "Fast FP8" },
      { quant: "int8", hide: true },
    ]),
  ]);
  const famB = decl("fam-b", "Family B", [
    vrow("only", "", "fam-b:only", undefined, [{ quant: "q" }]),
  ]);

  it("board order, then variant order, then declared cell order — and the default is entries[0]", () => {
    const out = semanticModelEntries([famA, famB]);
    assert.deepEqual(out.map((e) => e.value), [
      "fam-a:fast:fp8", "fam-a:draft:bf16", "fam-b:only:q",
    ]);
    assert.equal(out[0]!.family, "fam-a", "order-0 variant precedes the declared-first one");
  });

  it("label precedence is cell → variant → family; hidden cells never serve", () => {
    const out = semanticModelEntries([famA]);
    assert.deepEqual(out.map((e) => e.label), ["Fast FP8", "Draft"]);
    const [b] = semanticModelEntries([famB]);
    assert.equal(b!.label, "Family B", "an empty variant label falls to the family's");
  });

  it("a cell with no own route rides the variant route; both empty serves nothing", () => {
    const fam = decl("fam-c", "Fam C", [
      vrow("cell-routed", "CR", "c:cell-routed", 0, [
        { quant: "x", route: "c:r:x" },
        { quant: "bare" },
      ]),
      vrow("no-route", "NR", "", 1, [{ quant: "y" }]),
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
