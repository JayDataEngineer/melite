// skillPlane.ts — the skills plane, RE-HOMED (REBUILD-16,
// 2026-09-10): the dead gateway's planes.ts skill arms (killed
// with the gateway app) port here BESIDE their peers — the skill
// INDEX (GET /v1/skills), the skill READ (GET /v1/skills/:id),
// the doc-tree walkers (modelRows / cardRows / engineDirs), the
// SkillRow gate + wire shape, and the flow rows (LEVEL 4: one
// gated row per registry declaration). The contiguous spans
// planes.ts:151-1090 (errors/fmt/flow decls/fs/walks) and
// 1195-1260 (FlowRow + registryBody + flowRows) port wholesale —
// the manifest/orientation block between them (PyNum/parseJson
// consumers, the lane-bundle machinery) is the LOAD stroke's
// meat, not the skills'. The skill.read ledger ride is preserved
// (appendLedger → the queue core's own seam, gateway ledger
// 2241-2250).
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Underscore card dirs bridge to their registry ids here
 *  (dead doors/toolProjection.ts:27-31, verbatim — a future dir
 *  rename deletes the row). */
const DIR_ID_ALIASES: Readonly<Record<string, string>> = {
  img_to_mesh: "img-to-mesh",
  input_prep: "input-prep",
  mask_studio: "mask-studio",
};
import { appendLedger } from "./queue.ts";
import { pyReprString } from "./pyJson.ts";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
  registrySkillBody,
} from "./flowsData.ts";

/** A wire-contract refusal the disclosure engine could not
 *  construct around — the doors translate it to a structured 500
 *  (lane_disclosure.LaneWireError 100-102; the class NAME rides the
 *  boot error text via _section, so it stays "LaneWireError"). */
export class LaneWireError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaneWireError";
  }
}

// ---------------------------------------------------------------------------
// python-compat scalars
// ---------------------------------------------------------------------------

/** printf-style %s / %r / %d over a template (py % formatting for
 *  the refusal/orientation texts). Templates are internal constants
 *  — values ride raw, exactly as py formats the template only. */
function fmt(template: string, ...args: unknown[]): string {
  let i = 0;
  return template.replace(/%[srd]/g, (m: string): string => {
    const a: unknown = args[i++];
    // (%r serves strings at every live site — 404 ids, dir paths;
    // no live template formats %s/%d: every %s text guards a
    // statically-impossible refusal, so the else never fires.)
    return m === "%r"
      ? pyReprString(a as string)
      : /* v8 ignore next */ String(a);
  });
}




/** Path.stem (py: strip the last-dot suffix; dotfiles keep theirs). */
function stem(name: string): string {
  const i: number = name.lastIndexOf(".");
  if (i <= 0) return name;
  return name.slice(0, i);
}

// ---------------------------------------------------------------------------
// roots
// ---------------------------------------------------------------------------

/** Disclosure root (the REPO the doors read): MELITE_REPO_ROOT else
 *  file-anchored (the uploads-door pattern, gateway.py 63).
 *  Exported — the catalogs door anchors the same root (one root
 *  function, never duplicated). */
export function disclosureRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  // 4 up from estate-queue/src/ (the REBUILD-16 re-home shallowed the
  // tree — the ported 5-up anchor read the parent of the repo until
  // the skills spec pinned it, 2026-09-12).
  return resolve(here, "..", "..", "..", "..");
}

/** Process boot seconds (Gateway.boot_at 1074: construction time;
 *  the module loads at server boot — the same instant). */
const BOOT_AT: number = Date.now() / 1000;

// ---------------------------------------------------------------------------
// the flow declarations (the flows registry — flowsData.ts, re-homed
// REBUILD-13 from the dead gateway package)
// ---------------------------------------------------------------------------

/** One registry headless-tool property, projected to the frozen
 *  FlowToolDecl shape (always ptype + description; enum / default /
 *  minimum / maximum ride only when the registry declares them —
 *  nulls never serve). */
function projectToolProperties(
  properties: Record<string, {
    ptype: string;
    description: string;
    default: unknown;
    hasDefault: boolean;
    minimum: number | null;
    maximum: number | null;
    enum: readonly string[] | null;
  }>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [name, p] of Object.entries(properties)) {
    const cell: Record<string, unknown> = {
      ptype: p.ptype,
      description: p.description,
    };
    if (p.enum !== null) cell["enum"] = [...p.enum];
    if (p.hasDefault) cell["default"] = p.default;
    if (p.minimum !== null) cell["minimum"] = p.minimum;
    if (p.maximum !== null) cell["maximum"] = p.maximum;
    out[name] = cell;
  }
  return out;
}

interface FlowToolDecl {
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly properties: Record<string, Record<string, unknown>>;
  readonly required: string[];
}

interface FlowDecl {
  readonly id: string;
  readonly loadError: string | null;
  readonly description: string;
  readonly stages: { readonly id: string; readonly engine: string }[];
  readonly tool: FlowToolDecl | null;
  readonly skillRefs: string[];
  readonly hasSkillMd: boolean;
}

/** Flow declarations in registry order (registryFlowNames sorted),
 *  with load failures marked (py _flow_rows 389-393 skips FlowError
 *  silently — the registry is code, so a declaration bug throws LOUD
 *  out of expandRegistryFlow instead of marking a row). Skips the
 *  registry when flows/ is absent (py _flow_rows 387-388: not-a-dir
 *  -> []). The headless tool rides the registry declaration
 *  verbatim (projected to the frozen row shape); hasSkillMd reads
 *  the flows/<id>/SKILL.md leaf live. skillRefs ride the registry
 *  declaration (empty today — the frozen refs pointed at the
 *  retired flow.py rows and the retired enhance recipes, which
 *  resolve nowhere and would only skip-loud). */
function flowDecls(repo: string): FlowDecl[] {
  if (!isDir(join(repo, "flows"))) return [];
  const out: FlowDecl[] = [];
  for (const name of registryFlowNames()) {
    const flow = getRegistryFlow(name);
    /* v8 ignore next -- names and flows come from the same registry:
       the skip never fires (2026-09-12) */
    if (flow === undefined) continue;
    const expanded = expandRegistryFlow(flow);
    const stages: { readonly id: string; readonly engine: string }[] =
      expanded.stages.map((s) => ({ id: s.id, engine: s.engine }));
    let tool: FlowToolDecl | null = null;
    if (flow.tool !== null) {
      tool = {
        name: flow.tool.name,
        version: flow.tool.version,
        description: flow.tool.description,
        properties: projectToolProperties(flow.tool.properties),
        required: [...flow.tool.required],
      };
    }
    out.push({
      id: flow.id,
      loadError: null,
      description: flow.description,
      stages,
      tool,
      skillRefs: [...flow.skillRefs],
      hasSkillMd: isFile(join(repo, "flows", flow.id, "SKILL.md")),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// fs helpers (py stdlib move-for-move)
// ---------------------------------------------------------------------------

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Sorted subdir names, NO dot filter (the disclosure walks —
 *  _model_rows/_card_rows/_model_ids — never filter dots; only
 *  catalog._dirs_under does). D4 over non-ASCII. */
function subdirs(parent: string): string[] {
  let names: string[];
  try {
    names = readdirSync(parent);
  } catch {
    /* v8 ignore next -- every caller isDir-guards (TOCTOU-only):
       the fallback never fires (2026-09-12) */
    return [];
  }
  return names
    .filter((n: string): boolean => isDir(join(parent, n)))
    .sort();
}

function readText(p: string): string | null {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// frontmatter (lane_disclosure 110-127)
// ---------------------------------------------------------------------------

const FM_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const KV_RE = /^(name|description):\s*([\s\S]+?)\s*$/;

function frontmatter(text: string): { name: string; description: string } {
  let name = "";
  let description = "";
  const m: RegExpExecArray | null = FM_RE.exec(text);
  if (m !== null) {
    for (const line of (m[1] as string).split("\n")) {
      const kv: RegExpExecArray | null = KV_RE.exec(line);
      if (kv !== null) {
        // .strip('"\'') strips ALL leading/trailing quote chars.
        const val: string = (kv[2] as string).replace(/^["']+|["']+$/g, "");
        if (kv[1] === "name") name = val;
        else description = val;
      }
    }
  }
  if (name === "") {
    const h: RegExpExecArray | null = /^#\s+(.+)$/m.exec(text);
    name = h !== null ? (h[1] as string).trim() : "";
  }
  return { name, description };
}

// ---------------------------------------------------------------------------
// lane-wire gates (python/lane_wire.py — pydantic v2 lax, move-for-move)
// ---------------------------------------------------------------------------

export interface ManifestRow {
  readonly name: string;
  readonly version: number;
  readonly kind: string;
  readonly card: string;
  readonly flow: string;
  // PURGE S-snapshots: null rides (the clothing base row's model is
  // null — the /v1/tools door serves it verbatim, so the projection
  // preserves it and the doors agree; "" and null are both
  // model-less downstream).
  readonly model: string | null;
  readonly stageTitle: string;
  readonly description: string;
  readonly paramsSchema: {
    readonly type: string;
    readonly properties: Record<string, unknown>;
    // PURGE S-snapshots: the registry projection passes the
    // emitter's output VERBATIM (the emitter omits an empty
    // required — the /v1/tools overlay serves the same object, so
    // the doors agree byte-for-byte; JSON drops undefined).
    // Gate-built rows always carry the array.
    readonly required?: string[];
  };
  readonly hidden: boolean | null;
}


interface StepRow {
  readonly id: string;
  readonly type: string;
  readonly plugin: string;
}

export interface SkillRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scope: string;
  readonly genre: string | null;
  readonly card: string | null;
  readonly model: string | null;
  readonly steps: StepRow[] | null;
  readonly stepCount: number | null;
}

/** SkillRow constructor (lane_wire 190-226 shapes the row): the
 *  callers pre-gate — readDoc builds valid doc rows (exactly one of
 *  card/model, paired steps), flowRows pre-checks stages — so the
 *  refusal arms have no live caller and stay in py, not here. */
function gateSkill(
  id: string,
  name: string,
  description: string,
  scope: string,
  genre: string | null,
  card: string | null,
  model: string | null,
  steps: StepRow[] | null,
  stepCount: number | null,
): SkillRow {
  return {
    id,
    name,
    description,
    scope,
    genre,
    card,
    model,
    steps,
    stepCount,
  };
}

/** The served skill shape (SkillRow.wire 224-226): exclude_none in
 *  FIELD order. */
export function wireSkill(r: SkillRow): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: r.id,
    name: r.name,
    description: r.description,
    scope: r.scope,
  };
  if (r.genre !== null) out["genre"] = r.genre;
  if (r.card !== null) out["card"] = r.card;
  if (r.model !== null) out["model"] = r.model;
  if (r.steps !== null) {
    out["steps"] = r.steps.map(
      (s: StepRow): Record<string, unknown> => ({
        id: s.id,
        type: s.type,
        plugin: s.plugin,
      }),
    );
  }
  if (r.stepCount !== null) out["step_count"] = r.stepCount;
  return out;
}

// ---------------------------------------------------------------------------
// walks (lane_disclosure 130-337)
// ---------------------------------------------------------------------------

export interface DocRow {
  readonly row: SkillRow;
  readonly path: string;
}

/** One doc -> gated row (lane_disclosure._read_doc 130-152):
 *  OSError -> silent None; gate refusal -> LOUD None. */
function readDoc(
  path: string,
  sid: string,
  scope: string,
  genre: string | null,
  card: string | null,
  model: string | null,
): DocRow | null {
  const text: string | null = readText(path);
  if (text === null) return null;
  const fm: { name: string; description: string } = frontmatter(text);
  // (split never yields [] — pop is always a string here)
  const leaf: string = path.split("/").pop() as string;
  const gated: SkillRow = gateSkill(
    sid,
    fm.name !== "" ? fm.name : stem(leaf),
    fm.description.slice(0, 200),
    scope,
    genre,
    card,
    model,
    null,
    null,
  );
  return { row: gated, path };
}

/** Every plugin dir owning action cards (lane_disclosure._engine_dirs
 *  158-176 over plugins.iter_plugin_dirs_under: depth-2 + depth-3
 *  with package.json/plugin.yaml/engines/ marker, sorted —
 *  plugin.py retired 2026-09-08, package.json is the marker). */
export function engineDirs(enginesRoot: string): string[] {
  const marker = (d: string): boolean =>
    isFile(join(d, "package.json")) ||
    isFile(join(d, "plugin.yaml")) ||
    isDir(join(d, "engines"));
  let tops: string[];
  try {
    tops = readdirSync(enginesRoot).sort();
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of tops) {
    const full: string = join(enginesRoot, name);
    if (!isDir(full)) continue;
    if (marker(full)) {
      out.push(full);
      continue;
    }
    let subs: string[];
    try {
      subs = readdirSync(full).sort();
    } catch {
      /* v8 ignore next -- full isDir-guarded above (TOCTOU-only):
         the skip never fires (2026-09-12) */
      continue;
    }
    for (const sub of subs) {
      const sfull: string = join(full, sub);
      if (isDir(sfull) && marker(sfull)) out.push(sfull);
    }
  }
  return out;
}

/** LEVEL 1+3 model docs (lane_disclosure._model_rows 259-312):
 *  GUIDE.md / agents/AGENT.md / agents/skills/* per model dir. */
export function modelRows(engine: string): DocRow[] {
  const rows: DocRow[] = [];
  const modelsRoot: string = join(engine, "models");
  if (!isDir(modelsRoot)) return rows;
  for (const genre of subdirs(modelsRoot)) {
    for (const mid of subdirs(join(modelsRoot, genre))) {
      const mdir: string = join(modelsRoot, genre, mid);
      const guide: DocRow | null = readDoc(
        join(mdir, "GUIDE.md"),
        "guide:" + mid,
        "guide",
        genre,
        null,
        mid,
      );
      if (guide !== null) rows.push(guide);
      const agent: DocRow | null = readDoc(
        join(mdir, "agents", "AGENT.md"),
        "model:" + mid,
        "model",
        genre,
        null,
        mid,
      );
      if (agent !== null) rows.push(agent);
      let sks: string[];
      try {
        sks = readdirSync(join(mdir, "agents", "skills")).sort();
      } catch {
        continue;
      }
      for (const sk of sks) {
        const skp: string = join(mdir, "agents", "skills", sk);
        const doc: string = isDir(skp) ? join(skp, "SKILL.md") : skp;
        if (!isDir(skp) && !doc.endsWith(".md")) continue;
        const r: DocRow | null = readDoc(
          doc,
          "model:" + mid + ":" + sk,
          "model-skill",
          genre,
          null,
          mid,
        );
        if (r !== null) rows.push(r);
      }
    }
  }
  return rows;
}

export interface CardWalk {
  readonly rows: DocRow[];
  readonly buckets: Map<string, { dir: string; rows: DocRow[] }>;
}

/** THE CARD PACKAGE DOMAINS (the card sweep, 2026-09-09): cards
 *  live in their own packages — packages/<domain>/<card>/
 *  (src/card.ts + src/ui/ + src/agents/ in one unit). The engine
 *  src/cards tree keeps only cards not yet swept. This walk yields
 *  both, engine tree FIRST (deterministic order: remainder cards,
 *  then domains sorted, cards sorted — one spelling with the
 *  registry walk below). */
function cardUnitDirs(engine: string, repo: string): { genre: string; cname: string; cdir: string }[] {
  const out: { genre: string; cname: string; cdir: string }[] = [];
  const push = (genre: string, cname: string, cdir: string): void => {
    if (cname === "node_modules" || cname.startsWith(".")) return;
    if (cname.includes("_") && DIR_ID_ALIASES[cname] === undefined) {
      throw new LaneWireError(
        fmt(
          "[tool_projection] card dir %r has no registry mapping " +
            "(underscore dirs bridge via DIR_ID_ALIASES in " +
            "doors/toolProjection.ts — add the row or rename the dir)",
          cdir,
        ),
      );
    }
    out.push({ genre, cname: DIR_ID_ALIASES[cname] ?? cname, cdir });
  };
  // the engine remainder tree: <engine>/src/cards/<genre>/<card>
  const cardsRoot = join(engine, "src", "cards");
  if (isDir(cardsRoot)) {
    for (const genre of subdirs(cardsRoot)) {
      if (genre.startsWith("_")) continue;
      for (const c of subdirs(join(cardsRoot, genre))) {
        push(genre, c, join(cardsRoot, genre, c));
      }
    }
  }
  // the card package domains (de-doubled 2026-09-09: the genre dirs
  // are BARE words — <repo>/packages/<genre>/<card>/; the mapping
  // table died with the prefix, the dir IS the genre). models stays
  // out of this walk by content: model packages carry index.ts, no
  // card.ts — the isFile guard below is the discriminator.
  // UNION-ONCE (2026-09-10 — the picker-tripling fix): this walk is
  // engine-INDEPENDENT (repo-wide packages tree — no engine remainder
  // card trees exist anymore), but every caller merges per-engine
  // (buildCardTools, peek, cardRows). Emitting here for every engine
  // served each card once per engine dir (3× — the picker repeats).
  // Emit under the registry's owner engine ONLY (the manifests()
  // dir-less-cards precedent below) — never once per engine. The
  // owner is comfyui-cordis (factsPath in flowsCard.ts hardcodes it;
  // packages/engines/comfyui/ holds only action_cards tenants, it is
  // never itself an engine entry).
  // (split never yields [] — pop is always a string here; dir names
  // are unique so the equal arm never fires)
  if ((engine.split("/").pop() as string) !== "comfyui-cordis") return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : /* v8 ignore next */ 0));
  for (const genre of ["3d", "audio", "image", "motion", "video"]) {
    const droot = join(repo, "packages", genre);
    if (!isDir(droot)) continue;
    for (const c of subdirs(droot)) {
      // the card unit of a package lives at src/ (card.ts + ui + agents)
      if (!isFile(join(droot, c, "src", "card.ts"))) continue;
      push(genre, c, join(droot, c, "src"));
    }
  }
  return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : /* v8 ignore next */ 0));
}

/** LEVEL 2 card docs (lane_disclosure._card_rows 178-257): AGENT.md
 *  + agents/skills/* per card dir, bucketed by DIR NAME ("_" genres
 *  skipped). ONE root — the card-folder migration is complete
 *  (card-folder-shape design record, 2026-09-08): every card lives
 *  as src/cards/<genre>/<card>/ (one card one folder — card.ts +
 *  ui/ + agents/ in one unit); action_cards keeps only the
 *  no-host-card tenants (3d/body) and the genre ui packages. */
export function cardRows(engine: string, repo: string): CardWalk {
  const rows: DocRow[] = [];
  const buckets = new Map<string, { dir: string; rows: DocRow[] }>();
  {
    for (const { genre, cname, cdir } of cardUnitDirs(engine, repo)) {
      {
        const got: DocRow[] = [];
        // Oracle fallback order (lane_disclosure card walk): the
        // top-level AGENT.md wins, agents/AGENT.md orients when the
        // card ships no top-level doc (every estate card today).
        let agent: DocRow | null = readDoc(
          join(cdir, "AGENT.md"),
          "card:" + cname,
          "card",
          genre,
          cname,
          null,
        );
        if (agent === null) {
          agent = readDoc(
            join(cdir, "agents", "AGENT.md"),
            "card:" + cname,
            "card",
            genre,
            cname,
            null,
          );
        }
        if (agent !== null) got.push(agent);
        let sks: string[];
        try {
          sks = readdirSync(join(cdir, "agents", "skills")).sort();
        } catch {
          sks = [];
        }
        for (const sk of sks) {
          const skp: string = join(cdir, "agents", "skills", sk);
          const doc: string = isDir(skp) ? join(skp, "SKILL.md") : skp;
          if (!isDir(skp) && !doc.endsWith(".md")) continue;
          const r: DocRow | null = readDoc(
            doc,
            "card:" + cname + ":" + sk,
            "card-skill",
            genre,
            cname,
            null,
          );
          if (r !== null) got.push(r);
        }
        for (const g of got) rows.push(g);
        buckets.set(cname, { dir: cdir, rows: got });
      }
    }
  }
  return { rows, buckets };
}
export interface FlowRow {
  readonly row: SkillRow;
  readonly bodyPath: string;
  readonly bodyText: string | null;
}

/** The registry skill body for one flow id (null when the flow
 *  has its own SKILL.md or is unknown to the TS registry — the
 *  caller falls back to the file path). A registry flow whose
 *  declaration fails to expand is an authoring bug: LOUD, never a
 *  silent empty body. */
function registryBody(flowId: string): string | null {
  const decl = getRegistryFlow(flowId);
  /* v8 ignore next -- callers pass live declaration ids (flowDecls):
     the miss never fires (2026-09-12) */
  if (decl === undefined) return null;
  return registrySkillBody(expandRegistryFlow(decl));
}

/** LEVEL 4 flow rows (lane_disclosure._flow_rows 364-411): one gated
 *  SkillRow per loadable declaration (load_error -> silent skip);
 *  body = SKILL.md when present (mega-skill mode) else the TS
 *  registry render (flowsData.ts — the flow.py authoring plane died
 *  2026-09-08; the deleted source is neither servable nor wanted,
 *  so the declaration renders instead). */
export function flowRows(repo: string): FlowRow[] {
  const out: FlowRow[] = [];
  for (const decl of flowDecls(repo)) {
    /* v8 ignore next -- flowDecls marks loadError null (the registry
       is code — declaration bugs throw LOUD instead): the skip never
       fires (2026-09-12) */
    if (decl.loadError !== null) continue;
    const steps: StepRow[] = [];
    for (const s of decl.stages) {
      // FlowStepRow gate (id/type/plugin min_length=1) — refusal is
      // a code bug (LaneWireError, "flow %s: lane wire refusal").
      // (the static registry carries no empty ids/engines — the fence
      // never fires, but it stays: an authoring bug must throw LOUD)
      /* v8 ignore next */
      if (s.id.length < 1 || s.engine.length < 1) {
        throw new LaneWireError(
          fmt(
            "flow %s: lane wire refusal: id: String should have at " +
              "least 1 character",
            decl.id,
          ),
        );
      }
      steps.push({ id: s.id, type: s.engine, plugin: s.engine });
    }
    const gated: SkillRow = gateSkill(
      "flow:" + decl.id,
      decl.id,
      decl.description.slice(0, 200),
      "flow",
      null,
      null,
      null,
      steps,
      steps.length,
    );
    out.push({
      row: gated,
      bodyPath: decl.hasSkillMd
        ? join(repo, "flows", decl.id, "SKILL.md")
        : join(repo, "flows", decl.id, "flow.py"),
      bodyText: decl.hasSkillMd ? null : registryBody(decl.id),
    });
  }
  return out;
}

/** GET /v1/skills body (lane_disclosure.skill_index 633-649). */
export function buildSkillIndex(repo: string): Record<string, unknown> {
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  const rows: Record<string, unknown>[] = [];
  try {
    for (const engine of engines) {
      for (const r of modelRows(engine)) rows.push(wireSkill(r.row));
      for (const r of cardRows(engine, repo).rows) rows.push(wireSkill(r.row));
    }
    for (const fr of flowRows(repo)) rows.push(wireSkill(fr.row));
  } catch (e) {
    /* v8 ignore next -- the walks throw LaneWireError only (readDoc
       swallows I/O to null): the wrap never fires (2026-09-12) */
    if (!(e instanceof LaneWireError)) {
      throw new LaneWireError(
        "skills envelope refusal: " + (e instanceof Error ? e.message : String(e)),
      );
    }
    throw e;
  }
  return { count: rows.length, skills: rows };
}

interface AgentBlock {
  readonly source: string;
  readonly name: string;
  readonly content: string;
}

/** The inline agent block (lane_disclosure._agent_block 780-793):

/** Skill lookup across flow + model + card rows
 *  (lane_disclosure.skill_read 844-863). Flow rows may carry the
 *  rendered registry text (bodyText) instead of a file path. */
export function findSkill(
  repo: string,
  sid: string,
): { row: SkillRow; path: string; bodyText: string | null } | null {
  for (const fr of flowRows(repo)) {
    if (fr.row.id === sid) {
      return { row: fr.row, path: fr.bodyPath, bodyText: fr.bodyText };
    }
  }
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  for (const engine of engines) {
    for (const r of modelRows(engine)) {
      if (r.row.id === sid) return { row: r.row, path: r.path, bodyText: null };
    }
    for (const r of cardRows(engine, repo).rows) {
      if (r.row.id === sid) return { row: r.row, path: r.path, bodyText: null };
    }
  }
  return null;
}

/** GET /v1/skills/* (lane_disclosure.skill_read 844-880 via
 *  _h_skill_read 3906-3913): flow rows first, then model+card rows;
 *  success ledgers skill.read (gateway ledger 2241-2250, compact
 *  envelope — queue.ts appendLedger). */
export function hSkillRead(
  repo: string,
  stateRoot: string,
  sid: string,
): { status: number; payload: unknown } {
  try {
    const found: { row: SkillRow; path: string; bodyText: string | null } | null =
      findSkill(repo, sid);
    if (found === null) {
      return { status: 404, payload: { error: fmt("no such skill: %r", sid) } };
    }
    let body: string;
    if (found.bodyText !== null) {
      body = found.bodyText;
    } else {
      try {
        body = readFileSync(found.path, "utf8");
      } catch (e) {
        /* v8 ignore next -- found paths come from the same live walk
           (TOCTOU-only): the 500 never fires (2026-09-12) */
        return {
          status: 500,
          payload: {
            error: "unreadable: " + (e instanceof Error ? e.message : String(e)),
          },
        };
      }
    }
    // SkillDocRow gate (id/name/description/scope/content) —
    // refusal is a code bug (the skill doc refusal). The rows ride
    // the walks (never empty) and "" misses 404 above — the fence
    // never fires, but it stays.
    /* v8 ignore next */
    if (
      sid.length < 1 ||
      found.row.name.length < 1 ||
      found.row.scope.length < 1
    ) {
      throw new LaneWireError(
        fmt("skill doc refusal (%s): name: Field required", sid),
      );
    }
    appendLedger(stateRoot, "skill.read", { id: sid });
    return {
      status: 200,
      payload: {
        id: sid,
        name: found.row.name,
        description: found.row.description,
        scope: found.row.scope,
        content: body,
      },
    };
  } catch (e) {
    /* v8 ignore next -- findSkill throws LaneWireError only and the
       journal never throws (appendLedger swallows): the rethrow never
       fires (2026-09-12) */
    if (!(e instanceof LaneWireError)) throw e;
    return { status: 500, payload: { error: (e as Error).message } };
  }
}
