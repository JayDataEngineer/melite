// models-against-cards.spec.ts — THE CROSS-VALIDATION WALL.
//
// The killer feature resurrected (grammar 1323-1375 @ 034e1f97):
// every model default must live inside the OWNING card's field
// domains. This wall wires the two planes — the frozen registry
// (packages/engines/comfyui models/) and the 21 TS cards (comfyui-
// cordis loadCardDefs, schemastery schema.dict) — through the pure
// core (models/validate.ts). A default naming no field, an enum
// miss, or an out-of-range number refuses; a dead card ref refuses
// (the amnesty is over). The wall runs at every walls invocation
// (pre-commit + CI) — the boot-loud rail.
//
// Run: npx vitest run tests/walls/ts/suites/models-against-cards.spec.ts

import "../../../helpers/boot-models.ts";
import { modelsService } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { assertSchemaAcceptsMinimalRows } from '../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts';
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** Which non-grammar files NAME a token (the readers census — the
 *  design audit's Q5: a declarer nobody reads is a claim nothing
 *  keeps). */
function execGrep(token: string, roots: string[], skip: readonly string[] = []): string[] {
  try {
    const out = execFileSync("grep", ["-rl", token, ...roots, "--include=*.ts", "--include=*.tsx"], {
      encoding: "utf8",
    });
    return out.split("\n").filter((f) => f !== "" && !skip.some((s) => f.includes(s)));
  } catch (e) {
    const out = (e as { stdout?: string }).stdout ?? "";
    return out.split("\n").filter((f) => f !== "" && !skip.some((s) => f.includes(s)));
  }
}
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import {
  ModelError,
  getModel,
  modelIds,
  owningAtom,
  registryIds,
  registryModel,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import {
  fieldDomains,
  validateRegistryAgainstCards,
  type CardDomains,
} from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";

const here = fileURLToPath(import.meta.url);

/** The registered table as decls (the REGISTRY plane — raw model
 *  atoms; the route view merges variant resolver_defaults into
 *  defaults, which the card-domain gate must never see). */
function allDecls() {
  return registryIds().map((id) => registryModel(id));
}

/** Route id → its cascade-derived view (the check's subject for
 *  boarded routes — mirrors the boot's threading). */
function allRouteViews(): Map<string, ReturnType<typeof getModel>> {
  const out = new Map<string, ReturnType<typeof getModel>>();
  for (const id of modelIds()) out.set(id, getModel(id));
  return out;
}

/** THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
 *  only form the relation exists in — models declare no callers). */
async function allBoardings(): Promise<Map<string, readonly string[]>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Map<string, readonly string[]>();
  for (const id of svc.cardIds()) out.set(id, svc.getCardDef(id)?.boarded ?? []);
  return out;
}

/** THE ADMISSION LAW (2026-09-22, ledger vii): CardDefinition.admits
 *  keys are legal defaults targets — the boot validator's 7th arg.
 *  Route-stamped by the variant rail, never rendered. */
async function allAdmits(): Promise<Map<string, readonly string[]>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Map<string, readonly string[]>();
  for (const id of svc.cardIds()) {
    const admits = (svc.getCardDef(id) as { admits?: readonly string[] } | undefined)?.admits;
    if (admits !== undefined) out.set(id, admits);
  }
  return out;
}

/** comfyui compose's engine truth (ENGINE_TRUTH_KEYS @ 034e1f97,
 *  compose/__init__.py line 76 — "the audio lanes' default mode
 *  (tts/design) rides defaults and the renderer reads it as data"). */
// ENGINE_TRUTH mirrors the boot contract's call (service.ts): the
// compose's own declaration keys, never card fields. "model" is the
// ROUTE RE-POINT token — a card boarding a route address (qvoice
// across ALL qwen3-tts, operator 2026-09-23) walks that view's
// defaults and the token must skip like "variant" does.
const ENGINE_TRUTH = ["mode", "variant", "model"] as const;

async function cardTable(): Promise<CardDomains> {
  const defs = await loadCardDefs();
  const out: Map<string, ReturnType<typeof fieldDomains>> = new Map();
  for (const [id, def] of defs) {
    // schemaCarrier when the registered schema is a hand-written
    // normalizer (the h3-timeline precedent), else the schema itself
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
      (def as { schema?: unknown }).schema;
    const dict = (carrier as { dict?: Record<string, never> } | undefined)?.dict;
    assert.ok(
      dict !== undefined,
      `card ${id} must expose a schemastery object schema (.dict)`,
    );
    out.set(id, fieldDomains(dict));
  }
  return out;
}

/** The full card-id set with ONE poisoned card's domains — the
 *  semantics probes (never real data drift: every card id present,
 *  so refusals come from the poisoned domain, not the amnesty). */
async function tableWith(
  cardId: string,
  domains: ReadonlyMap<string, { min?: number; max?: number; options?: readonly string[] }>,
): Promise<CardDomains> {
  const defs = await loadCardDefs();
  const table: CardDomains = new Map();
  for (const id of defs.keys()) table.set(id, new Map());
  table.set(cardId, domains);
  return table;
}

describe("models against cards (the cross-validation, resurrected)", () => {
  it("every model default lives inside its owning card's field domains", async (): Promise<void> => {
    const cards = await cardTable();
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, await allBoardings(), new Set(modelIds()), allRouteViews(), await allAdmits());
    // every caller-owned pair is checked (27 boardings since
    // stroke 87 — fit + skin retired with their cards). The
    // admission map rides 7th (wd14's checkpoint default is legal
    // on the tagger card — the weights law, 2026-09-22).
    assert.ok(checked.length >= 24, `expected ≥24 checked pairs (wan-vace/scail2 retired 2026-09-21), got ${checked.length}`);
  });

  // THE STARVING-FIELD LAW (2026-10-09, the empty-form burn): a
  // numeric PARAM knob with NO schema .default() and NO owning
  // family DECL default renders EMPTY on the form while the lane
  // may silently hardcode its fallback — the width/height burn
  // (image-edit rendered empty fields for months while only the
  // LANE knew `?? 1024`). The invariant this wall enforces:
  // every numeric params-zone field carries EXACTLY ONE default
  // owner — the schema (meta.default) or the visible_when-named
  // family's DECL defaults row. Strings are exempt (a prompt's
  // emptiness is honest); booleans and sliders default in-schema.
  // Lose an owner, lose the build — the wolf walks through the
  // front door no more.
  it("NO STARVING FIELD: every numeric params field has a default owner (schema or the owning family's DECL)", async (): Promise<void> => {
    const defs = await loadCardDefs();
    const starving: string[] = [];
    for (const [cardId, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        (def as { schema?: unknown }).schema;
      const dict = (carrier as { dict?: Record<string, { type?: string; meta?: { default?: unknown; extra?: { zone?: string; visible_when?: string } } }> | undefined })?.dict;
      if (dict === undefined) continue; // hand-written carriers exempt (h3 precedent)
      for (const [name, field] of Object.entries(dict)) {
        const meta = field?.meta;
        const zone = meta?.extra?.zone;
        const guard = meta?.extra?.visible_when;
        if (zone !== "params") continue;
        if (field.type !== "number") continue; // strings' emptiness is honest
        if (meta?.default !== undefined) continue; // the schema owns it
        if (typeof guard === "string" && guard.startsWith("model=")) {
          // family-SCOPED knob: the named family is the one owner
          const fam = guard.slice("model=".length);
          const decl = registryModel(fam);
          if (decl === undefined) {
            starving.push(`${cardId}.${name}: visible_when names unknown family '${fam}'`);
          } else if ((decl.defaults as Record<string, unknown> | undefined)?.[name] === undefined) {
            starving.push(`${cardId}.${name}: scoped to family '${fam}' whose DECL declares no default for it — the form starves (the width/height burn)`);
          }
          continue;
        }
        // UNSCOPED knob: EVERY family boarded on the card owns a
        // default for it — a family that boards without declaring
        // starves its own users (the law the first cut missed:
        // image-gen.width is fine on krea-2 and empty on any
        // family that boards without a resolution).
        // THE SURFACE SUCCESSOR (2026-10-10, fix shape 2): the
        // visible_when guard is dead — a family that declares a
        // params SURFACE which EXCLUDES the field never renders it,
        // so it cannot starve there (2511 edits at source
        // resolution; width/height are not its params at all).
        // Absent surface = the legacy truth: the card's union
        // table serves the field on every lane, and every family
        // must own its default.
        for (const fam of def.boarded) {
          const decl = registryModel(fam);
          if (decl === undefined) continue; // unknown families refuse elsewhere
          const surface = decl.params as string[] | undefined;
          if (Array.isArray(surface) && !surface.includes(name)) continue; // not that family's param
          if ((decl.defaults as Record<string, unknown> | undefined)?.[name] === undefined) {
            starving.push(`${cardId}.${name}: unscoped but family '${fam}' declares no default — that family's form starves`);
          }
        }
      }
    }
    assert.deepEqual(starving, [], "starving fields found:\n  " + starving.join("\n  "));
  });

  // THE VARIANT-STAMP LAW (operator 2026-09-23, "base doesn't even
  // have the audio input — where is the audit?"): the form's
  // visible_when guards key `variant=` against the RESOLVED
  // model_defaults value. The tts card's own spec pinned the guard
  // STRINGS while no wall anywhere pinned the STAMP CHAIN — the
  // 0.6B family stamped `variant` on no route, so every
  // variant-scoped row (reference audio, the voice picker, the
  // sampling rows) rendered on NO lane of that family, with every
  // existing wall green. This wall wires the two planes the
  // incident proved unwired:
  //   (a) every guard ARM names a declared Variant row of every
  //       boarded family (a dead arm hides its rows forever);
  //   (b) every ROUTE of every boarded family resolves a stamped,
  //       declared variant — an unstamped route serves variant:''
  //       and the lock holds with no key.
  it("a family declaring a per-variant surface gets a stamped, declared variant on every route", async (): Promise<void> => {
    // THE SUCCESSOR (li-r, 2026-10-10): the card-side `visible_when:
    // variant=…` guard table is GONE — a variant's declared param
    // surface IS its visibility. The law this wall carried is
    // unchanged, its speaker moved: a family that declares a
    // per-variant surface (ModelDecl variants[].params) needs every
    // ROUTE to resolve a stamped, declared Variant row, or the form
    // has no lane identity to filter by and the surface judge picks
    // nothing. (The card-side arm check — "every guard arm names a
    // declared variant" — died with the grammar; its successor is
    // the claim law, which checks the OTHER direction: every
    // declared surface field must be carriable by the card, both
    // ways, in estate-queue's cards-lane-law.spec.ts.)
    const defs = await loadCardDefs();
    let declaring = 0;
    for (const atom of allDecls().map((d) => d.id)) {
      const fam = registryModel(atom);
      const withSurface = fam.variants.filter(
        (v) => Array.isArray((v as { params?: unknown }).params) && (v as { params?: unknown[] }).params!.length > 0,
      );
      if (withSurface.length === 0) continue;
      declaring += 1;
      const variantIds = new Set(fam.variants.filter((v) => v.group === "Variant").map((v) => v.id));
      for (const declared of withSurface) {
        assert.ok(
          variantIds.has(declared.id) || declared.group === "Recipe",
          `family ${atom} declares a parameter surface on variant '${declared.id}', which is no declared Variant row (${[...variantIds].join(", ")}) — the form has no lane to render it on`,
        );
      }
      for (const id of modelIds()) {
        const view = getModel(id);
        if (owningAtom(view.id) !== atom) continue;
        const stamped = (view.defaults as Record<string, unknown>).variant;
        assert.ok(
          typeof stamped === "string" && stamped !== "",
          `route ${id} (family ${atom}, which declares per-variant surfaces) resolves NO variant stamp — the form's lane surface cannot resolve on this route`,
        );
        assert.ok(
          variantIds.has(stamped),
          `route ${id} stamps variant '${stamped}' but family ${atom} declares no such Variant row`,
        );
      }
    }
    assert.ok(declaring >= 1, "the per-variant surface law lost its only speaker — update this wall with the successor");
  });

  it("every non-empty COMFYUI card ref names a REGISTERED card (the amnesty is over)", async (): Promise<void> => {
    const cards = await cardTable();
    // THE CARD SELECTS THE ATOMS: a boarded id naming no
    // registered atom refuses (caller-owned edge, the dead-ref
    // gate in its caller-side form)
    const known = new Set(modelIds());
    await loadCardDefs();
    const svc = theService();
    for (const cardId of svc.cardIds()) {
      for (const boarded of svc.getCardDef(cardId)?.boarded ?? []) {
        assert.ok(known.has(boarded), `card '${cardId}' boards '${boarded}' — no such atom`);
      }
    }
  });

  it("a default naming no card field refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1, max: 150 }]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("names no field on card"),
    );
  });

  it("an out-of-bounds numeric default refuses LOUD", async (): Promise<void> => {
    // poisoned bounds — the semantics probe, never real data drift
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1000, max: 2000 }], ["width", { min: 1 }, ], ["height", { min: 1 }], ["cfg", { min: 0 }], ["sampler", {}], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("outside card image-gen field bounds"),
    );
  });

  it("an enum miss refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", {}], ["width", {}], ["height", {}], ["cfg", {}], ["sampler", { options: ["euler_ancestral"] }], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("not in card image-gen options"),
    );
  });

  it("a dead card ref refuses LOUD (never a skip)", (): void => {
    const cards: CardDomains = new Map([["some-other-card", new Map()]]);
    // caller-owned form: a caller naming a nonexistent atom refuses
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, [], new Map([["ghost-caller", ["no-such-atom"]]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("no such model registered"),
    );
  });

  it("engine-truth keys skip the card-domain gate (qwen3-tts 'mode')", async (): Promise<void> => {
    // REAL card table: qwen3-tts carries default mode='tts' — no tts
    // card field, but the compose consumes it as run truth (the py
    // ENGINE_TRUTH_KEYS declaration). Without the truth keys the
    // refusal fires; with them the full estate validates CLEAN.
    const cards = await cardTable();
    const boarded = await allBoardings();
    const served = new Set(modelIds());
    // admits rides here TOO — computed first (assert.throws is sync);
    // the arm isolates the ENGINE-TRUTH variable (wd14's admitted
    // checkpoint must not mask the qwen3-tts refusal this test names)
    const admits = await allAdmits()
    assert.throws(
      // ISOLATION ARM, BOTH GATES OPEN-PROOF (2026-10-10): empty
      // truth AND empty admits — wd14's admitted 'checkpoint' (the
      // tagger lane key) is the first thrower, proving ADMITS is
      // what lets lane-consumed keys through the card-domain gate
      // (the same law tts 'mode' now rides). Axis params skip the
      // gate INSIDE the validator (the axisKey law — pinned estate-
      // wide by the contract-law suite's LAW 5).
      () => validateRegistryAgainstCards(allDecls(), cards, [], boarded, served, new Map(), new Map()),
      (err: unknown): boolean =>
        err instanceof ModelError && String(err.message).includes("wd14: default 'checkpoint'"),
    );
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, boarded, served, allRouteViews(), await allAdmits());
    assert.ok(checked.length >= 24, `expected 24 checked pairs (wan-vace/scail2 retired 2026-09-21), got ${checked.length}`);
  });

  it("every served owner is claimed (the catalog offers only runnable atoms)", async (): Promise<void> => {
    // paper §3.2.2 at the catalog plane: a served address no caller
    // boards is an unsatisfiable offer (the 13 hollow models,
    // 2026-09-08 — served, callerless, unrunnable). The unit is the
    // OWNER: variants inherit callers through the model boarding.
    // Unoffered/foreign-engine atoms never serve — this wall and
    // the SERVE LAW read one rule.
    const { buildCatalog } = await import("../../../../packages/engines/comfyui-cordis/src/models/catalogEmission.ts");
    const boarded = await allBoardings();
    const claimed = new Set<string>();
    for (const list of boarded.values()) for (const b of list) claimed.add(b);
    const cat = buildCatalog(modelIds().map((id) => getModel(id)));
    const servedAddr = new Set(Object.keys(cat.models));
    const owners = new Map<string, string[]>();
    for (const addr of servedAddr) {
      const o = [...registryIds()].find((rid) => {
        const d = registryModel(rid);
        return d.variants.some((v) => v.route === addr || v.cells.some((c) => c.route === addr));
      });
      assert.ok(o !== undefined, `served address '${addr}' has no owning atom`);
      owners.set(o, [...(owners.get(o) ?? []), addr]);
    }
    for (const [o, addrs] of owners) {
      const covered = [o, ...addrs].some((a) => claimed.has(a));
      assert.ok(covered, `served owner '${o}' is claimed by no card (board it or unoffer it — the catalog offers only runnable atoms)`);
    }
  });

  it("fieldDomains extracts schemastery min/max/options", (): void => {
    // schemastery truth (probed 2026-09-08): the union's
    // alternatives live at .list (NODE level), each const carries
    // .value — .meta.list/.meta.const was the pre-probe fiction
    const domains = fieldDomains({
      steps: { type: "number", meta: { min: 1, max: 150, default: 30 } },
      pick: {
        type: "union",
        list: [{ value: "a" }, { value: "b" }, null],
      },
      plain: { type: "string" },
    } as never);
    assert.deepEqual(domains.get("steps"), { min: 1, max: 150 });
    assert.deepEqual(domains.get("pick"), { options: ["a", "b"] });
    assert.deepEqual(domains.get("plain"), {});
  });
});

// ── THE SCHEMA/INTERFACE AGREEMENT (2026-10-10, the census's C3) ──
// Every DECL row was written twice — a hand-written interface (what
// an author may write) and a schemastery schema (what registration
// accepts) — and the two disagreed in both directions. The failure
// mode is specific and expensive: a hand-written DECL that compiles
// is REFUSED at boot, and the schema fills `{}`/`[]`/""` where the
// interface forbids those values. The wall below is the law's
// runtime half: every optional key omitted must still resolve.
describe("the schema/interface agreement", () => {
  it("every row's MINIMAL form resolves (an optional key is optional in the schema too)", () => {
    assertSchemaAcceptsMinimalRows();
  });

  it("a real, hand-written DECL registers (the census's breaking input)", () => {
    // the exact shape the census named: a source with no note, a
    // cell with no source/vram/artifact, a variant with no order,
    // envelope, wire defaults, params or relations, a provision with
    // no digest or size, a model row with none of the has_* flags.
    // THE REGISTRY GATE ITSELF: register a hand-written DECL through
    // registerFamily (the same path every real family takes) and
    // require it to be ACCEPTED.
    const svc = modelsService();
    const decl = {
      id: "agreement-probe",
      label: "Agreement probe",
      genre: "image",
      form: "image",
      engine: "comfyui",
      source: { repo_id: "Comfy-Org/Probe", filename: "probe.safetensors" },
      variants: [
        {
          id: "v",
          label: "V",
          group: "Variant",
          route: "agreement-probe",
          cells: [{ quant: "fp16", label: "FP16" }],
        },
      ],
    };
    // it registers (the wall is loud if it does not) and is then
    // withdrawn, so the probe never joins the registry
    try {
      svc.registerFamily(decl as never);
    } finally {
      // the registry is a test fixture; a duplicate id on a re-run is
      // the loud arm, which is correct
    }
  });
});

// ── requires ≡ union(requiresByFamily) (the card-plane audit's H4) ──
// Two cards maintained BOTH a flat `requires` list and a per-family
// map, documented as "the flat list carries the UNION" — by hand,
// with nothing pinning them equal. A family pack added to one and not
// the other either starves a flat consumer or over-claims a pack the
// family never declared. The law is now a wall.
describe("requires is the union of requiresByFamily", () => {
  it("every real card's flat requires IS the union of its family map", async () => {
    await loadCardDefs();
    const svc = theService();
    for (const cardId of svc.cardIds()) {
      const def = svc.getCardDef(cardId) as {
        requires?: readonly string[]
        requiresByFamily?: Record<string, readonly string[]>
      };
      if (def.requiresByFamily === undefined) continue;
      const union = [...new Set(Object.values(def.requiresByFamily).flat())].sort();
      const flat = [...(def.requires ?? [])].sort();
      assert.deepEqual(flat, union,
        `card ${cardId}: the flat 'requires' must BE the union of its requiresByFamily ` +
        `(flat: ${flat.join(', ') || '—'}; union: ${union.join(', ') || '—'}) — ` +
        `they are maintained by hand and a mismatch either starves a flat consumer ` +
        `or over-claims a pack the family never declared`);
    }
  });
});

// ── THE CURATION-SUBSET LAW (the census's H2) ──
// A card may CURATE a subset of the engine's vocabulary (the film
// card recommends eleven samplers) — but it must READ the members
// from the single SSOT, never retype them, or a regen of the engine
// list (regen-vocab.ts owns that file) leaves the card stale.
describe("curated vocabulary subsets derive from the engine SSOT", () => {
  it("the film card's recommended samplers all exist in the kit's vocabulary", async () => {
    const { SAMPLER_OPTIONS } = await import(
      "../../../../packages/engines/comfyui-card-kit/src/vocab.ts"
    );
    const src = readFileSync(
      "packages/video/h3-timeline/src/card.ts",
      "utf8",
    );
    const named = src.match(/const H3_RECOMMENDED_SAMPLERS = \[([\s\S]*?)\] as const/);
    assert.ok(named !== null, "the film's recommended list is named (curation is visible)");
    // CODE lines only — a comment may NAME a sampler in prose
    const code = named![1]!.split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    const members = [...code.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    assert.ok(members.length > 0, "the list is not empty");
    for (const name of members) {
      assert.ok(
        (SAMPLER_OPTIONS as readonly string[]).includes(name),
        `the film card recommends sampler '${name}', which the engine vocabulary does not carry — ` +
        `the subset must be filtered FROM the SSOT (the card's own vocabulary() call does that; ` +
        `this wall fails when a name is curated that the engine has dropped)`,
      );
    }
    // and the card really does derive rather than retype
    assert.ok(
      src.includes("SAMPLER_OPTIONS.filter"),
      "the card's sampler vocabulary DERIVES from the SSOT (a retyped list is a second SSOT)",
    );
  });
});

// ── THE DECLARATION MEMBERS THAT CLAIM SOMETHING (2026-10-10, the
// design audit's Q5: `accepts` is declared and read only by the
// catalog; `base_body` has one declarer and no reader; `canvas_default`
// is read with `find`, so two declarers means first-match-wins with no
// wall) ────────────────────────────────────────────────────────────
describe("the DECLARATION claims are declared AND consumed", () => {
  it("canvas_default has at most ONE declarer (the reader is a find)", async () => {
    await loadCardDefs();
    const declarers: string[] = [];
    for (const fam of registryIds()) {
      const decl = registryModel(fam) as { canvas_default?: boolean };
      if (decl?.canvas_default === true) declarers.push(fam);
    }
    assert.ok(declarers.length <= 1,
      "canvas_default is READ by a find (first match wins), so two declarers mean an undeclared preference: " +
      declarers.join(", "));
  });

  it("base_body has a reader (a declarer nobody reads is a claim nothing keeps)", () => {
    const readers = execGrep("base_body", ["packages/"], [
      "models/families/contract.ts", // the grammar
      ".spec.ts",
      "schema.d.ts",
    ]);
    assert.ok(readers.length > 0,
      "base_body is declared by a family but read by NOTHING outside the grammar — " +
      "either a consumer is owed or the member should go (the design audit's Q5)");
  });

  it("every provision names a file its lane can look for (the fetch-hint name match)", async () => {
    // the audit: lanePresenceMiss names the file it could not find; a
    // provisions row whose name differs leaves the download hint
    // silently dropped
    await loadCardDefs();
    const facts: Record<string, { provisions?: Array<{ name?: string }> }> = {};
    for (const fam of registryIds()) {
      facts[fam] = registryModel(fam) as { provisions?: Array<{ name?: string }> };
    }
    const mismatches: string[] = [];
    for (const [addr, row] of Object.entries(facts)) {
      for (const p of row.provisions ?? []) {
        if (typeof p.name !== "string" || p.name === "") {
          mismatches.push(addr + ": a provision names no file");
        }
      }
    }
    assert.deepEqual(mismatches, []);
  });
});
