// THE NO-CHEAT WALL (2026-09-20, the operator's order: "you edit the
// shared library to always walk every single parameter no matter
// what — that way you can't cheat"). The door in service.compose
// must REFUSE a card whose declared defaults the walk drops — proven
// by a planted cheat carrying the exact crime that hid
// h3-timeline's shift_video for days: the schemaCarrier declares
// default 8 while the card's own walk function (the normalizer
// wrapper, "the family-literal resolution path") delivers null, and
// a renderer ?? floor silently invents the 8 back. The test's value
// is the REFUSAL, never a pass: a green suite with a silent door is
// the lie this wall exists to make impossible.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal } from "../src/service.ts";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
import { declaredDefaults } from "../src/no-cheat.ts";

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  return ctx.comfyui as ComfyUIService;
};

// the declaration: shift_video carries a real default, 8 — what the
// carrier's dict (and therefore every served face) promises
const cheatCarrier = z.object({
  shift_video: z.number().min(1).max(20).step(0.5).default(8),
});

// the crime: the card's OWN walk function nulls the knob while the
// declaration promises 8 — the wrapper shape every card uses
const nulWalk = (v: unknown): Record<string, unknown> => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { shift_video: null, ...o };
};

const cheatCard = (schema: CardDefinition["schema"], carrier: unknown = cheatCarrier): CardDefinition => ({
  id: "cheater",
  skeleton: "gen",
  boarded: ["fam1"],
  schema,
  schemaCarrier: carrier as never,
  compose: (_p, _m, g) => { g.node("TestNode", { a: 1 }); },
  sidebar: { key: "gen", order: 1 },
  flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
  requiresModel: false,
});

describe("declaredDefaults (the enumeration's own contract)", () => {
  it("a meta.default of null is NOT a declared default (lawful optionality, skipped)", () => {
    // hand-built carrier: the projection serves meta.default verbatim,
    // and a null default promises nothing — the door must skip it
    const carrier = {
      dict: {
        pinned: { type: "number", meta: { default: 8 } },
        nothing: { type: "string", meta: { default: null } },
        bare: { type: "string" },
      },
    } as never;
    const out = declaredDefaults(carrier, []);
    assert.deepEqual(out, { pinned: 8 }, "only the non-null, defined default is declared");
  });
});

describe("the no-cheat door (unwalked-param)", () => {
  it("REFUSES a walk that nulls a declared default — by name, with both values", async () => {
    const svc = await boot();
    svc.registerCard(cheatCard(nulWalk));
    assert.throws(
      () => svc.compose("cheater", null, {}, "r1"),
      (e: unknown) =>
        e instanceof ComposeRefusal
        && e.code === "unwalked-param"
        && /shift_video/.test(e.message)
        && /declared default 8/.test(e.message)
        && /null/.test(e.message),
    );
  });

  it("REFUSES a walk that OMITS a declared default — 'absent', not just null", async () => {
    const svc = await boot();
    // the second face of the same crime: the walk drops the key
    // entirely instead of nulling it
    const dropWalk = (v: unknown): Record<string, unknown> => {
      const o = (v ?? {}) as Record<string, unknown>;
      const { shift_video: _drop, ...rest } = o;
      return rest;
    };
    svc.registerCard(cheatCard(dropWalk));
    assert.throws(
      () => svc.compose("cheater", null, {}, "r1b"),
      (e: unknown) =>
        e instanceof ComposeRefusal
        && e.code === "unwalked-param"
        && /shift_video/.test(e.message)
        && /absent/.test(e.message),
    );
  });

  it("a MULTI-FAMILY card composes lawful — the synthesized 'model' knob is not a declared default", async () => {
    const svc = await boot();
    const lawful = z.object({
      shift_video: z.number().min(1).max(20).default(8),
      // a DECLARED knob literally named 'model' (the naming the
      // {model:} door discourages, but if a card declares it the
      // door holds it to its word like any other knob)
      model: z.string().default("declared"),
    });
    const honestWalk = (v: unknown): Record<string, unknown> =>
      lawful(v ?? {}) as Record<string, unknown>;
    const multi: CardDefinition = {
      ...cheatCard(honestWalk, lawful),
      boarded: ["fam1", "fam2"],
    };
    svc.registerCard(multi);
    const graph = svc.compose("cheater", null, {}, "r4");
    assert.equal(typeof graph, "object");
    // emitParamsSchema synthesizes the family-picker 'model' knob for
    // multi-family boards; the door must not mistake it for a
    // declared default nobody walks
  });

  it("REFUSES an explicit user null on a declared-default knob — no silent repair by the walk", async () => {
    const svc = await boot();
    // the raw schemastery walk resolves explicit null -> default (its
    // own quiet repair); the door must refuse the null BEFORE the
    // walk gets to hide it
    const honestWalk = (v: unknown): Record<string, unknown> =>
      cheatCarrier(v ?? {}) as Record<string, unknown>;
    svc.registerCard(cheatCard(honestWalk));
    assert.throws(
      () => svc.compose("cheater", null, { shift_video: null }, "r2"),
      (e: unknown) =>
        e instanceof ComposeRefusal
        && e.code === "nulled-param"
        && /shift_video/.test(e.message),
    );
  });

  it("a lawful declaration walks its default and composes clean; optionality stays optional", async () => {
    const svc = await boot();
    const lawfulCarrier = z.object({
      shift_video: z.number().min(1).max(20).default(8),
      image: z.string(),           // no default: lawful optionality
      // a DECLARED null default is lawful optionality spelled loud —
      // the door skips it (nothing promised, nothing to drop)
      maybe: z.union([z.number(), z.const(null)]).default(null),
      maybe_str: z.string().default(null as never),
    });
    const lawfulWalk = (v: unknown): Record<string, unknown> =>
      lawfulCarrier(v ?? {}) as Record<string, unknown>;
    svc.registerCard(cheatCard(lawfulWalk, lawfulCarrier));
    const graph = svc.compose("cheater", null, {}, "r3");
    assert.equal(typeof graph, "object");
    // the door never invents values — it only holds declarations to
    // their word: image stays absent and nothing fills it
  });
});
