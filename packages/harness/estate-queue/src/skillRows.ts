// skillRows.ts — the skill index's row walkers (extracted from
// skillPlane.ts): tool properties, flow declarations, doc/spawn
// rows, engine/model/card/flow rows — module truth over paths.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DIR_ID_ALIASES, isDir, isFile, subdirs, readText, disclosureRoot, stem } from "./skillFs.ts";
import { frontmatter, gateSkill } from "./skillFrontmatter.ts";
import type { DocRow, SkillRow, StepRow } from "./skillPlane.ts";
import { LaneWireError } from "./skillPlane.ts";
import { expandRegistryFlow, getRegistryFlow, registryFlowNames, registrySkillBody } from "./flowsData.ts";

/** One registry headless-tool property, projected to the frozen
 *  FlowToolDecl shape (always ptype + description; enum / default /
 *  minimum / maximum ride only when the registry declares them —
 *  nulls never serve). */
export function projectToolProperties(
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
 *  with load failures marked (_flow_rows 389-393 skips FlowError
 *  silently — the registry is code, so a declaration bug throws LOUD
 *  out of expandRegistryFlow instead of marking a row). Skips the
 *  registry when flows/ is absent (_flow_rows 387-388: not-a-dir
 *  -> []). The headless tool rides the registry declaration
 *  verbatim (projected to the frozen row shape); hasSkillMd reads
 *  the flows/<id>/SKILL.md leaf live. skillRefs ride the registry
 *  declaration (empty today — the frozen refs pointed at the
 *  retired flow.py rows and the retired enhance recipes, which
 *  resolve nowhere and would only skip-loud). */
export function flowDecls(repo: string): FlowDecl[] {
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

/** One doc -> gated row (lane_disclosure._read_doc 130-152):
 *  OSError -> silent None; gate refusal -> LOUD None. */
export function readDoc(
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

/** THE SPAWN PLANE (operator pin, stroke 87): leaves under
 *  `agents/spawn/` (dir/SKILL.md, same shape as agents/skills/)
 *  are SUBAGENT-ONLY — findSkill resolves their refs for the
 *  agent-stage spawn injection (skills[] inlined into the spawned
 *  brief at stage start), but buildSkillIndex NEVER lists them:
 *  the constructor agent (the main chat session) does not see
 *  skills that belong to the spawned doer. The scope suffix
 *  `-spawn` is the structural mark; the index filter is the law. */
export function spawnRows(
  cdir: string,
  prefix: string,
  scope: "card-spawn" | "model-spawn",
  genre: string | null,
  card: string | null,
  model: string | null,
): DocRow[] {
  const out: DocRow[] = [];
  let sks: string[];
  try {
    sks = readdirSync(join(cdir, "agents", "spawn")).sort();
  } catch {
    return out;
  }
  for (const sk of sks) {
    const skp: string = join(cdir, "agents", "spawn", sk);
    const doc: string = isDir(skp) ? join(skp, "SKILL.md") : skp;
    if (!isDir(skp) && !doc.endsWith(".md")) continue;
    const r: DocRow | null = readDoc(doc, prefix + ":" + sk, scope, genre, card, model);
    if (r !== null) out.push(r);
  }
  return out;
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
      // THE SPAWN PLANE (subagent-only; the index filters, the
      // spawn reader resolves — never listed to the constructor).
      // Walked BEFORE the skills loop: a spawn-only model dir (no
      // agents/skills — the blender-door shape) must not be skipped
      // by that loop's readdir catch.
      for (const r of spawnRows(mdir, "model:" + mid, "model-spawn", genre, null, mid)) {
        rows.push(r);
      }
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
export function cardUnitDirs(engine: string, repo: string): { genre: string; cname: string; cdir: string }[] {
  const out: { genre: string; cname: string; cdir: string }[] = [];
  const push = (genre: string, cname: string, cdir: string): void => {
    if (cname === "node_modules" || cname.startsWith(".")) return;
    if (cname.includes("_") && DIR_ID_ALIASES[cname] === undefined) {
      throw new LaneWireError(
        "[tool_projection] card dir " + JSON.stringify(cdir) +
          " has no registry mapping (underscore dirs bridge via " +
          "DIR_ID_ALIASES in toolProjection.ts — add the row or " +
          "rename the dir)",
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
  // owner is comfyui-cordis (factsPath in cardsRegistry.ts hardcodes it;
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
        // THE SPAWN PLANE (subagent-only; the index filters, the
        // spawn reader resolves — never listed to the constructor).
        for (const r of spawnRows(cdir, "card:" + cname, "card-spawn", genre, cname, null)) {
          got.push(r);
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
  readonly bodyPath: string | null;
  readonly bodyText: string | null;
}

/** The registry skill body for one flow id (null when the flow
 *  has its own SKILL.md or is unknown to the TS registry — the
 *  caller falls back to the file path). A registry flow whose
 *  declaration fails to expand is an authoring bug: LOUD, never a
 *  silent empty body. */
export function registryBody(flowId: string): string | null {
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
          "flow " + decl.id + ": lane wire refusal: id: String " +
            "should have at least 1 character",
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
        : null,
      bodyText: decl.hasSkillMd ? null : registryBody(decl.id),
    });
  }
  return out;
}

/** GET /v1/skills body (lane_disclosure.melite_skill_index 633-649). The
 *  SPAWN PLANE filter: `-spawn` scoped rows NEVER ride the index —
 *  they are the spawned subagent's private leaves (findSkill
 *  resolves them for stage-start injection; the constructor's
 *  index/listing never sees them — the operator's pin). */
