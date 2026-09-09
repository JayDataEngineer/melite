// routeUtil.ts — shared routing primitives as plain functions.
//
// The old GatewayRouterService (src/core/router.ts, deleted this
// stroke) wrapped exactly these three helpers behind provide/inject.
// A service buys load-gating and teardown; pure request math needs
// neither, so the framework pattern here is a util, not a service
// (CORDIS CORE law, docs/patterns/cordis-core.md): every door plugin
// matches its own rows inside its 'gateway/request' listener via
// matchRoute (the adapter's doorMatch). No fiber
// owns them; no plugin injects them.
//
// Logic relocated VERBATIM from the deleted service (which itself
// relocated them verbatim from ctx.ts): path normalization mirrors
// route()'s target.split("?")[0].rstrip("/") or "/"; matchRoute is
// first-match-wins over ROUTES (regex arms emulate re.match —
// anchored at the start, prefix ok; row order is the contract: the
// F3 stage-patch arm stays BEFORE the greedy draft :id arm exactly
// as in the python table). The query parse rides the Node builtin
// URLSearchParams (2026-09-10, ledger G-9: the old "lib ES2022 has
// no DOM so URLSearchParams is unavailable" claim was FALSE — it is
// a Node global under @types/node with types:["node"]; the
// adversarial verifier proved identical results for every query
// shape the doors serve — repeated keys, + decoding, empty/bare
// values — diverging only on malformed % escapes, which no door
// sends).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { ROUTES } from "./routes.ts";
import type { GatewayRoute } from "./routes.ts";

/** Query parse for the request record (chrome doors ignore it; kept
 *  so the shape stays faithful to route()'s parse_qs). */
export function parseQuery(target: string): Record<string, string[]> {
  const qpos: number = target.indexOf("?");
  if (qpos < 0) return {};
  const params: URLSearchParams = new URLSearchParams(target.slice(qpos + 1));
  const out: Record<string, string[]> = {};
  for (const key of params.keys()) {
    out[key] = params.getAll(key);
  }
  return out;
}

/** First-match-wins over ROUTES — mirrors route()'s loop. Regex arms
 *  emulate re.match (match must start at index 0; a trailing $ still
 *  pins the end, a bare prefix still matches). Row order is the
 *  contract (F3 stage-patch before greedy draft :id). */
export function matchRoute(
  method: string,
  path: string,
): { row: GatewayRoute; m: RegExpExecArray | null } | null {
  for (const row of ROUTES) {
    if (row.method !== "*" && !row.method.split("|").includes(method)) {
      continue;
    }
    if (row.regex) {
      const re: RegExp = new RegExp(row.path);
      const m: RegExpExecArray | null = re.exec(path);
      if (m === null || m.index !== 0) continue;
      return { row, m };
    }
    if (path !== row.path) continue;
    return { row, m: null };
  }
  return null;
}
