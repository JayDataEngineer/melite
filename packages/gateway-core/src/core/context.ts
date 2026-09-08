// core/context.ts — the gateway IS a Cordis app: one root Context.
//
// The boot is LOADER-DRIVEN (PLATFORM TIER law, docs/patterns/
// cordis-core.md): `new Context()` (the proxy root), then the
// Loader service owns the plugin tree from the checked-in manifest
// (`packages/gateway/cordis.config.json` — the boot order SSOT).
// Local plugins ride the loader as `cordis:` builtins (registered
// here from their owning modules — the loader cannot address named
// exports by specifier, so the module hands its plugin object over
// directly); the vendored platform services (timer, logger-console
// — `vendor/cordis_plugins/`, wired by
// `scripts/link-vendored-platform.sh`) are pre-imported by real
// specifier through the gateway's workspace links and aliased under
// their entry ids at create time (the loader must never
// bare-import from a vendored realpath — resolution would walk
// upward past the gateway links).
//
// Entries are created SEQUENTIALLY in manifest order (one awaited
// loader.create per entry — never the bulk group update, which fans
// out concurrently): registration order IS dispatch order (serial
// bail serves the first answering listener, so the F3
// stage-patch-before-greedy-draft contract rides order here exactly
// as it did in the old arm chain).
//
// Two entry points because dispatch-as-library must stay pure (the
// old rule: dispatch never boots the queue):
//   - ensureDoorContext() — every manifest entry EXCEPT the gateway
//     lifecycle entry (error service + door plugins + timer +
//     logger-console). Backs ctx.ts dispatch(). No lock, no queue
//     boot, no side effects beyond registration. Singleton per
//     process.
//   - bootGatewayContext(config) — doors first, then the gateway
//     entry (gate + bootQueue on start, stop-ledger + unlock on
//     dispose) with the runtime config (roots/port/engine/claimLock
//     ride env per boot — never the manifest). Backs startServer().
//     Guarded to one gateway entry per process.
//
// The loader WRAPS entry failures ("failed to apply loader entry
// <id> (<name>): <original>", cause-chained): refusalLine() recovers
// the byte-exact gate refusal for the main's stderr (the queue
// parity wall pins the REFUSING line byte-equal).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import type { Fiber } from "@deepseek-ai/cordis";
import Loader from "@deepseek-ai/cordis-plugin-loader";
import type { EntryOptions } from "@deepseek-ai/cordis-plugin-loader";
import { gatewayErrors } from "./errors.ts";
import { storageHub } from "../storage/hub.ts";
import {
  storageDomainFacility,
  storageJsonBackend,
} from "../storage/plugins.ts";
import { resolveStorageRoot } from "../storage/store.ts";
import { gatewayPlugin } from "./gateway.ts";
import type { GatewayConfig } from "./gateway.ts";

/** One manifest entry (cordis.config.json "entries" row). */
interface ManifestEntry {
  readonly id: string;
  readonly name: string;
  readonly config?: unknown;
  readonly disabled?: boolean;
}

/** The gateway lifecycle entry id (runtime config — never manifest). */
const GATEWAY_ENTRY_ID: string = "gateway";

/** The webserver entry's $runtime config (host/port ride the boot
 *  caller — never the manifest, same law as the gateway entry; the
 *  vendored plugin owns listen/close/disposal). Set by
 *  bootGatewayContext BEFORE the door context caches: the first boot
 *  of a process owns it (prod passes one port to both its boots;
 *  every wall process is single-boot). */
let runtimeWebServerConfig: Record<string, unknown> = {
  host: "127.0.0.1",
  port: 0,
};

/** The checked-in manifest — the boot order SSOT. Read once. */
let manifestEntries: readonly ManifestEntry[] | null = null;

function readManifest(): readonly ManifestEntry[] {
  if (manifestEntries !== null) return manifestEntries;
  const url = new URL(
    "../../../gateway/cordis.config.json",
    import.meta.url,
  );
  const raw: unknown = JSON.parse(readFileSync(url, "utf8")) as unknown;
  const rows: unknown =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)["entries"]
      : undefined;
  if (!Array.isArray(rows)) {
    throw new Error("[gateway-ts] cordis.config.json has no entries array");
  }
  const entries: ManifestEntry[] = [];
  for (const row of rows) {
    if (
      typeof row === "object" &&
      row !== null &&
      typeof (row as Record<string, unknown>)["id"] === "string" &&
      typeof (row as Record<string, unknown>)["name"] === "string"
    ) {
      const rec = row as Record<string, unknown>;
      entries.push({
        id: rec["id"] as string,
        name: rec["name"] as string,
        ...(rec["config"] !== undefined ? { config: rec["config"] } : {}),
        ...(rec["disabled"] === true ? { disabled: true as boolean } : {}),
      });
    } else {
      throw new Error("[gateway-ts] cordis.config.json has a malformed entry");
    }
  }
  manifestEntries = entries;
  return manifestEntries;
}

/** Loader builtins for the NON-loadable remainder (STAGE 2: the 15
 *  doors + 2 queue arms mount by npm specifier via createEntry's
 *  pre-import; only core-owned services stay here — the error
 *  plugin, the composed storage pieces, and the gateway assembler
 *  itself, none of which has a package address yet). Keys are BARE (the loader strips the `cordis:` prefix before
 *  the builtins lookup — name.slice(7)). The vendored platform
 *  services ride builtins too, but they are registered DYNAMICALLY
 *  in createEntry (pre-imported by real specifier through the
 *  gateway's workspace links, then aliased under the entry id):
 *  the loader must NEVER bare-import from a vendored realpath
 *  (resolution would walk upward past the gateway links), so every
 *  entry resolves through builtins — one mechanism, manifest order.
 *  The persistence tier (hub → json backend → domain facility)
 *  rides the same table: the storage packages' plugin pieces are
 *  composed in src/storage/plugins.ts, then aliased here. */
function registerBuiltins(ctx: Context): void {
  const table: Record<string, unknown> = {
    "gateway-errors": gatewayErrors,
    "storage-hub": storageHub,
    "storage-json": storageJsonBackend,
    "storage-domain": storageDomainFacility,
    gateway: gatewayPlugin,
  };
  for (const [key, plugin] of Object.entries(table)) {
    ctx.loader.builtins[key] = plugin;
  }
}

let doorsReady: Promise<Context> | null = null;
let gatewayFiber: (Fiber & PromiseLike<Fiber>) | null = null;

/** Create one manifest entry (id-stable; skips entries already in
 *  the tree so re-entry is a no-op, never a restart). The $runtime
 *  marker means the config is built programmatically per boot (never
 *  pinned): the gateway entry's lifecycle config rides the boot
 *  caller, the storage entries' configs ride env (the json root is
 *  resolveStorageRoot — scratch-pinned per boot like every other
 *  root; the domain routes every domain at the json backend). */
async function createEntry(ctx: Context, entry: ManifestEntry): Promise<void> {
  // H3 (homolog 06): disabled entries are kept, never mounted.
  if (entry.disabled === true) return;
  try {
    ctx.loader.resolve(entry.id);
    return;
  } catch {
    /* absent — create below */
  }
  // H1 (homolog 06): platform names are REAL specifiers. Pre-import
  // through the gateway's workspace links and alias under the entry
  // id — the loader's bare import would resolve from the vendored
  // realpath past our links, and builtins dereference only under the
  // cordis: prefix.
  let loadName: string = entry.name;
  if (!loadName.startsWith("cordis:")) {
    const mod = (await import(entry.name)) as { default?: unknown };
    ctx.loader.builtins[entry.id] = mod.default ?? mod;
    loadName = `cordis:${entry.id}`;
  } else if (ctx.loader.builtins[loadName.slice(7)] === undefined) {
    throw new Error(
      `[gateway-ts] no builtin registered for loader entry ${entry.id} (${entry.name})`,
    );
  }
  const base = { id: entry.id, name: loadName };
  let options: EntryOptions;
  if (entry.config === "$runtime" && entry.id === "storage-json") {
    options = {
      ...base,
      config: { root: resolveStorageRoot() } as unknown as Record<string, unknown>,
    };
  } else if (entry.config === "$runtime" && entry.id === "storage-domain") {
    options = {
      ...base,
      config: { backend: "json" } as unknown as Record<string, unknown>,
    };
  } else if (entry.config === "$runtime" && entry.id === "webserver") {
    options = { ...base, config: runtimeWebServerConfig };
  } else if (entry.config !== undefined && entry.config !== "$runtime") {
    options = {
      ...base,
      config: entry.config as Record<string, unknown>,
    };
  } else {
    options = { ...base };
  }
  // The create() type omits id (auto-assign), but the runtime honors
  // an explicit id via ensureId — the manifest ids stay stable.
  await ctx.loader.create(options as Omit<EntryOptions, "id">);
}

/** The error service + door plugins + platform services, in
 *  manifest order. Resolves once the loader tree settles (a failing
 *  entry rejects here — LOUD, like the old import graph: a broken
 *  door module crashed the boot). */
export function ensureDoorContext(): Promise<Context> {
  if (doorsReady === null) {
    doorsReady = (async (): Promise<Context> => {
      const ctx = new Context();
      await ctx.plugin(Loader, {
        baseUrl: new URL("../../", import.meta.url).href,
      });
      registerBuiltins(ctx);
      for (const entry of readManifest()) {
        if (entry.id === GATEWAY_ENTRY_ID) continue;
        await createEntry(ctx, entry);
      }
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
  // The webserver entry is created inside ensureDoorContext (manifest
  // order) — publish its runtime config BEFORE the context caches.
  runtimeWebServerConfig = {
    host: "127.0.0.1",
    port: config.port,
  };
  const ctx: Context = await ensureDoorContext();
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
