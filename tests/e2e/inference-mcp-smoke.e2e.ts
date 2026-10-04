/**
 * inference-mcp-smoke.e2e.ts — THE MCP LIVE RECEIPT (stroke 83).
 *
 * The gap this closes: ComfyUI had a live full-stack e2e receipt
 * (inference-smoke.e2e.ts → real PNG bytes); the MCP lane had
 * protocol-level live-fire proof (the blender server's own
 * handshake/scene_info/render_shot, ledger §5175) and unit walls
 * on the executor — but NOTHING drove a RUN through the estate
 * door → mcp:blender executor → the real blender binary. This spec
 * is that joint: one run, real stage params, a real
 * blender-rendered PNG artifact harvested into the run dir.
 *
 * Gates honestly (the ComfyUI-gate precedent): the blender binary
 * + the vendored mcp_server.py must exist; without them the spec
 * self-skips (a skip is not a cost signal — the no-engine arm
 * pins the gate itself).
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";

// ── the gate: blender + the vendored server face ──────────────────
/** Resolve a bare binary name through PATH (existsSync cannot). */
function onPath(name: string): string {
  for (const dir of (process.env["PATH"] ?? "").split(":")) {
    if (!dir) continue;
    const candidate = join(dir, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch { /* not in this dir */ }
  }
  return "";
}
const BLENDER = process.env["MELITE_E2E_BLENDER"] ?? onPath("blender");
const REPO = join(import.meta.dirname, "..", "..");
const MCP_SERVER = join(REPO, "vendor", "comfyui_extensions", "melite-blender-proxy-nodes", "mcp_server.py");
// The @deepseek-ai scope the host rows import from: an explicit
// override, else the newest mise-installed global dsh (the dev
// estate's layout), else unresolvable (the suite self-skips).
const DSH_SCOPE: string | null = (() => {
  const env = process.env["MELITE_DSH_MODULES"];
  if (env) return env;
  const installs = join(process.env["HOME"] ?? "", ".local/share/mise/installs/node");
  try {
    const version = readdirSync(installs).sort().at(-1);
    if (version === undefined) return null;
    return join(installs, version, "lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai");
  } catch { return null; }
})();
const HAS_ENGINE = BLENDER !== "" && existsSync(MCP_SERVER) && DSH_SCOPE !== null;

/** Mint a fresh sandbox (the estate-smoke convention). */
function mintSandbox(prefix: string): { root: string; dispose(): void } {
  const root = mkdtempSync(join(tmpdir(), prefix));
  return { root, dispose: (): void => { rmSync(root, { recursive: true, force: true }); } };
}

describe("inference mcp smoke (live blender through the estate door)", { timeout: 240_000 }, () => {
  describe.runIf(HAS_ENGINE)("with the engine", () => {
    let ctx: Context;
    let sandbox: { root: string; dispose(): void };
    let stateRoot: string;

    // the restore (the flake audit's A1 step 7, 2026-10-15): the
    // beforeAll SETS MELITE_STATE_ROOT over whatever the outer shell
    // carried — a bare delete writes "absent" over a PRESENT value,
    // so later suites in the same fork read a different world
    const savedStateRoot = process.env["MELITE_STATE_ROOT"];
    beforeAll(async () => {
      sandbox = mintSandbox("melite-e2e-mcp-");
      stateRoot = join(sandbox.root, "state");
      mkdirSync(stateRoot, { recursive: true });
      process.env["MELITE_STATE_ROOT"] = stateRoot;
      ctx = new Context();
      // The production composition rows (melite-estate/src/index.ts,
      // same order): the queue seat, the engines seat, the
      // dsh-mcp-client blender stdio row (the REAL binary + the
      // vendored mcp_server.py), the mcp engine provider, then the
      // runs registry.
      // THE HOST STORAGE STACK (estate-smoke's exact rows — the
      // drafts domain the start door probes rides it):
      const hostPkg = (n: string) =>
        `../../packages/estate/drafts/node_modules/@deepseek-ai/${n}/lib/index.js`;
      const Storage = (await import(hostPkg("dsh-storage"))).default as new (c: unknown) => unknown;
      const jsonBackend = await import(hostPkg("dsh-storage-json"));
      const domainPlugin = await import(hostPkg("dsh-storage-domain"));
      await ctx.plugin(Storage);
      await ctx.plugin(
        { apply: jsonBackend.apply, Config: jsonBackend.Config, inject: jsonBackend.inject, name: "storage-json-mcp-e2e" },
        { root: join(stateRoot, "storage") },
      );
      await ctx.plugin({ ...domainPlugin }, { backend: "json" });
      const estateQueue = (await import("../../packages/harness/estate-queue/src/index.ts")).default;
      const estateDrafts = (await import("../../packages/estate/drafts/src/index.ts")).default;
      const engineContract = await import("../../packages/engines/contract/src/index.ts");
      const mcpEngine = await import("../../packages/engines/mcp/src/index.ts");
      const mcpClient = await import(
        "../../packages/web/melite-estate/node_modules/@deepseek-ai/dsh-mcp-client/lib/index.js"
      );
      ctx.plugin(estateQueue, { repoRoot: stateRoot });
      const engines = new engineContract.EnginesService(ctx);
      void engines;
      // The host rows the lane rides (dsh-base cordis.patch.yml):
      // system-prompt first (ToolRuntime's constructor wires its
      // schema face into it), then the tools registry itself.
      const promptPkg = await import(pathToFileURL(join(DSH_SCOPE!, "dsh-system-prompt/lib/index.js")).href);
      new (promptPkg as unknown as { default: new (c: unknown, cfg: unknown) => unknown }).default(ctx, {});
      const toolsPkg = await import(pathToFileURL(join(DSH_SCOPE!, "dsh-tools/lib/index.js")).href);
      new (toolsPkg as unknown as { ToolRuntime: new (c: unknown, cfg: unknown) => unknown }).ToolRuntime(ctx, { mode: "native" });
      // The blender stdio row, VERBATIM from the lane's composition:
      // failOnStartupError false, the mcp_server.py face, the same
      // cwd. The apply promise resolves once the census lands.
      const settled = (mcpClient as unknown as {
        apply(c: unknown, config: unknown): unknown;
      }).apply(ctx, {
        transport: "stdio",
        serverName: "blender",
        command: BLENDER,
        args: ["-b", "--python", MCP_SERVER],
        env: {},
        cwd: join(MCP_SERVER, ".."),
        toolCallTimeoutMs: 300_000,
        failOnStartupError: false,
      });
      if (settled !== undefined && typeof (settled as Promise<unknown>).then === "function") {
        await settled;
      }
      (mcpEngine as unknown as {
        mcpEngines(c: unknown, config: { engines?: string[] }): void;
      }).mcpEngines(ctx, { engines: ["mcp:blender"] });
      ctx.plugin(estateDrafts);
      const { RunsRuntimeService } = await import("../../packages/harness/estate-queue/src/runsRegistry.ts");
      new RunsRuntimeService(ctx);
      // the bench doc the run's draft_id names — BORN through the
      // real bench door (ensureBench's CARD BIRTH LAW: a session's
      // doc lands at bench-<session>; the run door probes that id).
      const benchRemote = (ctx as unknown as { benchRemote: { ensure(doc: Record<string, unknown>, signal: AbortSignal): Promise<unknown> } }).benchRemote;
      await benchRemote.ensure(
        { session: "main", intent: "the mcp e2e bench", stages: [], author: "agent", expect_rev: 0, overwrite: false },
        new AbortController().signal,
      );
    });

    afterAll(async () => {
      if (savedStateRoot === undefined) delete process.env["MELITE_STATE_ROOT"];
      else process.env["MELITE_STATE_ROOT"] = savedStateRoot;
      await ctx.fiber.dispose();
      sandbox.dispose();
    });

    it("drives one mcp:blender run to a real rendered PNG artifact", async () => {
      const svc = (ctx as unknown as { runs: RunsRuntimeServiceLike }).runs;
      assert.ok(typeof svc?.start === "function", "the runs seat mounted");
      const ans = await svc.start({
        draft_id: "bench-main",
        test: false,
        flow_inline: {
          id: "blender_shot",
          stages: [{
            id: "s",
            engine: "mcp:blender",
            params: {
              tool: "render_shot",
              args: { out: "shot.png", width: 320, height: 320 },
            },
          }],
        },
      }, new AbortController().signal);
      // settle: poll the registry row (the queue's own truth)
      const core = (ctx as unknown as { queue: { core: { runs: Map<string, { status: string; error?: string }> } } }).queue.core;
      const deadline = Date.now() + 180_000;
      let row: { status: string; error?: string } | undefined;
      for (;;) {
        row = core.runs.get(ans.run_id);
        const st = row?.status ?? "absent";
        if (st === "completed" || st === "failed" || st === "stopped") break;
        if (Date.now() > deadline) throw new Error("mcp e2e: run never settled (last " + st + ")");
        await new Promise((r): void => { setTimeout(r, 500); });
      }
      assert.equal(row?.status, "completed", "the run completed: " + (row?.error ?? ""));
      const status = await svc.status(ans.run_id, new AbortController().signal) as {
        artifacts?: string[];
        stages?: { url?: string }[];
      };
      assert.ok((status.artifacts?.length ?? 0) >= 1, "the harvest caught the artifact: " + JSON.stringify(status.artifacts));
      // the artifact is route-relative (the stroke-82 law)
      for (const a of status.artifacts ?? []) {
        assert.ok(!String(a).startsWith("/"), "route-relative: " + String(a));
      }
      const png = join(stateRoot, "output", ans.run_id, "shot.png");
      assert.ok(existsSync(png), "the PNG landed in the run dir");
      const magic = readFileSync(png).subarray(0, 4);
      assert.equal(magic[0], 0x89);
      assert.equal(magic[1], 0x50);
      assert.equal(magic[2], 0x4e);
      assert.equal(magic[3], 0x47, "real PNG magic bytes (blender-rendered)");
      // the sidecar settled completed
      const side = JSON.parse(readFileSync(join(stateRoot, "output", ans.run_id, "_flow.json"), "utf8")) as {
        status: string;
        artifacts: string[];
      };
      assert.equal(side.status, "completed");
      assert.ok(side.artifacts.length >= 1);
    });
  });

  describe.skipIf(HAS_ENGINE)("without the engine", () => {
    it("self-skips honestly (a skip is not a cost signal)", () => {
      // The gate is the receipt's honesty: without the blender
      // binary (or the vendored server face) this spec declines to
      // claim anything about the MCP joint. The with-engine arm
      // above is the law; MELITE_E2E_BLENDER overrides the binary.
      assert.ok(true);
    });
  });
});

interface RunsRuntimeServiceLike {
  start(doc: unknown, signal: AbortSignal): Promise<{ run_id: string; status: string; queue_position: number }>;
  status(runId: string, signal: AbortSignal, includeLog?: boolean): Promise<unknown>;
}
