// core/context.ts — the gateway IS a Cordis app: one root Context.
//
// The boot is INCLUDE-DRIVEN (DSH shape, app-boot mountRootInclude):
// `new Context()` (the proxy root), the Loader service, builtins for
// the `cordis:` locals + the vendored `include`/`group` carriers,
// then ONE root Include on the leaf `packages/gateway/shell/cordis.yml`
// with the operator layer (`cordis.patch.yml`) as its patches.
// Runtime values ride `!!js` expressions against ctx.gatewayRuntime
// (published before the include mounts — the DSH dshHomePath shape).
//
// What died in the include stroke (2026-09-08): the hand-parsed
// patch YAML (readManifest), the `$runtime` marker, the pre-import +
// builtins-alias machinery for workspace specifiers (the loader's
// internal.import resolves them through the leaf's baseUrl —
// packages/gateway/ carries the @melite/* workspace links), and the
// sequential createEntry loop. What stays: registerBuiltins for the
// `cordis:` locals (error plugin, storage pieces, gateway assembler
// — none has a package address), the programmatic gateway row (full
// JS GatewayConfig, boot-owned), refusalLine (the loader's entry
// wrap is unchanged).
//
// ORDER NOTE: EntryGroup.update fans out concurrently, so door
// listener attach order is completion order, not leaf order. The F3
// stage-patch-before-greedy-draft contract rides order — pinned by
// the dispatch-order walls (sandbox boot probes, not assumption).
//
// Two entry points because dispatch-as-library must stay pure:
//   - ensureDoorContext() — the leaf rows (error service + doors +
//     platform services). Backs ctx.ts dispatch(). No lock, no queue
//     boot. Singleton per process.
//   - bootGatewayContext(config) — doors first, then the gateway row
//     (gate + bootQueue on start, stop-ledger + unlock on dispose).
//     Backs startServer(). One gateway entry per process.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Context } from "@deepseek-ai/cordis";
import type { Fiber } from "@deepseek-ai/cordis";
import Loader from "@deepseek-ai/cordis-plugin-loader";
import type { EntryOptions } from "@deepseek-ai/cordis-plugin-loader";
import Include from "@deepseek-ai/cordis-plugin-include";
import type { PatchOptions } from "@deepseek-ai/cordis-plugin-include";
import Group from "@deepseek-ai/cordis-plugin-group";
import { gatewayErrors } from "./errors.ts";
import { storageHub } from "../storage/hub.ts";
import {
  storageDomainFacility,
  storageJsonBackend,
} from "../storage/plugins.ts";
import { gatewayPlugin } from "./gateway.ts";
import type { GatewayConfig } from "./gateway.ts";

/** Boot-published runtime values for the leaf's `!!js` rows
 *  (webserver host/port, storage configs). Set on the context
 *  BEFORE the root include mounts — `with(ctx)` scope, so rows
 *  read them as bare `gatewayRuntime.*` (DSH: ctx.dshHomePath). */
export interface GatewayRuntime {
  readonly webserver: { readonly host: string; readonly port: number };
  readonly storageJson: { readonly root: string };
  readonly storageDomain: { readonly backend: string };
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    gatewayRuntime?: GatewayRuntime;
  }
}

/** The gateway lifecycle entry id (boot-owned — never the leaf). */
const GATEWAY_ENTRY_ID: string = "gateway";

/** Loader builtins for the NON-loadable remainder: the `cordis:`
 *  locals (none has a package address — the error plugin, the
 *  composed storage pieces, the gateway assembler itself) plus the
 *  two vendored tree carriers (include + group, by real specifier
 *  through the workspace links). Door/platform rows import by bare
 *  specifier through the leaf's baseUrl (packages/gateway/ links). */
function registerBuiltins(ctx: Context): void {
  const table: Record<string, unknown> = {
    "gateway-errors": gatewayErrors,
    "storage-hub": storageHub,
    "storage-json": storageJsonBackend,
    "storage-domain": storageDomainFacility,
    gateway: gatewayPlugin,
    include: Include,
    group: Group,
  };
  for (const [key, plugin] of Object.entries(table)) {
    ctx.loader.builtins[key] = plugin;
  }
}

/** The operator layer (cordis.patch.yml) as Include patches — the
 *  DSH loadOptionalPatches shape: absent file = no layer (never a
 *  boot failure); a present file parses as a patch list (each row a
 *  PatchOptions: {id,...overrides} or {insert:[...]}). Read with the
 *  include's own entryListSchema so `!!js` in operator overrides
 *  parses exactly as the include mounts it. */
async function loadOperatorPatches(): Promise<PatchOptions[] | undefined> {
  const url = new URL("../../../gateway/cordis.patch.yml", import.meta.url);
  let text: string;
  try {
    const fs = await import("node:fs");
    text = fs.readFileSync(url, "utf8");
  } catch {
    return undefined;
  }
  const yaml = await import("js-yaml");
  const { entryListSchema } = await import(
    "@deepseek-ai/cordis-plugin-include"
  );
  const data: unknown = (yaml as { load: (s: string, o: unknown) => unknown }).load(
    text,
    { schema: entryListSchema },
  );
  if (!Array.isArray(data)) {
    throw new Error("[gateway-ts] cordis.patch.yml must be a patch list");
  }
  return data as PatchOptions[];
}

let doorsReady: Promise<Context> | null = null;
let gatewayFiber: (Fiber & PromiseLike<Fiber>) | null = null;

/** The error service + door plugins + platform services, in leaf
 *  order. Resolves once the loader tree settles (a failing entry
 *  rejects here — LOUD, like the old import graph: a broken door
 *  module crashed the boot). The leaf's `!!js` rows read
 *  ctx.gatewayRuntime — published here BEFORE the include mounts
 *  (first boot of the process owns it; every wall process is
 *  single-boot). Library boots (no port) take the inert webserver
 *  seat {127.0.0.1, 0} exactly as the old module default did;
 *  storage roots ride env (resolveStorageRoot — scratch-pinned per
 *  boot); the domain routes every domain at the json backend. */
export function ensureDoorContext(port: number = 0): Promise<Context> {
  if (doorsReady === null) {
    doorsReady = (async (): Promise<Context> => {
      const ctx = new Context();
      await ctx.plugin(Loader, {
        baseUrl: new URL("../../", import.meta.url).href,
      });
      registerBuiltins(ctx);
      const { resolveStorageRoot } = await import("../storage/store.ts");
      ctx.gatewayRuntime = {
        webserver: { host: "127.0.0.1", port },
        storageJson: { root: resolveStorageRoot() },
        storageDomain: { backend: "json" },
      };
      // STRUCTURE STAGE 2: core moved one tier deeper
      // (packages/gateway/core/src/core/) — the leaf is the SHELL's
      // (packages/gateway/shell/cordis.yml), 3 hops up + shell.
      const leaf = new URL(
        "../../../shell/cordis.yml",
        import.meta.url,
      ).href;
      const patches = await loadOperatorPatches();
      await ctx.loader.create({
        id: "include",
        name: "cordis:include",
        config: {
          path: leaf,
          ...(patches !== undefined && patches.length > 0
            ? { patches }
            : {}),
        },
      } as Omit<EntryOptions, "id">);
      await ctx.loader.await();
      return ctx;
    })();
  }
  return doorsReady;
}

/** Recover the byte-exact gate refusal through the loader's entry
 *  wrap (Entry failure: "failed to apply loader entry <id>
 *  (<name>): <original>", cause-chained to the original). Returns
 *  null when the failure is not a gate refusal (the caller then
 *  prints the raw message). */
export function refusalLine(exc: unknown): string | null {
  const seen = new Set<unknown>();
  let cur: unknown = exc;
  while (cur instanceof Error && !seen.has(cur)) {
    seen.add(cur);
    if (cur.message.startsWith("[gateway] REFUSING TO START:")) {
      return cur.message;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  if (exc instanceof Error) {
    const m: RegExpExecArray | null =
      /\[gateway\] REFUSING TO START:[^\n]*/.exec(exc.message);
    if (m !== null) return m[0];
  }
  return null;
}

/** The full boot: doors first, then the gateway entry (gate +
 *  bootQueue on start, stop-ledger + unlock on dispose). Resolves
 *  with the shared context and the gateway fiber (dispose it for
 *  teardown). One gateway entry per process — repeat calls return
 *  the first. */
export async function bootGatewayContext(config: GatewayConfig): Promise<{
  ctx: Context;
  gate: Fiber & PromiseLike<Fiber>;
}> {
  // The webserver entry mounts inside ensureDoorContext (leaf
  // order) — its runtime port rides the boot caller, never the
  // leaf. The first boot of the process owns the cached context.
  const ctx: Context = await ensureDoorContext(config.port);
  if (gatewayFiber === null) {
    const gwOptions: EntryOptions = {
      id: GATEWAY_ENTRY_ID,
      name: "cordis:gateway",
      config: config as unknown as Record<string, unknown>,
    };
    await ctx.loader.create(gwOptions as Omit<EntryOptions, "id">);
    await ctx.loader.await();
    const fiber: Fiber | undefined = ctx.loader.resolve(GATEWAY_ENTRY_ID).fiber;
    if (fiber === undefined) {
      throw new Error("[gateway-ts] loader entry gateway has no fiber");
    }
    gatewayFiber = fiber as Fiber & PromiseLike<Fiber>;
  }
  return { ctx, gate: gatewayFiber };
}
