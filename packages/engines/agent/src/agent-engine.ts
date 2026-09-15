// agent-engine.ts — the agent engine (stroke 60, plan §5:
// docs/design/engine-generics-mcp.md). One stage = ONE AGENT RUN:
// a general tool-calling loop with the task as its brief — "craft
// without the fixed critic". The model gets the allow-listed MCP
// tools (filtered from the host ToolRuntime's own schemas), drives
// them turn by turn through `tools.execute` (the same programmatic
// channel the mcp engine and the harness agent loop ride — every
// allow/deny/ask policy applies), and answers with text when the
// task is done. Artifacts are the run-dir tree's new files (the
// estate's artifact law).
//
// THE FOUR PARAMS (the operator's sketch, verbatim — plan §5.2):
//   task      (required)      the brief
//   mcps[]    (allow-list)    MCP server namespaces → tools mcp__<server>__*
//   skills[]  (spawn-injected)leaves read AT STAGE START and inlined
//                              into the brief (NOT constructor-read — two
//                              different processes, the operator's pin)
//   max_turns (default UNLIMITED, hard circuit breaker 1000)
//   inputs[]  (plus-box list) name/value entries rendered into the brief
//
// STREAM LAW (copied from the real protocol, dsh-llm types — never
// invented): tool calls arrive as `block-end` chunks carrying an
// assembled `{type:'tool-call', id, name, arguments}` block
// (arguments = RAW JSON string); the finish reason is an OBJECT
// `{kind:'stop'|'tool-calls'|'max-tokens'|'aborted'|'error'}`.
// Dispatch rides `{...prepared.config, messages, tools}` (the
// stroke-57 INVALID_PREPARED_CALL law).
import { randomUUID } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import type { ToolExecutionInput, ToolExecutionResult } from "@deepseek-ai/dsh-tools";
import { ToolCallId } from "@deepseek-ai/dsh-llm";
import type { EnginesService, EngineStageOutcome } from "@melite/engine-contract";

/** The hard circuit breaker (never a tunable — a law). DEFAULT
 *  max_turns is UNLIMITED (the operator's word: "if I give a task
 *  to 'rig a character'… that is not 10 turns"); this cap is the
 *  runaway bound, with the stop door and live reports as the real
 *  bounds. */
export const AGENT_MAX_TURNS_HARD_CAP = 1000;

/** The structural slice of the host ToolRuntime the loop rides
 *  (the real service is dsh-tools' ToolRuntime — schemas() projects
 *  visible definitions onto model-facing fields; execute() is the
 *  caller-owned programmatic channel). */
export interface AgentToolsSeam {
  schemas(): { name: string; description: string; parameters: Record<string, unknown> }[];
  execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
}

/** The skills seam: read one leaf's body at stage start (the
 *  spawn-injection process — the estate composition builds the real
 *  reader from findSkill; the engine never walks the repo itself). */
export interface AgentSkillReader {
  read(id: string): Promise<string | null>;
}

/** The llm seam (the craft engine's structural slice, grown for
 *  tools: the stream options carry ToolSchemas and the loop-built
 *  message history). */
export interface AgentLlmSeam {
  prepareCall(config: { provider: string; model: string }, signal?: AbortSignal): Promise<{
    /** The resolved config prepareCall materialized (defaults filled —
     *  the dispatch contract compares stream options against it). */
    config: { provider: string; model: string; [key: string]: unknown };
    stream(options: {
      provider: string;
      model: string;
      system?: string;
      messages: { role: "user" | "assistant"; content: unknown[] }[];
      tools?: { name: string; description: string; parameters: Record<string, unknown> }[];
      [key: string]: unknown;
    }): AsyncIterable<{ type: string; text?: string; block?: { type?: unknown; text?: unknown } }>;
  }>;
}

/** One assembled tool call off the stream (block-end, assembled —
 *  the protocol guarantees it; deltas are never hand-joined). */
interface TurnToolCall {
  id: string;
  name: string;
  arguments: string;
}

/** Snapshot a dir tree (file paths, relative) — the mcp-engine
 *  collect-arm law, copied (the runs tree is the estate's artifact
 *  law). Missing dir = empty set. */
const treeOf = (dir: string): Set<string> => {
  const out = new Set<string>();
  const walk = (d: string, prefix: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      /* v8 ignore next -- TOCTOU/missing-dir only: the initial call
       * always names the run dir; subdirs come from the same live
       * walk (the mcp-engine law, mirrored) */
      return;
    }
    for (const name of entries) {
      const full = join(d, name);
      const rel = prefix === "" ? name : `${prefix}/${name}`;
      let st;
      try {
        st = statSync(full);
      } catch {
        /* v8 ignore next -- TOCTOU-only (the skillPlane law): paths
         * come from the same live readdir */
        continue;
      }
      if (st.isDirectory()) walk(full, rel);
      else out.add(rel);
    }
  };
  walk(dir, "");
  return out;
};

const plainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Validate the string-array params (mcps, skills): an array of
 *  non-empty strings, nothing else. */
const stringArrayOk = (v: unknown, where: string, field: string): string[] => {
  if (!Array.isArray(v)) {
    throw new Error(`${where}: '${field}' must be an array of strings`);
  }
  const out: string[] = [];
  for (const e of v) {
    if (typeof e !== "string" || e.length === 0) {
      throw new Error(`${where}: '${field}' entries must be non-empty strings`);
    }
    out.push(e);
  }
  return out;
};

/** Render the plus-box inputs list into brief lines (slice §5.2:
 *  array-of-entries on the wire — structural, never stringified). */
const renderInputs = (inputs: readonly { name: string; value: unknown }[]): string => {
  if (inputs.length === 0) return "";
  return (
    "\n\nINPUTS:\n" +
    inputs.map((i) => `- ${i.name}: ${typeof i.value === "string" ? i.value : JSON.stringify(i.value)}`).join("\n")
  );
};

/** Parse "provider/model" (the card's model dropdown id). */
export const parseRoute = (
  model: unknown,
  where: string,
): { provider: string; model: string } => {
  if (typeof model !== "string" || !model.includes("/")) {
    throw new Error(`${where}: 'model' must be a "provider/model" route id`);
  }
  const [provider, ...rest] = model.split("/");
  return { provider: provider as string, model: rest.join("/") };
};

/** The agent loop executor: llm + tools + (optional) skill reader,
 *  all injected — pinned with fakes per the estate test law. */
export const agentLoopExecutor = (
  llm: AgentLlmSeam,
  tools: AgentToolsSeam,
  skills?: AgentSkillReader,
  fallbackRoute?: { provider: string; model: string },
): { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } => {
  return {
    async executeStages(rows, runDir, _inputNames, options) {
      const outcomes: EngineStageOutcome[] = [];
      for (const row of rows) {
        const where = `agent stage ${JSON.stringify(row.stageId)}`;
        const p = row.params as Record<string, unknown>;
        // ── THE FOUR PARAMS (validated loud, before anything runs) ──
        const task = p.task;
        if (typeof task !== "string" || task.length === 0) {
          throw new Error(`${where}: 'task' (the brief) is required`);
        }
        const mcps = p.mcps === undefined ? [] : stringArrayOk(p.mcps, where, "mcps");
        const skillIds = p.skills === undefined ? [] : stringArrayOk(p.skills, where, "skills");
        if (skillIds.length > 0 && skills === undefined) {
          throw new Error(
            `${where}: 'skills' requested but this lane wires no skill reader (spawn-injection is a serving path the composition owns)`,
          );
        }
        const inputsRaw = p.inputs;
        const inputs: { name: string; value: unknown }[] = [];
        if (inputsRaw !== undefined) {
          if (!Array.isArray(inputsRaw)) {
            throw new Error(`${where}: 'inputs' must be an array of {name, value} entries`);
          }
          for (const e of inputsRaw) {
            if (!plainObject(e) || typeof e.name !== "string" || e.name.length === 0 || !("value" in e)) {
              throw new Error(
                `${where}: 'inputs' entries must be objects {name: string, value: any}`,
              );
            }
            inputs.push({ name: e.name, value: e.value });
          }
        }
        const maxTurns = p.max_turns;
        if (
          maxTurns !== undefined &&
          (typeof maxTurns !== "number" || !Number.isInteger(maxTurns) || maxTurns < 1)
        ) {
          throw new Error(`${where}: 'max_turns' must be a positive integer (default unlimited)`);
        }
        if (maxTurns !== undefined && maxTurns > AGENT_MAX_TURNS_HARD_CAP) {
          throw new Error(
            `${where}: 'max_turns' ${maxTurns} exceeds the hard cap ${AGENT_MAX_TURNS_HARD_CAP}`,
          );
        }
        const route = p.model === undefined ? undefined : parseRoute(p.model, where);

        // ── SPAWN-INJECTION: read the named leaves at stage start and
        //    inline them into the brief as operating instructions (the
        //    two-process pin — this is NOT melite_load's constructor
        //    read; same storage, new serving path). Unknown skill =
        //    loud refusal, never a silent skip. ──
        let skillText = "";
        for (const id of skillIds) {
          const body = (await skills?.read(id)) ?? null;
          if (body === null) {
            throw new Error(`${where}: skill ${JSON.stringify(id)} does not resolve (no such leaf)`);
          }
          skillText += `\n\n--- SKILL: ${id} ---\n${body}`;
        }

        // ── THE TOOL ALLOW-LIST: mcps[] namespaces → mcp__<server>__*
        //    (the dsh-mcp-client naming law). Empty list = a pure text
        //    agent (no tools offered — the model never sees them). ──
        const allow = (name: string): boolean => {
          for (const server of mcps) {
            if (name.startsWith(`mcp__${server}__`)) return true;
          }
          return false;
        };
        const toolSchemas = mcps.length === 0 ? [] : tools.schemas().filter((s) => allow(s.name));
        if (mcps.length > 0 && toolSchemas.length === 0) {
          throw new Error(
            `${where}: 'mcps' [${mcps.join(", ")}] allow-list matches no seated tools (the census is empty — seat the server or drop the entry)`,
          );
        }

        const before = treeOf(runDir);
        const brief =
          `TASK:\n${task}` +
          (skillText === "" ? "" : skillText) +
          renderInputs(inputs) +
          `\n\nWORKING DIRECTORY: ${runDir} — write every output file HERE (relative paths land in it).` +
          (toolSchemas.length === 0
            ? "\nYou have no tools this run: answer in text."
            : `\nTOOLS: the mcp tools offered below. Call them as needed; when the task is done, answer in text.`);

        const messages: { role: "user" | "assistant"; content: unknown[] }[] = [
          { role: "user", content: [{ type: "text", text: brief }] },
        ];

        // ── THE LOOP (turn = one model dispatch + its tool calls) ──
        let turns = 0;
        let finalText = "";
        for (;;) {
          if (options.shouldStop()) {
            throw new Error(`${where}: stopped by the user at turn ${turns}`);
          }
          if (
            turns >= AGENT_MAX_TURNS_HARD_CAP ||
            (maxTurns !== undefined && turns >= maxTurns)
          ) {
            throw new Error(
              `${where}: task unfinished within ${maxTurns ?? AGENT_MAX_TURNS_HARD_CAP} turns (the circuit breaker)`,
            );
          }
          if (route === undefined && fallbackRoute === undefined) {
            throw new Error(
              `${where}: 'model' (a "provider/model" route id) is required when the engine config names no brain`,
            );
          }
          const dispatchRoute = route ?? (fallbackRoute as { provider: string; model: string });
          const prepared = await llm.prepareCall(dispatchRoute);
          let text = "";
          const calls: TurnToolCall[] = [];
          const seen: Record<string, number> = {};
          let finishKind = "none";
          for await (const chunk of prepared.stream({
            ...prepared.config,
            system: brief,
            messages,
            ...(toolSchemas.length === 0 ? {} : { tools: toolSchemas }),
          })) {
            const c = chunk as {
              type: string;
              text?: unknown;
              block?: { type?: unknown; text?: unknown };
              reason?: unknown;
            };
            seen[c.type] = (seen[c.type] ?? 0) + 1;
            if (c.type === "text-delta" && typeof c.text === "string") text += c.text;
            else if (c.type === "block-end" && c.block?.type === "text" && typeof c.block.text === "string") {
              text += c.block.text;
            } else if (c.type === "block-end" && c.block?.type === "tool-call") {
              const b = c.block as unknown as TurnToolCall & { type: string };
              calls.push({ id: b.id, name: b.name, arguments: b.arguments });
            } else if (c.type === "finish") {
              // The finish reason is an OBJECT {kind} (dsh-llm
              // FinishReason — read, never guessed). Only error-shaped
              // kinds throw; a clean stop may also ride an object
              // (the craft stroke-58 law).
              const r = c.reason as { kind?: unknown; failure?: unknown; error?: unknown } | string | undefined;
              if (typeof r === "string") {
                finishKind = r;
              } else if (plainObject(r)) {
                if (r.kind === "error" || r.kind === "aborted" || r.failure !== undefined || r.error !== undefined) {
                  throw new Error(
                    `${where}: model call failed at turn ${turns}: ${JSON.stringify(c.reason).slice(0, 600)}`,
                  );
                }
                finishKind = typeof r.kind === "string" ? r.kind : "object-stop";
              }
            }
          }
          turns += 1;
          // The assistant turn rides the history (text + its tool
          // calls — exactly what the model produced).
          messages.push({
            role: "assistant",
            content: [
              ...(text === "" ? [] : [{ type: "text", text }]),
              ...calls.map((c) => ({ type: "tool-call", id: c.id, name: c.name, arguments: c.arguments })),
            ],
          });
          if (calls.length === 0) {
            finalText = text;
            break;
          }
          // ── EXECUTE the turn's calls through the host ToolRuntime
          //    (the programmatic channel — every policy applies). A
          //    parse failure or tool error goes back to the MODEL as
          //    an isError tool-result (the loop's discipline), never
          //    a silent drop. ──
          const results: unknown[] = [];
          for (const call of calls) {
            let args: Record<string, unknown>;
            try {
              const parsed: unknown = JSON.parse(call.arguments === "" ? "{}" : call.arguments);
              if (!plainObject(parsed)) throw new Error("arguments must be a JSON object");
              args = parsed;
            } catch (e: unknown) {
              results.push({
                type: "tool-result",
                toolCallId: call.id,
                content: [{ type: "text", text: `argument parse failed: ${String(e)}` }],
                isError: true,
              });
              continue;
            }
            const controller = new AbortController();
            /* v8 ignore next 3 -- timing-only (the 250ms tick): the
             * stop door itself is pinned at the loop top; a test that
             * parks 250ms buys nothing */
            const ticker = setInterval(() => {
              if (options.shouldStop()) controller.abort();
            }, 250);
            let result: ToolExecutionResult;
            try {
              result = await tools.execute({
                callId: ToolCallId(`melite-agent-${randomUUID()}`),
                name: call.name,
                arguments: args,
                signal: controller.signal,
              });
            } finally {
              clearInterval(ticker);
            }
            const textBlock = result.content.find((b) => (b as { type?: string }).type === "text");
            results.push({
              type: "tool-result",
              toolCallId: call.id,
              content: [
                {
                  type: "text",
                  text: result.isError
                    ? `tool error: ${result.error.message}`
                    : typeof (textBlock as { text?: unknown } | undefined)?.text === "string"
                      ? (textBlock as { text: string }).text
                      : JSON.stringify(result.value),
                },
              ],
              ...(result.isError ? { isError: true } : {}),
            });
            options.report({
              activity: `agent turn ${turns}: ${call.name} ${result.isError ? "ERROR" : "ok"}`,
            });
          }
          messages.push({ role: "user", content: results });
        }
        const artifacts = [...treeOf(runDir)].filter((f) => !before.has(f)).sort();
        options.report({
          activity: `agent done in ${turns} turn${turns === 1 ? "" : "s"} (${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"})`,
        });
        outcomes.push({ stageId: row.stageId, outputs: { default: finalText }, artifacts });
      }
      return { stages: outcomes };
    },
  };
};

/** The provider: engine id 'agent' on the seat. The brain route is
 *  named in config (explicit > implicit — the estate row wires it;
 *  a stage param 'model' overrides per run). */
export const agentEngine = (
  ctx: Context,
  config: { provider: string; model: string; skills?: AgentSkillReader },
): void => {
  new AgentEngineService(ctx, config);
};

export class AgentEngineService extends Service {
  constructor(
    ctx: Context,
    config: { provider: string; model: string; skills?: AgentSkillReader },
  ) {
    super(ctx, "melite-engine-agent");
    const seat = ctx.get("engines") as EnginesService | undefined;
    if (seat === undefined) {
      throw new Error("agentEngine: the 'engines' seat is not mounted (mount enginesContract before this row)");
    }
    if (typeof config.provider !== "string" || config.provider.length === 0) {
      throw new Error("agentEngine: config needs the 'provider' route id (the brain)");
    }
    if (typeof config.model !== "string" || config.model.length === 0) {
      throw new Error("agentEngine: config needs the 'model' route id");
    }
    const llm = ctx.get("llm") as AgentLlmSeam | undefined;
    if (llm === undefined) {
      throw new Error("agentEngine: the llm seat is not mounted (the agent needs the route)");
    }
    const tools = ctx.get("tools") as AgentToolsSeam | undefined;
    if (tools === undefined) {
      throw new Error("agentEngine: the tools runtime is not mounted (the agent drives tools through it)");
    }
    ctx.effect(() =>
      seat.register("agent", {
        executor: agentLoopExecutor(llm, tools, config.skills, {
          provider: config.provider,
          model: config.model,
        }),
      }),
    );
    console.log(
      `[melite-engine-agent] seated: brain ${config.provider}/${config.model}${config.skills === undefined ? "" : " + skill reader"}`,
    );
  }
}
