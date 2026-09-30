// runsValidateArms.ts — the runs seat's validate arms (extracted
// from runsRegistry.ts, the god-file cut): the /validate fold and
// the model-validate arm. Explicit deps, no Service state.
import type { Context } from "@deepseek-ai/cordis";
import { RemoteError, remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import type { FlowsValidateAnswer } from "./runsValidate.ts";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.ts";
import { getRegistryFlow, registryFlowNames, expandRegistryFlow, registryFlowToInline, registryInitialsError } from "./flowsData.ts";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { inlineArm, strictBody, findDanglingRefs, type FlowError } from "./runsValidate.ts";
import { FLOW_ID_RE } from "./runsGates.ts";
import type { ModelFactsRow } from "./cardsFacts.ts";
import { CardArmError } from "./cardsArmError.ts";
export async function validate(
  doc: unknown,
  signal: AbortSignal,
  ctx: Context,
): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    // the {flow:} shim may REPLACE the body (flow → flow_inline):
    // the inline arm compiles the LIVE body, not the original doc.
    let liveDoc: unknown = doc;
    if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
      let body = doc as Record<string, unknown>;
      if ("model" in body) {
        const answer: FlowsValidateAnswer = await modelValidateArm(body, ctx);
        if (answer.status === 200) return answer.payload;
        const p = answer.payload as {
          error: string;
          code: string;
          loc?: string;
        };
        const mapped = RUNS_ERROR_CODES[p["code"]];
        if (mapped === undefined) {
          throw new Error(
            "runs validate: unmapped answer code " + p["code"],
          );
        }
        // (no model-arm answer stamps loc today — the passthrough
        // rides undefined, verbatim like the inline block below.)
        throw new RemoteError(mapped, p["error"], {
          loc: p["loc"],
        });
      }
      if (
        "flow" in body && !("flow_inline" in body) &&
        !("model" in body) && !("stages" in body)
      ) {
        // THE NAMED-FLOW SHIM at validate (REBUILD-13; the dead
        // door's law): expand the registry flow live and compile it
        // through the SAME inline arm — no second validator. Unknown
        // names keep the door's own voice.
        const name: string = typeof body["flow"] === "string" ? body["flow"] : "";
        const decl = getRegistryFlow(name);
        if (decl === undefined) {
          throw new RemoteError(
            "runs/invalid-request",
            "no flow named " + name + " in the registry",
            { loc: "flow" },
          );
        }
        const expanded = expandRegistryFlow(decl);
        // The same compile-time gate at validate (REBUILD-21).
        const badInitial: string | null = registryInitialsError(expanded, body, {
          repoRoot: resolveRepoRoot(),
          stateRoot: ctx.queue.stateRoot,
        });
        if (badInitial !== null) {
          throw new RemoteError("runs/invalid-request", badInitial, {
            loc: "body",
          });
        }
        const inlineDoc = registryFlowToInline(expanded);
        const rest: Record<string, unknown> = { ...body };
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
    const answer: FlowsValidateAnswer = inlineArm(liveDoc, ctx.cardRegistry);
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
    const p = answer.payload as {
      error: string;
      code: string;
      loc?: string;
      errors?: unknown;
    };
    const mapped = RUNS_ERROR_CODES[p["code"]];
    /* v8 ignore next -- inlineArm answers stamp flow_compile |
       workflow_pin only (both tabled): the LOUD arm never fires (2026-09-12) */
    if (mapped === undefined) {
      // An answer this table does not name is a bug — LOUD.
      throw new Error(
        "runs validate: unmapped answer code " + p["code"],
      );
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
  async function composeCardStagesAtValidate(
    liveDoc: unknown,
    svc: unknown,
  ): Promise<string | null> {
    const seat = svc as {
      phase1Card?: unknown;
      primeObjectInfo?: unknown;
    };
    // (a null registry is the door's own LOUD miswire — inlineArm
    // refuses it before the walk is reached; only a registry that
    // cannot COMPOSE lands here)
    if (typeof seat.phase1Card !== "function" ||
        typeof seat.primeObjectInfo !== "function") return null;
    // THE DOOR OWNS THE SHAPE (2026-09-25): runsValidateStages refuses
    // a non-object stage, a non-object params, an empty id and a
    // missing model BEFORE this walk reads them — every stage here is
    // an object with a non-empty id and an object params. The
    // re-checking branches this walk used to carry were unreachable
    // (a wall for an unreachable arm is a lie), so they are gone; a
    // body that skipped the door now fails loud instead of quietly
    // composing nothing.
    const stages = (liveDoc as { flow_inline: { stages: unknown[] } }).flow_inline.stages;
    // a legal NON-card stage (a plain engine stage) is not this
    // walk's business: it composes through the engine
    const cardStages = stages.filter((st): st is Record<string, unknown> =>
      typeof (st as Record<string, unknown>)["card"] === "string" && (st as Record<string, unknown>)["card"] !== "");
    if (cardStages.length === 0) return null;
    if (!(await (seat as unknown as { primeObjectInfo(): Promise<boolean> }).primeObjectInfo())) {
      return "compose walk skipped: engine unreachable (schema-only verdict — the start door composes before queuing)";
    }
    for (const st of cardStages) {
      const params = st["params"] as Record<string, unknown>;
      // a non-string model row (the door's card gate only demands
      // presence) composes against the CARD name — the arm is live
      const mid: string = typeof params["model"] === "string"
        ? params["model"] : String(st["card"]);
      // A MODEL-LESS CARD STAGE (stroke 3: the registry's rig hop)
      // rides with NO model key at all: an injected one would hit
      // the board check ("model 'rig' is not offered by card 'rig'",
      // boards: none) before prepareCardParams ever resolved the
      // familyless card-unit arm — which needs mid alone, not a
      // body.model. admitStageModel passes an absent model; the
      // compose names the family through the card's own selector
      // (the rig card's mode knob).
      const body: Record<string, unknown> =
        params["model"] === undefined
          ? { ...params }
          : { ...params, model: mid };
      try {
        await (seat as unknown as {
          phase1Card(body: Record<string, unknown>, mid: string): Promise<unknown>;
        }).phase1Card(body, mid);
      } catch (e) {
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
export async function modelValidateArm(
  body: Record<string, unknown>,
  ctx: Context,
): Promise<FlowsValidateAnswer> {
    const mid: string = String(body["model"] ?? "");
    try {
      strictBody(body);
    } catch (e) {
      // (strictBody throws FlowError only — checkStrictBody is total
      // string ops over the body's keys — so the cast folds every
      // throw with the door-verbatim text.)
      const flowErr = e as FlowError;
      return {
        status: 400,
        payload: { error: flowErr.message, code: "invalid_request" },
      };
    }
    // resolve_request's door count: the {model} arm
    // re-checks ambiguity — a body naming two doors refuses here,
    // before the artifact sweep.
    const doors: string[] = (["flow", "flow_inline", "model"] as string[])
      .filter((k) => k in body);
    if (doors.length > 1) {
      return {
        status: 400,
        payload: {
          error:
            "ambiguous request: names " +
            JSON.stringify(doors) +
            " — provide exactly one of flow, flow_inline, model",
          code: "invalid_request",
        },
      };
    }
    // ARTIFACT-REF GATE first.
    const dangling: Array<[string, string, string]> =
      findDanglingRefs(body);
    if (dangling.length > 0) {
      const [location, ref, why] = dangling[0] as [string, string, string];
      return {
        status: 400,
        payload: {
          error:
            "dangling artifact ref at " + JSON.stringify(location) + ": " +
            ref + " (" + why + ")",
          code: "invalid_request",
        },
      };
    }
    if (!FLOW_ID_RE.test(mid)) {
      return {
        status: 400,
        payload: {
          error: "model id " + JSON.stringify(mid) + " is not a legal identifier",
          code: "invalid_request",
        },
      };
    }
    const svc = ctx.cardRegistry;
    // Resolution degrades to {} when the facts file is absent (the
    // old cordisFacts degrade — the resolves check below then
    // answers from the catalog alone; the strict overlay further
    // down still throws LOUD).
    let facts: Record<string, ModelFactsRow>;
    try {
      facts = svc.modelFacts();
    } catch {
      facts = {};
    }
    const resolves: boolean =
      mid in facts ||
      svc.resolveCardFamily(mid, facts) in facts ||
      svc.modelMids().has(mid);
    // THE CARD-UNIT PASS (2026-10-08, the Run-press law): the
    // bench's Run press addresses a family-less card by its OWN id
    // (defaultFamilyForCard's documented fallback) — the door
    // composes the card the press names. Only ids that are neither
    // family NOR card refuse below (the unknown voice).
    const cardUnit: boolean = !resolves &&
      Object.prototype.hasOwnProperty.call(svc.cardDecls(facts), mid);
    if (!resolves && !cardUnit) {
      return {
        status: 400,
        payload: {
          error: "no model unit for model: " + mid +
            " (no .catalog.models row " + mid +
            " in the frozen discovery catalog and no family declares route " +
            mid + " in its variants' cells — checked the class tree's _routes map)",
          code: "invalid_request",
        },
      };
    }
    if (!cardUnit) {
      const fam: string = svc.resolveCardFamily(mid, facts);
      const famRow: ModelFactsRow | undefined = facts[fam];
      if (famRow === undefined) {
        // Non-cordis compose arm (no family row): verdict + code.
        return {
          status: 400,
          payload: {
            error:
              "card_compose phase 1: model " + JSON.stringify(mid) +
              " composes outside the cordis plane (no family row — " +
              "the model resolves but the facts file declares nothing for it)",
            code: "card_compose",
          },
        };
      }
    }
    // THE ROUTE-LENS STAMP OVERLAY (_route_stamp_overlay
    // 705-751): family defaults + the selected variant's
    // resolver_defaults, absent-keys-only, filtered to the card
    // field surface.
    let overlaid: { fam: string; card: string; params: Record<string, unknown> };
    try {
      // (awaited — the overlay is sync today, but the arm owns the
      // rejection either way: an async throw must fold, never float.)
      overlaid = await svc.overlayCardParams(body, mid);
    } catch (e) {
      if (e instanceof CardArmError) {
        return { status: 400, payload: { error: e.message, code: e.code } };
      }
      throw e;
    }
    const params: Record<string, unknown> = overlaid.params;
    // IN-PROCESS COMPOSE: the SAME registry compose pipeline the
    // start arm rides composes for validate (one plane, both arms).
    const refused: { message: string; code: string } | null =
      // the body's OWN model address rides: the params are overlaid (the
      // model key is consumed), so the arm must not lose the address the
      // board check and the variant selection both judge
      await svc.composeValidateCard(overlaid.card, overlaid.fam, params, mid, body);
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
