// doors/chromeDoors.ts — the health/chrome doors (J1-J10) as a
// self-registering plugin.
//
// The BODIES live in the GENERATED chrome.ts (capture_chrome.py —
// DO NOT EDIT, a regen would wipe hand code), so the plugin lives
// here, importing the CHROME_BODIES map. A ROUTES hit serves the
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
import type { DispatchResult } from "../core/errors.ts";
import type { GatewayRequest } from "../ctx.ts";
import { matchRoute } from "../routeUtil.ts";
import { CHROME_BODIES } from "./chrome.ts";

/** The health/chrome doors (J1-J10): a ROUTES hit serves the
 *  captured bytes verbatim (200). Anything else falls through. */
export const chromeDoors: Plugin = {
  name: "gateway-chrome",
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (
          hit === null ||
          (hit.row.handler !== "_h_health" &&
            hit.row.handler !== "_h_chrome")
        ) {
          return undefined;
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
