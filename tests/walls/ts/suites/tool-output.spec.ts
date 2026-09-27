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
import "../../../helpers/boot-models.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { Context, Service, type Plugin } from "@deepseek-ai/cordis";
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
import type { JsonValue } from "../../../../packages/harness/melite-tools/src/types.ts";

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
  // execute's envelope is unknown-statically but always the
  // canonical JSON envelope at runtime — render's JsonValue face.
  const content = def.output.render(args, envelope as JsonValue);
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
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  // THE CORE-SKILLS DECOY (agent-trace audit, 2026-09-13): DSH
  // core's dsh-skill registers a service ALSO named "skills" in every
  // dsh-base composition — the tools' seat probe once read that name
  // and melite_skill_index died live ("seats.skills.index is not a function")
  // while this wall's bare composition stayed green. The decoy
  // reproduces the collision ON PURPOSE: if any probe touches
  // ctx.get('skills') again, the arms below fail loudly.
  class SkillsDecoy extends Service {
    constructor(c: Context) { super(c, "skills"); }
    index(): never { throw new Error("decoy skills service touched — the estate seat is meliteSkills"); }
    read(): never { throw new Error("decoy skills service touched — the estate seat is meliteSkills"); }
  }
  new SkillsDecoy(ctx);
  await ctx.plugin(estateBundle as unknown as Plugin);
  // settle the seats the tools' transports resolve (the composition
  // wall's settle pattern — the bundle fans out un-awaited)
  const seats = ["queue", "draftsRemote", "benchRemote", "cardRegistry", "disclose", "manage", "meliteSkills", "load", "runs", "comfyui"];
  const deadline = Date.now() + 15_000;
  for (;;) {
    const missing = seats.filter((n) => ctx.get(n, false) === undefined);
    if (missing.length === 0) break;
    if (Date.now() > deadline) assert.fail(`the bundle never settled: ${missing.join(", ")}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  tools = new ToolsCollector(ctx);
  await ctx.plugin(
    { name: toolsName, inject: toolsInject, apply: toolsApply } as unknown as Plugin,
    // cardTools: true — THE MAKER FACE (operator law 2026-09-21):
    // this wall proves the card faces EXECUTE + RENDER over the live
    // composition, so it opts in; the agent lane default (BASE only)
    // is pinned in melite-tools/test/index.spec.ts
    { headless: true, cardTools: true },
  );
}, 60_000);

describe("the melite tool faces answer over the live composition", () => {
  it("every base + headless + card tool registers (headless seats the estate doors AT APPLY — the maker law)", async () => {
    // THE EXPANSION LAW (operator 2026-10-08): BROWSER apply seats
    // only the eager trio; the deferred estate doors seat on the
    // first catalog touch. THE MAKER LAW (transcript-016 audit,
    // operator 2026-09-24): HEADLESS runners fix their tool catalog
    // at boot, so headless apply seats the deferred five immediately
    // — promised-but-unreachable doors burned nine catalog hunts and
    // whole reasoning spirals. This composition opts into headless
    // (the run doors + card faces), so the five sit at apply; the
    // browser-side deferral stays pinned in melite-tools' index.spec.
    const makerDoors = ["melite_view", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail"];
    for (const name of makerDoors) {
      assert.ok(tools.registered.some((d) => d.name === name), `${name} seated at apply (the maker law)`);
    }
    const names = tools.registered.map((d) => d.name).sort();
    for (const want of [
      "melite_discover", "melite_construct", "melite_load", "comfy_manage",
      "melite_skill_index", "melite_skill_read", "ledger_tail",
      "melite_flow", "run_status",
      "music", "tts", // voice_lock died 2026-09-21 (design moved into the tts card's mods)
      "image_edit", "motion", "h3_timeline",
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
    // NEITHER ANSWER IS A VACUOUS WIN (the walls audit's row 5):
    // `runId !== undefined || refused !== undefined` accepts an
    // EMPTY error string as a refusal, and a run_id of "" as a run.
    // Each half is pinned in its own shape: a refusal NAMES itself,
    // a run_id is a non-empty id.
    if (refused !== undefined) {
      assert.ok(refused.trim().length > 0, `the refusal names itself (got: ${JSON.stringify(envelope).slice(0, 200)}`);
    }
    if (runId !== undefined) {
      assert.ok(runId.trim().length > 0, `a run_id is a non-empty id (got: ${JSON.stringify(envelope).slice(0, 200)}`);
    }
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

  // ── THE DISCLOSURE LINES RIDE (2026-09-13, operator: "melite_discover
  // is not returning the tools + hints, it is supposed to have these as a
  // tool response"). dsh-tools buildSuccessResult feeds output.render
  // straight into the model-facing ToolResult.content — the envelope only
  // feeds the GUI. Counts-only renders starved the whole agent loop
  // (melite_load needs a name "exactly as discovered"; melite_skill_read needs
  // an id "from melite_skill_index"; the load follow-up needs params + model
  // ids). These arms pin the LINES, not the counts. ──────────────────
  it("melite_discover render NAMES real flows and cards from the envelope", async () => {
    const { envelope, lines } = await drive("melite_discover", { lookup: "all" });
    const env = envelope as { flows?: Array<{ name?: string }>; cards?: Array<{ id?: string }>; error?: string };
    const text = lines.join("\n");
    const firstFlow = env.flows?.[0]?.name;
    assert.ok(typeof firstFlow === "string" && text.includes(`  ${firstFlow} —`),
      `a rendered line names the first flow by id (want '  ${firstFlow} —' in: ${text.slice(0, 300)}`);
    const firstCard = env.cards?.[0]?.id;
    assert.ok(typeof firstCard === "string" && text.includes(`  ${firstCard} —`),
      `a rendered line names the first card by id`);
  });

  it("melite_skill_index render CARRIES the entrance ids (melite_skill_read demands one; the dump is dead)", async () => {
    // THE SELECTION LAW: the index serves the LIVE BENCH — seed one
    // (image-gen) or the render serves the empty-bench pointer.
    {
      const home = mkdtempSync(join(tmpdir(), "bench-home-"));
      const { mkdirSync, writeFileSync } = await import("node:fs");
      mkdirSync(join(home, "storages", "drafts", "docs"), { recursive: true });
      writeFileSync(
        join(home, "storages", "drafts", "docs", "bench-session-test.json"),
        JSON.stringify({ record: { doc: { stages: [{ card: "image-gen", params: {} }] } } }),
      );
      process.env["DSH_HOME"] = home;
    }
    let out: { envelope: unknown; lines: string[] };
    try {
      out = await drive("melite_skill_index", {});
    } finally {
      delete process.env["DSH_HOME"];
    }
    const { envelope, lines } = out;
    const env = envelope as { families?: Array<{ entrance?: string }>; cards?: Array<{ entrance?: string }>; skills?: Array<{ id?: string }>; error?: string };
    assert.equal(env.skills, undefined, "the envelope never carries skill rows");
    const first = [...(env.families ?? []), ...(env.cards ?? [])]
      .map((r) => r.entrance).find((e): e is string => typeof e === "string" && e !== "");
    assert.ok(typeof first === "string" && lines.join("\n").includes(first),
      `the rendered lines carry an entrance id (want ${first} in: ${lines.join(" | ").slice(0, 200)}`);
  });

  it("melite_skill_read render CARRIES the body (tier 2's whole purpose)", async () => {
    // the selection law: seed the bench (image-gen) so the index
    // carries an entrance id for melite_skill_read to open
    {
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const home = mkdtempSync(join(tmpdir(), "bench-home-"));
      mkdirSync(join(home, "storages", "drafts", "docs"), { recursive: true });
      writeFileSync(
        join(home, "storages", "drafts", "docs", "bench-session-test.json"),
        JSON.stringify({ record: { doc: { stages: [{ card: "image-gen", params: {} }] } } }),
      );
      process.env["DSH_HOME"] = home;
    }
    let idx: { envelope: unknown; lines: string[] };
    try {
      idx = await drive("melite_skill_index", {});
    } finally {
      delete process.env["DSH_HOME"];
    }
    const id = [...((idx.envelope as { families?: Array<{ entrance?: string }> }).families ?? []),
      ...((idx.envelope as { cards?: Array<{ entrance?: string }> }).cards ?? [])]
      .map((r) => r.entrance).find((e): e is string => typeof e === "string" && e !== "");
    assert.ok(typeof id === "string", "an entrance id came from melite_skill_index");
    const { envelope, lines } = await drive("melite_skill_read", { id });
    const env = envelope as { content?: string; error?: string };
    const body = typeof env.content === "string" ? env.content : "";
    assert.ok(body.length > 0, `the envelope carries the body`);
    const text = lines.join("\n");
    assert.ok(text.length > body.slice(0, 40).length && text.includes(body.slice(0, 40)),
      `the rendered lines carry the body's head (got: ${text.slice(0, 200)}`);
  });

  it("melite_load render CARRIES params + digest (the follow-up call needs them)", async () => {
    const disc = await drive("melite_discover", { lookup: "cards" });
    const card = (disc.envelope as { cards?: Array<{ id?: string }> }).cards?.[0]?.id;
    assert.ok(typeof card === "string", "a card id came from discover");
    const { envelope, lines } = await drive("melite_load", { name: card, inference_type: "card" });
    const env = envelope as { bundle?: { digest?: string }; error?: string };
    // NO BARE RETURN ON REFUSAL (the walls audit's row 4,
    // 2026-10-10): `if (refused) return` turned a REFUSAL into a
    // silent pass — the arm proves nothing whenever the composition
    // lacks the card docs, and the operator never learns which. A
    // refusal must still ANSWER: a named, non-empty error in the
    // envelope and in the rendered lines, or this wall fails.
    if (typeof env.error === "string") {
      assert.ok(env.error.trim().length > 0, "the refusal NAMES itself (empty error string)");
      assert.ok(lines.join("\n").includes("REFUSED"),
        `the refusal renders REFUSED (got: ${lines.join(" | ").slice(0, 200)}`);
      return;
    }
    const text = lines.join("\n");
    assert.ok(text.includes("params:") || text.includes("signature model:"),
      `the rendered lines carry the signature (got: ${text.slice(0, 200)}`);
    const digest = env.bundle?.digest;
    assert.ok(typeof digest === "string" && text.includes(digest),
      `the rendered lines carry the digest (got: ${text.slice(0, 200)}`);
  });
});
