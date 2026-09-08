// doors/chromeDoors.ts — the health/chrome doors (J1-J10) as a
// self-registering plugin.
//
// The BODIES live in the FROZEN chrome.ts (generator retired with
// the py oracle — DO NOT EDIT the frozen constants), so the plugin
// lives here, importing the CHROME_BODIES map. A ROUTES hit serves the
// captured bytes verbatim (200) — parse+reserialize would drift (py
// ensure_ascii \uXXXX vs JSON.stringify raw UTF-8, py float 1.0 vs
// JS number 1). Anything else falls through to the asset arms,
// exactly as the old arm did. Matches its own rows inside the
// listener (routeUtil.matchRoute) — no central table owns it. No
// services injected — the door reads nothing through the context.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";
import { CHROME_BODIES } from "./chrome.ts";
import { toolsJsonLive } from "./toolsEmit.ts";

/** The health/chrome doors (J1-J10): a ROUTES hit serves the
 *  captured bytes verbatim (200) — except /v1/tools, which serves
 *  the frozen doc with params_schema overlaid LIVE from the
 *  registered card schemas (the 2026-09-08 single-declaration
 *  flip: the Schemastery schema is the one source; toolsEmit.ts).
 *  Anything else falls through. */
export const chromeDoors: Plugin = {
  name: "gateway-chrome",
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = matchRoute(req.method, req.path);
        if (
          hit === null ||
          (hit.row.handler !== "_h_health" &&
            hit.row.handler !== "_h_chrome")
        ) {
          return undefined;
        }
        if (hit.row.path === "/v1/tools" || req.path === "/v1/tools") {
          return {
            status: 200,
            body: await toolsJsonLive(),
            contentType: "application/json",
            headers: {},
          };
        }
        const served: string | undefined =
          CHROME_BODIES[hit.row.path] ?? CHROME_BODIES[req.path];
        if (served !== undefined) {
          return {
            status: 200,
            body: served,
            contentType: "application/json",
            headers: {},
          };
        }
        return undefined;
      },
    );
  },
};
