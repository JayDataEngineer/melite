// storage/hub.ts — the storage hub host plugin.
//
// The DSH storage hub (`ctx.storage`: the named backend registry plus
// mounted data-form facilities) ships as a Service class, not a plugin
// object — the owning lane provides it exactly like the gateway error
// service (core/errors.ts `gatewayErrors`: construct in apply, the
// Service base provides). Rides the loader as the `cordis:storage-hub`
// builtin (registered in core/context.ts from this module — the loader
// cannot address named exports by specifier, so the module hands its
// plugin object over directly, same as every door), FIRST in the
// persistence tier (hub → json backend → domain facility: the domain
// layer injects the backend's lifecycle service key, so activation
// cannot race registration).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Storage } from "@deepseek-ai/dsh-storage";
import type { Context } from "@deepseek-ai/cordis";

/** Provides `ctx.storage` (no inject — injecting the service it
 *  provides would self-wait; the gateway-errors shape). */
export const storageHub = {
  name: "storage-hub",
  apply(ctx: Context): void {
    new Storage(ctx);
  },
};
