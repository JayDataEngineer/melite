// craft-engine.ts — the craft loop engine (stroke 55, plan §2.3:
// dev_docs/design/engine-generics-mcp.md). One stage = ONE LOOP:
// act (a nested engine command through the engines seat) →
// capture (the act's artifacts land in the run dir) → critique
// (a named image-capable model route, the artifact attached) →
// decide (JSON verdict: done, or refine with the next command).
// Bounded by max_iterations (default unlimited, hard cap 1000 —
// the circuit breaker).
//
// The operator's card sketch, verbatim: "a simple card that is
// model drop down, inputs (generic), prompt for the agent, maybe
// optional max iterations". The card composes THIS stage; the
// stage params carry the same four fields.
//
// SEAM LAW: the executor takes the critic as an INJECTED
// interface (CraftCritic) and the engines as an injected
// resolver — pinned with fakes per the estate test law. The
// provider builds the REAL critic from the llm + attachments
// seats (the melite_view law: saveImage → ImageBlock, the route
// gate's image-capability check) and registers engine id
// 'craft' on the seat.
import { randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
/** The hard circuit breaker (never a tunable — a law). */
import { normalizeCraftStageParams, normalizeCraftCommand, CRAFT_MAX_ITERATIONS_HARD_CAP } from "./params.js";
export { CRAFT_MAX_ITERATIONS_HARD_CAP };
export const craftLoopExecutor = (engines, critic) => {
    return {
        async executeStages(rows, runDir, _inputNames, options) {
            const outcomes = [];
            for (const row of rows) {
                const p = row.params;
                // THE CONTRACT GATE (stroke 69): ONE declaration validates
                // the wire (params.ts — the same object the served form
                // serializes; the four fields' LOUD messages preserved).
                const norm = normalizeCraftStageParams(p, `craft stage ${JSON.stringify(row.stageId)}`, CRAFT_MAX_ITERATIONS_HARD_CAP);
                const { prompt, model, maxIterations: maxIter } = norm;
                let command = norm.command;
                // THE LOOP
                const artifacts = new Set();
                let note = "";
                let iteration = 0;
                for (;;) {
                    if (options.shouldStop()) {
                        throw new Error(`craft stage ${JSON.stringify(row.stageId)}: stopped by the user at iteration ${iteration}`);
                    }
                    if (iteration >= CRAFT_MAX_ITERATIONS_HARD_CAP || (maxIter !== undefined && iteration >= maxIter)) {
                        throw new Error(`craft stage ${JSON.stringify(row.stageId)}: no done verdict within ${maxIter ?? CRAFT_MAX_ITERATIONS_HARD_CAP} iterations (the circuit breaker)`);
                    }
                    // act: one nested engine stage, same run dir (captures land there).
                    // No request initials: a craft act's params are the critic's
                    // literal tool arguments, never a run's declared $spells.
                    const act = await engines.resolve(command.engine).executor.executeStages([{ stageId: `${row.stageId}#${iteration}`, outputs: {}, params: command.params }], runDir, {}, options);
                    for (const a of act.stages[0]?.artifacts ?? [])
                        artifacts.add(a);
                    // critique + decide
                    const verdict = await critic.critique({
                        iteration,
                        prompt,
                        command,
                        artifacts: [...artifacts].sort(),
                        runDir,
                        signal: new AbortController().signal,
                    });
                    options.report({
                        activity: `craft iter ${iteration}: ${verdict.verdict}${verdict.note !== undefined ? ` — ${verdict.note}` : ""} (${artifacts.size} artifact${artifacts.size === 1 ? "" : "s"})`,
                    });
                    if (verdict.verdict === "done") {
                        note = verdict.note ?? "";
                        break;
                    }
                    if (verdict.verdict !== "refine") {
                        throw new Error(`craft critic answered verdict ${JSON.stringify(verdict.verdict)} — 'done' or 'refine' only`);
                    }
                    command = normalizeCraftCommand(verdict.command, `craft critic refine (iteration ${iteration})`);
                    iteration += 1;
                }
                outcomes.push({
                    stageId: row.stageId,
                    outputs: { default: note !== "" ? note : [...artifacts].sort().join(", ") },
                    artifacts: [...artifacts].sort(),
                });
            }
            return { stages: outcomes };
        },
    };
};
/** The route law (the preference arm's precedent, stroke 52):
 *  enumerate every registered provider route round-robin and pick
 *  the FIRST image-capable one — zero config to misconfigure; a
 *  lane with no vision route seats no critic (loud, never fatal). */
export async function resolveImageCapableRoute(llm) {
    const providers = llm.listProviders();
    if (providers.length === 0)
        return null;
    const perProvider = [];
    for (const p of providers) {
        try {
            const models = await llm.listModels(p.id);
            if (models.length > 0) {
                perProvider.push(models.map((m) => ({ provider: p.id, model: m.id })));
            }
        }
        catch {
            /* a provider that cannot enumerate is skipped — the same
             * quiet-step as the harness route resolver */
        }
    }
    const routes = [];
    for (let i = 0; i < 12; i++) {
        for (const list of perProvider) {
            if (i < list.length)
                routes.push(list[i]);
        }
    }
    for (const route of routes) {
        try {
            const info = await llm.resolveModelInfo(route.provider, route.model);
            if ((info.inputModalities ?? []).includes("image"))
                return route;
        }
        catch {
            /* unresolvable routes step past */
        }
    }
    return null;
}
/** Build the REAL critic from the llm + attachments seats: the
 *  artifact image rides the message (ImageBlock, the
 *  melite_view law); the verdict comes back as JSON. */
export const llmCritic = (llm, attachments, route) => {
    return {
        async critique(input) {
            const info = await llm.resolveModelInfo(route.provider, route.model, input.signal);
            if (!(info.inputModalities ?? []).includes("image")) {
                throw new Error(`craft critic route ${route.provider}/${route.model} does not accept image input (the critic's eye must see the capture)`);
            }
            const content = [
                {
                    type: "text",
                    text: `CRAFT LOOP — iteration ${input.iteration}. Brief: ${input.prompt}\n` +
                        `Last act: ${JSON.stringify(input.command)}\nArtifacts: ${JSON.stringify(input.artifacts)}\n` +
                        `Answer ONE JSON object: {"verdict":"done","note":"..."} or {"verdict":"refine","note":"...","command":{"engine":"...","params":{...}}}. JSON only.`,
                },
            ];
            const newest = input.artifacts[input.artifacts.length - 1];
            if (newest !== undefined && /\.(png|jpe?g|webp|gif)$/i.test(newest)) {
                const { readFile } = await import("node:fs/promises");
                const bytes = await readFile(`${input.runDir}/${newest}`);
                // the image regex above guarantees a dot — split().pop() is
                // always the extension here (a `?? default` arm would be
                // unreachable defensive code; the coverage gate is right).
                const ext = newest.split(".").pop().toLowerCase();
                const mediaType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
                const image = await attachments.saveImage({ data: bytes, mediaType });
                content.push({ type: "image", attachment: { ...image, attachmentId: image.attachmentId } });
            }
            const prepared = await llm.prepareCall(route, input.signal);
            let text = "";
            // Dispatch under the PREPARED config (never a rebuilt
            // {provider, model}: prepareCall materializes adapter defaults
            // into it, and the dispatch contract rejects anything unequal
            // — the 2026-09-15 live-fire caught the rebuilt shape dying
            // INVALID_PREPARED_CALL on deepseek-flash's defaultMaxTokens).
            const callOptions = { ...prepared.config, messages: [{ role: "user", content }] };
            // Adapters vary: text may ride text-delta chunks, a whole
            // block-end text block, or (reasoning routes) reasoning-delta
            // before the answer. Accumulate every text carrier and keep a
            // chunk-type histogram — the no-JSON refusal names it, so the
            // next empty answer diagnoses itself (the 2026-09-15 drive
            // caught deepseek-flash answering with zero text-deltas).
            const seen = {};
            let finishReason = "none";
            for await (const chunk of prepared.stream(callOptions)) {
                const c = chunk;
                seen[c.type] = (seen[c.type] ?? 0) + 1;
                if (c.type === "text-delta" && typeof c.text === "string")
                    text += c.text;
                else if (c.type === "block-end" && (c.block?.type === "text") && typeof c.block.text === "string")
                    text += c.block.text;
                else if (c.type === "finish" && typeof c.reason === "string")
                    finishReason = c.reason;
                // The stream protocol's terminal error channel (dsh-llm's
                // adapterFailureChunk): an adapter throw arrives as a
                // finish chunk with an OBJECT reason carrying the failure —
                // never silently end the loop on it (the 2026-09-15 drive
                // stared at a bare {"finish":1} hiding the real refusal).
                // Surface the WHOLE reason as JSON (sliced): adapters shape
                // their failures differently (the 2026-09-15 spark drive
                // printed "[object Object]" for a guessed .message that was
                // itself an object) — never guess fields, print the object.
                // But only ERROR-shaped reasons throw: a clean stop can also
                // ride an object (pi-ai reports {"kind":"stop"}), which ends
                // accumulation normally and lets the no-JSON refusal below
                // name the chunk histogram.
                else if (c.type === "finish" && typeof c.reason === "object" && c.reason !== null) {
                    const r = c.reason;
                    if (r.kind === "error" || r.failure !== undefined || r.error !== undefined) {
                        throw new Error(`craft critic call failed: ${JSON.stringify(c.reason).slice(0, 600)}`);
                    }
                    finishReason = typeof r.kind === "string" ? r.kind : "object-stop";
                }
            }
            const start = text.indexOf("{");
            if (start === -1) {
                throw new Error(`craft critic answered no JSON (got ${JSON.stringify(text.slice(0, 200))}, ` +
                    `chunks ${JSON.stringify(seen)}, finish ${JSON.stringify(finishReason)})`);
            }
            // Critics trail commentary after the object (and quote braces
            // inside strings) — the 2026-09-15 spark drive died on a single
            // lastIndexOf slice ("Unexpected non-whitespace character after
            // JSON"). Walk the closing braces back until one parses; refuse
            // only when none does.
            let parsed;
            let end = text.length;
            while (parsed === undefined && end > start) {
                end = text.lastIndexOf("}", end - 1);
                if (end === -1 || end < start)
                    break;
                try {
                    parsed = JSON.parse(text.slice(start, end + 1));
                }
                catch {
                    parsed = undefined;
                }
            }
            if (parsed === undefined) {
                throw new Error(`craft critic answered no JSON (got ${JSON.stringify(text.slice(0, 200))}, ` +
                    `chunks ${JSON.stringify(seen)}, finish ${JSON.stringify(finishReason)})`);
            }
            if (parsed.verdict !== "done" && parsed.verdict !== "refine") {
                throw new Error(`craft critic verdict ${JSON.stringify(parsed.verdict)} — 'done' or 'refine' only`);
            }
            return parsed;
        },
    };
};
/** The provider: engine id 'craft' on the seat. The critic route
 *  is named in config (explicit > implicit). */
export const craftEngine = (ctx, config) => {
    new CraftEngineService(ctx, config);
};
export class CraftEngineService extends Service {
    constructor(ctx, config) {
        super(ctx, "melite-engine-craft");
        const seat = ctx.get("engines");
        if (seat === undefined) {
            throw new Error("craftEngine: the 'engines' seat is not mounted (mount enginesContract before this row)");
        }
        if (typeof config.provider !== "string" || config.provider.length === 0) {
            throw new Error("craftEngine: config needs the critic 'provider' route (the named eye)");
        }
        if (typeof config.model !== "string" || config.model.length === 0) {
            throw new Error("craftEngine: config needs the critic 'model' route id");
        }
        const llm = ctx.get("llm");
        if (llm === undefined) {
            throw new Error("craftEngine: the llm seat is not mounted (the critic needs the route)");
        }
        const attachments = ctx.get("attachments");
        if (attachments === undefined) {
            throw new Error("craftEngine: the attachments seat is not mounted (captures attach through it)");
        }
        ctx.effect(() => seat.register("craft", {
            executor: craftLoopExecutor(seat, llmCritic(llm, attachments, { provider: config.provider, model: config.model })),
        }));
    }
}
export const craftCallId = () => `melite-craft-${randomUUID()}`;
/** The composition-site mount: resolve the critic route at BOOT
 *  (the route law above) and seat engine 'craft'; a lane with no
 *  image-capable route seats NO critic (the loud log line, never
 *  a dead lane — craft stages then refuse at the door's membership
 *  arm with the registered list). A NAMED preference (the estate's
 *  MELITE_CRITIC_ROUTE "provider/model") beats the enumeration —
 *  explicit > implicit — but it is still verified image-capable
 *  before seating (a blind preference seats nothing, LOUD, never a
 *  silent substitution). Returns whether the seat landed, so the
 *  composition site can retry late (adapters register on settings
 *  arrival, AFTER early rows apply). */
export async function craftEngineAutoRoute(ctx, log, prefer) {
    const llm = ctx.get("llm");
    if (llm === undefined) {
        log("craft engine: no llm seat mounted — engine 'craft' NOT seated");
        return false;
    }
    const attachments = ctx.get("attachments");
    if (attachments === undefined) {
        log("craft engine: no attachments seat mounted — engine 'craft' NOT seated");
        return false;
    }
    if (prefer !== undefined) {
        // The refusal names WHAT the seat said (unresolvable vs the
        // resolved modality list) — the 2026-09-15 spark wiring died on
        // this line and the bare verdict hid which arm fired. The
        // resolve error rides the line (a missing credential names
        // itself — never swallow it into bare "does not resolve").
        let info;
        let resolveError = "";
        try {
            info = await llm.resolveModelInfo(prefer.provider, prefer.model);
        }
        catch (e) {
            resolveError = String(e?.message ?? e).slice(0, 300);
        }
        if (info === undefined) {
            log(`craft engine: named critic route ${prefer.provider}/${prefer.model} does not resolve (${resolveError}) — engine 'craft' NOT seated (explicit means explicit: no silent substitution)`);
            return false;
        }
        if (!(info.inputModalities ?? []).includes("image")) {
            log(`craft engine: named critic route ${prefer.provider}/${prefer.model} resolves with modalities [${(info.inputModalities ?? []).join(", ")}] (no image) — engine 'craft' NOT seated (explicit means explicit: no silent substitution)`);
            return false;
        }
        log(`craft engine: critic route ${prefer.provider}/${prefer.model} (named) — engine 'craft' seated`);
        new CraftEngineService(ctx, { provider: prefer.provider, model: prefer.model });
        return true;
    }
    const route = await resolveImageCapableRoute(llm);
    if (route === null) {
        log("craft engine: no image-capable route this boot — engine 'craft' NOT seated (craft stages will refuse at the door)");
        return false;
    }
    log(`craft engine: critic route ${route.provider}/${route.model} — engine 'craft' seated`);
    new CraftEngineService(ctx, { provider: route.provider, model: route.model });
    return true;
}
//# sourceMappingURL=craft-engine.js.map
