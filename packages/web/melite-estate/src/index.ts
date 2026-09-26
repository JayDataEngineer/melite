// index.ts — the estate bundle's host row.
//
// DSH is the only web app. This row mounts the estate's engine tier
// INTO the DSH host as child plugins — the loader's own composition
// mechanism (ctx.plugin).
//
// THE GATEWAY KILL (2026-09-10): the gateway is dead (operator
// order — the gateway package as an app made 1:1 DSH impossible).
// Every gateway row this bundle used to mount (error service, all
// doors, queue rows, the wire remotes, the lane root) is GONE with
// it. What remains is the engine tier the rebuild rides on; the
// domain remotes land here as they are rebuilt DSH-native.
//
//
// Erasable-syntax TS only: no enums, `import type` for types, bare
// package specifiers only.

import type { Context } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";

import modelsProvider from "@melite/comfyui-cordis/catalog-registry";
import comfyuiHost from "@melite/comfyui-cordis/comfyui-host";
// The engine-generics seam (stroke 53): the 'engines' seat first
// (one registry every engine provider registers into), then the
// ComfyUI adapter (engine id 'comfyui' — merged-submit law inside;
// the runs lane resolves through the seat). MCP engines register
// as 'mcp:<server>' rows next (docs/design/engine-generics-mcp.md).
import enginesContract from "@melite/engine-contract";
import comfyuiEngine from "@melite/comfyui-cordis/comfyui-engine";
// Stroke 54: the MCP lane. The dsh-mcp-client row (the official
// protocol client — one instance per server; tools register as
// mcp__blender__*) + the engine provider (mcp:<server> executors
// riding the tools runtime). The blender server is the pack's
// mcp_server.py face (Layer C, vendored): blender -b --python.
// The row INHERITS the package namespace (never a hand-built
// {name, apply}: the upstream load-path postmortem proves a bare
// apply drops `inject: ["tools"]`, and cordis then refuses the
// bridge's ctx.tools access — "cannot get property "tools"
// without inject" — failing every sync invisibly). Only the
// instance name is ours (one row per server: blender, godot…).
import * as mcpClientPlugin from "@deepseek-ai/dsh-mcp-client";
import { type Config as McpClientConfig } from "@deepseek-ai/dsh-mcp-client";
import { mcpEngines } from "@melite/engine-mcp";
// Stroke 55: the craft loop engine — the critic route resolves at
// boot (first image-capable route; a blind lane seats no craft).
import { craftEngineAutoRoute } from "@melite/engine-craft";
// Stroke 62: the agent engine — the spawner loop. The brain route
// is NAMED (MELITE_AGENT_ROUTE "provider/model", explicit >
// implicit — the critic route's law); skills spawn-inject through
// findSkill over the disclosure root (the same leaves melite_load
// serves — one storage, a new serving path).
import { agentEngine } from "@melite/engine-agent";
import { findSkill, disclosureRoot } from "@melite/estate-queue";
import { readFile } from "node:fs/promises";
// The drafts service only — the storage PROVIDERS (hub, json
// backend, domain form) belong to the composition site: dsh-base
// mounts them in profiles (bundle/base/cordis.patch.yml's
// storage/storage-json/storage-domain rows — "it belongs to the
// shared base"), the boot rigs mount them in tests. A consumer
// row never re-provides a base-owned seat
// (storage-domain/README.md: consumers "never touch a backend").
import draftsPlugin from "@melite/estate-drafts";
import queuePlugin, {
  cardRegistryProvider,
  discloseProvider,
  manageProvider,
  runsRegistryPlugin,
  skillProvider,
  loadProvider,
} from "@melite/estate-queue";
import { manageRemotePlugin } from "@melite/estate-manage";
// THE SELECTION CATALOG (the skill rework's close): zero rows on an
// empty bench; the bench's card+family craft carries on selection.
import { appendFileSync } from "node:fs";
import { runsRemotePlugin } from "@melite/estate-runs";
// The runs media route (the /v1/assets face's DSH-native
// replacement): run artifacts served same-origin from the queue
// seat's own runs tree.
import mediaPlugin from "@melite/estate-media";
// The models provisions route (the /v1/models face's DSH-native
// replacement): family DECL provision files served same-origin
// from the booted models table + the weights mount — no remotes,
// no proxies (the 2026-09-12 motion-skin 502).
import modelsPlugin from "@melite/estate-models";
import provisioningComposition from "./provisioning.ts";

/** The estate composition: the engine tier, the drafts service,
 *  the serial run queue, and the runs plane (REBUILD-5/9). A
 *  CONSUMER row, never a provider: the storage stack (hub +
 *  backend + the domain form) belongs to the composition site —
 *  dsh-base owns it in profiles (dshHomePath storages); wall and
 *  probe boots mount it themselves. The queue takes no row
 *  config: its state root is MELITE_STATE_ROOT else <cwd>/data/runs. */

// (2026-09-21, the operator's boundary — VERBATIM: "STOP [REDACTED 2026-11-05] WITH
// THE DEFAULT DSH SKILL SYSTEM. WHEN I TELL YOU TO REACH PAST TOOLS,
// AND INJECT INTO DSH SKILLS? WHEN?" — never.) The melite surface is
// TOOLS ONLY: melite_discover / melite_load / melite_skill_read over the
// estate's own /v1/skills door. DSH core's skill seat — its session
// catalog, its system-reminders, its providers — is NOT ours to
// touch. The selection-catalog provider that once lived here (the
// registerProvider injection, the invalidate wire, the 1.5s bench
// poll, the trace) is deleted; its "catalog follows the bench"
// behavior belonged to a seat we were never given.

const rows: readonly Plugin[] = [
  // The engines seat BEFORE every adapter + consumer (mount order
  // is load order — the adapters' inject gates on it).
  enginesContract,
  // The MCP control lane: the blender stdio server (official
  // MCP protocol, idle-reaped at 1800s; the client owns
  // reconnect). failOnStartupError false — a slow/absent blender
  // never takes the lane down (a failed start then rides the
  // supervisor's reconnect loop AND the REJECTED witness above).
  {
    name: "mcp-client-blender",
    inject: mcpClientPlugin.inject,
    Config: mcpClientPlugin.Config,
    // The bridge's own apply, witnessed: cordis buries per-fiber
    // apply rejections (both 2026-09-15 postmortems), so the
    // settled/rejected voice lives HERE — a rejection logs its
    // cause chain (the bridge wraps firstAttemptError) before it
    // vanishes, then rethrows to keep fiber semantics identical.
    // A settled apply censuses the blender namespace once (the
    // executor seat ≠ published tools — proven distinct today).
    apply: (ctx: Context, config: unknown) => {
      const p = (mcpClientPlugin.apply as (ctx: Context, config: McpClientConfig) => unknown)(
        ctx,
        config as McpClientConfig,
      ) as unknown;
      if (p === undefined || typeof (p as Promise<unknown>).then !== "function") return p;
      return (p as Promise<unknown>).then(
        (v: unknown) => {
          const t = ctx.get("tools") as unknown as { get(name: string): unknown } | undefined;
          const seen = ["mcp__blender__scene_info", "mcp__blender__render_shot"]
            .map((n) => n + "=" + (t?.get(n) === undefined ? "absent" : "PRESENT"))
            .join(" ");
          console.log("[melite-estate] mcp-client-blender ready: " + seen);
          return v;
        },
        (e: unknown) => {
          const chain = (x: unknown, depth: number): string => {
            if (depth > 2 || x === null || (typeof x !== "object" && typeof x !== "string")) return "";
            const err = x as { message?: unknown; cause?: unknown };
            const head = typeof x === "string" ? x : String(err.message ?? x);
            return head + (err.cause === undefined ? "" : " | caused by: " + chain(err.cause, depth + 1));
          };
          console.log("[melite-estate] mcp-client-blender REJECTED: " + chain(e, 0).slice(0, 900));
          throw e;
        },
      );
    },
    config: {
      transport: "stdio",
      serverName: "blender",
      command: "/home/user/tools/blender-4.5.0-linux-x64/blender",
      args: ["-b", "--python", "/home/user/Documents/programs/active/inference.cpp/vendor/comfyui_extensions/melite-blender-proxy-nodes/mcp_server.py"],
      env: {},
      cwd: "/home/user/Documents/programs/active/inference.cpp/vendor/comfyui_extensions/melite-blender-proxy-nodes",
      toolCallTimeoutMs: 300000,
      failOnStartupError: false,
    },
  } as unknown as Plugin,
  // ...and the same server on the RUNS plane: mcp:blender stages
  // execute as mcp__blender__* tool calls through the runtime.
  // inject gates the APPLY on both seats (the comfyui adapter's
  // `inject: ["engines"]` precedent): the 2026-09-15 live-fire
  // caught this row dying SILENTLY — the tools runtime mounts
  // after the estate row, the constructor's loud guard threw, and
  // cordis buried the per-fiber throw while the boot marched on
  // (seat: comfyui + craft only). Never an ungated seat read.
  {
    name: "melite-engine-mcp-row",
    inject: ["engines", "tools"],
    apply: (ctx: Context, config: unknown) => {
      // LOUD seat decision (the craft row's law): a silent row
      // hides a dead engine until a run fails at the door.
      console.log("[melite-estate] mcp row applying with config " + JSON.stringify(config));
      mcpEngines(ctx, config as { engines?: string[] });
    },
    config: { engines: ["mcp:blender"] },
  } as unknown as Plugin,
  // The craft loop engine (async apply: the route resolution rides
  // listModels — the seat lands after the enumeration).
  // MELITE_CRITIC_ROUTE "provider/model" names the critic
  // explicitly (the smoke drive pins the operator's spark route;
  // the lane default is the auto-route's first image-capable
  // enumeration) — explicit > implicit, verified before seating.
  // Late adapters (the pi-ai settings race — the adapter registers
  // on settings arrival, AFTER early rows apply): a missed first
  // attempt resubscribes on the registry's own llm/adapters-updated
  // announcement (root-side, like tools/change — a row fork never
  // sees it) and seats then, unsubscribing on success. The boot
  // line already said NOT seated LOUD; the seating line closes it.
  {
    name: "melite-engine-craft-row",
    apply: async (ctx: Context): Promise<void> => {
      const say = (line: string): void => {
        // console, not ctx.logger: the lane log owns stdout and the
        // optional-chained logger call swallowed the boot truth once
        // (2026-09-15) — never quiet-resolve a seat decision
        console.log("[melite-estate] " + line);
      };
      const named = /^([^/\s]+)\/(.+)$/.exec(process.env["MELITE_CRITIC_ROUTE"] ?? "");
      const prefer = named === null ? undefined : { provider: named[1] as string, model: named[2] as string };
      // Serialized attempts: adapters-updated fires per registration
      // (deepseek, pi-ai, …) and two concurrent attempts both pass
      // the resolve and collide in the service construction (the
      // 2026-09-15 drive killed its own child this way — an uncaught
      // duplicate-seat throw wedged boot and initialize timed out).
      // Never void without catch; a failed attempt logs LOUD and
      // releases for the next event, success unsubscribes.
      let done = false;
      let busy = false;
      let off: (() => void) | undefined;
      ctx.effect(() => () => off?.());
      const attempt = (): void => {
        if (done || busy) return;
        busy = true;
        void craftEngineAutoRoute(ctx, say, prefer).then(
          (seated) => {
            busy = false;
            if (seated) {
              done = true;
              off?.();
            }
          },
          (e: unknown) => {
            busy = false;
            say(`craft engine: late seat attempt failed (${String((e as { message?: unknown })?.message ?? e).slice(0, 200)}) — waiting for the next adapters-updated`);
          },
        );
      };
      off = ctx.root.on("llm/adapters-updated", attempt);
      attempt();
    },
  } as unknown as Plugin,
  // The agent engine (stroke 62, plan §5): engine id 'agent' on the
  // seat. Unlike the craft row there is NO boot-time route
  // enumeration to race — prepareCall happens per RUN, after the
  // adapters have long registered; the row needs only the SEATS
  // (gated by inject — the mcp-row lesson: never an ungated seat
  // read). The brain is named or the row refuses LOUD (a default
  // brain is a silent substitution the operator never asked for).
  {
    name: "melite-engine-agent-row",
    inject: ["engines", "tools", "llm"],
    apply: (ctx: Context): void => {
      const say = (line: string): void => {
        // console, not ctx.logger: the lane log owns stdout (the
        // craft row's law — never quiet-resolve a seat decision)
        console.log("[melite-estate] " + line);
      };
      const named = /^([^/\s]+)\/(.+)$/.exec(process.env["MELITE_AGENT_ROUTE"] ?? "");
      if (named === null) {
        // THE LINE MUST BE ACTIONABLE (a live 3088 commission's
        // finding: the not-seated notice rode line 3 of the maker's
        // log, where it is read by nobody, and it named the env var
        // without saying what the operator can DO about it). Two
        // lawful ways to seat the brain, both named, plus the honest
        // note that the card's own brain param rides the run instead.
        say("agent engine: MELITE_AGENT_ROUTE \"provider/model\" not set — engine 'agent' NOT seated; agent stages refuse at the door until the brain is named. Fix: export MELITE_AGENT_ROUTE=<provider>/<model> for this lane, or set the card's own brain param (params.ts: the agent card's model knob overrides the boot seat per run).")
        return;
      }
      // The spawn-injection reader: findSkill over the disclosure
      // root (MELITE_REPO_ROOT else file-anchored), body text or
      // leaf file; a read that fails answers null and the engine
      // refuses the skill LOUD at stage start.
      const skills = {
        read: async (id: string): Promise<string | null> => {
          const found = findSkill(disclosureRoot(), id);
          if (found === null) return null;
          if (found.bodyText !== null) return found.bodyText;
          try {
            // the FlowRow invariant (skillRows): bodyText is null only
            // when the file path is set — the cast carries it, branch-free.
            return await readFile(found.path as string, "utf8");
          } catch {
            return null;
          }
        },
      };
      agentEngine(ctx, { provider: named[1] as string, model: named[2] as string, skills });
    },
  } as unknown as Plugin,
  modelsProvider,
  comfyuiHost,
  comfyuiEngine,
  draftsPlugin,
  queuePlugin,
  // The card registry (REBUILD-9: the primed defs + facts + the
  // compose pipeline — the {model:} arms' engine) then the runs
  // registry + its Typert remote: the estate process serves the
  // runs lanes itself (start/status/stop/list/validate, both the
  // inline and the card door). The registry gates on the queue +
  // drafts + cards seats — mount order is load order here.
  cardRegistryProvider,
  provisioningComposition,
  // The disclosure seat (REBUILD-14): discover over both planes,
  // derived live — gates on the card registry seat (its inject).
  discloseProvider,
  // The management seat (REBUILD-15): the ComfyUI-Manager plane —
  // gates on the timer seat (the rail's timeouts).
  manageProvider,
  // The manage remote (the browser tab's plane): the Typert
  // namespace `manage` over the seat above.
  manageRemotePlugin,
  // The skills seat (REBUILD-16): the index + read over the
  // doc-tree walks — gates on the queue seat (the ledger seam).
  skillProvider,
  // The load seat (REBUILD-17): Melite load opens ONE card or
  // flow — the bundle (agents md + signature + skill lines).
  loadProvider,
  runsRegistryPlugin,
  runsRemotePlugin,
  // The media route last: it probes the queue seat at the use site
  // (optional-dependency law), so order carries no meaning — it just
  // reads well after the estate rows it serves.
  mediaPlugin,
  // The provisions route after it: it boots the models table itself
  // (bootModels' singleton, the card registry's own boot), so order
  // carries no meaning either.
  modelsPlugin,
];

export const name = "melite-estate";

/** The estate's config face (stroke 45c): repoRoot PINS the runs
 *  state tree — the queue seat refuses unpinned boots (a cwd-guessed
 *  root silently serves an empty runs tree; the profile patch names
 *  the repo). */
export interface Config {
  repoRoot?: string;
}

export function apply(ctx: Context, config: Config = {}): void {
  for (const row of rows) {
    // the queue row receives the pin (its QueueConfig.repoRoot)
    if (row === queuePlugin) {
      ctx.plugin(row, { repoRoot: config.repoRoot });
      continue;
    }
    // rows may carry their own config face (the MCP lane's stdio
    // server rows) — ctx.plugin's second argument is the row's
    // declared config, passed through verbatim
    const rowConfig = (row as { config?: unknown }).config;
    if (rowConfig !== undefined) {
      ctx.plugin(row, rowConfig);
      continue;
    }
    ctx.plugin(row);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
