// agent-engine.ts — the agent engine (stroke 60, plan §5:
// dev_docs/design/engine-generics-mcp.md). One stage = ONE AGENT RUN:
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
import { normalizeAgentStageParams } from "./params.js";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { ToolCallId } from "@deepseek-ai/dsh-llm";
/** The hard circuit breaker (never a tunable — a law). DEFAULT
 *  max_turns is UNLIMITED (the operator's word: "if I give a task
 *  to 'rig a character'… that is not 10 turns"); this cap is the
 *  runaway bound, with the stop door and live reports as the real
 *  bounds. */
export const AGENT_MAX_TURNS_HARD_CAP = 1000;
/** Snapshot a dir tree (file paths, relative) — the mcp-engine
 *  collect-arm law, copied (the runs tree is the estate's artifact
 *  law). Missing dir = empty set. */
const treeOf = (dir) => {
    const out = new Set();
    const walk = (d, prefix) => {
        let entries;
        try {
            entries = readdirSync(d);
        }
        catch {
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
            }
            catch {
                /* v8 ignore next -- TOCTOU-only (the skillPlane law): paths
                 * come from the same live readdir */
                continue;
            }
            if (st.isDirectory())
                walk(full, rel);
            else
                out.add(rel);
        }
    };
    walk(dir, "");
    return out;
};
const plainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/** Render the plus-box inputs list into brief lines (slice §5.2:
 *  array-of-entries on the wire — structural, never stringified). */
const renderInputs = (inputs) => {
    if (inputs.length === 0)
        return "";
    return ("\n\nINPUTS:\n" +
        inputs.map((i) => `- ${i.name}: ${typeof i.value === "string" ? i.value : JSON.stringify(i.value)}`).join("\n"));
};
/** Parse "provider/model" (the card's model dropdown id). */
export const parseRoute = (model, where) => {
    if (typeof model !== "string" || !model.includes("/")) {
        throw new Error(`${where}: 'model' must be a "provider/model" route id`);
    }
    const [provider, ...rest] = model.split("/");
    return { provider: provider, model: rest.join("/") };
};
/** The agent loop executor: llm + tools + (optional) skill reader,
 *  all injected — pinned with fakes per the estate test law. */
export const agentLoopExecutor = (llm, tools, skills, fallbackRoute) => {
    return {
        async executeStages(rows, runDir, _inputNames, options) {
            const outcomes = [];
            for (const row of rows) {
                const where = `agent stage ${JSON.stringify(row.stageId)}`;
                const p = row.params;
                // ── THE CONTRACT GATE (stroke 66): the declared params.ts SSOT
                //    validates + folds BOTH grammars (canonical strings, form
                //    bag entries) — the same file the served form serializes,
                //    so the wire and the form cannot drift. ──
                const norm = normalizeAgentStageParams(p, where, AGENT_MAX_TURNS_HARD_CAP);
                const task = norm.task;
                const mcps = norm.mcps;
                const skillIds = norm.skills;
                if (skillIds.length > 0 && skills === undefined) {
                    throw new Error(`${where}: 'skills' requested but this lane wires no skill reader (spawn-injection is a serving path the composition owns)`);
                }
                const inputs = norm.inputs;
                const maxTurns = norm.max_turns;
                const route = norm.model === undefined ? undefined : parseRoute(norm.model, where);
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
                const allow = (name) => {
                    for (const server of mcps) {
                        if (name.startsWith(`mcp__${server}__`))
                            return true;
                    }
                    return false;
                };
                const toolSchemas = mcps.length === 0 ? [] : tools.schemas().filter((s) => allow(s.name));
                if (mcps.length > 0 && toolSchemas.length === 0) {
                    throw new Error(`${where}: 'mcps' [${mcps.join(", ")}] allow-list matches no seated tools (the census is empty — seat the server or drop the entry)`);
                }
                const before = treeOf(runDir);
                const brief = `TASK:\n${task}` +
                    (skillText === "" ? "" : skillText) +
                    renderInputs(inputs) +
                    `\n\nWORKING DIRECTORY: ${runDir} — write every output file HERE (relative paths land in it).` +
                    (toolSchemas.length === 0
                        ? "\nYou have no tools this run: answer in text."
                        : `\nTOOLS: the mcp tools offered below. Call them as needed; when the task is done, answer in text.`);
                // The loop-built history (dsh-agent-loop's derived-history
                // shape): a leading user brief, assistant turns sourced as
                // model output, and one user message per tool result.
                const runKey = randomUUID().slice(0, 8);
                const messages = [
                    {
                        id: `agent-${runKey}-brief`,
                        role: "user",
                        content: [{ type: "text", text: brief }],
                        source: { kind: "user" },
                    },
                ];
                // ── THE LOOP (turn = one model dispatch + its tool calls) ──
                let turns = 0;
                let finalText = "";
                for (;;) {
                    if (options.shouldStop()) {
                        throw new Error(`${where}: stopped by the user at turn ${turns}`);
                    }
                    if (turns >= AGENT_MAX_TURNS_HARD_CAP ||
                        (maxTurns !== undefined && turns >= maxTurns)) {
                        throw new Error(`${where}: task unfinished within ${maxTurns ?? AGENT_MAX_TURNS_HARD_CAP} turns (the circuit breaker)`);
                    }
                    if (route === undefined && fallbackRoute === undefined) {
                        throw new Error(`${where}: 'model' (a "provider/model" route id) is required when the engine config names no brain`);
                    }
                    const dispatchRoute = route ?? fallbackRoute;
                    const prepared = await llm.prepareCall(dispatchRoute);
                    let text = "";
                    const calls = [];
                    const seen = {};
                    let finishKind = "none";
                    for await (const chunk of prepared.stream({
                        ...prepared.config,
                        system: brief,
                        messages,
                        ...(toolSchemas.length === 0 ? {} : { tools: toolSchemas }),
                    })) {
                        const c = chunk;
                        seen[c.type] = (seen[c.type] ?? 0) + 1;
                        // The delta/block-end joins are a DELIBERATE hand-roll (the
                        // audit's 4.5 record, 2026-10-12): dsh-llm's BlockAssembler
                        // is the canonical assembler, but this loop is a census +
                        // dispatch shape, not pure assembly — it counts every chunk
                        // type (`seen`), reads the FinishReason OBJECT inline (the
                        // craft stroke-58 law below), and tolerates malformed blocks
                        // where the assembler's blocks() THROWS on an unknown open
                        // block. The engine survives misbehaving adapters by record;
                        // porting would move that decision into the dependency.
                        if (c.type === "text-delta" && typeof c.text === "string")
                            text += c.text;
                        else if (c.type === "block-end" && c.block?.type === "text" && typeof c.block.text === "string") {
                            text += c.block.text;
                        }
                        else if (c.type === "block-end" && c.block?.type === "tool-call") {
                            const b = c.block;
                            calls.push({ id: b.id, name: b.name, arguments: b.arguments });
                        }
                        else if (c.type === "finish") {
                            // The finish reason is an OBJECT {kind} (dsh-llm
                            // FinishReason — read, never guessed). Only error-shaped
                            // kinds throw; a clean stop may also ride an object
                            // (the craft stroke-58 law).
                            const r = c.reason;
                            if (typeof r === "string") {
                                finishKind = r;
                            }
                            else if (plainObject(r)) {
                                if (r.kind === "error" || r.kind === "aborted" || r.failure !== undefined || r.error !== undefined) {
                                    throw new Error(`${where}: model call failed at turn ${turns}: ${JSON.stringify(c.reason).slice(0, 600)}`);
                                }
                                finishKind = typeof r.kind === "string" ? r.kind : "object-stop";
                            }
                        }
                    }
                    turns += 1;
                    // The assistant turn rides the history (text + its tool
                    // calls — exactly what the model produced). MESSAGE
                    // CONTRACT (the adapters read it — the live fire caught
                    // the pi-ai arm reading message.source.kind): an
                    // assistant message carries source {kind:'model'} with
                    // its route (createAssistantMessage's law, dsh-llm).
                    messages.push({
                        id: `agent-${runKey}-t${turns}`,
                        role: "assistant",
                        content: [
                            ...(text === "" ? [] : [{ type: "text", text }]),
                            ...calls.map((c) => ({ type: "tool-call", id: c.id, name: c.name, arguments: c.arguments })),
                        ],
                        source: { kind: "model", provider: dispatchRoute.provider, model: dispatchRoute.model },
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
                    for (const call of calls) {
                        let args;
                        try {
                            const parsed = JSON.parse(call.arguments === "" ? "{}" : call.arguments);
                            if (!plainObject(parsed))
                                throw new Error("arguments must be a JSON object");
                            args = parsed;
                        }
                        catch (e) {
                            messages.push({
                                id: `agent-${runKey}-t${turns}-r${messages.length}`,
                                role: "user",
                                content: [{
                                        type: "tool-result",
                                        toolCallId: call.id,
                                        content: [{ type: "text", text: `argument parse failed: ${String(e)}` }],
                                        isError: true,
                                    }],
                                source: { kind: "tool", callId: call.id },
                            });
                            continue;
                        }
                        const controller = new AbortController();
                        /* v8 ignore next 3 -- timing-only (the 250ms tick): the
                         * stop door itself is pinned at the loop top; a test that
                         * parks 250ms buys nothing */
                        const ticker = setInterval(() => {
                            if (options.shouldStop())
                                controller.abort();
                        }, 250);
                        let result;
                        try {
                            result = await tools.execute({
                                callId: ToolCallId(`melite-agent-${randomUUID()}`),
                                name: call.name,
                                arguments: args,
                                signal: controller.signal,
                            });
                        }
                        finally {
                            clearInterval(ticker);
                        }
                        const textBlock = result.content.find((b) => b.type === "text");
                        // ONE USER MESSAGE PER RESULT (createToolResultMessage's
                        // law, dsh-llm): a user-role message carrying one tool
                        // result, sourced {kind:'tool', callId} — the adapters
                        // read this shape; a batched array breaks them.
                        messages.push({
                            id: `agent-${runKey}-t${turns}-r${messages.length}`,
                            role: "user",
                            content: [{
                                    type: "tool-result",
                                    toolCallId: call.id,
                                    content: [
                                        {
                                            type: "text",
                                            text: result.isError
                                                ? `tool error: ${result.error.message}`
                                                : typeof textBlock?.text === "string"
                                                    ? textBlock.text
                                                    : JSON.stringify(result.value),
                                        },
                                    ],
                                    ...(result.isError ? { isError: true } : {}),
                                }],
                            source: { kind: "tool", callId: call.id },
                        });
                        options.report({
                            activity: `agent turn ${turns}: ${call.name} ${result.isError ? "ERROR" : "ok"}`,
                        });
                    }
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
export const agentEngine = (ctx, config) => {
    new AgentEngineService(ctx, config);
};
export class AgentEngineService extends Service {
    constructor(ctx, config) {
        super(ctx, "melite-engine-agent");
        const seat = ctx.get("engines");
        if (seat === undefined) {
            throw new Error("agentEngine: the 'engines' seat is not mounted (mount enginesContract before this row)");
        }
        if (typeof config.provider !== "string" || config.provider.length === 0) {
            throw new Error("agentEngine: config needs the 'provider' route id (the brain)");
        }
        if (typeof config.model !== "string" || config.model.length === 0) {
            throw new Error("agentEngine: config needs the 'model' route id");
        }
        const llm = ctx.get("llm");
        if (llm === undefined) {
            throw new Error("agentEngine: the llm seat is not mounted (the agent needs the route)");
        }
        const tools = ctx.get("tools");
        if (tools === undefined) {
            throw new Error("agentEngine: the tools runtime is not mounted (the agent drives tools through it)");
        }
        ctx.effect(() => seat.register("agent", {
            executor: agentLoopExecutor(llm, tools, config.skills, {
                provider: config.provider,
                model: config.model,
            }),
        }));
        console.log(`[melite-engine-agent] engine 'agent' seated: brain ${config.provider}/${config.model}${config.skills === undefined ? "" : " + skill reader"}`);
    }
}
//# sourceMappingURL=agent-engine.js.map
