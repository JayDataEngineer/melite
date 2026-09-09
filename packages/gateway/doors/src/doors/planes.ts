// ── FLIP-GAP STROKE: lane-discovery + agent-plane doors ─────────────
// Port of the py disclosure/observability arms to the TS preview
// gateway. ONE discipline throughout: py-identical wire shapes — the
// wall (tests/walls/suites/test_gateway_planes_parity.py) dual-serves
// py vs TS and byte-compares bodies.
//
// Door -> py source decisions (each arm read fully, no approximation):
//   GET /v1/lanes            _h_lanes 3059-3072 -> peek 498-562 (card
//                            walks _manifests 259-312 / _card_rows
//                            178-257 + flow splice _flow_rows 364-411;
//                            envelope lane_wire 163-176).
//   GET /v1/card-tools       _h_card_tools 3876-3888 -> card_tools
//                            585-630 (lane filter resolves card id /
//                            dir name / boarding model id / flow id;
//                            unknown lane 404).
//   GET /v1/cards/*/bundle  _h_lane_bundle 3915-3949 -> lane_bundle
//                            652-777 (card branch: lane=card=DECLARED
//                            id, families or [card_key], same-engine
//                            model rows + base chain, guides-first
//                            read_first[:6]; template branch: lane =
//                            REQUEST lane, always-composed orientation,
//                            read_first untruncated; 404 names kind).
//   GET /v1/skills           _h_skills 3890-3896 -> skill_index 633-649.
//   GET /v1/skills/*         _h_skill_read 3906-3913 -> skill_read
//                            844-880 (ledgered skill.read 2241-2250).
//   GET /v1/agent/boot      _h_agent_boot 3269-3318 (fault-isolated
//                            _section 3261-3266; gateway/health/queue/
//                            lanes/card_tools/skills/model_catalog/
//                            schema; ledgered agent.boot).
//   GET /v1/metrics         _h_metrics 3241-3258 + _pipeline_of 2098 /
//                            _recent_row 2109-2121.
//
// The flow splice (LIVE since 2026-09-10): flow LANES are TS
// declarations (doors/flowsRegistry.ts — the flows/*/flow.py
// authoring plane died 2026-09-08 under NO-ESTATE-PYTHON, and the
// authoring-time export died with the discovery blob 2026-09-10).
// flowDecls derives from the registry per request (ids, stages,
// tool declarations, skillRefs; hasSkillMd reads the flows/<id>/
// SKILL.md leaf live); every GATE (ToolManifestRow / SkillRow /
// FlowStepRow), the orientation composer, and the envelope assembly
// run NATIVELY here. No cache: the registry reads per request (the
// discovery-door posture — the scan cost is inherent to the
// read-your-own-tree design).
//
// The frozen file resolves under the DISCLOSURE root
// (MELITE_REPO_ROOT else file-anchored): hermetic fixtures stage
// their own freeze (the planes wall's build_fixture); production
// serves the checked-in estate freeze.
//
// Native reads mirror py stdlib move-for-move; KNOWN divergences
// (all outside the wall's exercised domain):
//   D1 str.strip/trim, lower/toLowerCase, [:N], len(): unicode edge
//      classes (\\x85, \\uFEFF, astral, Turkish İ) differ; exercised
//      domain is ASCII.
//   D2 dict ordering with integer-like keys: py preserves insertion,
//      JS objects ascend integer-like keys. Fixtures use string keys.
//   D3 non-UTF8 doc bytes: py surrogateescape preserves them, TS
//      substitutes U+FFFD. Fixtures are valid UTF-8.
//   D4 path sort: py sorts full-path code points, TS sorts dirent
//      UTF-16 units. Identical over ASCII.
//   D5 frontmatter \\s class: py \\s matches \\x1c-\\x1f, JS does not.
//      Identical over ASCII whitespace.
//   D6 lax int gate: py int("1_0")==10 / int(" 1 ")==1; the TS gate
//      takes plain decimal forms (whitespace-trimmed). Same verdict
//      on the exercised domain; refusal TEXT differs off-domain
//      (stderr/500 surface only).
//   D7 a file literally named ".md": py suffix "" skips it, TS reads
//      it. No such file in any fixture.
//   D8 ledger agent.boot uptime_s: py round() half-even on the binary
//      double; pyRound3 matches except exact-half ulps (unobservable:
//      ledger ts already differs per side).
//   D9 registry terms the preview does not retain (settled-run
//      counts, created/started stamps, WS subscriber sets, the recent
//      ring): derived from the live queueSnapshot() + fresh empties.
//      Fresh registries (the wall's domain) are EXACT — every such
//      term is {} / [] / null / 0 on both sides.
//
// Number fidelity: frozen-file JSON passes through parseJson so
// number VALUES survive exactly (literals normalize to numbers at
// the serve boundary — value-truth, ROW 29 STAGE 2);
// dumpsJson serializes (assets.ts). Refusal normalization
// rides the local normalize4xx alias (R4.2; the drafts-door precedent
// keeps the door importable without ctx).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dumpsJson,
  parseJson,
  pyReprString,
  unquotePy,
} from "./assets.ts";
import {
  PyNum,
} from "@melite/gateway-core";
import type {
  AssetRoots,
} from "@melite/gateway-core";
import { liveSources, catalogSection, schemaSection } from "./discoveryLive.ts";
import { queueSnapshot } from "./flowsRun.ts";
import type { RunsService } from "./flowsRun.ts";
import { needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService } from "./flowsCard.ts";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
  registrySkillBody,
} from "./flowsRegistry.ts";
import {
  DIR_ID_ALIASES,
  baseRowFor,
  projectCardRow,
} from "./toolProjection.ts";
import { appendLedger } from "@melite/gateway-queue";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";
import { ROUTES } from "@melite/gateway-core";

/** The dispatcher answer for plane doors (ctx.ts DispatchResult
 *  shape, restated locally so this module stays importable without
 *  the dispatcher — the drafts-door precedent). */
export interface PlaneResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

/** R4.2 dispatcher normalization — mirrors route() 4347-4356
 *  (kept HERE so this door module stays importable without the
 *  dispatcher; the P4 drafts-door precedent). */
export function normalize4xx(status: number, payload: unknown): unknown {
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    !("code" in (payload as Record<string, unknown>))
  ) {
    (payload as Record<string, unknown>)["code"] = "invalid_request";
  }
  return payload;
}

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

/** Gateway version (gateway.py 1066-1102 VERSION = "0.1.0"; the
 *  chrome HEALTH_JSON pins the same literal). */
const GATEWAY_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// the flow declarations (the flows registry — doors/flowsRegistry.ts)
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
function modelRows(engine: string): DocRow[] {
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

interface ManifestEntry {
  readonly genre: string;
  /** The CARD UNIT name (the cardRows bucket key = the declared id).
   *  Explicit since the package sweep: a package card's dir ends in
   *  /src, so dir-pop never yields the unit — the contract is this
   *  field, never path parsing. */
  readonly unit: string;
  readonly dir: string;
  readonly rows: ManifestRow[];
}

/** Card tool manifests (M1, 2026-09-09: the card emits the tool —
 *  rows project ENTIRELY from the primed registry; the card-dir
 *  tool.json snapshots (2026-09-08) and the frozen TOOLS_JSON
 *  base are both dead (toolProjection.ts derives every field).
 *  The walk still scopes dir-backed cards to the disclosure root
 *  (structure + readdir order preserved at BOTH glob levels);
 *  unregistered dirs (the planes fixture's plug fakes, stale dirs)
 *  skip silently; dir-less pure-tool cards (requiresModel false —
 *  no dir, no models, no docs) union in as root-independent
 *  globals under the registry-owner engine only (once, not once
 *  per engine). Keyed by DECLARED card id. */
function manifests(engine: string, repo: string, cards?: CardRegistryService | null): Map<string, ManifestEntry> {
  const out = new Map<string, ManifestEntry>();
  const defs = needCardRegistry(cards, "manifests").defsSync();
  const resolved = new Set<string>();
  // ONE root — the card-folder migration is complete (card-folder
  // design record, 2026-09-08): every card unit lives at
  // src/cards/<genre>/<card>/ (dash-named registry ids — the
  // DIR_ID_ALIASES bridge and the closed underscore refusal below
  // ride along for the history they document).
  {
    for (const { genre, cname: cid, cdir } of cardUnitDirs(engine, repo)) {
      const def = defs.get(cid);
      if (def === undefined) continue;
      resolved.add(cid);
      out.set(cid, {
        genre,
        unit: cid,
        dir: cdir,
        rows: [projectCardRow(def, baseRowFor(defs, cid))],
      });
    }
  }
  for (const [cid, def] of defs) {
    if (resolved.has(cid)) continue;
    if (def.requiresModel !== false) continue;
    // Dir-less pure-tool cards are engine-independent globals, but
    // the manifests() walk is per-engine (callers merge engines) —
    // union them under the registry's owner engine ONLY, never once
    // per engine (the registry IS the comfyui card set; factsPath +
    // cardDefs hardcode the same owner).
    if ((engine.split("/").pop() ?? "") !== "comfyui") continue;
    out.set(cid, { genre: "", unit: cid, dir: "", rows: [projectCardRow(def, baseRowFor(defs, cid))] });
  }
  return out;
}

/** Model ids under ONE engine (lane_disclosure._model_ids 314-319:
 *  unsorted accumulation — a SET, order-free except base_chain's
 *  sorted() use). */
function modelIds(engine: string): Set<string> {
  const ids = new Set<string>();
  const modelsRoot: string = join(engine, "models");
  let genres: string[];
  try {
    genres = readdirSync(modelsRoot);
  } catch {
    return ids;
  }
  for (const genre of genres) {
    const gdir: string = join(modelsRoot, genre);
    if (!isDir(gdir)) continue;
    let mids: string[];
    try {
      mids = readdirSync(gdir);
    } catch {
      continue;
    }
    for (const mid of mids) {
      if (isDir(join(gdir, mid))) ids.add(mid);
    }
  }
  return ids;
}

/** Base-model chain by leading token (lane_disclosure._base_chain
 *  322-329: sorted ids, exact id wins over prefixes). */
function baseChain(family: string, allIds: Set<string>): string[] {
  const out: string[] = [];
  for (const cand of [...allIds].sort()) {
    if (cand !== family && family.startsWith(cand + "-")) out.push(cand);
  }
  return out;
}

const KINDS: Record<string, string> = {
  action_card: "card",
  card: "card",
  template: "flow",
  flow: "flow",
};

/** kind vocabulary gate (lane_disclosure._norm_kind 339-358):
 *  empty -> null, unknown -> throw (the named refusal). */
function normKind(kind: string | null): string | null {
  if (kind === null || kind.trim() === "") return null;
  const k: string | undefined = KINDS[kind.trim().toLowerCase()];
  if (k === undefined) {
    throw new Error(
      fmt(
        "unknown kind %r — the lane table is the CALLABLE surface " +
          "(action_card | template); models are not lanes: parameter " +
          "detail via model_catalog, craft docs via skill_read",
        kind,
      ),
    );
  }
  return k;
}

// ---------------------------------------------------------------------------
// flow splice (lane_disclosure 364-487 over frozen declarations)
// ---------------------------------------------------------------------------

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
 *  registry render (doors/flowsRegistry.ts — the flow.py authoring
 *  plane died 2026-09-08; the deleted source is neither servable
 *  nor wanted, so the declaration renders instead). */
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

/** A headless flow tool declaration -> wire manifest
 *  (lane_disclosure._flow_tool_manifest 414-451). Null when the flow
 *  declares no tool. Gate refusal -> LaneWireError. */
function flowToolManifest(decl: FlowDecl): Record<string, unknown> | null {
  if (decl.tool === null) return null;
  const t: FlowToolDecl = decl.tool;
  const cells: Record<string, unknown> = {};
  for (const pname of Object.keys(t.properties)) {
    const p = t.properties[pname] as Record<string, unknown>;
    const cell: Record<string, unknown> = {
      type: typeof p["ptype"] === "string" ? p["ptype"] : "",
      description:
        typeof p["description"] === "string" ? p["description"] : "",
    };
    if (p["enum"] !== undefined) cell["enum"] = p["enum"];
    if (p["default"] !== undefined) cell["default"] = p["default"];
    if (p["minimum"] !== undefined) cell["minimum"] = p["minimum"];
    if (p["maximum"] !== undefined) cell["maximum"] = p["maximum"];
    cells[pname] = cell;
  }
  const g: { row: ManifestRow } | { refusal: string } = gateManifest({
    name: t.name,
    version:
      Number.isInteger(t.version) && typeof t.version === "number"
        ? new PyNum(String(t.version))
        : t.version,
    kind: "flow-tool",
    flow: decl.id,
    // stage_title + description ride the manifest exactly as py
    // builds them (_flow_tool_manifest 440-446: "%s (flow)", str()
    // of the tool description).
    stage_title: decl.id + " (flow)",
    description: t.description,
    params_schema: {
      type: "object",
      properties: cells,
      required: t.required,
    },
  });
  if ("refusal" in g) {
    throw new LaneWireError(
      fmt("flow %s: tool manifest refusal: %s", decl.id, g.refusal),
    );
  }
  return wireManifest(g.row);
}

interface OrientPropUnused {
  readonly name: string;
}

/** The flow orientation doc (lane_disclosure._flow_orientation
 *  796-841): head + step ladder + headless-tool call shape, composed
 *  from the gated flow ROW (steps) + the declaration (tool). The
 *  CARD BIRTH LAW paragraph is verbatim (\\u2014 em-dash). */
function flowOrientation(
  row: SkillRow,
  decl: FlowDecl,
): string {
  const lines: string[] = [fmt("# %s (flow template)", row.name), ""];
  if (row.description !== "") lines.push(row.description, "");
  lines.push("## Steps", "");
  for (const s of row.steps ?? []) {
    lines.push(
      fmt("- **%s** (%s%s)", s.id, s.type, s.plugin !== "" ? " · " + s.plugin : ""),
    );
  }
  if (decl.tool !== null) {
    const t: FlowToolDecl = decl.tool;
    const req = new Set<string>(t.required);
    lines.push(
      "",
      fmt("## Headless tool `%s`", t.name),
      t.description,
      "",
      "One call runs the whole flow — but CARD BIRTH LAW " +
        "(2026-09-06): compose the card FIRST " +
        "(POST /v1/flows/drafts with this same body takes " +
        "a draftId), then start:",
      "",
      fmt(
        "    POST /v1/flows/start " +
          '{"flow": "%s", "draft_id": "<draftId>", ' +
          "...params}",
        row.name,
      ),
      "",
      "(A start without a doc-backed draft_id 4xxes BEFORE " +
        "any run registers. Compile first without a queue " +
        "slot: POST /v1/flows/validate.)",
      "",
    );
    for (const pname of Object.keys(t.properties)) {
      const p = t.properties[pname] as Record<string, unknown>;
      const bits: string[] = [typeof p["ptype"] === "string" ? p["ptype"] : ""];
      if (p["enum"] !== undefined) {
        bits.push(
          fmt(
            "one of %s",
            pyReprStringList(
              Array.isArray(p["enum"]) ? (p["enum"] as unknown[]) : [],
            ),
          ),
        );
      }
      if (req.has(pname)) bits.push("required");
      // %r formats the RAW frozen value (fmt quotes strings, keeps
      // PyNum literals verbatim — never pre-render).
      else if (p["default"] !== undefined) {
        bits.push(fmt("default %r", p["default"]));
      } else bits.push("optional");
      const descr: string =
        typeof p["description"] === "string" ? p["description"] : "";
      lines.push(
        fmt("- `%s` (%s)%s", pname, bits.join(", "), descr !== "" ? " — " + descr : ""),
      );
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// builders (one per door body)
// ---------------------------------------------------------------------------

interface PeekRow {
  readonly kind: string;
  readonly lane: string;
  readonly genre: string | null;
  readonly title: string;
  readonly description: string;
  readonly shape: number;
  readonly skills: number;
  readonly isCard: boolean;
}

/** GET /v1/lanes body (lane_disclosure.peek 498-562). */
function buildPeek(
  repo: string,
  kind: string | null,
  genre: string | null,
  cards?: CardRegistryService | null,
): Record<string, unknown> {
  let k: string | null;
  try {
    k = normKind(kind);
  } catch (e) {
    return {
      count: 0,
      lanes: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
  const g: string | null =
    genre === null || genre.trim() === "" ? null : genre.trim().toLowerCase();
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  const rows: PeekRow[] = [];
  try {
    for (const engine of engines) {
      const mans: Map<string, ManifestEntry> = manifests(engine, repo, cards);
      const walk: CardWalk = cardRows(engine, repo);
      for (const [cid, entry] of mans) {
        const gg: string | null =
          entry.genre !== "" ? entry.genre.toLowerCase() : null;
        if (g !== null && gg !== g) continue;
        // Skill rows bucket by the card DIR — match on it, not the
        // declared card id (peek 527-530).
        const dname: string = entry.unit;
        let skills = 0;
        for (const r of walk.rows) {
          if (r.row.card === dname) skills++;
        }
        let params = 0;
        let title: string | null = null;
        for (const m of entry.rows) {
          params = Math.max(
            params,
            Object.keys(m.paramsSchema.properties).length,
          );
          if (title === null && m.stageTitle !== "") title = m.stageTitle;
        }
        let description = "";
        for (const m of entry.rows) {
          if (m.description !== "") {
            description = m.description;
            break;
          }
        }
        // CardLaneRow gate — refusal is a code bug (the lanes
        // envelope refusal).
        if (cid.length < 1 || (title ?? cid).length < 1) {
          throw new LaneWireError(
            "lanes envelope refusal: lane: String should have at " +
              "least 1 character",
          );
        }
        rows.push({
          kind: "action_card",
          lane: cid,
          genre: gg,
          title: title ?? cid,
          description,
          shape: params,
          skills,
          isCard: true,
        });
      }
    }
    for (const fr of flowRows(repo)) {
      if (fr.row.name.length < 1) {
        throw new LaneWireError(
          "lanes envelope refusal: lane: String should have at " +
            "least 1 character",
        );
      }
      rows.push({
        kind: "template",
        lane: fr.row.name,
        genre: null,
        title: fr.row.name,
        description: fr.row.description.slice(0, 120),
        shape: fr.row.stepCount ?? 0,
        skills: 0,
        isCard: false,
      });
    }
  } catch (e) {
    if (e instanceof LaneWireError) {
      throw e.message.startsWith("lanes envelope refusal")
        ? e
        : new LaneWireError("lanes envelope refusal: " + e.message);
    }
    throw new LaneWireError(
      "lanes envelope refusal: " + (e instanceof Error ? e.message : String(e)),
    );
  }
  const kept: PeekRow[] = rows.filter((r: PeekRow): boolean => {
    if (k === "card") return r.isCard;
    if (k === "flow") return !r.isCard;
    return true;
  });
  return {
    count: kept.length,
    lanes: kept.map(
      (r: PeekRow): Record<string, unknown> => {
        if (r.isCard) {
          return {
            kind: "action_card",
            lane: r.lane,
            genre: r.genre,
            title: r.title,
            description: r.description,
            params: r.shape,
            skills: r.skills,
          };
        }
        return {
          kind: "template",
          lane: r.lane,
          genre: r.genre,
          title: r.title,
          description: r.description,
          steps: r.shape,
        };
      },
    ),
  };
}

/** lane -> declared card id (lane_disclosure._resolve_card_dir
 *  568-582): the card id, the card dir name, or the card boarding
 *  the model id. */
function resolveCardDir(
  mans: Map<string, ManifestEntry>,
  lane: string,
): string | null {
  if (mans.has(lane)) return lane;
  for (const [cid, entry] of mans) {
    if (entry.unit === lane) return cid;
  }
  for (const [cid, entry] of mans) {
    for (const m of entry.rows) {
      if (m.model === lane) return cid;
    }
  }
  return null;
}

/** GET /v1/card-tools body (lane_disclosure.card_tools 585-630). */
function buildCardTools(
  repo: string,
  lane: string | null,
  cards?: CardRegistryService | null,
): Record<string, unknown>[] {
  const l: string = (lane ?? "").trim();
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  const out: Record<string, unknown>[] = [];
  if (l !== "") {
    for (const engine of engines) {
      const mans: Map<string, ManifestEntry> = manifests(engine, repo, cards);
      const cid: string | null = resolveCardDir(mans, l);
      if (cid !== null) {
        for (const m of (mans.get(cid) as ManifestEntry).rows) {
          out.push(wireManifest(m));
        }
        return out;
      }
    }
    // The flow match is verbatim py (card_tools 615-616): the
    // gated row NAME or the "flow:%s" template over the REQUEST lane
    // — and the row id is ALREADY "flow:<id>", so the template
    // ("flow:"+lane == row id) reduces to lane == the bare id. The
    // template is dead surface (a "flow:"-prefixed lane never
    // resolves); the bare-id check below mirrors both arms exactly.
    for (const decl of flowDecls(repo)) {
      if (decl.loadError !== null) continue;
      if (decl.id === l) {
        const manifest: Record<string, unknown> | null =
          flowToolManifest(decl);
        if (manifest === null) {
          throw new Door404(
            fmt(
              "flow %r declares no headless tool (no tool=... in " +
                "flows/%s/flow.py) — there is no single tool " +
                "to mount; load the template bundle instead",
              l,
              decl.id,
            ),
          );
        }
        return [manifest];
      }
    }
    throw new Door404(
      fmt(
        "no such lane: %r — /v1/card-tools?lane= resolves a card " +
          "dir name (see /v1/lanes) or a model id landing on its " +
          "card",
        l,
      ),
    );
  }
  for (const engine of engines) {
    for (const entry of manifests(engine, repo, cards).values()) {
      for (const m of entry.rows) out.push(wireManifest(m));
    }
  }
  return out;
}

/** GET /v1/skills body (lane_disclosure.skill_index 633-649). */
function buildSkillIndex(repo: string): Record<string, unknown> {
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
 *  the row's own doc, "" when unreadable. */
function agentBlock(agentRow: DocRow | null): AgentBlock | null {
  if (agentRow === null) return null;
  const content: string | null = readText(agentRow.path);
  return {
    source: agentRow.row.id,
    name: agentRow.row.name,
    content: content === null ? "" : content,
  };
}

/** GET /v1/cards/{lane}/bundle body (lane_disclosure.lane_bundle 652-777).
 *  BundleRow gate invariants hold by construction (card branch:
 *  card set + no flows + card-addressed tools; template branch: no
 *  card + flow-tool manifests + the flow row); violation throws the
 *  bundle refusal. */
function buildLaneBundle(
  repo: string,
  lane: string,
  kind: string | null,
  cards?: CardRegistryService | null,
): Record<string, unknown> {
  let k: string | null;
  try {
    k = normKind(kind);
  } catch (e) {
    throw new Door400(e instanceof Error ? e.message : String(e));
  }
  const l: string = lane.trim();
  if (l === "") throw new Door400("lane is required");
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  // Card branch (one engine owns the lane; lane=card=DECLARED id).
  for (const engine of engines) {
    const mans: Map<string, ManifestEntry> = manifests(engine, repo, cards);
    const cardKey: string | null = resolveCardDir(mans, l);
    if (cardKey === null) continue;
    if (k === "flow") continue;
    const entry: ManifestEntry = mans.get(cardKey) as ManifestEntry;
    const models: DocRow[] = modelRows(engine);
    const ids: Set<string> = modelIds(engine);
    const tools: ManifestRow[] = entry.rows;
    const families: string[] = [];
    for (const m of tools) {
      if (
        typeof m.model === "string" &&
        m.model !== "" &&
        !families.includes(m.model)
      )
        families.push(m.model);
    }
    if (families.length === 0) families.push(cardKey);
    const walk: CardWalk = cardRows(engine, repo);
    const dname: string = entry.unit;
    const bucket: { dir: string; rows: DocRow[] } | undefined =
      walk.buckets.get(dname);
    const bucketRows: DocRow[] = bucket?.rows ?? [];
    let agentRow: DocRow | null = null;
    for (const r of bucketRows) {
      if (r.row.id === "card:" + dname) {
        agentRow = r;
        break;
      }
    }
    const skills: SkillRow[] = bucketRows.map((r: DocRow): SkillRow => r.row);
    for (const fam of families) {
      for (const r of models) {
        const rid: string = r.row.id;
        if (
          rid === "model:" + fam ||
          rid.startsWith("model:" + fam + ":") ||
          rid === "guide:" + fam
        ) {
          skills.push(r.row);
        }
      }
      for (const base of baseChain(fam, ids)) {
        for (const r of models) {
          const rid: string = r.row.id;
          if (
            rid === "model:" + base ||
            rid.startsWith("model:" + base + ":") ||
            rid === "guide:" + base
          ) {
            skills.push(r.row);
          }
        }
      }
    }
    // Dedupe by id, keep order; guides first for read_first.
    const seen = new Set<string>();
    const uniq: SkillRow[] = [];
    for (const r of skills) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        uniq.push(r);
      }
    }
    const guides: string[] = uniq
      .filter((r: SkillRow): boolean => r.id.startsWith("guide:"))
      .map((r: SkillRow): string => r.id);
    const rest: string[] = uniq
      .filter((r: SkillRow): boolean => !r.id.startsWith("guide:"))
      .map((r: SkillRow): string => r.id);
    return {
      lane: cardKey,
      card: cardKey,
      kind: "action_card",
      agent: agentBlock(agentRow),
      tools: tools.map(wireManifest),
      flows: [],
      skills: uniq.map(wireSkill),
      read_first: [...guides, ...rest].slice(0, 6),
    };
  }
  // Template branch (lane = REQUEST lane, orientation always).
  // The match is verbatim py (lane_bundle 743): the gated row NAME
  // or the "flow:%s" template over the REQUEST lane — and the row id
  // is ALREADY "flow:<id>", so the template ("flow:"+lane == row id)
  // reduces to lane == the bare id. The template is dead surface (a
  // "flow:"-prefixed lane never resolves); the bare-id check below
  // mirrors both arms exactly.
  if (k !== "card") {
    const decls: FlowDecl[] = flowDecls(repo);
    const frows: FlowRow[] = flowRows(repo);
    for (const decl of decls) {
      if (decl.loadError !== null) continue;
      if (decl.id !== l) continue;
      const fr: FlowRow | undefined = frows.find(
        (f: FlowRow): boolean => f.row.id === "flow:" + decl.id,
      );
      if (fr === undefined) continue;
      const manifest: Record<string, unknown> | null =
        flowToolManifest(decl);
      const tools: Record<string, unknown>[] =
        manifest !== null ? [manifest] : [];
      // skill_refs resolve against flow + model + card rows,
      // setdefault first-wins; exclude carries riding ids.
      const pool = new Map<string, SkillRow>();
      for (const f of frows) {
        if (!pool.has(f.row.id)) pool.set(f.row.id, f.row);
      }
      for (const engine of engines) {
        for (const r of modelRows(engine)) {
          if (!pool.has(r.row.id)) pool.set(r.row.id, r.row);
        }
        for (const r of cardRows(engine, repo).rows) {
          if (!pool.has(r.row.id)) pool.set(r.row.id, r.row);
        }
      }
      const exclude = new Set<string>([fr.row.id]);
      const extra: SkillRow[] = [];
      for (const ref of decl.skillRefs) {
        if (exclude.has(ref)) continue;
        const hit: SkillRow | undefined = pool.get(ref);
        if (hit === undefined) {
          loud(
            fmt(
              "[lane_disclosure] flow %s: skill_ref %r resolves " +
                "nowhere — skipped",
              decl.id,
              ref,
            ),
          );
          continue;
        }
        exclude.add(ref);
        extra.push(hit);
      }
      const skills: SkillRow[] = [fr.row, ...extra];
      return {
        lane: l,
        card: null,
        kind: "template",
        agent: {
          source: fr.row.id,
          name: fr.row.name,
          content: flowOrientation(fr.row, decl),
        },
        tools,
        flows: [wireSkill(fr.row)],
        skills: skills.map(wireSkill),
        read_first: skills.map((r: SkillRow): string => r.id),
      };
    }
  }
  throw new Door404(fmt("no such lane: %r (kind=%s)", l, k ?? "any"));
}

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

// ---------------------------------------------------------------------------
// doors
// ---------------------------------------------------------------------------

function door404(e: Door404): { status: number; payload: Record<string, unknown> } {
  return { status: 404, payload: { error: e.message } };
}

export function hLanes(
  repo: string,
  kind: string | null,
  genre: string | null,
  cards?: CardRegistryService | null,
): { status: number; payload: unknown } {
  try {
    return { status: 200, payload: buildPeek(repo, kind, genre, cards) };
  } catch (e) {
    if (e instanceof LaneWireError) {
      return {
        status: 500,
        payload: { error: fmt("lane wire refusal (lanes): %s", (e as Error).message) },
      };
    }
    throw e;
  }
}

export function hCardTools(
  repo: string,
  lane: string | null,
  cards?: CardRegistryService | null,
): { status: number; payload: unknown } {
  try {
    return { status: 200, payload: buildCardTools(repo, lane, cards) };
  } catch (e) {
    if (e instanceof Door404) return door404(e);
    if (e instanceof LaneWireError) {
      return {
        status: 500,
        payload: {
          error: fmt("lane wire refusal (card-tools): %s", (e as Error).message),
        },
      };
    }
    throw e;
  }
}

export function hSkills(repo: string): { status: number; payload: unknown } {
  try {
    return { status: 200, payload: buildSkillIndex(repo) };
  } catch (e) {
    if (e instanceof LaneWireError) {
      return {
        status: 500,
        payload: { error: fmt("lane wire refusal (skills): %s", (e as Error).message) },
      };
    }
    throw e;
  }
}

export function hLaneBundle(
  repo: string,
  lane: string,
  kind: string | null,
  cards?: CardRegistryService | null,
): { status: number; payload: unknown } {
  try {
    return { status: 200, payload: buildLaneBundle(repo, lane, kind, cards) };
  } catch (e) {
    if (e instanceof Door404) return door404(e);
    if (e instanceof Door400) {
      return { status: 400, payload: { error: e.message } };
    }
    if (e instanceof LaneWireError) {
      return {
        status: 500,
        payload: {
          error: fmt("lane wire refusal (lane_bundle): %s", (e as Error).message),
        },
      };
    }
    throw e;
  }
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

/** GET /v1/metrics (gateway._h_metrics 3241-3258). Registry terms
 *  the preview retains: queue depth/queued from the live
 *  queueSnapshot(); runs_registered + runs_by_status derived from
 *  that snapshot (settled runs invisible — D9); boot_at/uptime_s
 *  from process boot; active null on fresh boot (D9: created/
 *  started stamps unretained); subscribers/recent fresh empties
 *  (no WS bus / worker feed in the preview — D9). */
export function hMetrics(
  svc?: RunsService | null,
): { status: number; payload: unknown } {
  const snap: {
    queued: number;
    running: number;
    active: string;
    queued_ids: string[];
  } = queueSnapshot(svc ?? undefined);
  const counts: Record<string, number> = {};
  if (snap.queued > 0) counts["queued"] = snap.queued;
  if (snap.running > 0) counts["running"] = snap.running;
  const now: number = Date.now() / 1000;
  return {
    status: 200,
    // Key order is the constructor order (gateway.py 3248-3256).
    payload: {
      boot_at: BOOT_AT,
      uptime_s: pyRound3(now - BOOT_AT),
      queue_depth: snap.queued,
      queued: [...snap.queued_ids],
      active: null,
      runs_registered: snap.queued + snap.running,
      runs_by_status: counts,
      subscribers: {},
      recent: [],
    },
  };
}

/** One fault-isolated section (gateway._section 3261-3266):
 *  exceptions become {"error": "<Type>: <msg>"} — never a 500. */
function section(fn: () => unknown): unknown {
  try {
    return fn();
  } catch (e) {
    const name: string = e instanceof Error ? e.constructor.name : "Error";
    const msg: string = e instanceof Error ? e.message : String(e);
    return { error: name + ": " + msg };
  }
}

/** The async section (the boot's live catalog/schema overlays) —
 *  same fault isolation, awaited (a rejection degrades the section,
 *  never the boot). */
async function sectionAsync(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    return await fn();
  } catch (e) {
    const name: string = e instanceof Error ? e.constructor.name : "Error";
    const msg: string = e instanceof Error ? e.message : String(e);
    return { error: name + ": " + msg };
  }
}

/** GET /v1/agent/boot (gateway._h_agent_boot 3269-3318): gateway
 *  truth + health + all discovery in ONE fault-isolated payload,
 *  then the agent.boot ledger row (routes + uptime_s). Async — the
 *  catalog/schema sections derive live (the card boot rides the
 *  loadCardDefs cache after first call). */
export async function hAgentBoot(
  repo: string,
  stateRoot: string,
  svc?: RunsService | null,
  cards?: CardRegistryService | null,
): Promise<{ status: number; payload: unknown }> {
  const now: number = Date.now() / 1000;
  const snap: {
    queued: number;
    running: number;
    active: string;
    queued_ids: string[];
  } = queueSnapshot(svc ?? undefined);
  const counts: Record<string, number> = {};
  if (snap.queued > 0) counts["queued"] = snap.queued;
  if (snap.running > 0) counts["running"] = snap.running;
  const manifest: Record<string, unknown> = {
    gateway: {
      version: GATEWAY_VERSION,
      routes: ROUTES.length,
      boot_at: BOOT_AT,
      uptime_s: pyRound3(now - BOOT_AT),
    },
    health: { status: "ok", version: GATEWAY_VERSION },
    queue: {
      depth: snap.queued,
      queued: [...snap.queued_ids],
      active: snap.active !== "" ? snap.active : null,
      runs_by_status: counts,
    },
    lanes: section(() => buildPeek(repo, null, null, cards)),
    card_tools: section(() => buildCardTools(repo, null, cards)),
    skills: section(() => buildSkillIndex(repo)),
    // The catalog/schema sections derive LIVE (the same builders
    // the discovery doors serve — fault-isolated per section, so a
    // declaration bug degrades one section, never the boot).
    model_catalog: await sectionAsync(() =>
      liveSources().then(({ defs }) => catalogSection(defs)),
    ),
    schema: await sectionAsync(() =>
      liveSources().then(({ defs }) => schemaSection(defs)),
    ),
  };
  appendLedger(stateRoot, "agent.boot", {
    routes: ROUTES.length,
    uptime_s: pyRound3(Date.now() / 1000 - BOOT_AT),
  });
  return { status: 200, payload: manifest };
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

/** First-non-blank query value (parse_qs drops blanks: urllib —
 *  the flowsRun firstQuery precedent). */
function qFirst(qs: Record<string, string[]>, name: string): string | null {
  const vals: string[] | undefined = qs[name];
  if (vals === undefined) return null;
  const hit: string | undefined = vals.find((v: string): boolean => v !== "");
  return hit ?? null;
}

/** The raw-target query parse (ctx.parseQuery shape: name ->
 *  values; query stays raw — the server splits path/query). */
function parseTargetQuery(target: string): Record<string, string[]> {
  const qs: Record<string, string[]> = {};
  const qpos: number = target.indexOf("?");
  if (qpos < 0) return qs;
  for (const pair of target.slice(qpos + 1).split("&")) {
    if (pair === "") continue;
    const eq: number = pair.indexOf("=");
    const rk: string = eq < 0 ? pair : pair.slice(0, eq);
    const rv: string = eq < 0 ? "" : pair.slice(eq + 1);
    let k: string;
    let v: string;
    try {
      k = decodeURIComponent(rk.replace(/\+/g, " "));
    } catch {
      k = rk;
    }
    try {
      v = decodeURIComponent(rv.replace(/\+/g, " "));
    } catch {
      v = rv;
    }
    const cur: string[] | undefined = qs[k];
    if (cur === undefined) qs[k] = [v];
    else cur.push(v);
  }
  return qs;
}

function answer(status: number, payload: unknown): PlaneResult {
  normalize4xx(status, payload);
  return {
    status,
    body: dumpsJson(payload),
    contentType: "application/json",
    headers: {},
  };
}

/** The 7-door dispatcher arm (ctx.ts calls this for the plane
 *  handlers; null = not ours). Async — the agent-boot arm derives
 *  live; the other six stay sync work under the async seam. */
export async function dispatchPlanes(
  handler: string,
  m: RegExpExecArray | null,
  target: string,
  roots: AssetRoots,
  svc?: RunsService | null,
  cards?: CardRegistryService | null,
): Promise<PlaneResult | null> {
  const repo: string = disclosureRoot();
  const qs: Record<string, string[]> = parseTargetQuery(target);
  switch (handler) {
    case "_h_lanes": {
      const r: { status: number; payload: unknown } = hLanes(
        repo,
        qFirst(qs, "kind"),
        qFirst(qs, "genre"),
        cards,
      );
      return answer(r.status, r.payload);
    }
    case "_h_card_tools": {
      const r: { status: number; payload: unknown } = hCardTools(
        repo,
        qFirst(qs, "lane"),
        cards,
      );
      return answer(r.status, r.payload);
    }
    case "_h_lane_bundle": {
      const lane: string =
        m !== null && m[1] !== undefined ? unquotePy(String(m[1])) : "";
      const r: { status: number; payload: unknown } = hLaneBundle(
        repo,
        lane,
        qFirst(qs, "kind"),
        cards,
      );
      return answer(r.status, r.payload);
    }
    case "_h_skills": {
      const r: { status: number; payload: unknown } = hSkills(repo);
      return answer(r.status, r.payload);
    }
    case "_h_skill_read": {
      // No strip (skill_read 844: the unquoted id is final).
      const sid: string =
        m !== null && m[1] !== undefined ? unquotePy(String(m[1])) : "";
      const r: { status: number; payload: unknown } = hSkillRead(
        repo,
        roots.stateRoot,
        sid,
      );
      return answer(r.status, r.payload);
    }
    case "_h_agent_boot": {
      const r: { status: number; payload: unknown } = await hAgentBoot(
        repo,
        roots.stateRoot,
        svc,
        cards,
      );
      return answer(r.status, r.payload);
    }
    case "_h_metrics": {
      const r: { status: number; payload: unknown } = hMetrics(svc);
      return answer(r.status, r.payload);
    }
    default:
      return null;
  }
}

/** The lane-discovery + agent-plane doors as a self-registering
 *  plugin: lanes, card-tools, lane bundles, skills, skill bodies,
 *  agent boot, metrics — native decl/file-derived reads over the
 *  disclosure root, dumpsJson + normalize4xx at the door. The queue
 *  terms (metrics, agent boot) read through ctx.runs; the card
 *  terms (lanes, card-tools, agent boot) read through
 *  ctx.cardRegistry. Matches its own
 *  rows inside the listener (dispatchPlanes answers plane rows and
 *  returns null for every other handler — gating on its answer alone
 *  preserves the old fall-through exactly). */
export const planesDoors: Plugin = {
  name: "gateway-planes",
  inject: ["gatewayError", "runs", "cardRegistry", "webServer"],
  apply(ctx: Context): void {
    mountDoorRoutes(ctx, ctx.webServer, ["_h_lanes", "_h_card_tools", "_h_lane_bundle", "_h_skills", "_h_skill_read", "_h_agent_boot", "_h_metrics"], async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = doorMatch(req, ["_h_lanes", "_h_card_tools", "_h_lane_bundle", "_h_skills", "_h_skill_read", "_h_agent_boot", "_h_metrics"]);
        if (hit === null) return undefined;
        const planes: DispatchResult | null = await dispatchPlanes(
          hit.row.handler,
          hit.m,
          req.target,
          req.roots,
          ctx.runs,
          ctx.cardRegistry,
        );
        if (planes !== null) return planes;
        return undefined;
    });
  },
};
