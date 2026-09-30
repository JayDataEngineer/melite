// loadPlane.ts — Melite load, RE-HOMED (REBUILD-17, 2026-09-10):
// the dead gateway's disclose.ts loader span (killed with the
// gateway app) ports here — load opens ONE card or flow (agents
// md + tool-call signature + tier-1 skill lines; bodies stay
// behind melite_skill_read). Division of enhance unchanged (operator law
// 2026-09-09): the agent holds the skill lines, reads bodies via
// melite_skill_read, writes the prompt itself.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {cardPackages, cardWireName, emitModifierKinds, emitParamsSchema, getModel, modelsService, resolveRepoRoot, theService} from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";
import { laneContractsFor, type LaneContractDecl } from "@melite/contracts/laneRelations";
import type { CardRegistryService } from "./cardsRegistry.ts";
import { getRegistryFlow } from "./flowsData.ts";
import { toolBaseRows } from "./toolProjection.ts";
import { modelRows, cardRows, engineDirs, flowRows, wireSkill, findSkill } from "./skillPlane.ts";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
import { laneFilesStatus } from "./cardsLanes.ts";

/** A card id → its package dir. The cardPackages rows are package
 *  NAMES ('@melite/<genre>-<card>'); the id is the row's tail past
 *  the genre prefix, which is NOT reparseable from the string alone
 *  (ids carry dashes) — so match rows ending in '-' + id, split the
 *  genre against the LIVE domain tier (readdir packages/), and keep
 *  the ones whose dir carries src/card.ts (the cardUnitDirs guard).
 *  Node resolution is the WRONG tool (pnpm links only dependents —
 *  require.resolve starves); the repo tree is the truth.
 *  Zero hits = unknown id; two = a data bug — both refuse LOUD at
 *  the door, never a silent pick. */
export function resolveCardPackageDir(repo: string, cardId: string): string {
  let domains: string[] = [];
  try {
    domains = readdirSync(join(repo, "packages"), { withFileTypes: true })
      .filter((e): boolean => e.isDirectory())
      .map((e): string => e.name);
  } catch {
    throw new Error(`disclose: no packages tier under '${repo}'`);
  }
  const hits: string[] = [];
  for (const row of cardPackages) {
    // (every cardPackages row carries the @melite/ prefix — the bare arm never fires;
    // studio cards' rows point at the CARD subpath ('.../card') — strip it: the
    // resolver wants the package name, and the dir guard below does the rest)
    const tail: string = (row.startsWith("@melite/") ? row.slice("@melite/".length) : /* v8 ignore next */ row).replace(/\/card$/, "");
    if (!tail.endsWith("-" + cardId)) continue;
    for (const dom of domains) {
      if (!tail.startsWith(dom + "-")) continue;
      const dir: string = join(repo, "packages", dom, tail.slice(dom.length + 1));
      /* v8 ignore next -- every registry tail resolves to a real card
         dir (the build consumes the same rows): the skip never fires
         (2026-09-12) */
      if (!existsSync(join(dir, "src", "card.ts"))) continue;
      hits.push(dir);
    }
  }
  if (hits.length === 0) throw new Error(`disclose: unknown card '${cardId}'`);
  /* v8 ignore next -- no cardPackages tail repeats (single hit each):
     the ambiguity fence never fires (2026-09-12) */
  if (hits.length > 1) throw new Error(`disclose: card '${cardId}' is ambiguous (${hits.length} packages)`);
  return hits[0];
}

/** The card's agents md (src/agents/**, AGENT.md first, sorted,
 *  capped — the cap is the contract: lines route, bodies stay
 *  bounded). */
export function cardSkillDocs(pkgDir: string): Array<{ path: string; text: string }> {
  const MAX_FILES = 8;
  const MAX_BYTES = 32768;
  const agents: string = join(pkgDir, "src", "agents");
  let files: string[] = [];
  try {
    files = readdirSync(agents).filter((f): boolean => f.endsWith(".md"));
  } catch (e) {
    // M6 (the fallback audit): ENOENT is the normal no-agents card —
    // most cards ship none. Any OTHER read failure is a real defect
    // and is NAMED (the bundle must not silently narrow the agent's
    // constraints); the bundle still serves (a disclose read never
    // refuses the door), but the degrade is visible in the log.
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`disclose: card agents dir unreadable (${agents}): ${String(e)}`);
    }
    return [];
  }
  files.sort((a, b): number => {
    const ra: number = a === "AGENT.md" ? 0 : 1;
    const rb: number = b === "AGENT.md" ? 0 : 1;
    // (byte-sorted readdir + V8's (current, earlier) insertion order
    // never evaluate the less-than tiebreak here: the sort RESULT is
    // pinned by the AGENT-first assertions below)
    return ra - rb || (a < b ? /* v8 ignore next */ -1 : 1);
  });
  const out: Array<{ path: string; text: string }> = [];
  let budget: number = MAX_BYTES;
  for (const f of files.slice(0, MAX_FILES)) {
    if (budget <= 0) break;
    try {
      const text: string = readFileSync(join(agents, f), "utf8").slice(0, budget);
      budget -= text.length;
      out.push({ path: "src/agents/" + f, text });
    } catch (e) {
      // M6: an unreadable skill doc is named, never skipped silent —
      // the agent's constraints must not narrow invisibly.
      console.error(`disclose: card skill doc unreadable (${join(agents, f)}): ${String(e)}`);
    }
  }
  return out;
}

/** The card's tool-call signature — the /v1/tools row
 *  envelope (ROW_KEYS mirror toolsEmit — one projection, the
 *  emitter imported, the envelope shared by construction). */
export function toolRowFor(
  id: string,
  def: {
    schemaCarrier?: unknown;
    schema: unknown;
    boarded: readonly string[];
    mods?: Parameters<typeof emitModifierKinds>[0];
  },
  rows: ReturnType<typeof toolBaseRows>,
): Record<string, unknown> {
  const base = rows.get(id);
  if (base === undefined) throw new Error(`disclose: no tool row for card '${id}'`);
  const paramsSchema = emitParamsSchema(
    ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as Parameters<typeof emitParamsSchema>[0],
    def.boarded,
  );
  // THE MODS PROJECTION (stroke 79): one emitter (emitModifierKinds
  // — the same SSOT the /v1/tools manifest row serves), so the load
  // bundle's signature and the manifest never drift. leaf_face never
  // rides (the agent composes VALUES, never faces).
  const modifiers = emitModifierKinds(def.mods);
  // THE LANE CONTRACT RIDES THE BUNDLE (the DECL audit's gap 1,
  // 2026-10-10): this signature is what melite_load renders, and it
  // served no `lanes` key at all — so the agent's primary face said
  // nothing about a lane's surface, its relation words, its bounds,
  // or its sampler domain, and the agent learned every law by
  // hitting the bench's refusal. /v1/card-tools served the same
  // projection; this is ONE construction (laneContractsFor, contracts
  // floor) so the two faces cannot drift.
  const lanes = laneContractsFor(def.boarded, (fam) => {
    try {
      return getModel(fam) as unknown as LaneContractDecl;
    } catch {
      // a boarded id that is not a declared family (a retired
      // address) contributes nothing — the stand-down, never a throw
      return undefined;
    }
  });
  return {
    ...(modifiers.length > 0 ? { modifiers } : {}),
    ...(Object.keys(lanes).length > 0 ? { lanes } : {}),
    name: base.name,
    version: base.version,
    kind: base.kind,
    card: base.card,
    model: base.model,
    stage_title: base.stageTitle,
    description: base.description,
    params_schema: {
      type: paramsSchema.type,
      properties: paramsSchema.properties as Record<string, unknown>,
      ...(paramsSchema.required !== undefined ? { required: paramsSchema.required } : {}),
    },
  };
}

/** The bundle digest (the DSH session-catalog half we CAN own:
 *  their catalog is digest-diffed "stable, never duplicated" — we
 *  don't own the loop so we can't clear the agent's context, but a
 *  stable content hash lets the agent dedupe its own reloads: quote
 *  the digests you hold, skip reload on a match). sha16 of the
 *  canonical bundle JSON (the asset pipeline's sha16 convention). */
export function bundleDigest(bundle: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex").slice(0, 16);
}

// ── end moved pures ──


/** Tier-1 skill LINES for one card id (the melite_skill_index truth —
 *  wireSkill rows over the planes buckets, card-skill scope only;
 *  the card's AGENT.md rides full under agents, never as a line).
 *  Merged across engines, id-deduped; unknown cards line nothing
 *  (the walk is the truth — never a refusal). */
export function skillLinesForCard(repo: string, cardId: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  let engines: string[];
  try {
    engines = engineDirs(join(repo, "packages", "engines"));
  } catch {
    /* v8 ignore next -- engineDirs returns [] instead of throwing
       (missing roots read empty): the degrade never fires (2026-09-12) */
    return out;
  }
  for (const engine of engines) {
    let bucket;
    try {
      bucket = cardRows(engine, repo).buckets.get(cardId);
    } catch {
      /* v8 ignore next -- cardRows walks (never throws): the skip
         never fires (2026-09-12) */
      continue;
    }
    if (bucket === undefined) continue;
    for (const doc of bucket.rows) {
      if (doc.row.scope !== "card-skill") continue;
      /* v8 ignore next -- one engine owns each card's rows (no
         cross-engine dup ids in the walk): the dedupe never fires
         (2026-09-12) */
      if (seen.has(doc.row.id)) continue;
      seen.add(doc.row.id);
      out.push(wireSkill(doc.row));
    }
  }
  return out;
}

/** Tier-1 skill LINES for boarded families (the discover+load
 *  contract, 2026-09-22: ONE melite_load hands the agent the card's
 *  skills AND every boarded family's model skills — the agent
 *  learns model:anima:prompt-enhance from loading image-gen, never
 *  from a second hunt). Entrance rows (scope "model", the family's
 *  AGENT.md) ride when the family authors one, then its skills
 *  (scope "model-skill"), in the boarded order — card skills first
 *  (the caller concatenates), then family by family. A boarded id
 *  with no rows contributes nothing (the walk is the truth — never
 *  a refusal; anima itself ships no AGENT.md, only the skill). */
export function skillLinesForFamilies(repo: string, fams: readonly string[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  // (M6: engineDirs never throws — missing roots read empty — so the
  // old try/catch here was a dead arm; removed. If it ever DOES
  // throw, the error propagates loud: fail-closed is the law.)
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  // walk once, bucket per family — the bundle emits boarded order
  const perFam = new Map<string, Array<{ id: string; line: Record<string, unknown>; entrance: boolean }>>();
  for (const engine of engines) {
    let rows;
    try {
      rows = modelRows(engine);
    } catch (e) {
      // M6: an engine whose model rows cannot be read vanishes from
      // the skill walk — that degrade is NAMED, never silent.
      console.error(`disclose: model rows unreadable (${engine}): ${String(e)}`);
      continue;
    }
    for (const doc of rows) {
      if (doc.row.model === null || !fams.includes(doc.row.model)) continue;
      if (doc.row.scope !== "model" && doc.row.scope !== "model-skill") continue;
      if (seen.has(doc.row.id)) continue;
      seen.add(doc.row.id);
      const cell = perFam.get(doc.row.model) ?? [];
      cell.push({ id: doc.row.id, line: wireSkill(doc.row), entrance: doc.row.scope === "model" });
      perFam.set(doc.row.model, cell);
    }
  }
  for (const fam of fams) {
    const cell = perFam.get(fam) ?? [];
    // entrance first, then skills in walk order
    cell.sort((a, b): number => Number(b.entrance) - Number(a.entrance));
    for (const r of cell) out.push(r.line);
  }
  return out;
}
export function flowLeafDocs(repo: string, flowName: string): Array<{ path: string; text: string }> {
  const MAX_FILES = 8;
  const MAX_BYTES = 32768;
  const leaf: string = join(repo, "flows", flowName);
  const files: string[] = [];
  const walk = (dir: string, rel: string): void => {
    /* v8 ignore next -- the per-loop breaks cap before any re-entry
       at cap: the guard never fires (2026-09-12) */
    if (files.length >= MAX_FILES) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const names: string[] = entries.map((e): string => e.name);
    const isDir = new Map<string, boolean>(entries.map((e): [string, boolean] => [e.name, e.isDirectory()]));
    names.sort((a, b): number => {
      const rank = (f: string): number => f === "AGENT.md" || f === "AGENTS.md" || f === "SKILL.md" ? 0 : 1;
      // (same byte-order law as cardSkillDocs above: the less-than
      // tiebreak never evaluates; the order assertions pin the result)
      return rank(a) - rank(b) || (a < b ? /* v8 ignore next */ -1 : 1);
    });
    for (const f of names) {
      if (files.length >= MAX_FILES) break;
      if (isDir.get(f) === true) {
        walk(join(dir, f), rel + f + "/");
      } else if (f.endsWith(".md")) {
        files.push(rel + f);
      }
    }
  };
  walk(leaf, "");
  const out: Array<{ path: string; text: string }> = [];
  let budget: number = MAX_BYTES;
  for (const f of files) {
    if (budget <= 0) break;
    try {
      const text: string = readFileSync(join(leaf, f), "utf8").slice(0, budget);
      budget -= text.length;
      out.push({ path: "flows/" + flowName + "/" + f, text });
    } catch {
      // unreadable — skip, never refuse the bundle
    }
  }
  return out;
}

/** Resolve one skill ref (a card:/model:/flow: sid) to its tier-1
 *  line through the planes registry (the melite_skill_index truth).
 *  Dangling refs line null — visible drift, never a refusal. */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law the runs doors ride) */
export function skillLineForRef(
  repo: string,
  ref: string,
  modelsSeat?: FamilyModelsSeat | null,
): Record<string, unknown> {
  try {
    const found = findSkill(repo, ref, modelsSeat);
    if (found !== null) return { ref, line: wireSkill(found.row) };
  } catch {
    // registry walk threw — line null below
  }
  return { ref, line: null };
}

/** The lane's models seat as the CARD arm reads it: the four
 *  disclosure methods (family rows, path/file presence, catalog
 *  artifacts). ModelsService satisfies it structurally; ctx.get
 *  returns the same service, so the card arm discloses from the
 *  lane that serves the run (the lane-seat law). */
export type CardModelsSeat = Pick<
  ModelsService,
  "allDecls" | "checkModelPresent" | "checkModelPathPresent" | "resolveCatalogArtifact"
>;

/** Melite load for a CARD: agents md + tool-call signature +
 *  tier-1 skill lines (the card's own AND every boarded family's
 *  model skills — ONE load hands the agent the whole craft: loading
 *  image-gen serves model:anima:prompt-enhance beside the card
 *  lines, so the prompt guide is read before compose, never hunted
 *  after) + model hints (the boarded families' DECL identity —
 *  presence-marked, never a run-time surprise; LLM-powered enhance
 *  stays the user's ✦ door, never served here). Throws LOUD
 *  on unknown ids (the door maps to 404). */
export function loadCard(
  repo: string,
  cards: CardRegistryService,
  modelsSeat: CardModelsSeat | null | undefined,
  cardId: string,
): Record<string, unknown> {
  // ADMISSION BEFORE THE DEPENDENCY (the flow arm's own order at
  // loadFlow: the referent first, the seat that serves it second).
  // Reading the models seat first made an unknown card answer in the
  // engine's bootstrap voice ("models service not booted") instead of
  // the load door's own "disclose: unknown card 'x'".
  const defs = cards.defsSync();
  const def = defs.get(cardId);
  if (def === undefined) throw new Error(`disclose: unknown card '${cardId}'`);
  // The lane's seat when mounted (the lane-seat law — the same read
  // the flow arm threads), the booted singleton otherwise; an
  // unmounted seat degrades exactly like the flow arm.
  const models: CardModelsSeat = modelsSeat ?? modelsService();
  const rows = toolBaseRows(defs);
  const pkgDir: string = resolveCardPackageDir(repo, cardId);
  const decls = new Map(models.allDecls().map((d): [string, { id: string; label: string; description: string; lane_inputs?: Record<string, unknown> }] => [d.id, { id: d.id, label: d.label, description: d.description ?? "", ...(d.lane_inputs === undefined ? {} : { lane_inputs: d.lane_inputs }) }]));
  const hints: Array<Record<string, unknown>> = [];
  for (const fam of (def as { boarded: readonly string[] }).boarded) {
    const d = decls.get(fam);
    if (d === undefined) continue;
    let present = false;
    const lanePath = typeof (d as { lane_inputs?: Record<string, unknown> }).lane_inputs?.["model_path"] === "string"
      ? String((d as { lane_inputs?: Record<string, unknown> }).lane_inputs?.["model_path"]).trim()
      : "";
    const filesPresent = typeof models.checkModelPresent === "function"
      ? laneFilesStatus(d, (folder, name) => models.checkModelPresent("models/" + folder, name, repo))
      : null;
    if ((lanePath !== "" && typeof models.checkModelPathPresent === "function" && models.checkModelPathPresent(lanePath, repo) !== null) || filesPresent === true) {
      present = true;
    } else {
      try {
        const rows = models.resolveCatalogArtifact(fam, "", "", repo);
        present = rows.length > 0 && rows.every((row) => models.checkModelPresent(row.relative_path, row.name, repo) !== null);
      } catch {
        present = false;
      }
    }
    hints.push({ id: d.id, label: d.label, description: d.description, present });
  }
  // THE PACK HINTS (the no-silent-drop law's extension half,
  // stroke 18): the card's declared extension packs (flat requires +
  // every per-family slice), presence-marked by the EXTENSION-LAW
  // gate's own read via the engine service. The LLM sees a missing
  // pack at LOAD time — install via comfy_manage install_extension
  // before running, never a run-time surprise.
  const extDef = def as {
    requires?: readonly string[];
    requiresByFamily?: Record<string, readonly string[]>;
  };
  const packIds: string[] = [...(extDef.requires ?? [])];
  for (const slice of Object.values(extDef.requiresByFamily ?? {})) {
    for (const p of slice) if (!packIds.includes(p)) packIds.push(p);
  }
  let pack_hints: Array<Record<string, unknown>> = [];
  try {
    const svc = theService();
    pack_hints = svc.packPresence(packIds).map((r) => ({ id: r.id, present: r.present }));
  } catch {
    // engine service unavailable at load time — the ids still serve
    // (present: null — unknown, never a silent drop)
    pack_hints = packIds.map((id) => ({ id, present: null }));
  }
  const bundle: Record<string, unknown> = {
    name: cardId,
    kind: "card",
    signature: toolRowFor(
      cardId,
      def as Parameters<typeof toolRowFor>[1],
      rows,
    ),
    agents: cardSkillDocs(pkgDir),
    skills: [
      ...skillLinesForCard(repo, cardId),
      // THE BOARDED CRAFT (discover+load contract, 2026-09-22):
      // the boarded families' model skills ride the same bundle —
      // no second hunt before compose.
      ...skillLinesForFamilies(repo, (def as { boarded: readonly string[] }).boarded),
    ],
    model_hints: hints,
    pack_hints,
  };
  bundle["digest"] = bundleDigest(bundle);
  return bundle;
}

/** Melite load for a FLOW: the leaf agents md + the registry
 *  signature (the tool overlay verbatim — ONE spelling, the same
 *  object validate/start enforce; null when the row declares
 *  none) + slim stages + the author's skill refs (verbatim) with
 *  their tier-1 lines. Throws LOUD on unknown flows. */
/** @param modelsSeat the context's models service when mounted — the
 *  flow's skill lines resolve through the seat the runs doors
 *  thread (the lane-seat law); the booted singleton otherwise */
export function loadFlow(
  repo: string,
  flowName: string,
  modelsSeat?: FamilyModelsSeat | null,
): Record<string, unknown> {
  const row = getRegistryFlow(flowName);
  if (row === undefined) throw new Error(`disclose: unknown flow '${flowName}'`);
  const stages = row.stages.map((s): Record<string, unknown> => ({
    id: s.id,
    // A family stage discloses its verb (family.action) — the card
    // key stays "" and the family keys ride alongside (stroke 4's
    // compose-at-expansion: the graph derives from the action).
    ...(s.family !== "" ? { family: s.family, action: s.action } : {}),
    card: s.card,
    description: s.description,
    // fromFlow links resolve at COMPILE time (expandRegistryFlow) —
    // disclosure serves the link verbatim, never a silent copy.
    ...(s.fromFlow !== null ? { fromFlow: { flow: s.fromFlow.flow, stage: s.fromFlow.stage } } : {}),
  }));
  const seen = new Set<string>();
  const skills: Array<Record<string, unknown>> = [];
  const pushLines = (cardId: string): void => {
    for (const line of skillLinesForCard(repo, cardId)) {
      // wireSkill always emits id (skillPlane.ts) — the String reads it.
      const id = String((line as { id: unknown }).id);
      /* v8 ignore next -- every bucket row carries a non-empty id
         (probed: card:image-gen's 3 doc lines): the skip never fires
         (2026-09-12) */
      if (id === "") continue;
      /* v8 ignore next -- stage cards never repeat a skill line in
         the registry (single-engine walk, unique ids): the dedupe
         never fires (2026-09-12) */
      if (seen.has(id)) continue;
      seen.add(id);
      skills.push(line);
    }
  };
  const pushFamilyLines = (fam: string): void => {
    for (const line of skillLinesForFamilies(repo, [fam])) {
      const id = String((line as { id: unknown }).id);
      if (id === "" || seen.has(id)) continue;
      seen.add(id);
      skills.push(line);
    }
  };
  // Card stages ride the card's skill lines; family stages ride
  // the FAMILY's (the boarded-craft law: no second hunt before
  // compose — a census flow's stages are all family-side).
  for (const s of row.stages) {
    if (s.family !== "") pushFamilyLines(s.family);
    else pushLines(s.card);
  }
  const refs: Array<Record<string, unknown>> = [];
  for (const ref of row.skillRefs) {
    const r = skillLineForRef(repo, ref, modelsSeat);
    refs.push(r);
    const line = r["line"] as Record<string, unknown> | null;
    /* v8 ignore next -- every registry skillRef resolves (the walk
       is the truth): the null arm never fires (2026-09-12) */
    if (line === null) continue;
    // wireSkill always emits id (skillPlane.ts) — the String reads it.
    const id = String((line as { id: unknown }).id);
    /* v8 ignore next -- probed: all 5 image-upscale ref lines carry
       ids (2026-09-12) */
    if (id === "") continue;
    /* v8 ignore next -- probed: ref ids (card:C) are disjoint from
       stage-line ids (card:C:doc), so the merge never dedupes
       (2026-09-12) */
    if (seen.has(id)) continue;
    seen.add(id);
    skills.push(line);
  }
  const bundle: Record<string, unknown> = {
    name: flowName,
    kind: "flow",
    signature: row.tool === null ? null : {
      name: row.tool.name,
      description: row.tool.description,
      properties: row.tool.properties,
      required: row.tool.required,
      overlays: row.tool.overlays,
    },
    agents: flowLeafDocs(repo, flowName),
    stages,
    refs: row.skillRefs.slice(),
    skills,
  };
  bundle["digest"] = bundleDigest(bundle);
  return bundle;
}

/** First-non-blank query value (the catalogs qFirst shape). */
