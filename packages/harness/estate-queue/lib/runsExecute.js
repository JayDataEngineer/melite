import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import { loadCardDefs, needComfyUI, spliceWorkflow } from "@melite/comfyui-cordis";
import { deadline } from "@deepseek-ai/dsh-timeout";
import { errText, runRel } from "./runsTypes.js";
import { notifyRunChanged } from "./runsChange.js";
import { engineFilmName } from "./filmLead.js";
/** THE HUNG-RUN FUSE (the serial-queue ERROR, audit 2026-10-22):
 *  a never-settling engine call holds the pump's activeId forever —
 *  the claim-release law covers throws, not hangs, so every later
 *  run strands behind it silently. The fuse races the executor
 *  against dsh-timeout's deadline; the rejection rides the SAME
 *  catch a throwing engine rides (stages failed, settle, release).
 *  The ceiling is the run's own `execute_ceil_ms` (the F8 burn: a
 *  whole-film window loop outlasts the deployment default) falling
 *  back to the queue config's executeCeilMs (deployment tunable;
 *  `<= 0` arms no timer — the race never rejects; an
 *  undefined read (a minimal test-seat fake) disables the same way).
 *  The abandoned engine promise keeps running; its rejection, if
 *  any, is suppressed here because the run already settled. */
async function raceExecuteFuse(p, ceilMs, what) {
    const ceil = ceilMs ?? 0; // undefined (a minimal fake seat) = disabled, like <= 0
    const dl = deadline(undefined, ceil, "RUN_EXECUTE_HUNG");
    try {
        return await Promise.race([
            p,
            new Promise((_, reject) => {
                dl.signal.addEventListener("abort", () => {
                    const shown = ceil < 60_000
                        ? Math.round(ceil) + "ms"
                        : Math.round(ceil / 60_000) + " min";
                    reject(new Error("runs/execute-hung: " + what + " exceeded the execute ceiling (" +
                        shown +
                        ") — a hung engine call must never strand the serial queue; raise the queue config's executeCeilMs, set it <= 0 to disable, or state the run's own execute_ceil_ms"));
                }, { once: true });
            }),
        ]);
    }
    finally {
        dl[Symbol.dispose]();
        void p.catch(() => { }); // the losing promise's rejection is already handled
    }
}
/** THE LIVE ROW LAW (2026-10-11, the operator's "stuck on a bugged
 *  out webhook … I SHOULD BE ABLE TO SEE STEPS"): the executor's
 *  report fold mutates the stage rows in MEMORY only — and the UI's
 *  run tail is push-only (the poll retired 2026-10-12), so a fold
 *  that never notifies leaves the tile frozen on its opening read
 *  forever; "merged submit (1 stages, 10 nodes)" was the last frame
 *  the stream ever carried while the engine rendered to completion.
 *  The fold notifies the runs change seam (the stop press's own
 *  pattern — runsRegistry's stopping stamp), throttled: the row
 *  moves in memory, every subscriber re-reads it per notify, and no
 *  mid-run persist rides it (claim + settle own the disk).
 *  THE WATCHDOG: an engine that folds nothing (a refused progress
 *  socket, lost events) must never own the tile either — past the
 *  silence window the stamp moves to the waiting voice itself, so a
 *  silent engine reads as "waiting on engine (Ns)" and counts up
 *  instead of lying with the submit stamp. stop() clears the tick;
 *  a post-settle stamp is a bug this module refuses. */
export const LIVENESS_NOTIFY_MS = 300;
export const LIVENESS_WATCHDOG_MS = 5_000;
export function startRunLiveness(run) {
    let lastNotify = 0;
    let lastReportAt = Date.now();
    const stampWaiting = () => {
        const waitedS = Math.round((Date.now() - lastReportAt) / 1000);
        for (const stage of run.stages) {
            if (stage["status"] === "running") {
                stage["activity"] =
                    "waiting on engine (" + waitedS + "s — no engine events)";
            }
        }
    };
    const tick = () => {
        // settled runs own no stamp (the terminal writer deleted the
        // activity lines); only a still-running row may move.
        if (run.status !== "running")
            return;
        if (Date.now() - lastReportAt < LIVENESS_WATCHDOG_MS)
            return;
        stampWaiting();
        lastNotify = Date.now();
        notifyRunChanged(run.runId);
    };
    const handle = setInterval(tick, LIVENESS_WATCHDOG_MS);
    handle.unref?.();
    return {
        report() {
            lastReportAt = Date.now();
            const now = Date.now();
            if (now - lastNotify < LIVENESS_NOTIFY_MS)
                return;
            lastNotify = now;
            notifyRunChanged(run.runId);
        },
        stop() {
            clearInterval(handle);
        },
    };
}
/** THE DECLARED HERO (the mask hero defect, 2026-10-09): the
 *  stage gallery leads with engine completion order — a card that
 *  saves secondary same-kind artifacts (the mask card's manifest
 *  photo beside mask_combined) declares its product stem on the
 *  DECL (primaryFile) and the match moves first. The name may carry
 *  a HARVEST PREFIX (the live seam-proof's catch, 2026-10-09: a
 *  subfoldered save prefix makes fetchOutputs save
 *  `SaveImage.1_mask_combined_00001_.png` — the stem is a bounded
 *  TOKEN, never a basename prefix). Token rule: start-or-underscore
 *  before the stem; after it — end, "." + extension, or "_" + DIGITS
 *  (the engine counter; a longer stem-sharing name like
 *  mask_combined_union is a different product, never the hero). No
 *  match (or no stem) = engine order, never a reorder into nothing.
 *  Pure (the film-mux walls pin the precedent: presentation order is
 *  the harness's only job). */
export function declaredPrimaryFirst(names, stem) {
    if (stem === undefined || stem === "")
        return names;
    const token = new RegExp("(^|_)" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(_[0-9]|\\.|$)");
    const hero = names.find((n) => {
        const base = n.slice(n.lastIndexOf("/") + 1);
        return token.test(base);
    });
    if (hero === undefined)
        return names;
    return [hero, ...names.filter((n) => n !== hero)];
}
/** One run through the merged path (door-verbatim: stages ->
 *  running + merged:true, splice rows, ONE executeFlow submit,
 *  per-stage harvest + result_outputs, the stop-gated terminal
 *  mapping, the settle persist). */
export async function runOne(run, ctx, settle) {
    run.status = "running";
    for (const stage of run.stages) {
        stage["status"] = "running";
        stage["merged"] = true;
    }
    const inputNames = run.inputNames ?? {};
    // THE ENGINE-GENERICS DISPATCH (stroke 53): the 'engines' seat
    // governs when mounted — the executor owns graph surgery
    // (splice inside the adapter), the tap, and the merged submit.
    // Seat-less boots (fixtures, walls) keep the pre-seam direct
    // path byte-for-byte. Runs stay single-engine today: the
    // single-stage gateway constraint means one run names one
    // engine; mixed-engine grouping arrives with the MCP executor.
    const enginesSeat = ctx.get("engines");
    let seatExecutor = null;
    if (enginesSeat !== undefined &&
        typeof enginesSeat.resolve === "function") {
        // resolve() throws LOUD on an unknown id (the contract's
        // miswire voice) — INSIDE the splice-catch scope so the run
        // settles failed and the pump SURVIVES: outside it, the throw
        // escaped runOne with activeId still held, and every future
        // tryDequeue returned null — all inference bricked until
        // restart (audit R1, stroke 82).
        try {
            // THE ONE-ENGINE LAW (audit 2026-10-22): the seat submits
            // EVERY stage row to the ONE executor resolved from the first
            // stage's engine (runEngine's rule below) — a flow whose
            // stages name two engines would mis-submit rows to the wrong
            // engine. Refuse loud at claim, inside this same settle-failed
            // scope, never mid-flight.
            const seen = [];
            for (const stage of run.stages) {
                const e = stage["engine"];
                const name = typeof e === "string" && e !== "" ? e : CARD_PLANE_ENGINE;
                if (!seen.includes(name))
                    seen.push(name);
            }
            if (seen.length > 1) {
                throw new Error("runs/mixed-engines: the flow's stages name " +
                    seen.join(" + ") +
                    " — the seat submits every row to one executor (the first stage's engine); a mixed-engine flow is refused, never mis-dispatched");
            }
            seatExecutor = enginesSeat.resolve(runEngine(run)).executor;
        }
        catch (exc) {
            const text = errText(exc);
            for (const stage of run.stages) {
                // (every stage reads running — runOne stamps them before
                // the engine call, so this fence never filters.)
                /* v8 ignore next */
                if (stage["status"] === "running") {
                    stage["status"] = "failed";
                    stage["error"] = text;
                }
            }
            run.status = "failed";
            run.error = text;
            await settle(run);
            return;
        }
    }
    let rows;
    try {
        rows = seatExecutor !== null ? [] : run.stages.map((stage, i) => ({
            stageId: stage.id,
            card: typeof stage["card"] === "string" && stage["card"] !== ""
                ? stage["card"]
                : typeof run.cardId === "string" && run.cardId !== ""
                    ? run.cardId
                    : undefined,
            workflow: spliceWorkflow(run.params[i]),
            outputs: { ...stage.outputs },
            outputNodes: { ...run.outputNodes[i] },
            params: { ...run.params[i] },
        }));
    }
    catch (exc) {
        // splice refusal pre-submit: the run fails with the
        // planner's text (the per-stage fallback loop is later
        // scope).
        const text = errText(exc);
        for (const stage of run.stages) {
            // (every stage reads running — runOne stamps them just
            // above, so the fence never filters.)
            /* v8 ignore next */
            if (stage["status"] === "running") {
                stage["status"] = "failed";
                stage["error"] = text;
            }
        }
        run.status = "failed";
        run.error = text;
        await settle(run);
        return;
    }
    // THE WIRING FENCE (2026-10-10, the operator's law: ON SUBMIT
    // IS A HACK — a check threaded as an option through ONE engine
    // call is a wall someone remembered to build, not the schema
    // system). The rows are BUILT here, in the run seat, before any
    // engine action — so the doc-walk judges HERE, in the same
    // fence as the splice refusal above: every stage's graph names
    // only class_types and inputs the engine's own /object_info
    // declares, in the run's voice, before the first wire moves.
    // (The merge that follows namespaces ids and resolves $spells
    // into link VALUES — it adds no names, so the rows' name
    // surface is the engine's.) The judge is the wiring service's
    // own wall — ONE owner (wiringWall.ts), the same walk the
    // card-compose seat has always had, now at the seat every path
    // (start, restore, queue replay) already walks. NO SEAT-BRANCH
    // GATE (the audit's finding: the first cut walked only when
    // seatExecutor was null, and production ALWAYS takes the seat
    // path — the wall was dead on the lane).
    //
    // AND THE CLAIM WAS FALSE UNTIL NOW (the coverage audit's HIGH
    // finding, proven live by two independent probes: seat-mounted +
    // armed doc + a graph naming an undeclared class_type → the run
    // COMPLETED and the engine was submitted). `rows` is `[]` on the
    // seat path, so this loop iterated ZERO times in production while
    // the comment above claimed "the rows walk on BOTH paths here".
    // The adapter's post-splice walk caught the poison anyway, which
    // is why nobody saw it — but the run seat's own voice (naming the
    // STAGE, before the engine is ever touched) never fired on the
    // lane, and a composition without the adapter would submit poison
    // with the suite green.
    //
    // The fence therefore judges ONE GRAPH per stage on BOTH paths:
    // the spliced rows where the seat path already built them, and
    // the SEAT path's own splice of the stage params HERE — because
    // the compiled params are the ENVELOPE {workflow, output_nodes},
    // not the graph. The first cut walked the envelope raw and every
    // object-valued param became a PHANTOM NODE: an armed doc
    // refused every seat-path run as "card 'flow' built node
    // 'workflow' with no class_type — the graph is not addressable"
    // (the operator's face, 2026-10-10 — a card that COULD run,
    // refused by a wall judging its own envelope). The same cut
    // named the card from a stage row that carries none, falling
    // back to the invented 'flow'. The walk now names the REAL
    // card: the stage's own card when stamped, the record's cardId
    // (registration's own law: stamped for card runs, absent for
    // inline — never a guess), the stage id last.
    // Unarmed (no wiring service in the composition): the wall
    // stands down — the standing law.
    const wiring = ctx.get("comfyuiWiring");
    // UNARMED, THE WHOLE FENCE STANDS DOWN — splice included (the
    // second audit, 2026-10-11: the cut below spliced outside the
    // wall's own stand-down, so a lane whose /object_info fetch
    // failed — wall disarmed, judgment forbidden — still refused
    // runs with the SPLICE's compose voice. A/B: an unarmed
    // mcp:blender run completed before the cut and failed after,
    // the executor never called. armed() mirrors the wall's own
    // doc-null stand-down; assert() re-checks it inside.)
    if (wiring !== undefined && wiring.armed()) {
        for (let i = 0; i < run.stages.length; i++) {
            const stage = run.stages[i];
            // THE WALK IS A COMFY-GRAPH LAW: the stage's OWN engine token
            // is the discriminator (runEngine's rule, per stage). Absent
            // or card-plane → the compiled params are the comfy envelope;
            // anything else is a foreign lane (mcp/craft/agent) whose tool
            // params are NOT a graph — its seats own its voices, and this
            // wall never judges it, armed or not.
            const eng = stage["engine"];
            if (rows.length === 0 &&
                typeof eng === "string" &&
                eng !== "" &&
                eng !== CARD_PLANE_ENGINE) {
                continue;
            }
            try {
                const graph = rows.length > 0
                    ? rows[i].workflow
                    : spliceWorkflow((run.params[i] ?? {}));
                wiring.assert(String(stage["card"] ?? run.cardId ?? stage.id), graph);
            }
            catch (exc) {
                const text = errText(exc);
                for (const st of run.stages) {
                    // (same fence as the splice-catch above — every stage is
                    // still running when this splice reports.)
                    /* v8 ignore next */
                    if (st["status"] === "running") {
                        st["status"] = "failed";
                        st["error"] = text;
                    }
                }
                run.status = "failed";
                run.error = text;
                await settle(run);
                return;
            }
        }
    }
    // THE LIVE ROW's owner: created before the submit path, stopped
    // in the finally — every execute path (success, throw, fuse)
    // retires the watchdog exactly once.
    const live = startRunLiveness(run);
    try {
        // THE PROGRESS TAP FOLD (2026-09-13, the operator's "forward
        // the comfyui progress webhooks like before"): the engine
        // drains its tap into this callback; the merged submit mints
        // ONE prompt, so every stage row shares the same live fold
        // (status serves stages VERBATIM — the poll rides the
        // existing door, no new wire verb). Hoisted for both paths.
        const report = (updates) => {
            const act = updates["activity"];
            const prog = updates["progress"];
            const pRec = typeof prog === "object" && prog !== null && !Array.isArray(prog)
                ? prog
                : null;
            for (const stage of run.stages) {
                if (typeof act === "string" && act !== "")
                    stage["activity"] = act;
                if (pRec !== null &&
                    typeof pRec["value"] === "number" &&
                    typeof pRec["max"] === "number") {
                    stage["progress"] = { value: pRec["value"], max: pRec["max"] };
                }
            }
            // THE LIVE ROW (the module law above): the stamps are memory
            // until this notify — the push-only tail never re-reads.
            live.report();
        };
        const shouldStop = () => run.stopFlag;
        let result;
        if (seatExecutor !== null) {
            // The seat path: engine-agnostic rows — the adapter splices
            // (its splice refusal lands in this same catch: the run
            // fails with the planner's text, stages failed, settled).
            const genericRows = run.stages.map((stage, i) => ({
                stageId: stage.id,
                // the card label for the adapter's walk voice — the
                // SAME preference chain the estate fence above uses
                // (stage's own card, then the run's, then the stage id
                // for flow stages that never had one)
                card: typeof stage["card"] === "string" && stage["card"] !== ""
                    ? stage["card"]
                    : typeof run.cardId === "string" && run.cardId !== ""
                        ? run.cardId
                        : undefined,
                outputs: { ...stage.outputs },
                params: { ...run.params[i] },
            }));
            const outcome = await raceExecuteFuse(seatExecutor.executeStages(genericRows, run.dir, inputNames, { shouldStop, report, stateRoots: ctx.queue.stateRoots }, 
            // The run's request initials ride every engine submit: the
            // gate-blessed values the start door extracted for this
            // flow's declared initials, so `$spell` params resolve at
            // the engine's merge. Engines whose param dialect has no
            // `$spells` ignore the record.
            run.initials), run.executeCeilMs ?? ctx.queue.executeCeilMs, "the seat executor");
            result = {
                stages: Object.fromEntries(outcome.stages.map((s) => [
                    s.stageId,
                    { outputs: s.outputs, artifacts: [...s.artifacts] },
                ])),
                // THE REPLAY VERDICT (D11): forwarded, never re-derived —
                // the executor's seated tap is the only witness.
                replaySuspect: outcome.replaySuspect,
                promptId: String(outcome.engineRef),
            };
        }
        else {
            const engine = needComfyUI(ctx, "runsRemote worker");
            const nodeCount = rows.reduce((n, r) => n + Object.keys(r.workflow).length, 0);
            for (const stage of run.stages) {
                stage["activity"] =
                    "merged submit (" + rows.length + " stages, " + nodeCount + " nodes)";
            }
            // Same law as the seat path above: the run's request initials
            // resolve the `$spells` at this merge. The hung-run fuse wraps
            // BOTH executors (one law, no escape hatch).
            result = await raceExecuteFuse(engine.executeFlow(rows, run.dir, inputNames, run.initials, {
                shouldStop,
                report,
                stateRoots: ctx.queue.stateRoots,
            }), run.executeCeilMs ?? ctx.queue.executeCeilMs, "the engine submit");
        }
        // THE PROMPT STAMP (P1): the executed prompt's id folds onto
        // the receipt here — the seat path carried it on the merged
        // result from outcome.engineRef, the legacy path reads
        // FlowResult.promptId (the SAME POST /prompt answer), before
        // the harvest below; settle's sidecar rewrite carries it to
        // disk.
        stampReceiptPromptId(run, result.promptId);
        // THE MISSING-STAGE REFUSAL (P7 B1): the engine answered for a
        // submitted stage id or it did not — there is no empty success.
        // Judge the whole harvest BEFORE touching a stage row, so one
        // missing id fails every running stage instead of leaving the
        // answered stages completed beside it.
        const missingStageIds = run.stages
            .map((stage) => stage.id)
            .filter((id) => result.stages[id] === undefined);
        if (missingStageIds.length > 0) {
            throw new Error("runs/missing-stage-result: the engine result has no row for " +
                missingStageIds.map((id) => `stage "${id}"`).join(", ") +
                " — a submitted stage with no result fails, never settles completed/empty");
        }
        for (const stage of run.stages) {
            const row = result.stages[stage.id];
            const arts = row.artifacts.filter((a) => a !== "");
            run.artifacts.push(...arts);
            notifyRunChanged(run.runId);
            if (arts.length > 0) {
                // DIVERGENCE-BY-ORDER: run-relative names, no /v1 prefix
                // (the asset HTTP face died with the app).
                let names = arts.map((a) => runRel(run, a));
                // THE ENGINE FILM LEADS (2026-09-17; re-affirmed 2026-09-22
                // when the disk-stitch valve died): when the engine
                // composed the film (h3_t4_film), presentation order is the
                // harness's only job — film first, windows after. No mux,
                // no mix, never a shell ffmpeg: composition belongs to the
                // engine (the film-assemble stage's model-free workflow).
                const semanticNames = new Set(Object.values(row.outputs)
                    .filter((value) => typeof value === 'string' && value !== '')
                    .map((value) => runRel(run, value)));
                const semantic = names.find((name) => semanticNames.has(name));
                if (semantic !== undefined) {
                    names = [semantic, ...names.filter((name) => name !== semantic)];
                }
                const engineFilm = engineFilmName(names);
                if (engineFilm !== null && names[0] !== engineFilm) {
                    names = [engineFilm, ...names.filter((name) => name !== engineFilm)];
                }
                const stem = run.cardId !== undefined
                    ? (await loadCardDefs()).get(run.cardId)?.primaryFile
                    : undefined;
                names = declaredPrimaryFirst(names, stem);
                // (THE DISK-STITCH VALVE DIED, 2026-09-22, the operator's
                // provenance law: every artifact traces to a composition
                // of cards — no harness ffmpeg ever owned the film. The
                // film is assembled IN-GRAPH (the film-assemble stage's
                // model-free workflow: MeliteLoadVideo + the Melite audio
                // chain + CreateVideo/SaveVideo h3_t4_film); the harness's
                // only job here is presentation order.)
                stage["url"] = names[0];
                stage["gallery"] = names.map((n) => ({ name: n }));
            }
            stage["result_outputs"] = { ...row.outputs };
            stage["status"] = "completed";
            delete stage["progress"];
            delete stage["activity"];
        }
        run.status = run.stopFlag ? "stopped" : "completed";
        // THE REPLAY STAMP (D11, 2026-10-11): the executor's seated tap
        // folded zero engine events before settlement — the engine
        // served memo'd outputs without executing (byte-identical
        // graphs replay the previous film in ~0.01s, no ws events, the
        // tile frozen at "merged submit"). The run still completes —
        // the harvest is what the engine said — but the row tells the
        // truth: this film may predate the request. A dead tap
        // withholds the verdict (its own warn, never a replay claim).
        if (result.replaySuspect === true) {
            run.replaySuspect = true;
            console.warn(`[runs] ${run.runId} completed with no engine progress events — the film may be a replay of an earlier identical submit (the request's inputs never executed)`);
        }
        await settle(run);
    }
    catch (exc) {
        const text = errText(exc);
        const stopped = run.stopFlag && text.toLowerCase().includes("stop");
        for (const stage of run.stages) {
            // (same fence as the splice-catch above — every stage is
            // still running here.)
            /* v8 ignore next */
            if (stage["status"] === "running") {
                stage["status"] = stopped ? "stopped" : "failed";
                stage["error"] = text;
            }
            delete stage["progress"];
            delete stage["activity"];
        }
        run.status = stopped ? "stopped" : "failed";
        if (!stopped)
            run.error = text;
        await settle(run);
    }
    finally {
        live.stop();
    }
}
export function runEngine(run) {
    const first = run.stages[0];
    const engine = first?.["engine"];
    // the card plane engine is the contract value (one owner per token)
    return typeof engine === "string" && engine !== "" ? engine : CARD_PLANE_ENGINE;
}
/** THE GRAPH-RECEIPT PROMPT STAMP (the silent UI-drop purge's P1):
 *  the receipt is stamped at QUEUE time, but the engine mints the
 *  prompt_id at POST /prompt — inside the execute — so the claim
 *  rewrite (which runs BEFORE the submit) cannot carry it. The
 *  earliest estate seat that CAN see it is the execute outcome:
 *  the seat path's engineRef (comfyui-engine's brand) and the
 *  legacy path's FlowResult.promptId (the same POST /prompt
 *  answer). The stamp folds here, before settle — settle's sidecar
 *  rewrite carries `graph_receipt.prompt_id` to disk. Runs with no
 *  receipt (inline envelopes) stamp nothing. */
function stampReceiptPromptId(run, promptId) {
    if (run.graphReceipt === undefined)
        return;
    if (typeof promptId !== "string" || promptId === "")
        return;
    run.graphReceipt = { ...run.graphReceipt, prompt_id: promptId };
}
//# sourceMappingURL=runsExecute.js.map
