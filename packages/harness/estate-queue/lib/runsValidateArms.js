import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.js";
import { expandRegistryFlow, registryFlowToInline, registryInitialsError } from "./flowsData.js";
import { applyFlowParamsOverride, overlayDecls } from "./flowsParamsOverlay.js";
import { composeFamilyStages, liveFamilySeat } from "./flowsFamilyCompose.js";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { inlineArm, strictBody } from "./runsValidate.js";
import { FLOW_ID_RE } from "./runsGates.js";
import { CardArmError } from "./cardsArmError.js";
import { prepareCardParams } from "./cardsCompose.js";
export async function validate(doc, signal, ctx) {
    signal.throwIfAborted();
    // the {flow:} shim may REPLACE the body (flow → flow_inline):
    // the inline arm compiles the LIVE body, not the original doc.
    let liveDoc = doc;
    if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
        let body = doc;
        if ("model" in body) {
            const answer = await modelValidateArm(body, ctx);
            if (answer.status === 200)
                return answer.payload;
            const p = answer.payload;
            const mapped = RUNS_ERROR_CODES[p["code"]];
            if (mapped === undefined) {
                throw new Error("runs validate: unmapped answer code " + p["code"]);
            }
            // (no model-arm answer stamps loc today — the passthrough
            // rides undefined, verbatim like the inline block below.)
            throw new RemoteError(mapped, p["error"], {
                loc: p["loc"],
            });
        }
        if ("flow" in body && !("flow_inline" in body) &&
            !("model" in body) && !("stages" in body)) {
            // THE NAMED-FLOW SHIM at validate (REBUILD-13; the dead
            // door's law): expand the registry flow live and compile it
            // through the SAME inline arm — no second validator. Unknown
            // names keep the door's own voice.
            const raw = body["flow"];
            const name = typeof raw === "string" ? raw : "";
            // The start arm's order, verbatim: admission (the id's shape)
            // before presence (is it registered). One voice for an
            // illegal name, whichever door answers.
            if (!FLOW_ID_RE.test(name)) {
                throw new RemoteError("runs/invalid-request", 
                // The RAW value, named — the start arm's voice verbatim.
                "flow id " + JSON.stringify(raw) + " is not a legal identifier", { loc: "flow" });
            }
            const flowsSeat = ctx.get("meliteFlows");
            const decl = flowsSeat.get(name);
            if (decl === undefined) {
                throw new RemoteError("runs/invalid-request", "no flow named " + name + " in the registry", { loc: "flow" });
            }
            // THE EXPANSION FOLD (round-21 flows audit F4): the start
            // door's twin — expansion's authoring throws ride the
            // invalid-request voice here too, never 500-class.
            let expanded;
            try {
                expanded = expandRegistryFlow(decl, flowsSeat);
            }
            catch (e) {
                throw new RemoteError("runs/invalid-request", e instanceof Error ? e.message : String(e), { loc: "stages" });
            }
            // THE PARAMS DOOR RIDES VALIDATE (round-21 flows audit F1),
            // AT THE START DOOR'S SEAM (round-23 family-compose audit Q1,
            // unifyOverlayPoint): the start arm overlays the EXPANDED
            // rows before its initials gate and family-compose
            // (runsRegistry 1518→1533→1588) — this arm now rides the same
            // point on the same rows, so a body tripping more than one
            // gate gets the same first refusal from both doors, never
            // params-voice here and stages-voice at start (or the
            // reverse).
            const overrideRaw = body["params"];
            if (overrideRaw !== undefined) {
                applyFlowParamsOverride(name, expanded.stages, overrideRaw, overlayDecls(ctx.cardRegistry), String(body["model"] ?? ""));
            }
            // The same compile-time gate at validate (REBUILD-21).
            const badInitial = registryInitialsError(expanded, body, {
                repoRoot: resolveRepoRoot(),
                stateRoot: ctx.queue.stateRoot,
            });
            if (badInitial !== null) {
                throw new RemoteError("runs/invalid-request", badInitial, {
                    loc: "body",
                });
            }
            // THE FAMILY-ACTION STAGES COMPOSE HERE TOO (the atom
            // vocabulary, stroke 4): validate compiles the SAME composed
            // envelope start registers — one admission law, both doors.
            // The interpreter's refusals (unknown family/action,
            // unadmitted param, contradicting hand-write) surface with
            // the door's invalid-request voice.
            let composedFlow;
            try {
                // The seat read rides ctx.get, the engines precedent in
                // runsRegistry: an undeclared-inject property access
                // would throw cordis's reflect voice instead of
                // degrading to the booted singleton.
                const seat = liveFamilySeat(ctx.get("models"));
                composedFlow = composeFamilyStages(expanded, seat.decls, seat.state);
            }
            catch (e) {
                throw new RemoteError("runs/invalid-request", e instanceof Error ? e.message : String(e), { loc: "stages" });
            }
            // The overlay rode AFTER this compose until the round-23
            // family-compose audit (Q1) — start overlays first, so the
            // composed rows are already the overlaid truth when the door
            // compiles them; card stages pass through composeFamilyStages
            // by reference, family stages admit nothing (their card is
            // ""), so the pre-compose overlay is neither lost nor
            // reordered.
            const inlineDoc = registryFlowToInline(composedFlow);
            const rest = { ...body };
            delete rest["flow"];
            liveDoc = { ...rest, flow_inline: inlineDoc };
        }
    }
    // The card-stage lattice reads through the primed registry (the
    // cards stroke's CardRegistryService — ctx.cardRegistry, primed
    // at boot). Passing null here refused EVERY card= stage with the
    // LOUD miswire ("no CardRegistryService for cardGate") — the
    // named debt the flow test surfaced (2026-09-13): a bench stage
    // could run but never validate.
    // THE MEMBERSHIP SOURCE (audit S-S6, 2026-10-22): the live
    // engines seat's registered ids — the same source the run
    // door's inline compiler judges. A seat-less boot (pure walls,
    // fixtures) passes undefined and the ENGINE_TABLE shape keeps
    // the pre-seam verdict.
    const enginesSeat = ctx.get("engines");
    const knownEngines = enginesSeat !== undefined && typeof enginesSeat.ids === "function"
        ? enginesSeat.ids()
        : undefined;
    const answer = inlineArm(liveDoc, ctx.cardRegistry, knownEngines);
    if (answer.status === 200) {
        // THE ONE-ADMISSION LAW (commission 018's sharpest
        // self-critique, 2026-09-25): a green compile was never a
        // runnable promise — the start door composes card stages
        // through phase1Card (overlay → admission → lane presence →
        // spell pool → composeOnce) and that walk refused params the
        // lattice's schema alone passed (attempt-018: the directory
        // default died at the compose guard, validate said green).
        // Validate now runs the SAME walk per card stage. One honest
        // degradation: an unreachable engine keeps validate usable —
        // the payload NAMES the skipped walk instead of refusing
        // closed (the {model:} arm's composeValidateCard keeps its
        // stricter closed voice; the bench seat must validate on
        // engine-less boxes).
        const note = await composeCardStagesAtValidate(liveDoc, ctx.cardRegistry);
        if (typeof note === "string" && note.startsWith("REFUSED ")) {
            throw new RemoteError("runs/invalid-request", note.slice(8), { loc: "stages" });
        }
        return note === null ? answer.payload : { ...answer.payload, note };
    }
    const p = answer.payload;
    const mapped = RUNS_ERROR_CODES[p["code"]];
    /* v8 ignore next -- inlineArm answers stamp flow_compile |
       workflow_pin only (both tabled): the LOUD arm never fires (2026-09-12) */
    if (mapped === undefined) {
        // An answer this table does not name is a bug — LOUD.
        throw new Error("runs validate: unmapped answer code " + p["code"]);
    }
    // (inlineArm stamps loc on every 400 — the passthrough never
    // yields undefined here.)
    throw new RemoteError(mapped, p["error"], {
        loc: p["loc"],
        errors: p["errors"],
    });
}
/** THE ONE-ADMISSION LAW's inline half: compose every card stage
 *  through the registry's phase1Card — the SAME walk the start
 *  door rides ($spell bodies skip the graph by their own law).
 *  null = composed clean, no note. A string starting "REFUSED "
 *  carries the refusal voice; any other string is a degradation
 *  note (engine unreachable — the schema-only verdict stands,
 *  named). */
async function composeCardStagesAtValidate(liveDoc, svc) {
    // THE DOOR OWNS THE SHAPE (2026-09-25): runsValidateStages refuses
    // a non-object stage, a non-object params, an empty id and a
    // missing model BEFORE this walk reads them — every stage here is
    // an object with a non-empty id and an object params. The
    // re-checking branches this walk used to carry were unreachable
    // (a wall for an unreachable arm is a lie), so they are gone; a
    // body that skipped the door now fails loud instead of quietly
    // composing nothing.
    // THE SUBJECT, THE WAY inlineArm FINDS IT (under the 200 only —
    // the re-audit's correction, 2026-10-16): on a 200, a body
    // carrying flow_inline is read through it and a body without one
    // is its own subject (inlineArm's own envelope rule). Reading
    // flow_inline.stages unconditionally assumed a key this walk's
    // caller does not promise — the removed half-built-seat guard had
    // been hiding it.
    // THE WALK'S ONLY ARRIVALS (2026-10-16, the same law as the door
    // comment above): validate reaches this walk only on a 200 from
    // inlineArm, and flowFromBody — the door every subject passes —
    // refuses a non-object body and a non-array (or empty) stages
    // list before that 200 can exist. The non-object `: {}` and
    // non-array `: []` fallbacks this walk carried were unreachable
    // (a wall for an unreachable arm is a lie) and are gone; the
    // casts state what the door already proved.
    const liveRec = liveDoc;
    const envelope = ("flow_inline" in liveRec ? liveRec["flow_inline"] : liveRec);
    const stages = envelope.stages;
    // a legal NON-card stage (a plain engine stage) is not this
    // walk's business: it composes through the engine
    const cardStages = stages.filter((st) => typeof st["card"] === "string" && st["card"] !== "");
    if (cardStages.length === 0)
        return null;
    if (!(await svc.primeObjectInfo())) {
        return "compose walk skipped: engine unreachable (schema-only verdict — the start door composes before queuing)";
    }
    for (const st of cardStages) {
        const params = st["params"];
        // a non-string model row (the door's card gate only demands
        // presence) composes against the CARD name — the arm is live
        const mid = typeof params["model"] === "string"
            ? params["model"] : String(st["card"]);
        // A MODEL-LESS CARD STAGE (stroke 3: the registry's rig hop)
        // rides with NO model key at all: an injected one would hit
        // the board check ("model 'rig' is not offered by card 'rig'",
        // boards: none) before prepareCardParams ever resolved the
        // familyless card-unit arm — which needs mid alone, not a
        // body.model. admitStageModel passes an absent model; the
        // compose names the family through the card's own selector
        // (the rig card's mode knob).
        const body = params["model"] === undefined
            ? { ...params }
            : { ...params, model: mid };
        try {
            await svc.phase1Card(body, mid);
        }
        catch (e) {
            if (e instanceof CardArmError) {
                return "REFUSED stage " + JSON.stringify(String(st["id"])) + ": " + e.message;
            }
            throw e;
        }
    }
    return null;
}
/** Map a CardArmError onto the refusal envelope (door-verbatim:
 *  the error verbatim + code + loc/expected/got only when set). */
export async function modelValidateArm(body, ctx) {
    const mid = String(body["model"] ?? "");
    try {
        strictBody(body);
    }
    catch (e) {
        // (strictBody throws FlowError only — checkStrictBody is total
        // string ops over the body's keys — so the cast folds every
        // throw with the door-verbatim text.)
        const flowErr = e;
        return {
            status: 400,
            payload: { error: flowErr.message, code: "invalid_request" },
        };
    }
    // resolve_request's door count: the {model} arm
    // re-checks ambiguity — a body naming two doors refuses here,
    // before the artifact sweep.
    const doors = ["flow", "flow_inline", "model"]
        .filter((k) => k in body);
    if (doors.length > 1) {
        return {
            status: 400,
            payload: {
                error: "ambiguous request: names " +
                    JSON.stringify(doors) +
                    " — provide exactly one of flow, flow_inline, model",
                code: "invalid_request",
            },
        };
    }
    const svc = ctx.cardRegistry;
    // ONE PREPARE: this door owns no refusal voices of its own —
    // prepareCardParams refuses (dangling, legality, resolves,
    // unknown-unit, skew) and the arm folds its CardArmErrors
    // into the validate answer. The facts degrade below is THIS
    // door's pinned policy (the catalog answers alone when the
    // facts file is absent), handed to prepare as an explicit
    // resolve step.
    let facts;
    try {
        facts = svc.modelFacts();
    }
    catch {
        facts = {};
    }
    let prep;
    try {
        prep = prepareCardParams(svc, body, mid, "1", facts);
    }
    catch (e) {
        if (e instanceof CardArmError) {
            return { status: 400, payload: { error: e.message, code: e.code } };
        }
        throw e;
    }
    const params = prep.params;
    // IN-PROCESS COMPOSE: the SAME registry compose pipeline the
    // start arm rides composes for validate (one plane, both arms).
    // ONE-FACTS-READ (round-22 compose audit Q3b): the door's one
    // facts read rides the whole arm — the internal prepare and the
    // lane verdict judge the same table this prepare did, never a
    // second strict read beside a degraded first.
    const refused = 
    // the body's OWN model address rides: the params are overlaid (the
    // model key is consumed), so the arm must not lose the address the
    // board check and the variant selection both judge
    await svc.composeValidateCard(prep.card, prep.fam, params, mid, body, facts);
    if (refused !== null) {
        return {
            status: 400,
            payload: { error: refused.message, code: refused.code },
        };
    }
    // composed OK — 200 shape verbatim (ok/model/card/cost in
    // wire order; engine medians unknown at validate time so the
    // stages list is empty).
    return {
        status: 200,
        payload: {
            ok: true,
            model: mid,
            card: true,
            cost: { queue_depth: 0, eta_queue_s: null, stages: [] },
        },
    };
}
//# sourceMappingURL=runsValidateArms.js.map
