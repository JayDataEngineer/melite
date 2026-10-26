// THE EDIT DEFAULT IS THE TURBO (burn c, 2026-10-26 — operator:
// "YOU DIDN'T MAKE TURBO DEFAULT FOR THE IMAGE EDIT MODEL"). The
// operator's own bench tile (bench-session-74e975cf, Edit Image)
// states variant turbo + steps 8 BY HAND — because the family's
// DECL rode base first, and the DECL walk's law is FIRST DECLARED =
// THE DEFAULT (laneRelations.ts:1105-1109: "the DECL walk: first
// declared = the default" — variants[0] resolves every unstated
// doc). Every fresh edit card opened BASE: 25 steps, the slow
// lane, and the operator's every edit began with the same manual
// turbo pick. The order was the lie's seat: no wall judged what a
// FRESH card opens.
//
// THE LAW THIS WALL OWNS: the image edit family's default variant
// (first declared Variant row) is the TURBO distill — and the
// default actually RESOLVES the turbo route + the turbo weights,
// never the base's. Judged at three depths: the DECL array (the
// default law's own seat), the resolver (the same resolveVariantRow
// the door rides, on an UNSTATED doc), and the lane file (the
// default's resolver lands the turbo unet).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { getModel } from "@melite/comfyui-cordis";
import { resolveVariantRow } from "@melite/contracts/laneRelations";

/** The family the operator's bench names (the Edit Image tile). */
const FAMILY = "qwen-img-edit-21";

type VariantRow = {
  id?: unknown;
  group?: unknown;
  route?: unknown;
  resolver_defaults?: Record<string, unknown>;
  cells?: Array<Record<string, unknown>>;
};

describe("the image edit family's default variant is the turbo (burn c)", () => {
  it("ARM 1 — THE DECL LAW: the first declared Variant row IS the turbo (first declared = the default)", () => {
    const decl = getModel(FAMILY);
    assert.ok(decl, `the booted registry serves ${FAMILY}`);
    const variants = (decl as { variants?: VariantRow[] }).variants ?? [];
    const variantRows = variants.filter((v) => v.group === "Variant");
    assert.ok(variantRows.length >= 2, "the family declares its variant pair (base + turbo)");
    assert.equal(variantRows[0]?.id, "turbo",
      `the default variant (first declared) is '${String(variantRows[0]?.id)}' — a fresh edit card opens THIS lane; the operator ordered the turbo (bench tile states it by hand)`);
  });

  it("ARM 2 — THE RESOLVER: an UNSTATED variant doc resolves the turbo route through the door's own resolveVariantRow", () => {
    const decl = getModel(FAMILY);
    assert.ok(decl);
    const variants = (decl as { variants?: VariantRow[] }).variants ?? [];
    const r = resolveVariantRow(
      variants as never,
      { variant: null },
      "",
      "offered",
    );
    assert.equal(r.status, "resolved", "the unstated doc resolves (the default law)");
    assert.equal((r.variant as VariantRow).id, "turbo",
      "the resolved default names the turbo lane — the base's 25-step face must never be what a fresh card opens");
    assert.equal((r.variant as VariantRow).route, "qwen-img-edit-21-turbo",
      "the default's route is the turbo route");
  });

  it("ARM 3 — THE LANES: the turbo default carries the turbo weights (its int8_convrot cell's unet is the turbo file)", () => {
    const decl = getModel(FAMILY);
    assert.ok(decl);
    const variants = (decl as { variants?: VariantRow[] }).variants ?? [];
    const turbo = variants.find((v) => v.id === "turbo");
    assert.ok(turbo, "the turbo row declares");
    const int8Cell = (turbo.cells ?? []).find(
      (c) => {
        const lane = c.lane_inputs as Record<string, unknown> | undefined;
        return typeof lane?.unet === "string" && lane.unet.includes("int8");
      },
    );
    assert.ok(int8Cell, "the turbo row carries its int8 lane cell");
    const unet = (int8Cell.lane_inputs as Record<string, string>).unet;
    assert.match(unet, /qwen_image_2\.1_turbo_int8_convrot\.safetensors$/,
      `the default lane's unet is the turbo file (saw '${unet}') — the base weights must never ride the default`);
    assert.equal(turbo.resolver_defaults?.steps, 8,
      "the turbo default's own steps are 8 (the distilled count — the default a fresh card opens runs the fast lane)");
  });
});
