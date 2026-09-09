// gen-api-docs — generate the gateway API surface docs FROM the
// authored route table (the wire SSOT in packages/gateway/core/src/routes.ts).
//
// TS port of tools/gen_api_docs.py (deleted at cut). Same-in/same-out:
// the same INTRO + grouping + _doc_path/_spec_path rendering from the
// TS-parsed row set; byte-identical docs/gateway/endpoints.md +
// docs/gateway/openapi.yaml (the committed docs are the golden —
// dual-run rule: any non-empty diff fails the wall, never updates
// the golden).
//
// NOTE (frozen provenance, 2026-09-08): INTRO below reproduces the
// committed bytes VERBATIM — including the `python/gateway.py` +
// `tools/gen_api_docs.py` provenance lines, which now name the
// retired source + tool. This is deliberate, not drift: docs/gateway/*
// carries the sibling lane's unstaged edits (never stage them), so
// this stroke keeps the docs byte-stable and the walls green. The
// provenance refresh rides the next committed docs regen (a route
// change, or the sibling lane's own commit).
//
// Emits:
//   docs/gateway/endpoints.md   — the human wire table (grouped)
//   docs/gateway/openapi.yaml   — the machine surface (paths + params;
//                                 response BODIES stay pinned by the
//                                 goldens — the spec deliberately carries
//                                 no schemas)
//
// GATE HONESTY (2026-09-10): the wall this file used to cite
// (tests/walls/suites/test_api_doc_parity.py) never existed in the TS
// tree — a py-era phantom. Regenerating is the gate now: the doc below
// derives from the imported ROUTES at generation time, so a drifted doc
// differs from a fresh run
// between the table, the doc, and the spec: run this after every route
// change, and the wall keeps them honest.
//
// Usage:
//   node --experimental-strip-types packages/gateway/scripts/gen-api-docs.ts --check
//   (Bare invocation regenerates both files, like the py tool's default.
//   Erasable-syntax TS only: no enums, no namespaces.)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Ledger row 36 (2026-09-10): the route table is IMPORTED from the SSOT
// package, never re-parsed as text — the old stripComments/
// splitTopObjects/strField parser hand-rolled what the module system
// already guarantees (shell depends on @melite/gateway-core:
// workspace:*; runtime is node --experimental-strip-types, no build).
import { ROUTES } from "@melite/gateway-core";

const HERE: string = dirname(fileURLToPath(import.meta.url));
// Four segments up (scripts → shell → gateway → packages → repo).
const REPO: string = join(HERE, "..", "..", "..", "..");
const DOC_REL: string = "docs/gateway/endpoints.md";
const SPEC_REL: string = "docs/gateway/openapi.yaml";

// Frozen to the committed bytes (see NOTE above): the provenance
// lines name the retired py source + tool until the next committed
// docs regen refreshes them.
const INTRO: string =
  [
    "# Gateway endpoints — the LIVE wire table",
    "",
    "GENERATED from the gateway-core ROUTES table (routes.ts) by",
    "`tools/gen_api_docs.py` — edit the table, not this file. The wall",
    "the imported gateway-core ROUTES table — regen-diff is the gate",
    "table, this page, and `openapi.yaml`.",
    "",
    "Authorities, in order:",
    "- **Response bodies**: the goldens in `tests/golden_http/` (the estate's",
    "  own regression pin since C retirement, 2026-09-03). Changing one is a",
    "  deliberate contract change, never drift.",
    "- **The path list**: the route table (this page mirrors it).",
    "- **State is not contract**: runs/drafts routes are pinned in-harness",
    "  (envelope + count invariant + row shape), not golden-pinned.",
    "",
    "The surface groups by AUDIENCE, not by REST resource:",
    "- *Queue & runs* — the inference contract every client speaks",
    "  (agents, MCP tools, the editor, the DSH embed).",
    "- *Assets & ledger* — delivered artifacts and the activity journal.",
    "- *Lane discovery* — the progressive-disclosure ladder for agents.",
    "- *Models & forms* — the catalog + editor form surfaces.",
    "- *Templates & drafts* — the flow library the editor edits. The",
    "  `yaml/*` prefix is HONEST: the library on disk is still `flow.yaml`",
    "  files (5 of 8 lanes; the rest are `flow.py` declarations). The RETIRED",
    "  thing (2026-09-04) was the yaml START door — `/v1/flows/start` takes",
    "  `{flow: name}` or `{model: id}`, never yaml text.",
    "- *Management* — the ONE comfy management door.",
    "- *Health & chrome* — liveness plus the deck-shape stubs the editor",
    "  renders against.",
    "",
    "`/v1/models` is the OpenAI-compat list door (custom format; see",
    "docs/gateway/openai-compat.md) — a different vocabulary from",
    "`/v1/model-catalog`, not a duplicate.",
  ].join("\n") + "\n";

type RouteRow = (typeof ROUTES)[number];

function methodsLabel(row: RouteRow): string {
  if (row.ws) {
    return "WS";
  }
  if (row.method === "*") {
    return "ANY";
  }
  return row.method.replace(/\|/g, "/");
}

function docPath(row: RouteRow): string {
  return row.template !== "" ? row.template : row.path;
}

function genDoc(rows: RouteRow[]): string {
  const groups: Map<string, RouteRow[]> = new Map();
  for (const row of rows) {
    const list: RouteRow[] | undefined = groups.get(row.group);
    if (list === undefined) {
      groups.set(row.group, [row]);
    } else {
      list.push(row);
    }
  }
  const out: string[] = [INTRO];
  for (const group of [...groups.keys()].sort()) {
    out.push("\n## " + group + "\n");
    out.push("| Method | Path | Purpose |");
    out.push("|--------|------|---------|");
    for (const row of groups.get(group) as RouteRow[]) {
      out.push(
        "| " + methodsLabel(row) + " | `" + docPath(row) + "` | " +
          row.summary + " |",
      );
    }
  }
  return out.join("\n") + "\n";
}

function specMethods(row: RouteRow): string[] {
  if (row.ws) {
    return ["get"];
  }
  if (row.method === "*") {
    return ["get", "post", "delete", "put", "patch"];
  }
  return row.method.split("|").map((m) => m.trim().toLowerCase());
}

interface SpecParam {
  name: string;
  where: string;
  required: boolean;
}

function specPath(row: RouteRow): { path: string; params: SpecParam[] } {
  // OpenAPI path: template minus query string; params from braces.
  const tmpl: string = docPath(row);
  const qmark: number = tmpl.indexOf("?");
  const path: string = qmark < 0 ? tmpl : tmpl.slice(0, qmark);
  const query: string = qmark < 0 ? "" : tmpl.slice(qmark + 1);
  const params: SpecParam[] = [];
  for (const name of ["run_id", "id", "file", "lane", "family", "draft_id"]) {
    if (path.includes("{" + name + "}")) {
      params.push({ name, where: "path", required: true });
    }
  }
  for (const q of row.query) {
    params.push({ name: q, where: "query", required: false });
  }
  if (query !== "" && query.includes("{")) {
    const qname: string = query.split("={", 1)[0];
    params.push({ name: qname, where: "query", required: true });
  }
  return { path, params };
}

function pyJsonStr(value: string): string {
  // python json.dumps(s) with the default ensure_ascii=True: control
  // escapes + every non-ASCII code unit as \uXXXX (lowercase hex;
  // astral chars as surrogate pairs — which is exactly what
  // iterating JS UTF-16 code units yields).
  let out: string = '"';
  for (let i: number = 0; i < value.length; i += 1) {
    const cu: number = value.charCodeAt(i);
    if (cu === 0x22) {
      out += '\\"';
    } else if (cu === 0x5c) {
      out += "\\\\";
    } else if (cu === 0x0a) {
      out += "\\n";
    } else if (cu === 0x0d) {
      out += "\\r";
    } else if (cu === 0x09) {
      out += "\\t";
    } else if (cu === 0x08) {
      out += "\\b";
    } else if (cu === 0x0c) {
      out += "\\f";
    } else if (cu < 0x20) {
      out += "\\u" + cu.toString(16).padStart(4, "0");
    } else if (cu < 0x7f) {
      out += value[i];
    } else {
      out += "\\u" + cu.toString(16).padStart(4, "0");
    }
  }
  return out + '"';
}

function genSpec(rows: RouteRow[]): string {
  const lines: string[] = [
    "# GENERATED from @melite/gateway-core ROUTES by gen-api-docs.ts —",
    "# edit the table, not this file. Paths + parameters only:",
    "# response bodies are pinned by tests/golden_http/ (the wire",
    "# contract's byte authority), so this spec carries no schemas.",
    "openapi: 3.1.0",
    "info:",
    "  title: inference.cpp gateway",
    "  description: The local inference gateway. Serial GPU queue",
    "    (INFERENCE LAW); unresolved requests 4xx before registration",
    "    (QUEUE LANE LAW); a bad run never crashes the gateway",
    "    (RESILIENCE LAW).",
    "  version: 1.0.0",
    "servers:",
    "  - url: http://127.0.0.1:33081",
    "paths:",
  ];
  const paths: Map<string, { params: SpecParam[]; ops: Array<[string, string]> }> =
    new Map();
  for (const row of rows) {
    const { path: spath, params } = specPath(row);
    let entry:
      | { params: SpecParam[]; ops: Array<[string, string]> }
      | undefined = paths.get(spath);
    if (entry === undefined) {
      entry = { params, ops: [] };
      paths.set(spath, entry);
    }
    for (const m of specMethods(row)) {
      let desc: string = row.summary;
      if (row.ws) {
        desc +=
          " [websocket — hijacked on Upgrade; the " +
          "non-upgrade GET falls to the 404 fallback]";
      }
      entry.ops.push([m, desc]);
    }
  }
  for (const spath of [...paths.keys()].sort()) {
    const entry = paths.get(spath) as {
      params: SpecParam[];
      ops: Array<[string, string]>;
    };
    lines.push("  " + spath + ":");
    if (entry.params.length > 0) {
      lines.push("    parameters:");
      for (const p of entry.params) {
        lines.push("      - name: " + p.name);
        lines.push("        in: " + p.where);
        lines.push("        required: " + (p.required ? "true" : "false"));
        lines.push("        schema:");
        lines.push("          type: string");
      }
    }
    for (const [m, desc] of entry.ops) {
      lines.push("    " + m + ":");
      lines.push("      summary: " + pyJsonStr(desc));
      lines.push("      responses:");
      lines.push("        '200':");
      lines.push("          description: ok (shape pinned by goldens)");
    }
  }
  return lines.join("\n") + "\n";
}

function main(): number {
  const args: string[] = process.argv.slice(2);
  const check: boolean = args.includes("--check");
  const rows: RouteRow[] = [...ROUTES];
  const docPath: string = join(REPO, DOC_REL);
  const specPath: string = join(REPO, SPEC_REL);
  const doc: string = genDoc(rows);
  const spec: string = genSpec(rows);
  if (check) {
    let ok: boolean = true;
    for (const [path, text] of [
      [docPath, doc],
      [specPath, spec],
    ] as Array<[string, string]>) {
      if (readFileSync(path, "utf8") !== text) {
        console.log(
          "STALE: " + path + " (regenerate: node " +
            "--experimental-strip-types packages/gateway/scripts/gen-api-docs.ts)",
        );
        ok = false;
      }
    }
    return ok ? 0 : 1;
  }
  writeFileSync(docPath, doc);
  writeFileSync(specPath, spec);
  console.log(`wrote ${DOC_REL} + ${SPEC_REL} (${rows.length} routes)`);
  return 0;
}

process.exit(main());
