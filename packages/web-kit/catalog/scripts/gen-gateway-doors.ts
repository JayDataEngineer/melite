// gen-gateway-doors — generate the frontend's DOOR TYPES from the
// route table (the wire SSOT in packages/gateway/core/src/routes.ts).
//
// TS port of tools/gen_gateway_doors.py (deleted at cut — its OUT_PATH
// still spelled the dead pre-move web/catalog tree, pre-broken P4).
// Same-in/same-out on the MEMBER surface: parse the authored routes.ts
// with the wall's rigid-literal reader (no TS toolchain needed),
// apply the unchanged _door_template mapping, emit
// packages/web-kit/catalog/src/generated/gatewayDoors.ts.
// Dual-run rule: py-output members vs ts-output members must agree
// line-for-line (the committed file is the golden); only the two
// provenance header lines name the new source + tool.
//
// Emits:
//   packages/web-kit/catalog/src/generated/gatewayDoors.ts — the
//     `GatewayDoorUrl` template-literal union every apiJson/apiFetch
//     call site must satisfy. A frontend door with no backend route
//     row is a COMPILE ERROR (tsc), not a runtime 404 over live
//     data — the loras incident (2026-09-05: LoraPicker fetched
//     /v1/loras over 12 declared krea-2 rows; the table had no such
//     row) is the cause.
//
// The wall (tests/walls/suites/test_gateway_doors.py) refuses
// staleness: run this after every route change.
//
// Usage:
//   node --experimental-strip-types packages/web-kit/catalog/scripts/gen-gateway-doors.ts --check
//   node --experimental-strip-types packages/web-kit/catalog/scripts/gen-gateway-doors.ts --write
//
// (Bare invocation is the dry-run check. Erasable-syntax TS only:
// no enums, no namespaces.)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");
const ROUTES_TS: string = join(REPO, "packages", "gateway", "core", "src", "routes.ts");
const SNAP_REL: string =
  "packages/web-kit/catalog/src/generated/gatewayDoors.ts";

const HEADER: string =
  [
    "// GENERATED from packages/gateway/core/src/routes.ts (the wire SSOT) by",
    "// packages/web-kit/catalog/scripts/gen-gateway-doors.ts — DO NOT EDIT. Regenerate after every",
    "// route change; tests/walls/suites/test_gateway_doors.py refuses",
    "// staleness.",
    "//",
    "// THE HARD GATE: apiJson/apiFetch accept ONLY GatewayDoorUrl. A",
    "// frontend fetch of a door the gateway does not serve is a COMPILE",
    "// ERROR here — the loras incident (2026-09-05) shipped exactly that",
    '// gap to the operator as "No LoRAs installed" over 12 declared',
    "// rows. If tsc refuses your path, either the door is missing from",
    "// ROUTES (build it) or the call site is dead (delete it).",
    "",
    "/** Query-string tail: every door may carry one. */",
    'export type DoorTail = "" | `?${string}`',
  ].join("\n") + "\n";

interface RouteRow {
  path: string;
  template: string;
  regex: boolean;
}

function stripComments(text: string): string {
  // Remove // and /* */ comments outside string literals.
  const out: string[] = [];
  let i: number = 0;
  const n: number = text.length;
  let inStr: boolean = false;
  while (i < n) {
    const c: string = text[i];
    if (inStr) {
      out.push(c);
      if (c === "\\") {
        if (i + 1 < n) {
          out.push(text[i + 1]);
          i += 1;
        }
      } else if (c === '"') {
        inStr = false;
      }
      i += 1;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out.push(c);
      i += 1;
    } else if (c === "/" && i + 1 < n && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") {
        i += 1;
      }
    } else if (c === "/" && i + 1 < n && text[i + 1] === "*") {
      i += 2;
      while (i + 1 < n && !(text[i] === "*" && text[i + 1] === "/")) {
        i += 1;
      }
      i += 2;
    } else {
      out.push(c);
      i += 1;
    }
  }
  return out.join("");
}

function splitTopObjects(arrayBody: string): string[] {
  // Top-level {...} spans of an array literal (string-aware).
  const objs: string[] = [];
  let i: number = 0;
  const n: number = arrayBody.length;
  while (i < n) {
    if (arrayBody[i] !== "{") {
      i += 1;
      continue;
    }
    let depth: number = 0;
    let inStr: boolean = false;
    let j: number = i;
    while (j < n) {
      const c: string = arrayBody[j];
      if (inStr) {
        if (c === "\\") {
          j += 1;
        } else if (c === '"') {
          inStr = false;
        }
      } else if (c === '"') {
        inStr = true;
      } else if (c === "{") {
        depth += 1;
      } else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          objs.push(arrayBody.slice(i, j + 1));
          break;
        }
      }
      j += 1;
    }
    i = j + 1;
  }
  return objs;
}

function strField(obj: string, name: string): string {
  const m: RegExpMatchArray | null = obj.match(
    new RegExp(name + '\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"'),
  );
  if (m === null) {
    throw new Error("row has no " + JSON.stringify(name) + " string field");
  }
  return JSON.parse('"' + m[1] + '"') as string;
}

function parseRouteRows(): RouteRow[] {
  // The wall's rigid-literal reader: the authored table keeps one
  // rigid object literal per row; a shape break fails LOUDLY here.
  const text: string = readFileSync(ROUTES_TS, "utf8");
  const anchor: number = text.indexOf("export const ROUTES");
  if (anchor < 0) {
    throw new Error("routes.ts has no export const ROUTES");
  }
  const body: string = stripComments(text.slice(anchor));
  const lb: number = body.indexOf("[");
  const rb: number = body.lastIndexOf("]");
  const rows: RouteRow[] = [];
  for (const obj of splitTopObjects(body.slice(lb, rb))) {
    rows.push({
      path: strField(obj, "path"),
      template: strField(obj, "template"),
      regex: obj.includes("regex: true"),
    });
  }
  return rows;
}

function doorTemplate(row: RouteRow): string {
  // Route row -> TS template-literal type member.
  //
  // Literal rows  /v1/loras           -> `/v1/loras${DoorTail}`
  // Regex rows    ^/v1/flows/status/(.+)$
  //                                        -> `/v1/flows/status/${string}${DoorTail}`
  // Template docs /v1/flows/status/{run_id}
  //                                        -> same, from the template field
  if (row.regex) {
    let stem: string = row.path.startsWith("^")
      ? row.path.slice(1)
      : row.path;
    stem = stem.split("(")[0]; // literal stem before the capture
    if (!stem.endsWith("/")) {
      stem += "/"; // the capture is a path segment
    }
    return stem + "${string}${DoorTail}";
  }
  if (row.template !== "" && row.template.includes("{")) {
    const parts: string[] = [];
    for (const seg of row.template.split(/(\{[^}]+\})/)) {
      parts.push(seg.startsWith("{") ? "${string}" : seg);
    }
    return parts.join("") + "${DoorTail}";
  }
  return row.path + "${DoorTail}";
}

function generate(): string {
  const members: string[] = [];
  for (const row of parseRouteRows()) {
    const t: string = doorTemplate(row);
    if (!members.includes(t)) {
      members.push(t);
    }
  }
  const lines: string[] = [
    HEADER,
    "",
    "/** Every door the gateway serves, as fetchable URLs. */",
    "export type GatewayDoorUrl =",
  ];
  for (const m of members) {
    lines.push("  | `" + m + "`");
  }
  return lines.join("\n") + "\n";
}

function main(): number {
  const args: string[] = process.argv.slice(2);
  const write: boolean = args.includes("--write");
  const out: string = generate();
  const snap: string = join(
    REPO,
    "packages",
    "web-kit",
    "catalog",
    "src",
    "generated",
    "gatewayDoors.ts",
  );
  let current: string | null = null;
  try {
    current = readFileSync(snap, "utf8");
  } catch {
    current = null;
  }
  if (current === out) {
    console.log(`${SNAP_REL} matches the ROUTES table`);
    return 0;
  }
  if (write) {
    mkdirSync(dirname(snap), { recursive: true });
    writeFileSync(snap, out);
    console.log(`${SNAP_REL} written`);
    return 0;
  }
  console.log(`STALE: ${SNAP_REL} differs from the ROUTES table`);
  return 1;
}

process.exit(main());
