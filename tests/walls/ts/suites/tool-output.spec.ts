// tool-output.spec.ts — THE TOOL-OUTPUT WALL (the "no output, no
// disclosure" report, 2026-09-12): the melite tool faces booted
// against the LIVE estate composition must EXECUTE and RENDER —
// execute() returns the canonical envelope AND output.render()
// returns non-empty model-facing content. The executor specs prove
// the faces against mocked seams; this wall proves the SAME faces
// over the real seat plane (storage + the whole melite-estate
// bundle), so a composition break that leaves tools silent fails
// HERE, not at the operator's screen.
//
// Run: npx vitest run tests/walls/ts/suites/tool-output.spec.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import {
  apply as toolsApply,
  name as toolsName,
  inject as toolsInject,
} from "../../../../packages/harness/melite-tools/src/index.ts";
import type { ToolDefinition } from "../../../../packages/harness/melite-tools/src/types.ts";

/** The tools-service surface (the Consumer-owned shape — the same
 *  stub the executor specs ride; melite-tools only registers). */
class ToolsCollector extends Service {
  registered: ToolDefinition[] = [];
  constructor(ctx: Context) { super(ctx, "tools"); }
  register(def: ToolDefinition): () => void {
    this.registered.push(def);
    return () => {
      const i = this.registered.indexOf(def);
      if (i >= 0) this.registered.splice(i, 1);
    };
  }
  schemas(): Array<{ name: string; description?: string; parameters?: unknown }> {
    return this.registered.map((d) => ({ name: d.name, description: d.description }));
  }
}

let ctx: Context;
let tools: ToolsCollector;

function tool(name: string): ToolDefinition {
  const def = tools.registered.find((d) => d.name === name);
  assert.ok(def, `the ${name} tool registered over the live composition`);
  return def;
}

/** execute() → canonical envelope, then render() → model-facing
 *  content. The wall's whole point: BOTH must answer, non-empty. */
async function drive(
  name: string,
  args: Record<string, unknown>,
): Promise<{ envelope: unknown; lines: string[] }> {
  const def = tool(name);
  assert.ok(def.execute, `${name} declares execute`);
  assert.ok(def.output?.render, `${name} declares output.render`);
  const envelope = await def.execute(args, {
    signal: new AbortController().signal,
    eventId: "wall",
    sessionId: "wall",
    callId: "wall",
    toolCallId: "wall",
  } as never);
  const content = def.output.render(args, envelope);
  const lines = (content ?? [])
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text);
  return { envelope, lines };
}

beforeAll(async () => {
  const root = mkdtempSync(join(tmpdir(), "tool-output-wall-"));
  process.env["MELITE_STATE_ROOT"] = root;
  process.env["MELITE_HEADLESS"] = "1";
  ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(estateBundle as never);
  // settle the seats the tools' transports resolve (the composition
  // wall's settle pattern — the bundle fans out un-awaited)
  const seats = ["queue", "draftsRemote", "benchRemote", "cardRegistry", "disclose", "manage", "skills", "load", "runs", "comfyui"];
  const deadline = Date.now() + 15_000;
  for (;;) {
    const missing = seats.filter((n) => ctx.get(n, false) === undefined);
    if (missing.length === 0) break;
    if (Date.now() > deadline) assert.fail(`the bundle never settled: ${missing.join(", ")}`);
    await new Promise((r): void => setTimeout(r, 50));
  }
  tools = new ToolsCollector(ctx);
  await ctx.plugin(
    { name: toolsName, inject: toolsInject, apply: toolsApply } as never,
    { headless: true },
  );
}, 60_000);

describe("the melite tool faces answer over the live composition", () => {
  it("every base + headless + card tool registers", () => {
    const names = tools.registered.map((d) => d.name).sort();
    for (const want of [
      "melite_discover", "melite_construct", "melite_load", "comfy_manage",
      "skill_index", "skill_read", "ledger_tail",
      "melite_flow", "run_status",
      "music", "tts", "voice_lock",
      "image_edit", "motion", "h3_timeline", "clothing_placement",
    ]) {
      assert.ok(names.includes(want), `${want} registered (got: ${names.join(", ")})`);
    }
  });

  it("melite_discover EXECUTES and RENDERS disclosure lines (no silent disclosure)", async () => {
    const { envelope, lines } = await drive("melite_discover", { lookup: "all" });
    const env = envelope as { flows?: unknown[]; cards?: unknown[]; error?: string };
    assert.ok(Array.isArray(env.flows) && env.flows.length >= 11,
      `flows ride in the envelope (got ${env.flows?.length ?? "none"}: ${JSON.stringify(envelope).slice(0, 300)}`);
    assert.ok(Array.isArray(env.cards) && env.cards.length >= 1, "cards ride in the envelope");
    assert.ok(lines.length >= 1 && lines.join("").length > 0,
      `render returns model-facing lines (got ${lines.length}: ${lines.join(" | ").slice(0, 200)}`);
  });

  it("melite_flow EXECUTES and RENDERS the run envelope (no silent run)", async () => {
    const { envelope, lines } = await drive("melite_flow", {
      card: "image-gen", model: "krea-2",
      params: { prompt: "a tiny red sailboat on glass water, dawn" },
    });
    const env = envelope as Record<string, unknown>;
    const runId = typeof env["run_id"] === "string" ? env["run_id"] : undefined;
    const refused = typeof env["error"] === "string" ? env["error"] : undefined;
    assert.ok(runId !== undefined || refused !== undefined,
      `the envelope answers (run_id or a named refusal — got: ${JSON.stringify(envelope).slice(0, 300)}`);
    assert.ok(lines.length >= 1 && lines.join("").length > 0,
      `render returns model-facing lines (got ${lines.length}: ${lines.join(" | ").slice(0, 200)}`);
    if (runId !== undefined) {
      assert.match(lines.join(" "), /run_status/, "the rendered line names the monitor door");
    }
  });

  it("a card tool (music) EXECUTES and RENDERS over the same seats", async () => {
    const { envelope, lines } = await drive("music", {
      prompt: "a two-bar funk guitar loop",
    });
    const env = envelope as Record<string, unknown>;
    const answered = typeof env["run_id"] === "string" || typeof env["error"] === "string";
    assert.ok(answered, `the envelope answers (got: ${JSON.stringify(envelope).slice(0, 300)}`);
    assert.ok(lines.length >= 1 && lines.join("").length > 0,
      `render returns model-facing lines (got ${lines.length}: ${lines.join(" | ").slice(0, 200)}`);
  });
});
