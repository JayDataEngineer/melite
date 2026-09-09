// discoveryLive.ts — the discovery door's LIVE derivation plane.
//
// THE FROZEN BLOB IS DEAD (2026-09-10, operator order): the retired
// python system's served answers were captured into
// packages/gateway/shell/data/discovery-catalog.json and served
// byte-identical past the TS flip. Byte parity with legacy python
// is NOT a goal — every arm below derives from live sources (model
// DECLs, card definitions, the flows registry, hand-owned
// vocabularies). Normal JSON serialization throughout.
//
// Per-arm sources:
//   catalog models/families — buildCatalog (the registry emission,
//     golden-anchored; untouched here).
//   catalog cards/capabilities — the card definitions (identity +
//     boarding; the frozen ring is retired from this path).
//   catalog input_vocabulary — SLOT_VOCABULARY (the models-golden
//     wall's slot SSOT, never the blob).
//   forms — card sidebar/surface/boarding rows.
//   kinds — CARD_KINDS (hand-owned, wall-pinned; served in its own
//     alphabetical order, not the lost py TABLE order).
//   form-spec — (card, key-family) resolution over served models +
//     ComfyUIService.formSpec + DECL defaults/variants.
//   loras — the loras pack rows via modCatalog + the served offer.
//   family_schemas — card knob projection (emitKnob) scoped to the
//     key family, plus absorbed mod fields.
//   schema — flow slot kinds + card flow rows + expanded registry
//     flows + hand-owned API-shape docs.
//   provisions — DECL provision rows + card-owned tool weights.
//
// DIVERGENCES FROM THE FROZEN EXPORT (all live-truth, documented
// once here instead of per arm):
//   - retired engines/cards/keys 404 (ace-step/moss-tts/anycreature
//     families, forge/auto-rig/music-native cards, ltx/flow-id keys).
//   - clothing-placement serves (a live card the export predates).
//   - tts boards qwen3-tts-base again (three frozen witnesses; the
//     TS port dropped it).
//   - route keys scope to their own family: base drops the absorbed
//     qvoice fields, raw drops the absorbed loras field/options (the
//     packs board the owner only — models-plane declaration truth).
//   - the image-gen recipe knob rides every image-gen key (an
//     unscoped card knob the export predates for raw).
//   - numbers stay numbers (the export stringified some defaults;
//     'None'/'[]'/'0.35' strings become null/[]/0.35).
//   - enhance_prompts is the kernel fallback {prompt: null,
//     lyrics: ""} for every key (make-model forbids a DECL enhance
//     field; the per-family recipes died with the authoring plane).
//   - variant rows carry all ten keys uniformly (the export mixed
//     7/8/10-key shapes); base/voicedesign variant rows appear on
//     owner specs (their DECLs declare them).
//   - family schemas carry the recipe knob where the card declares
//     it, and group tooltips where the DECL authors them.
//   - forms/schema-cards/capabilities order is deterministic live
//     order (sidebar order / alphabetical), not py registration
//     order (lost with the authoring plane).
//   - the kinds arm drops the py-only runner/icon keys and serves
//     CARD_KINDS order; modifiers drop the py-only upload_dir /
//     options_scanned / declaration_only keys.

import {
  buildCatalog,
  CARD_KINDS,
  emitKnob,
  getModel,
  isServedFamily,
  KindValues,
  loadCardDefs,
  modelIds,
  provisionsByFamily,
  SLOT_VOCABULARY,
  theService,
} from "@melite/comfyui-cordis";
import type {
  CardDefinition,
  ComfyUIService,
  ModelDecl,
} from "@melite/comfyui-cordis";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
} from "./flowsRegistry.ts";

/** The booted live sources (cards + service). loadCardDefs caches;
 *  every arm awaits this once per request (the door already pays
 *  per-request IO by design). */
export async function liveSources(): Promise<{
  defs: Map<string, CardDefinition>;
  svc: ComfyUIService;
}> {
  const defs = await loadCardDefs();
  return { defs, svc: theService() };
}

/** family -> boarding card (first card in load order wins; the
 *  registry has no double-boarded family — a second spelling
 *  would serve two surfaces for one family). */
export function boardedMap(
  defs: Map<string, CardDefinition>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [cardId, def] of defs) {
    for (const fam of def.boarded ?? []) {
      if (!out.has(fam)) out.set(fam, cardId);
    }
  }
  return out;
}

/** Every route address a family's declaration names (variant routes
 *  + cell routes) — the route->owner back edge. */
function declRoutes(decl: ModelDecl): Set<string> {
  const out = new Set<string>();
  for (const v of decl.variants ?? []) {
    if (v.route) out.add(v.route);
    for (const c of v.cells ?? []) {
      if (c.route) out.add(c.route);
    }
  }
  return out;
}

/** One form-spec key's resolution: the rendering card + the boarded
 *  service family. Self-boarded first (a family that boards its own
 *  card keeps its self-attribution even when an owner's variants
 *  also route to it — qwen3-tts-voicedesign), else the boarded
 *  family whose declaration routes to the key (krea-2-raw rides
 *  krea-2), else null (unknown / unoffered / retired / fragment —
 *  the door 404s, same body as ever). */
export interface SpecResolution {
  card: string;
  service: string;
  /** The envelope's model id: the key itself, except card-id alias
   *  keys (?model=tts serves the default family's envelope). */
  model: string;
}

export function resolveSpecKey(
  key: string,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
): SpecResolution | null {
  const def = defs.get(key);
  if (def !== undefined && !isFamilyKey(key)) {
    // A card-id alias key (?model=tts): the card's envelope for its
    // default family (boarded[0] ?? the card itself — mask-studio
    // boards nothing and IS its own service).
    const boardedFams = def.boarded ?? [];
    const service = boardedFams.length > 0 ? boardedFams[0] : key;
    return { card: key, service, model: service };
  }
  let decl: ModelDecl;
  try {
    decl = getModel(key);
  } catch {
    return null;
  }
  if (!isServedFamily(decl)) return null;
  const self = boarded.get(key);
  if (self !== undefined) return { card: self, service: key, model: key };
  for (const [fam, card] of boarded) {
    let fdecl: ModelDecl;
    try {
      fdecl = getModel(fam);
    } catch {
      continue;
    }
    if (declRoutes(fdecl).has(key)) return { card, service: fam, model: key };
  }
  return null;
}

/** A key is a family key when a DECL names it (routes and owners
 *  alike); otherwise a defs hit is a card-id alias. */
function isFamilyKey(key: string): boolean {
  try {
    getModel(key);
    return true;
  } catch {
    return false;
  }
}

/** The served model ids in scan order (the _h_model_one known-set —
 *  the catalog emission's served keys, sorted). */
export function liveScanOrder(): string[] {
  const live = buildCatalog(modelIds().map((id) => getModel(id)));
  return Object.keys(
    (live as unknown as Record<string, Record<string, unknown>>).models,
  ).sort();
}

// ── form-spec bodies ──────────────────────────────────────────────

/** One DECL variant's wire row (the editor Variant contract: all ten
 *  keys, always — null/"" for absent, never a missing key). */
function variantRow(
  v: {
    id: string;
    label: string;
    group: string;
    resolver_defaults?: Record<string, unknown>;
    route?: string;
    hint?: string;
    engine?: string;
  },
  declEngine: string,
): Record<string, unknown> {
  return {
    id: v.id,
    label: v.label,
    group: v.group,
    defaults: v.resolver_defaults ?? {},
    route: v.route ?? "",
    hint: v.hint ?? null,
    engine: v.engine ?? declEngine,
    quant: null,
    vram_peak_gb: null,
    owner: "",
  };
}

function capQuant(quant: string): string {
  return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : quant;
}

/** The key family's variants + its offered quant cells (a cell
 *  serves the envelope iff its route is the key, the service
 *  owner (owner-shared checkpoints ride every service envelope),
 *  or the key is the card's default family — the primary envelope
 *  is the card's UNION surface, every quant honestly routed.
 *  Routeless cells are unaddressable, never offered. Variant rows
 *  serve whole (all ten keys, always) regardless of route — a
 *  variant addressed at another family renders through that
 *  family, never silently re-pointed. */
function specVariants(
  decl: ModelDecl,
  key: string,
  service: string,
  primary: boolean,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const declEngine = decl.engine ?? "";
  for (const v of decl.variants ?? []) {
    rows.push(variantRow(v, declEngine));
    seen.add(v.id);
    for (const c of v.cells ?? []) {
      if (!c.quant || c.hide_from_dropdown === true) continue;
      if (!c.route) continue;
      if (c.route !== key && c.route !== service && !primary) continue;
      const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant;
      seen.add(id);
      rows.push({
        id,
        label: c.label || capQuant(c.quant),
        group: "Quant",
        defaults: c.resolver_defaults ?? {},
        route: c.route ?? "",
        hint: null,
        engine: c.engine ?? declEngine,
        quant: c.quant,
        vram_peak_gb: c.vram_peak_gb ?? null,
        owner: v.id,
      });
    }
  }
  return rows;
}

/** The variant-group contract from the DECL's groups (label always;
 *  tooltip/default ride only when the DECL authors them). */
function groupContract(decl: ModelDecl | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const g of decl?.variant_groups ?? []) {
    const entry: Record<string, unknown> = { label: g.label };
    if (g.tooltip) entry.tooltip = g.tooltip;
    if (g.default) entry.default = g.default;
    out[g.id] = entry;
  }
  return out;
}

/** The modifier-pack table (the subcard packs — SubcardGrid kinds).
 *  lanpaint/qvoice ride the spec fields inline, never as subcards,
 *  so they have no row here; controlnet waits unboarded (the
 *  phantom-capability gate). kind/label/cardinality are UI strings
 *  with no other live source — one row per pack, stated once. */
const MODIFIER_PACKS: Record<
  string,
  { kind: string; label: string; cardinality: string; max_stack?: number }
> = {
  loras: { kind: "lora", label: "LoRAs", cardinality: "list" },
  controlnet: { kind: "controlnet", label: "ControlNet", cardinality: "list" },
  mask: { kind: "mask", label: "Region Mask", cardinality: "list", max_stack: 1 },
};

function optionTooltip(
  row: { category?: string; filename: string },
  shared: boolean,
): string {
  const base = row.category ? `${row.category} — ${row.filename}` : row.filename;
  return shared ? `${base} — runtime catalog` : base;
}

/** The modifiers offer: one entry per boarded modifier pack (the
 *  DECL's mods order, filtered to the pack table). Options ride the
 *  pack rows (the discovery door's tooltip law: union-served rows
 *  carry the shared suffix); fields ride the pack's schema_groups
 *  member rows minus the pack's own stack knob (the stack knob
 *  itself lives on the spec fields — modifiers carry the REST). */
function specModifiers(
  svc: ComfyUIService,
  card: string,
  key: string,
  decl: ModelDecl | null,
  schemaGroups: Array<{ id: string; fields: unknown[] }>,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const pack of decl?.mods ?? []) {
    const meta = MODIFIER_PACKS[pack];
    if (meta === undefined) continue;
    const cat = svc.modCatalog(pack, key);
    // The pack's groups (walked off its contract — never hardcoded):
    // the absorbed pack fields on this card, scoped to the key.
    const groups = new Set<string>();
    for (const absorbed of svc.cardModFields(card)) {
      if (absorbed.pack !== pack) continue;
      if (!absorbed.families.includes(key)) continue;
      const dict = (absorbed.fields as { dict?: Record<string, unknown> })
        ?.dict;
      for (const node of Object.values(dict ?? {})) {
        const extra = (
          ((node as { meta?: { extra?: Record<string, unknown> } }).meta
            ?.extra ?? {}) as Record<string, unknown>
        );
        if (typeof extra.group === "string") groups.add(extra.group);
      }
    }
    const fields: unknown[] = [];
    for (const g of schemaGroups) {
      if (!groups.has(g.id)) continue;
      for (const f of g.fields) {
        if ((f as { name?: unknown }).name === pack) continue;
        fields.push(f);
      }
    }
    const entry: Record<string, unknown> = {
      kind: meta.kind,
      label: meta.label,
      param_key: pack,
      cardinality: meta.cardinality,
    };
    if (meta.max_stack !== undefined) entry.max_stack = meta.max_stack;
    entry.fields = fields;
    entry.options = cat.rows.map((r) => ({
      value: r.id,
      label: r.label ?? r.id,
      tooltip: optionTooltip(r, cat.shared),
      defaults:
        r.default_strength === undefined
          ? {}
          : { strength: r.default_strength },
    }));
    out.push(entry);
  }
  return out;
}

/** Card schema defaults for card-only keys (mask-studio declares no
 *  DECL — its envelope defaults ride the schema's declared
 *  defaults, native JSON types, required-knob fallthrough excluded).
 *  DECL keys ride the DECL defaults verbatim. */
function schemaDefaults(def: CardDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
    def.schema;
  const dict = (carrier as { dict?: Record<string, { meta?: { default?: unknown } }> })
    ?.dict;
  for (const [name, node] of Object.entries(dict ?? {})) {
    const dflt = node?.meta?.default;
    if (dflt !== undefined) out[name] = dflt as unknown;
  }
  return out;
}

/** One form-spec envelope (the /v1/form-spec?model= body — the
 *  editor's render truth for one served key). Everything scopes to
 *  the KEY family; the owner supplies only the service
 *  attribution. Keys insert alphabetically (the frozen shape). */
export function specBody(
  svc: ComfyUIService,
  defs: Map<string, CardDefinition>,
  res: SpecResolution,
): Record<string, unknown> {
  const def = defs.get(res.card);
  if (def === undefined) {
    throw new Error(`form-spec: unknown card '${res.card}'`);
  }
  const ident = def.identity;
  if (ident === undefined) {
    throw new Error(`form-spec: card '${res.card}' declares no identity`);
  }
  // The envelope's family: the model id (card-id alias keys serve
  // the default family's envelope — ?model=tts IS qwen3-tts).
  // Everything scopes to it; the service is attribution only.
  const key = res.model;
  let decl: ModelDecl | null = null;
  try {
    decl = getModel(key);
  } catch {
    decl = null;
  }
  const fs = svc.formSpec(res.card, key) as {
    fields: unknown[];
    schema_groups: Array<{ id: string; fields: unknown[] }>;
  } | null;
  if (fs === null) {
    throw new Error(`form-spec: card '${res.card}' unknown`);
  }
  const surface = def.surface ?? {};
  const boarded = def.boarded ?? [];
  const primary = (boarded.length > 0 ? boarded[0] : res.card) === key;
  return {
    contract: null,
    defaults: decl?.defaults ?? schemaDefaults(def),
    engine: decl?.engine ?? "comfyui",
    enhance_prompt: null,
    enhance_prompts: { prompt: null, lyrics: "" },
    features: {
      modifiers: specModifiers(svc, res.card, key, decl, fs.schema_groups),
      variant_groups: groupContract(decl),
    },
    fields: fs.fields,
    form: res.card,
    genre: ident.genre,
    guide: null,
    label: ident.label,
    layout: surface.layout === "studio" ? "studio" : null,
    loader_info: null,
    model: res.model,
    schema_groups: fs.schema_groups,
    service: res.service,
    size: surface.size === "huge" ? "huge" : null,
    variants: decl ? specVariants(decl, key, res.service, primary) : [],
  };
}

// ── forms / kinds ─────────────────────────────────────────────────

/** The forms table (the /v1/forms body — card meta only, no fields:
 *  label/genre/order/plugin/sidebar_key/default_service/hidden/
 *  covers). Sorted by (sidebar order, card id) — deterministic, not
 *  py registration order. */
export function formsTable(
  defs: Map<string, CardDefinition>,
): Record<string, unknown> {
  const rows: Array<{ id: string; order: number; row: Record<string, unknown> }> =
    [];
  for (const [id, def] of defs) {
    const sidebar = def.sidebar ?? { key: "", order: 0 };
    const boarded = [...(def.boarded ?? [])];
    rows.push({
      id,
      order: typeof sidebar.order === "number" ? sidebar.order : 0,
      row: {
        label: def.identity?.label ?? id,
        genre: def.identity?.genre ?? "",
        order: sidebar.order,
        plugin: "comfyui",
        sidebar_key: sidebar.key,
        default_service: boarded.length > 0 ? boarded[0] : id,
        hidden: sidebar.hidden === true,
        covers: boarded.length > 0 ? boarded : [id],
      },
    });
  }
  rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.id] = r.row;
  return out;
}

/** The kinds arm (the /v1/kinds body — CARD_KINDS in its own
 *  alphabetical order, projected to the served seven keys). */
export function kindsArm(): Record<string, unknown> {
  return {
    kinds: CARD_KINDS.map((k) => ({
      kind: k.kind,
      runnable: k.runnable,
      executable: k.executable,
      formSpec: k.formSpec,
      compound: k.compound,
      opensStudio: k.opensStudio,
      badgeTone: k.badgeTone,
    })),
  };
}

// ── catalog cards / capabilities ──────────────────────────────────

/** The live card sections (the catalog arm's cards + capabilities —
 *  alphabetical by card id). families/default ride boarding
 *  (boarded[0] ?? the card itself — mask-studio boards nothing and
 *  IS its own family); principles ride the identity rung;
 *  skills/has_inference/has_rubric are unowned wire constants (no
 *  live source declares them — every frozen row agrees). */
export function cardSections(
  defs: Map<string, CardDefinition>,
): { cards: Record<string, unknown>; capabilities: Record<string, unknown> } {
  const cards: Record<string, unknown> = {};
  const capabilities: Record<string, unknown> = {};
  for (const id of [...defs.keys()].sort()) {
    const def = defs.get(id)!;
    const ident = def.identity;
    if (ident === undefined) {
      throw new Error(`catalog: card '${id}' declares no identity`);
    }
    const boarded = [...(def.boarded ?? [])];
    const fams = boarded.length > 0 ? boarded : [id];
    const df = fams[0];
    cards[id] = {
      id,
      label: ident.label,
      description: ident.description,
      genre: ident.genre,
      families: fams,
      principles: [...(ident.principles ?? [])],
      skills: [],
      has_inference: false,
      has_rubric: false,
    };
    capabilities[id] = {
      label: ident.label,
      description: ident.description,
      default_family: df,
      families: fams,
      kind: "generation",
      icon: ident.icon ?? "",
      resolved: { family: df, model: df, params: {} },
    };
  }
  return { cards, capabilities };
}

/** The full live catalog section (models/families ride the registry
 *  emission; cards/capabilities ride the cards; the vocabulary rides
 *  the slot SSOT). */
export function catalogSection(
  defs: Map<string, CardDefinition>,
): Record<string, unknown> {
  const live = buildCatalog(modelIds().map((id) => getModel(id))) as unknown as Record<
    string,
    unknown
  >;
  const { cards, capabilities } = cardSections(defs);
  return {
    models: live["models"],
    families: live["families"],
    capabilities,
    cards,
    input_vocabulary: SLOT_VOCABULARY,
  };
}

// ── loras ─────────────────────────────────────────────────────────

/** The family backing a loras offer (served resolution first, else
 *  the family declaring the key as a variant — turbo renders
 *  krea-2's loras). Null when nothing boards the pack (the door
 *  404s, same body as ever). */
export function lorasFamily(
  key: string,
  boarded: Map<string, string>,
): string | null {
  const res = ((): SpecResolution | null => {
    try {
      const decl = getModel(key);
      if (!isServedFamily(decl)) return null;
    } catch {
      return variantFamily(key);
    }
    const self = boarded.get(key);
    if (self !== undefined) return { card: self, service: key, model: key };
    for (const [fam] of boarded) {
      try {
        if (declRoutes(getModel(fam)).has(key)) {
          return { card: "", service: fam, model: key };
        }
      } catch {
        continue;
      }
    }
    return null;
  })();
  if (res === null) return null;
  try {
    if (!((getModel(res.service).mods ?? []).includes("loras"))) return null;
  } catch {
    return null;
  }
  return res.service;
}

function variantFamily(key: string): SpecResolution | null {
  for (const id of modelIds()) {
    let decl: ModelDecl;
    try {
      decl = getModel(id);
    } catch {
      continue;
    }
    if ((decl.variants ?? []).some((v) => v.id === key)) {
      return { card: "", service: id, model: key };
    }
  }
  return null;
}

/** One loras body ({model, loras, note, meta} — filenames in pack
 *  order, meta keyed by row id). */
export function lorasBody(
  svc: ComfyUIService,
  family: string,
): Record<string, unknown> {
  const cat = svc.modCatalog("loras", family);
  const meta: Record<string, unknown> = {};
  for (const r of cat.rows) {
    const entry: Record<string, unknown> = { label: r.label ?? r.id };
    if (r.category !== undefined) entry.category = r.category;
    if (r.default_strength !== undefined) {
      entry.default_strength = r.default_strength;
    }
    meta[r.id] = entry;
  }
  return {
    model: family,
    loras: cat.rows.map((r) => r.filename),
    note:
      cat.rows.length > 0
        ? `${cat.rows.length} declared adapters — the ${family} family's LorasMod rows (packages/models/${family}/mods/loras.ts)`
        : null,
    meta,
  };
}

// ── family schemas ────────────────────────────────────────────────

/** One family param-schema (the /v1/flows/families/<id>/
 *  param-schema body — card knobs + absorbed mod fields, scoped to
 *  the KEY family through the same families gates formSpec walks;
 *  required stays [] (the schema describes, the door enforces).
 *  Keyless families (fragments, retired) get the empty shape;
 *  unknown ids 404 at the door. */
export function familySchema(
  svc: ComfyUIService,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
  key: string,
): Record<string, unknown> | null {
  let card: string | undefined;
  let decl: ModelDecl | null = null;
  try {
    decl = getModel(key);
  } catch {
    decl = null;
  }
  if (decl !== null) {
    card = boarded.get(key);
    if (card === undefined) {
      for (const [fam, c] of boarded) {
        try {
          if (declRoutes(getModel(fam)).has(key)) {
            card = c;
            break;
          }
        } catch {
          continue;
        }
      }
    }
    if (card === undefined) {
      // A known family no card serves (fragments, retired): the
      // empty shape (every frozen row for such families agrees).
      return {
        title: `${key}_Params`,
        type: "object",
        additionalProperties: false,
        properties: {},
        required: [],
      };
    }
  } else {
    // A card-id family (mask-studio): the card's own knobs.
    if (!defs.has(key)) return null;
    card = key;
  }
  const def = defs.get(card!);
  if (def === undefined) return null;
  const properties: Record<string, unknown> = {};
  const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
    def.schema;
  const dict = (carrier as { dict?: Record<string, unknown> })?.dict ?? {};
  for (const [name, node] of Object.entries(dict)) {
    const meta = (node as { meta?: { extra?: Record<string, unknown> } }).meta
      ?.extra as Record<string, unknown> | undefined;
    const fams = meta?.families as readonly string[] | undefined;
    if (fams !== undefined && !fams.includes(key)) continue;
    properties[name] = emitKnob(
      node as Parameters<typeof emitKnob>[0],
    );
  }
  for (const absorbed of svc.cardModFields(card!)) {
    if (!absorbed.families.includes(key)) continue;
    const adict = (absorbed.fields as { dict?: Record<string, unknown> })
      ?.dict ?? {};
    for (const [name, node] of Object.entries(adict)) {
      properties[name] = emitKnob(
        node as Parameters<typeof emitKnob>[0],
      );
    }
  }
  return {
    title: `${key}_Params`,
    type: "object",
    additionalProperties: false,
    properties,
    required: [],
  };
}

/** Every served family schema + the card-id families + the empty
 *  shapes for keyless-but-known families (the param-schemas arm). */
export function familySchemas(
  svc: ComfyUIService,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = new Set<string>();
  for (const id of modelIds()) {
    try {
      if (isServedFamily(getModel(id))) keys.add(id);
    } catch {
      continue;
    }
  }
  for (const id of defs.keys()) keys.add(id);
  for (const key of [...keys].sort()) {
    const schema = familySchema(svc, defs, boarded, key);
    if (schema !== null) out[key] = schema;
  }
  return out;
}

// ── schema section ────────────────────────────────────────────────

/** The flow API-shape docs (hand-owned prose describing the
 *  wireformat — engines, stage fields, flow bodies, doors,
 *  pointers. They change only when the flows API changes, so they
 *  are authored HERE, never frozen in a blob). */
const FLOW_DOCS = {
  engines: {
    anycreature: "mesh",
    audio_cpp: "audio",
    comfyui: "image",
    sim: "text",
    skintokens: "mesh",
  },
  stage_shape: {
    fields: [
      "card",
      "card_io",
      "description",
      "engine",
      "expected",
      "id",
      "inputs",
      "outputs",
      "params",
      "retries",
      "skip_when",
      "timeout_s",
    ],
    id: "stage id (unique; edges reference it)",
    engine: "one of engines above (validated at compile)",
    card: "optional action-card id — opts the stage into the typed card gate (params validated against the card schema)",
    params:
      "the engine's verbatim surface (workflow / out_dir / timeout_s for comfyui; task/family for audio_cpp) — unvalidated here unless card= is set",
    inputs:
      'name -> {"initial": key} (a request key) or {"stage": id, "output": name} (an earlier stage\'s output; kind is INFERRED upstream)',
    outputs: "name -> Kind string (omit for the engine default)",
    expected:
      "name -> Kind string (what each input expects; required unless card= fills it)",
    skip_when:
      '{"initial": key, "when": "present|absent"} — prunes the stage at build time',
    edge_rules:
      "edges must point at EARLIER stages; a kind mismatch refuses at compile with both kinds named",
  },
  flow_body: {
    keys: ["description", "id", "stages"],
    example: {
      id: "my-flow",
      stages: [
        {
          id: "gen",
          engine: "anycreature",
          inputs: { prompt: { initial: "prompt" } },
          expected: { prompt: "text" },
        },
        {
          id: "remesh",
          engine: "comfyui",
          inputs: { mesh: { stage: "gen", output: "default" } },
          expected: { mesh: "mesh" },
        },
      ],
    },
  },
  doors: {
    start:
      'POST /v1/flows/start with exactly one of {"flow": name} | {"flow_inline": {...}} | {"model": id}, PLUS a REQUIRED doc-backed "draft_id" on the envelope (CARD BIRTH LAW: compose at POST /v1/flows/drafts first — a cardless start 4xxes BEFORE any run registers)',
    validate:
      'POST /v1/flows/validate with {"flow_inline": {...}} — verbatim compile refusals, no queue slot, no GPU, no sidecar',
    status: "GET /v1/flows/status/<run_id> — stages, progress, queue_position",
    stop: "POST /v1/flows/stop/<run_id>",
  },
  pointers: {
    card_param_schemas:
      "GET /v1/flows/families/param-schemas (per-family card param envelopes)",
    models: "GET /v1/models (the model catalog)",
  },
} as Record<string, unknown>;

/** The schema section (the flow-wireformat arm — kinds, cards,
 *  flows, docs). Cards ride flowKinds (params is unowned — the one
 *  frozen params string was an export artifact, never a source);
 *  flows ride the EXPANDED registry (from_flow links resolved, the
 *  source flow staying the single truth). */
export function schemaSection(
  defs: Map<string, CardDefinition>,
): Record<string, unknown> {
  const cards: Record<string, unknown> = {};
  for (const id of [...defs.keys()].sort()) {
    const def = defs.get(id)!;
    const kinds = def.flowKinds;
    if (kinds === undefined) {
      throw new Error(`schema: card '${id}' declares no flowKinds`);
    }
    cards[id] = {
      engine: "comfyui",
      kind_inputs: { ...(kinds.inputs as Record<string, unknown>) },
      kind_outputs: { ...(kinds.outputs as Record<string, unknown>) },
      requires_model: kinds.requiresModel,
      params: null,
    };
  }
  const flows: Record<string, unknown> = {};
  for (const name of registryFlowNames()) {
    const flow = getRegistryFlow(name);
    if (flow === undefined) continue;
    const expanded = expandRegistryFlow(flow);
    flows[name] = {
      description: expanded.description,
      stages: expanded.stages.map((st) => ({
        id: st.id,
        engine: st.engine,
        card: st.card,
        description: st.description,
        inputs: st.inputs,
        outputs: st.outputs,
        expected: st.expected,
        skip_when: st.skipWhen,
      })),
    };
  }
  return {
    kinds: [...KindValues],
    cards,
    flows,
    engines: FLOW_DOCS.engines,
    stage_shape: FLOW_DOCS.stage_shape,
    flow_body: FLOW_DOCS.flow_body,
    doors: FLOW_DOCS.doors,
    pointers: FLOW_DOCS.pointers,
  };
}

// ── provisions ────────────────────────────────────────────────────

/** The provisions map (family -> {engine, provisions}): every known
 *  family DECL rides verbatim (declared rows serve regardless of
 *  offer state — the offer gate lives on the catalog arms, never
 *  here), plus card-owned tool weights (mask-studio is a tool, not
 *  a family — its RT-DETR weights ride the card). */
export async function provisionsMap(
  defs: Map<string, CardDefinition>,
): Promise<Record<string, unknown>> {
  // ONE spelling — the engine owns the declaration rows
  // (cardDefs.provisionsByFamily); the door only shapes them.
  return (await provisionsByFamily(defs)) as Record<string, unknown>;
}
