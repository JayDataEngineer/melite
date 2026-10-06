// mcp-engine.ts — the MCP engine provider. One executor per
// configured engine id: `mcp:<server>` executes
// stage rows as TOOL CALLS on the host ToolRuntime — the same
// `ctx.tools.execute()` programmatic channel the agent loop rides
// (dsh-tools docs: caller-owned ToolExecutionInput, pipeline-owned
// guards/waterfalls, discriminated ToolExecutionResult) — so an
// MCP stage runs through every allow/deny/ask policy the host has.
//
// The stage params ARE the wire call (the card composes them):
//   { tool: "scene_info", args: { limit: 8 } }
// `tool` is the server-local name; the executor mints the public
// `mcp__<server>__<tool>` name (the dsh-mcp-client naming law).
//
// THE COLLECT ARM: artifacts are the run-dir tree's new files (the
// runs tree is the estate's artifact law — viewable by melite_view).
// A stage wanting pixels back declares an absolute `args.out` and
// the executor enforces CONTAINMENT (inside runDir, loud refusal
// otherwise) — file writes may never escape the run's own tree.
import { randomUUID } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { ToolCallId } from "@deepseek-ai/dsh-llm";
import { engineIdOk } from "@melite/engine-contract";
/** The mcp engine id law: `mcp:<server>` (the same grammar the
 *  seat pins). Returns the server name. */
/** The wire tool-name grammar — the same shape as the server name
 *  (the engine contract's), because both halves of
 *  `mcp__<server>__<tool>` are wire tokens. A tool name is an ADDRESS
 *  that reaches a Blender/Unity executor, never prose (the census's
 *  C1: a name carrying spaces or punctuation was minted verbatim). */
const MCP_TOOL_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const mcpServerOf = (engineId) => {
    if (!engineIdOk(engineId) || !engineId.startsWith("mcp:")) {
        throw new Error(`engine id must be 'mcp:<server>' ([A-Za-z0-9_-]{1,32}), got ${JSON.stringify(engineId)}`);
    }
    return engineId.slice("mcp:".length);
};
/** Snapshot a dir tree (file paths, relative) for the collect
 *  arm's before/after diff. Missing dir = empty set. */
const treeOf = (dir) => {
    const out = new Set();
    const walk = (d, prefix) => {
        let entries;
        try {
            entries = readdirSync(d);
        }
        catch {
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
/** Refuse unless `out` lands inside the run dir (containment —
 *  engine file writes stay in the run's own tree). */
const assertContained = (out, runDir) => {
    if (typeof out !== "string" || out.length === 0)
        return;
    const target = resolve(runDir, out);
    const rel = relative(resolve(runDir), target);
    if (isAbsolute(rel) || rel.startsWith("..")) {
        throw new Error(`mcp stage 'out' must land inside the run dir, got ${JSON.stringify(out)}`);
    }
};
const plainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/** The MCP executor factory: one server, many stages. */
export const mcpExecutor = (tools, engineId) => {
    const server = mcpServerOf(engineId);
    return {
        async executeStages(rows, runDir, _inputNames, options) {
            // Pre-flight: validate + containment for every row BEFORE the
            // first wire call (loud, nothing half-run).
            const calls = [];
            for (const row of rows) {
                const { tool, args } = row.params;
                if (typeof tool !== "string" || tool.length === 0) {
                    throw new Error(`stage ${JSON.stringify(row.stageId)}: mcp params need a non-empty 'tool' name`);
                }
                // THE WIRE-NAME GRAMMAR, ENFORCED WHERE IT WAS DECLARED
                // (the census's C1 — the regex above existed with this
                // comment and ZERO uses; a tool name carrying spaces or
                // punctuation was minted verbatim into
                // `mcp__<server>__<tool>` and died at the host, in the
                // host's voice, far from the row that authored it). An
                // ADDRESS is [A-Za-z0-9_-]{1,64}, never prose.
                if (!MCP_TOOL_NAME_RE.test(tool)) {
                    throw new Error(`stage ${JSON.stringify(row.stageId)}: mcp 'tool' ${JSON.stringify(tool)} is not a wire name ` +
                        `([A-Za-z0-9_-], at most 64) — the tool name is an address the server owns, never prose`);
                }
                // THE ARGS SPELLING BRIDGE (2026-10-10, the boundary audit's
                // C1): the card's form declares `args` as a JSON TEXT field
                // (a textarea is the only way a human authors an argument
                // bag), so every form-composed row arrives as a STRING —
                // and this reader demanded an object, refusing every mcp call
                // the form had ever made. One parse site, here, loud on
                // malformed: the object writer and the string writer now
                // compose the same call.
                const wire = typeof args === "string"
                    ? (() => {
                        const text = args.trim();
                        if (text === "")
                            return {};
                        try {
                            const parsed = JSON.parse(text);
                            if (!plainObject(parsed))
                                throw new Error("not a JSON object");
                            return parsed;
                        }
                        catch {
                            throw new Error(`stage ${JSON.stringify(row.stageId)}: mcp 'args' is not valid JSON — ` +
                                `the Arguments field carries a JSON object ({"limit": 8}); refusing rather than guessing`);
                        }
                    })()
                    : args;
                if (wire !== undefined && !plainObject(wire)) {
                    throw new Error(`stage ${JSON.stringify(row.stageId)}: mcp 'args' must be a JSON object (or the JSON text of one)`);
                }
                assertContained(wire?.["out"], runDir);
                const wireArgs = { ...(wire ?? {}) };
                const out = wireArgs["out"];
                // A RELATIVE out resolves against the run dir BEFORE the wire
                // call — tools that abspath against their own cwd (the blender
                // macro) would otherwise write outside the run tree silently.
                if (typeof out === "string" && out.length > 0 && !isAbsolute(out)) {
                    wireArgs["out"] = resolve(runDir, out);
                }
                calls.push({ stageId: row.stageId, name: `mcp__${server}__${tool}`, args: wireArgs });
            }
            const outcomes = [];
            for (const call of calls) {
                const before = treeOf(runDir);
                // shouldStop (the user's stop press) crosses into the
                // caller-owned abort the ToolRuntime contract requires.
                const controller = new AbortController();
                const ticker = setInterval(() => {
                    if (options.shouldStop())
                        controller.abort();
                }, 250);
                let result;
                try {
                    result = await tools.execute({
                        callId: ToolCallId(`melite-engine-${randomUUID()}`),
                        name: call.name,
                        arguments: call.args,
                        signal: controller.signal,
                    });
                }
                finally {
                    clearInterval(ticker);
                }
                if (result.isError) {
                    throw new Error(`mcp ${server}.${call.name.slice(`mcp__${server}__`.length)} failed: ${result.error.message}`);
                }
                const text = result.content.find((b) => b.type === "text");
                const outputs = {
                    default: typeof text?.text === "string"
                        ? text.text
                        : JSON.stringify(result.value),
                };
                const artifacts = [...treeOf(runDir)].filter((f) => !before.has(f)).sort();
                options.report({
                    activity: `mcp ${server} ok (${call.stageId}, ${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"})`,
                });
                outcomes.push({ stageId: call.stageId, outputs, artifacts });
            }
            return { stages: outcomes };
        },
    };
};
/** The provider: registers one executor per configured engine id
 *  onto the engines seat. The lane mounts the mcp-client server
 *  rows; THIS adapter's config names which servers also serve the
 *  RUNS plane (explicit > implicit: default registers none). */
export const mcpEngines = (ctx, config) => {
    new McpEnginesService(ctx, config);
};
export class McpEnginesService extends Service {
    // NO static inject here (the 2026-09-15 swallowed-throw lesson):
    // inject gates NOTHING on a directly-constructed Service (the
    // cordis Service base ignores it — service.ts carries no inject
    // handling); the gate belongs on the ROW object (the comfyui
    // adapter's `inject: ["engines"]` precedent), and the loud guards
    // row owns the gate now. The Config face stays: it documents
    // the row's config shape (the bundle threads it verbatim).
    static Config = z.object({
        engines: z.array(z.string()).default([]),
    });
    constructor(ctx, config) {
        super(ctx, "melite-engine-mcp");
        const seat = ctx.get("engines");
        if (seat === undefined) {
            throw new Error("mcpEngines: the 'engines' seat is not mounted (mount enginesContract before this row)");
        }
        const tools = ctx.get("tools");
        if (tools === undefined) {
            throw new Error("mcpEngines: the tools runtime is not mounted (the mcp engines call tools through it)");
        }
        for (const id of config.engines ?? []) {
            ctx.effect(() => seat.register(id, { executor: mcpExecutor(tools, id) }));
        }
        // LOUD seat decision (the craft row's law — the lane log owns
        // stdout): a registered engine with no line is unverifiable.
        console.log("[melite-engine-mcp] seated: " + (config.engines ?? []).join(", "));
    }
}
//# sourceMappingURL=mcp-engine.js.map
