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
import { PyNum } from "./pyValue.ts";
import { parseJson, pyReprString } from "./pyJson.ts";
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

/** Frozen-export read failure (missing/unreadable/bad JSON, or a
 *  section with the wrong shape). Surfaces through _section as
 *  "ProbeError: ..." exactly as py's "%s: %s" formats unexpected
 *  exceptions (the wire token predates the freeze — kept). */
class ProbeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProbeError";
  }
}

/** A named 404 refusal (LookupError in py) — the door shapes it. */
class Door404 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Door404";
  }
}

/** A named 400 refusal (ValueError in py) — the door shapes it. */
class Door400 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Door400";
  }
}

// ---------------------------------------------------------------------------
// python-compat scalars
// ---------------------------------------------------------------------------

/** printf-style %s / %r / %d over a template (py % formatting for
 *  the refusal/orientation texts; %r of a string quotes via
 *  pyReprString). Templates are internal constants — values ride
 *  raw, exactly as py formats the template only. */
function fmt(template: string, ...args: unknown[]): string {
  let i = 0;
  return template.replace(/%[srd]/g, (m: string): string => {
    const a: unknown = args[i++];
    if (m === "%r") {
      if (typeof a === "string") return pyReprString(a);
      return pyReprScalar(a);
    }
    return String(a);
  });
}

/** round(x, 3) half-even on the binary double (gateway.py 3247 and
 *  the agent.boot ledger 3314; D8 for the exact-half-ulp edge). */
function pyRound3(v: number): number {
  const n: number = v * 1000;
  const lo: number = Math.floor(n);
  const diff: number = n - lo;
  if (diff < 0.5) return lo / 1000;
  if (diff > 0.5) return (lo + 1) / 1000;
  return (lo % 2 === 0 ? lo : lo + 1) / 1000;
}

/** repr() of a tool scalar (orientation knobs, refusal texts).
 *  Operates on parseJson values; PyNum keeps the SOURCE literal
 *  (default 1.0 renders "1.0", never "1"). */
function pyReprScalar(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return pyReprString(v);
  if (v instanceof PyNum) return v.literal;
  return String(v);
}

/** repr() of a python list of scalars ("['krea-2', 'z-image']" —
 *  the enum knob text, lane_disclosure 830). */
function pyReprStringList(items: unknown[]): string {
  return "[" + items.map(pyReprScalar).join(", ") + "]";
}

/** Lax str() coercion at the pydantic rim (pydantic v2 lax: int ->
 *  "5", integral float 5.0 -> "5.0", True -> "True"). PyNum carries
 *  the source literal so 5.0 survives (D6 off-domain). */
function laxStr(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v instanceof PyNum) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(v.literal)) {
      return null;
    }
    return v.literal;
  }
  return null;
}

/** Lax int gate for version (pydantic v2 lax int: "1"->1, 1.0->1,
 *  True->1, 1.5 refuses; ge=1 after). Null = refusal. */
function laxIntGe1(v: unknown): number | null {
  if (typeof v === "boolean") {
    const n: number = v ? 1 : 0;
    return n >= 1 ? n : null;
  }
  if (v instanceof PyNum) {
    const t: string = v.literal.trim();
    if (/^[+-]?\d+$/.test(t)) {
      const n: number = parseInt(t, 10);
      return n >= 1 ? n : null;
    }
    const f: number = Number(t);
    if (Number.isFinite(f) && Number.isInteger(f) && f >= 1) return f;
    return null;
  }
  return null;
}

/** Lax bool gate for hidden (pydantic v2 lax bool word set;
 *  undefined = absent). Null = refusal. */
function laxBool(v: unknown): boolean | null | "absent" {
  if (v === undefined) return "absent";
  if (v === null) return null;
  if (typeof v === "boolean") return v;
  if (v instanceof PyNum) {
    if (v.literal === "1" || v.literal === "1.0") return true;
    if (v.literal === "0" || v.literal === "0.0") return false;
    return null;
  }
  if (typeof v === "string") {
    const t: string = v.toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(t)) return true;
    if (["false", "0", "no", "n", "off"].includes(t)) return false;
  }
  return null;
}

/** A frozen tool number to a JS number (parseJson keeps literals
 *  as PyNum; integral literals parse exact). */
function pyNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v instanceof PyNum) {
    const n: number = Number(v.literal);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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
  // 5 up from doors/src/doors/ (the leaf split 2dcb2568 deepened the
  // tree; the anchor was off by one until 2026-09-09 — lanes,
  // card-tools, skills, and bundles all starved on a phantom root).
  return resolve(here, "..", "..", "..", "..", "..");
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

/** LOGGER PIN (platform-tier stroke): py-mirrored stderr —
 *  lane_disclosure.py prints these rows via print(..., file=
 *  sys.stderr), and the queue parity wall pins the stream. Stays on
 *  process.stderr with exact text, never ctx.logger. */
function loud(msg: string): void {
  process.stderr.write(msg + "\n");
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
    for (const line of (m[1] ?? "").split("\n")) {
      const kv: RegExpExecArray | null = KV_RE.exec(line);
      if (kv !== null) {
        // .strip('"\'') strips ALL leading/trailing quote chars.
        const val: string = (kv[2] ?? "").replace(/^["']+|["']+$/g, "");
        if (kv[1] === "name") name = val;
        else description = val;
      }
    }
  }
  if (name === "") {
    const h: RegExpExecArray | null = /^#\s+(.+)$/m.exec(text);
    name = h !== null ? (h[1] ?? "").trim() : "";
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

/** Field presence: undefined/null -> missing (pydantic "Field
 *  required"; lax str rejects None). min_length=1 after coercion. */
function reqStr(v: unknown): string | null {
  const s: string | null = laxStr(v);
  return s !== null && s.length >= 1 ? s : null;
}

/** ToolManifestRow + ParamsSchemaRow gate (lane_wire 62-124).
 *  Extra keys refuse (extra=forbid) at BOTH levels. */
function gateManifest(
  doc: unknown,
): { row: ManifestRow } | { refusal: string } {
  const bad: string[] = [];
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return { refusal: "manifest: expected an object" };
  }
  const d = doc as Record<string, unknown>;
  const allowed = new Set([
    "name",
    "version",
    "kind",
    "card",
    "flow",
    "model",
    "stage_title",
    "description",
    "params_schema",
    "hidden",
  ]);
  for (const k of Object.keys(d)) {
    if (!allowed.has(k)) bad.push(fmt("%s: Extra inputs are not permitted", k));
  }
  const name: string | null = reqStr(d["name"]);
  if (name === null) bad.push("name: Field required");
  const version: number | null = laxIntGe1(d["version"]);
  if (version === null) {
    bad.push(
      d["version"] === undefined
        ? "version: Field required"
        : "version: Input should be a valid integer",
    );
  }
  const kind: string | null = reqStr(d["kind"]);
  if (kind === null) bad.push("kind: Field required");
  const optStr = (key: string): string => {
    if (d[key] === undefined) return "";
    const s: string | null = laxStr(d[key]);
    if (s === null) bad.push(fmt("%s: Input should be a valid string", key));
    return s ?? "";
  };
  const card: string = optStr("card");
  const flow: string = optStr("flow");
  const model: string = optStr("model");
  const stageTitle: string = optStr("stage_title");
  const description: string = optStr("description");
  let schema: ManifestRow["paramsSchema"] | null = null;
  const ps: unknown = d["params_schema"];
  if (ps === undefined) {
    bad.push("params_schema: Field required");
  } else if (ps === null || typeof ps !== "object" || Array.isArray(ps)) {
    bad.push("params_schema: Input should be a valid dictionary");
  } else {
    const p = ps as Record<string, unknown>;
    for (const k of Object.keys(p)) {
      if (k !== "type" && k !== "properties" && k !== "required") {
        bad.push(fmt("params_schema.%s: Extra inputs are not permitted", k));
      }
    }
    const ptype: string | null = reqStr(p["type"]);
    if (ptype === null) bad.push("params_schema.type: Field required");
    let props: Record<string, unknown> = {};
    if (p["properties"] !== undefined) {
      if (
        p["properties"] === null ||
        typeof p["properties"] !== "object" ||
        Array.isArray(p["properties"])
      ) {
        bad.push("params_schema.properties: Input should be a valid dictionary");
      } else {
        props = p["properties"] as Record<string, unknown>;
      }
    }
    let required: string[] = [];
    if (p["required"] !== undefined) {
      if (!Array.isArray(p["required"])) {
        bad.push("params_schema.required: Input should be a valid list");
      } else {
        const rs: string[] = [];
        for (const r of p["required"]) {
          const s: string | null = laxStr(r);
          if (s === null) {
            bad.push("params_schema.required: Input should be a valid string");
            break;
          }
          rs.push(s);
        }
        required = rs;
      }
    }
    if (ptype !== null) schema = { type: ptype, properties: props, required };
  }
  let hidden: boolean | null = null;
  const h: boolean | null | "absent" = laxBool(d["hidden"]);
  if (h === null) bad.push("hidden: Input should be a valid boolean");
  else if (h !== "absent") hidden = h;
  // card XOR flow (after-validator 99-114).
  if (name !== null && kind !== null) {
    if (Boolean(card) === Boolean(flow)) {
      bad.push(
        fmt(
          "<root>: Value error, a tool manifest names its lane exactly " +
            "once (card XOR flow — card=%r flow=%r)",
          card,
          flow,
        ),
      );
    } else if (flow !== "" && kind !== "flow-tool") {
      bad.push(
        fmt(
          "<root>: Value error, a flow-addressed manifest is kind " +
            "flow-tool (got kind=%r flow=%r)",
          kind,
          flow,
        ),
      );
    } else if (card !== "" && kind === "flow-tool") {
      bad.push(
        fmt(
          "<root>: Value error, a card-addressed manifest is never " +
            "kind flow-tool (card=%r)",
          card,
        ),
      );
    }
  }
  if (bad.length > 0) return { refusal: bad.join("; ") };
  return {
    row: {
      name: name as string,
      version: version as number,
      kind: kind as string,
      card,
      flow,
      model,
      stageTitle,
      description,
      paramsSchema: schema as ManifestRow["paramsSchema"],
      hidden,
    },
  };
}

/** The served manifest shape (ToolManifestRow.wire 116-123):
 *  model_dump(exclude_none) in FIELD order, falsy card/flow popped
 *  (model "" and hidden:false STAY). */
function wireManifest(r: ManifestRow): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: r.name,
    version: r.version,
    kind: r.kind,
  };
  if (r.card !== "") out["card"] = r.card;
  if (r.flow !== "") out["flow"] = r.flow;
  out["model"] = r.model;
  out["stage_title"] = r.stageTitle;
  out["description"] = r.description;
  out["params_schema"] = {
    type: r.paramsSchema.type,
    properties: r.paramsSchema.properties,
    required: r.paramsSchema.required,
  };
  if (r.hidden !== null) out["hidden"] = r.hidden;
  return out;
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

/** SkillRow gate (lane_wire 190-226): card/model XOR, steps +
 *  step_count agreement. String = refusal text. */
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
): SkillRow | string {
  if (id.length < 1) return "id: String should have at least 1 character";
  if (name.length < 1) return "name: String should have at least 1 character";
  if (scope.length < 1) {
    return "scope: String should have at least 1 character";
  }
  if (card !== null && model !== null) {
    return fmt(
      "<root>: Value error, a skill row is card-scoped OR model-scoped, " +
        "never both (card=%r model=%r)",
      card,
      model,
    );
  }
  if ((steps === null) !== (stepCount === null)) {
    return "<root>: Value error, steps and step_count travel together";
  }
  if (steps !== null && stepCount !== null && stepCount !== steps.length) {
    return fmt(
      "<root>: Value error, step_count %d != %d step rows",
      stepCount,
      steps.length,
    );
  }
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
  const leaf: string = path.split("/").pop() ?? "";
  const gated: SkillRow | string = gateSkill(
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
  if (typeof gated === "string") {
    loud(fmt("[lane_disclosure] skill row refused (%s): %s", path, gated));
    return null;
  }
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
  if ((engine.split("/").pop() ?? "") !== "comfyui-cordis") return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : 0));
  for (const genre of ["3d", "audio", "image", "motion", "video"]) {
    const droot = join(repo, "packages", genre);
    if (!isDir(droot)) continue;
    for (const c of subdirs(droot)) {
      // the card unit of a package lives at src/ (card.ts + ui + agents)
      if (!isFile(join(droot, c, "src", "card.ts"))) continue;
      push(genre, c, join(droot, c, "src"));
    }
  }
  return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : 0));
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
    if (decl.loadError !== null) continue;
    const steps: StepRow[] = [];
    for (const s of decl.stages) {
      // FlowStepRow gate (id/type/plugin min_length=1) — refusal is
      // a code bug (LaneWireError, "flow %s: lane wire refusal").
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
    const gated: SkillRow | string = gateSkill(
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
    if (typeof gated === "string") {
      throw new LaneWireError(
        fmt("flow %s: lane wire refusal: %s", decl.id, gated),
      );
    }
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
    if (e instanceof LaneWireError) throw e;
    throw new LaneWireError(
      "skills envelope refusal: " + (e instanceof Error ? e.message : String(e)),
    );
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
        return {
          status: 500,
          payload: {
            error: "unreadable: " + (e instanceof Error ? e.message : String(e)),
          },
        };
      }
    }
    // SkillDocRow gate (id/name/description/scope/content) —
    // refusal is a code bug (the skill doc refusal).
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
    if (e instanceof LaneWireError) {
      return { status: 500, payload: { error: (e as Error).message } };
    }
    throw e;
  }
}
