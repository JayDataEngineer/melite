// cards-registration.spec.ts — the card-only packages' registration
// contract (2026-09-11: the genre packages shipping card.ts with NO
// tool.ts and NO test — anny, img-to-mesh, quad-remesh, sfx,
// ideogram4, input-prep, tagger, upscale-tools.
// Nothing pinned their registerCard rows: a renamed id,
// a dropped skeleton, or a gutted identity would boot clean and
// surface only as a missing card in the UI).
// (fit + skin RETIRED stroke 87, operator order — DCC surgery
// moved to the blender MCP skills; mask-studio retired stroke 75.)
//
// The wall mounts each card's apply against a fake comfyui seat
// (effect runs inline, registerCard captures) and pins the row laws
// the discovery arms derive from: one card per apply, id/skeleton/
// boarded/schema present, the identity ring's four strings
// non-empty. A final cross-card pass mounts ALL twelve on one seat
// and asserts eleven unique ids (one card, one plugin — a collision
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
  requiresModel?: boolean;
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
  // fit + skin RETIRED (stroke 87, operator order): DCC surgery —
  // unwrap and bone math — belongs to the blender MCP door
  // (packages/engines/mcp/models/3d/blender/agents/skills/).
  { pkg: "img-to-mesh", genre: "3d", path: "../../../../packages/3d/img-to-mesh/src/card.ts" },
  { pkg: "quad-remesh", genre: "3d", path: "../../../../packages/3d/quad-remesh/src/card.ts" },
  { pkg: "rig", genre: "3d", path: "../../../../packages/3d/rig/src/card.ts" },
  { pkg: "sfx", genre: "audio", path: "../../../../packages/audio/sfx/src/card.ts" },
  // ideogram4 RETIRED (2026-09-17, operator order — the form-seams
  // stroke): card + family both gone.
  { pkg: "input-prep", genre: "image", path: "../../../../packages/image/input-prep/src/card.ts" },
  // mask-studio RETIRED (stroke 75, CONTRACT D at parity): the
  // card face is gone — mask owns the mask surface. The
  // package survives demoted (ui/ = the paint leaf-face carrier).
  { pkg: "tagger", genre: "image", path: "../../../../packages/image/tagger/src/card.ts" },
  { pkg: "upscale-tools", genre: "image", path: "../../../../packages/image/upscale-tools/src/card.ts" },
  // video-gen RETIRED (2026-09-21, operator order — "the ONLY
  // video gen I want is the timeline tool"): card face gone from
  // cardPackages; h3-timeline owns the video door.
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
      // A BOARDED LIST IS NOT AN EMPTY LIST (the walls audit's M7,
      // 2026-10-10): `Array.isArray([])` passed for a gutted
      // identity — a card that boarded nothing booted clean here.
      // The PURE-TOOL cards are the honest exemption: rig composes
      // from a loaded scene and models nothing (requiresModel:
      // false), so its list is empty BY LAW — the law is "a
      // model-carrying card boards at least one family".
      // (the pure-tool cards — rig composes from a loaded scene —
      // declare requiresModel: false in their own card and are
      // exempt BY NAME, so the exemption is an argument in this
      // file, not a hole the row shape opens)
      if (card.pkg !== "rig") {
        assert.ok(row.boarded.length > 0,
          `${card.pkg} boards at least one family (an empty list on a model-carrying card is a gutted identity)`);
      }
      assert.ok(row.schema !== undefined && row.schema !== null, "schema present (the surface)");
      assert.deepEqual(row.identity, mod.identity, "the module identity rides the row");
    });
  }

  it("eight cards on one seat: eight unique ids (video-gen retired 2026-09-21; studio stroke 75, fit+skin stroke 87, ideogram4 form-seams)", async () => {
    const { ctx, seat } = fakeCtx();
    for (const card of CARDS) {
      const mod: CardModule = (await import(card.path)) as CardModule;
      mod.apply(ctx);
    }
    assert.equal(seat.rows.length, 8);
    const ids: string[] = seat.rows.map((r) => r.id);
    assert.equal(new Set(ids).size, 8, `ids unique (got ${JSON.stringify(ids)})`);
  });
});
