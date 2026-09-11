// cards-registration.spec.ts — the card-only packages' registration
// contract (2026-09-11: twelve genre packages ship card.ts with NO
// tool.ts and NO test — anny, fit, img-to-mesh, quad-remesh, skin,
// sfx, ideogram4, input-prep, mask-studio, tagger, upscale-tools,
// video-gen. Nothing pinned their registerCard rows: a renamed id,
// a dropped skeleton, or a gutted identity would boot clean and
// surface only as a missing card in the UI).
//
// The wall mounts each card's apply against a fake comfyui seat
// (effect runs inline, registerCard captures) and pins the row laws
// the discovery arms derive from: one card per apply, id/skeleton/
// boarded/schema present, the identity ring's four strings
// non-empty. A final cross-card pass mounts ALL twelve on one seat
// and asserts twelve unique ids (one card, one plugin — a collision
// is the duplicate-card refusal in production).
//
// Run: npx vitest run tests/walls/ts/suites/cards-registration.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";

interface CardRow {
  id: string;
  skeleton: string;
  boarded: readonly string[];
  schema: unknown;
  identity: { label: string; description: string; genre: string; icon: string };
  [key: string]: unknown;
}

interface FakeSeat {
  rows: CardRow[];
  registerCard(def: CardRow): () => void;
}

function fakeCtx(): { ctx: { effect(fn: () => unknown): unknown; comfyui: FakeSeat }; seat: FakeSeat } {
  const seat: FakeSeat = {
    rows: [],
    registerCard(def: CardRow): () => void {
      seat.rows.push(def);
      return (): void => {
        seat.rows.splice(seat.rows.indexOf(def), 1);
      };
    },
  };
  return {
    ctx: {
      effect(fn: () => unknown): unknown {
        return fn();
      },
      comfyui: seat,
    },
    seat,
  };
}

interface CardModule {
  inject: readonly string[];
  identity: { label: string; description: string; genre: string; icon: string };
  apply(ctx: unknown): void;
}

const CARDS: Array<{ pkg: string; genre: string; path: string }> = [
  { pkg: "anny", genre: "3d", path: "../../../../packages/3d/anny/src/card.ts" },
  { pkg: "fit", genre: "3d", path: "../../../../packages/3d/fit/src/card.ts" },
  { pkg: "img-to-mesh", genre: "3d", path: "../../../../packages/3d/img-to-mesh/src/card.ts" },
  { pkg: "quad-remesh", genre: "3d", path: "../../../../packages/3d/quad-remesh/src/card.ts" },
  { pkg: "skin", genre: "3d", path: "../../../../packages/3d/skin/src/card.ts" },
  { pkg: "sfx", genre: "audio", path: "../../../../packages/audio/sfx/src/card.ts" },
  { pkg: "ideogram4", genre: "image", path: "../../../../packages/image/ideogram4/src/card.ts" },
  { pkg: "input-prep", genre: "image", path: "../../../../packages/image/input-prep/src/card.ts" },
  { pkg: "mask-studio", genre: "image", path: "../../../../packages/image/mask-studio/src/card.ts" },
  { pkg: "tagger", genre: "image", path: "../../../../packages/image/tagger/src/card.ts" },
  { pkg: "upscale-tools", genre: "image", path: "../../../../packages/image/upscale-tools/src/card.ts" },
  { pkg: "video-gen", genre: "video", path: "../../../../packages/video/video-gen/src/card.ts" },
];

describe("card-only packages register exactly one honest row", () => {
  for (const card of CARDS) {
    it(`${card.pkg}: apply registers one row with the row laws`, async () => {
      const mod: CardModule = (await import(card.path)) as CardModule;
      // The seat demand: every card injects the comfyui seat.
      assert.ok(
        Array.isArray(mod.inject) && mod.inject.includes("comfyui"),
        `${card.pkg} must inject comfyui (got ${JSON.stringify(mod.inject)})`,
      );
      // The identity ring ships on the module AND rides the row.
      for (const key of ["label", "description", "genre", "icon"] as const) {
        const text: unknown = mod.identity[key];
        assert.equal(typeof text, "string", `${card.pkg} identity.${key} is a string`);
        assert.ok((text as string).length > 0, `${card.pkg} identity.${key} is non-empty`);
      }
      assert.equal(mod.identity.genre, card.genre, `${card.pkg} genre is ${card.genre}`);
      const { ctx, seat } = fakeCtx();
      mod.apply(ctx);
      assert.equal(seat.rows.length, 1, `${card.pkg} registers exactly one card`);
      const row: CardRow = seat.rows[0] as CardRow;
      assert.equal(typeof row.id, "string");
      assert.ok(row.id.length > 0, "id non-empty");
      assert.equal(typeof row.skeleton, "string");
      assert.ok(row.skeleton.length > 0, "skeleton non-empty (the compose emits it, never a fallback)");
      assert.ok(Array.isArray(row.boarded), "boarded is an array");
      assert.ok(row.schema !== undefined && row.schema !== null, "schema present (the surface)");
      assert.deepEqual(row.identity, mod.identity, "the module identity rides the row");
    });
  }

  it("twelve cards on one seat: twelve unique ids (one card, one plugin)", async () => {
    const { ctx, seat } = fakeCtx();
    for (const card of CARDS) {
      const mod: CardModule = (await import(card.path)) as CardModule;
      mod.apply(ctx);
    }
    assert.equal(seat.rows.length, 12);
    const ids: string[] = seat.rows.map((r) => r.id);
    assert.equal(new Set(ids).size, 12, `ids unique (got ${JSON.stringify(ids)})`);
  });
});
