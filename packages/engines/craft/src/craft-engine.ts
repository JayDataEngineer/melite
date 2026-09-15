// craft-engine.ts — the craft loop engine (stroke 55, plan §2.3:
// docs/design/engine-generics-mcp.md). One stage = ONE LOOP:
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
import { Context, Service } from "@deepseek-ai/cordis";
import type { EnginesService, EngineParamValue, EngineStageOutcome } from "@melite/engine-contract";

/** One act command: a nested engine stage (the loop's hands). */
export interface CraftCommand {
  readonly engine: string;
  readonly params: Readonly<Record<string, EngineParamValue>>;
}

/** The critic's decision — the loop's discipline (JSON protocol):
 *  done ends the loop; refine carries the next command. */
export interface CraftCritique {
  readonly verdict: "done" | "refine";
  readonly note?: string;
  readonly command?: CraftCommand;
}

/** What the critic sees each iteration. */
export interface CraftCriticInput {
  readonly iteration: number;
  readonly prompt: string;
  readonly command: CraftCommand;
  readonly artifacts: readonly string[];
  readonly runDir: string;
  readonly signal: AbortSignal;
}

/** The critic seam (injected; the provider builds the real one). */
export interface CraftCritic {
  critique(input: CraftCriticInput): Promise<CraftCritique>;
}

/** The engines seam (the seat's resolver slice). */
export interface CraftEngines {
  resolve(id: string): { executor: { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } };
}

/** The hard circuit breaker (never a tunable — a law). */
export const CRAFT_MAX_ITERATIONS_HARD_CAP = 1000;

const plainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Validate one act command (LOUD, before anything runs). */
const commandOk = (v: unknown, where: string): CraftCommand => {
  if (!plainObject(v)) {
    throw new Error(`${where}: command must be a JSON object {engine, params}`);
  }
  if (typeof v.engine !== "string" || v.engine.length === 0) {
    throw new Error(`${where}: command needs a non-empty 'engine' id`);
  }
  if (v.params !== undefined && !plainObject(v.params)) {
    throw new Error(`${where}: command 'params' must be a JSON object`);
  }
  return { engine: v.engine, params: (v.params ?? {}) as Record<string, EngineParamValue> };
};

export const craftLoopExecutor = (
  engines: CraftEngines,
  critic: CraftCritic,
): { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } => {
  return {
    async executeStages(rows, runDir, _inputNames, options) {
      const outcomes: EngineStageOutcome[] = [];
      for (const row of rows) {
        const p = row.params as Record<string, unknown>;
        // THE CARD'S FOUR FIELDS (the sketch, verbatim)
        const prompt = p.agent_prompt;
        if (typeof prompt !== "string" || prompt.length === 0) {
          throw new Error(`craft stage ${JSON.stringify(row.stageId)}: 'agent_prompt' (the brief) is required`);
        }
        const inputs = p.inputs;
        if (!plainObject(inputs)) {
          throw new Error(`craft stage ${JSON.stringify(row.stageId)}: 'inputs' must be a JSON object carrying 'command'`);
        }
        let command = commandOk(inputs.command, `craft stage ${JSON.stringify(row.stageId)} inputs`);
        const model = p.model;
        if (model !== undefined && (typeof model !== "string" || model.length === 0)) {
          throw new Error(`craft stage ${JSON.stringify(row.stageId)}: 'model' must be a non-empty route id`);
        }
        const maxIter = p.max_iterations;
        if (
          maxIter !== undefined &&
          (typeof maxIter !== "number" || !Number.isInteger(maxIter) || maxIter < 1)
        ) {
          throw new Error(`craft stage ${JSON.stringify(row.stageId)}: 'max_iterations' must be a positive integer`);
        }
        if (maxIter !== undefined && maxIter > CRAFT_MAX_ITERATIONS_HARD_CAP) {
          throw new Error(
            `craft stage ${JSON.stringify(row.stageId)}: 'max_iterations' ${maxIter} exceeds the hard cap ${CRAFT_MAX_ITERATIONS_HARD_CAP}`,
          );
        }
        // THE LOOP
        const artifacts = new Set<string>();
        let note = "";
        let iteration = 0;
        for (;;) {
          if (options.shouldStop()) {
            throw new Error(`craft stage ${JSON.stringify(row.stageId)}: stopped by the user at iteration ${iteration}`);
          }
          if (iteration >= CRAFT_MAX_ITERATIONS_HARD_CAP || (maxIter !== undefined && iteration >= maxIter)) {
            throw new Error(
              `craft stage ${JSON.stringify(row.stageId)}: no done verdict within ${maxIter ?? CRAFT_MAX_ITERATIONS_HARD_CAP} iterations (the circuit breaker)`,
            );
          }
          // act: one nested engine stage, same run dir (captures land there)
          const act = await engines.resolve(command.engine).executor.executeStages(
            [{ stageId: `${row.stageId}#${iteration}`, outputs: {}, params: command.params }],
            runDir,
            {},
            options,
          );
          for (const a of act.stages[0]?.artifacts ?? []) artifacts.add(a);
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
            throw new Error(
              `craft critic answered verdict ${JSON.stringify(verdict.verdict)} — 'done' or 'refine' only`,
            );
          }
          command = commandOk(verdict.command, `craft critic refine (iteration ${iteration})`);
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

/** The structural seam slices the provider reads (the estate's
 *  ctx.get law — declared, never assumed). */
export interface CraftLlmSeam {
  listProviders(): { id: string }[];
  listModels(provider: string): Promise<{ id: string }[]>;
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<{ inputModalities?: readonly string[] }>;
  prepareCall(config: { provider: string; model: string }, signal?: AbortSignal): Promise<{
    /** The resolved config prepareCall materialized (defaults filled —
     *  the dispatch contract compares stream options against it). */
    config: { provider: string; model: string; [key: string]: unknown };
    stream(options: {
      provider: string;
      model: string;
      messages: { role: "user"; content: unknown[] }[];
      [key: string]: unknown;
    }): AsyncIterable<{ type: string; text?: string }>;
  }>;
}

/** The route law (the preference arm's precedent, stroke 52):
 *  enumerate every registered provider route round-robin and pick
 *  the FIRST image-capable one — zero config to misconfigure; a
 *  lane with no vision route seats no critic (loud, never fatal). */
export async function resolveImageCapableRoute(
  llm: CraftLlmSeam,
): Promise<{ provider: string; model: string } | null> {
  const providers = llm.listProviders();
  if (providers.length === 0) return null;
  const perProvider: { provider: string; model: string }[][] = [];
  for (const p of providers) {
    try {
      const models = await llm.listModels(p.id);
      if (models.length > 0) {
        perProvider.push(models.map((m) => ({ provider: p.id, model: m.id })));
      }
    } catch {
      /* a provider that cannot enumerate is skipped — the same
       * quiet-step as the harness route resolver */
    }
  }
  const routes: { provider: string; model: string }[] = [];
  for (let i = 0; i < 12; i++) {
    for (const list of perProvider) {
      if (i < list.length) routes.push(list[i]);
    }
  }
  for (const route of routes) {
    try {
      const info = await llm.resolveModelInfo(route.provider, route.model);
      if ((info.inputModalities ?? []).includes("image")) return route;
    } catch {
      /* unresolvable routes step past */
    }
  }
  return null;
}

export interface CraftAttachmentsSeam {
  // The face COPIED from the real seat (dsh-attachment's
  // AttachmentStore.saveImage — the 2026-09-16 live-fire caught
  // this seam inventing a positional (data, mediaType) shape the
  // seat never had: the seat read input.data.byteLength off the
  // Buffer we passed as `input` and died). One object in, a ref out.
  saveImage(input: { data: Uint8Array; mediaType: string; name?: string }): Promise<{
    attachmentId: string;
    mediaType: string;
    bytes: number;
    width: number;
    height: number;
  }>;
}

/** Build the REAL critic from the llm + attachments seats: the
 *  artifact image rides the message (ImageBlock, the
 *  melite_view law); the verdict comes back as JSON. */
export const llmCritic = (
  llm: CraftLlmSeam,
  attachments: CraftAttachmentsSeam,
  route: { provider: string; model: string },
): CraftCritic => {
  return {
    async critique(input): Promise<CraftCritique> {
      const info = await llm.resolveModelInfo(route.provider, route.model, input.signal);
      if (!(info.inputModalities ?? []).includes("image")) {
        throw new Error(
          `craft critic route ${route.provider}/${route.model} does not accept image input (the critic's eye must see the capture)`,
        );
      }
      const content: unknown[] = [
        {
          type: "text",
          text:
            `CRAFT LOOP — iteration ${input.iteration}. Brief: ${input.prompt}\n` +
            `Last act: ${JSON.stringify(input.command)}\nArtifacts: ${JSON.stringify(input.artifacts)}\n` +
            `Answer ONE JSON object: {"verdict":"done","note":"..."} or {"verdict":"refine","note":"...","command":{"engine":"...","params":{...}}}. JSON only.`,
        },
      ];
      const newest = input.artifacts[input.artifacts.length - 1];
      if (newest !== undefined && /\.(png|jpe?g|webp|gif)$/i.test(newest)) {
        const { readFile } = await import("node:fs/promises");
        const bytes = await readFile(`${input.runDir}/${newest}`);
        const ext = (newest.split(".").pop() ?? "png").toLowerCase();
        const mediaType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
        const image = await attachments.saveImage({ data: bytes, mediaType });
        content.push({ type: "image", attachment: { ...image, attachmentId: image.attachmentId } });
      }
      const prepared = await llm.prepareCall(route, input.signal);
      let text = "";
      // Dispatch under the PREPARED config (never a rebuilt
      // {provider, model}: prepareCall materializes adapter defaults
      // into it, and the dispatch contract rejects anything unequal
      // — the 2026-09-16 live-fire caught the rebuilt shape dying
      // INVALID_PREPARED_CALL on deepseek-flash's defaultMaxTokens).
      const callOptions = { ...prepared.config, messages: [{ role: "user" as const, content }] };
      // Adapters vary: text may ride text-delta chunks, a whole
      // block-end text block, or (reasoning routes) reasoning-delta
      // before the answer. Accumulate every text carrier and keep a
      // chunk-type histogram — the no-JSON refusal names it, so the
      // next empty answer diagnoses itself (the 2026-09-16 drive
      // caught deepseek-flash answering with zero text-deltas).
      const seen: Record<string, number> = {};
      let finishReason = "none";
      for await (const chunk of prepared.stream(callOptions)) {
        const c = chunk as { type: string; text?: unknown; block?: { type?: unknown; text?: unknown }; reason?: unknown };
        seen[c.type] = (seen[c.type] ?? 0) + 1;
        if (c.type === "text-delta" && typeof c.text === "string") text += c.text;
        else if (c.type === "block-end" && (c.block?.type === "text") && typeof c.block.text === "string") text += c.block.text;
        else if (c.type === "finish" && typeof c.reason === "string") finishReason = c.reason;
        // The stream protocol's terminal error channel (dsh-llm's
        // adapterFailureChunk): an adapter throw arrives as a
        // finish chunk with an OBJECT reason carrying the failure —
        // never silently end the loop on it (the 2026-09-16 drive
        // stared at a bare {"finish":1} hiding the real refusal).
        else if (c.type === "finish" && typeof c.reason === "object" && c.reason !== null) {
          const failure = (c.reason as { kind?: unknown; failure?: { message?: unknown; code?: unknown; status?: unknown } }).failure;
          throw new Error(
            `craft critic call failed: ${String(failure?.message ?? c.reason)}` +
            ` (code ${String(failure?.code ?? "?")}${failure?.status === undefined ? "" : `, status ${String(failure.status)}`})`,
          );
        }
      }
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) {
        throw new Error(
          `craft critic answered no JSON (got ${JSON.stringify(text.slice(0, 200))}, ` +
          `chunks ${JSON.stringify(seen)}, finish ${JSON.stringify(finishReason)})`,
        );
      }
      const parsed = JSON.parse(text.slice(start, end + 1)) as CraftCritique;
      if (parsed.verdict !== "done" && parsed.verdict !== "refine") {
        throw new Error(`craft critic verdict ${JSON.stringify(parsed.verdict)} — 'done' or 'refine' only`);
      }
      return parsed;
    },
  };
};

/** The provider: engine id 'craft' on the seat. The critic route
 *  is named in config (explicit > implicit). */
export const craftEngine = (ctx: Context, config: { provider?: string; model?: string }): void => {
  new CraftEngineService(ctx, config);
};

export class CraftEngineService extends Service {
  constructor(ctx: Context, config: { provider?: string; model?: string }) {
    super(ctx, "melite-engine-craft");
    const seat = ctx.get("engines") as EnginesService | undefined;
    if (seat === undefined) {
      throw new Error("craftEngine: the 'engines' seat is not mounted (mount enginesContract before this row)");
    }
    if (typeof config.provider !== "string" || config.provider.length === 0) {
      throw new Error("craftEngine: config needs the critic 'provider' route (the named eye)");
    }
    if (typeof config.model !== "string" || config.model.length === 0) {
      throw new Error("craftEngine: config needs the critic 'model' route id");
    }
    const llm = ctx.get("llm") as CraftLlmSeam | undefined;
    if (llm === undefined) {
      throw new Error("craftEngine: the llm seat is not mounted (the critic needs the route)");
    }
    const attachments = ctx.get("attachments") as CraftAttachmentsSeam | undefined;
    if (attachments === undefined) {
      throw new Error("craftEngine: the attachments seat is not mounted (captures attach through it)");
    }
    ctx.effect(() =>
      seat.register("craft", {
        executor: craftLoopExecutor(
          seat as CraftEngines,
          llmCritic(llm, attachments, { provider: config.provider as string, model: config.model as string }),
        ),
      }),
    );
  }
}

export const craftCallId = (): string => `melite-craft-${randomUUID()}`;

/** The composition-site mount: resolve the critic route at BOOT
 *  (the route law above) and seat engine 'craft'; a lane with no
 *  image-capable route seats NO critic (the loud log line, never
 *  a dead lane — craft stages then refuse at the door's membership
 *  arm with the registered list). */
export async function craftEngineAutoRoute(
  ctx: Context,
  log: (line: string) => void,
): Promise<void> {
  const llm = ctx.get("llm") as CraftLlmSeam | undefined;
  if (llm === undefined) {
    log("craft engine: no llm seat mounted — engine 'craft' NOT seated");
    return;
  }
  const attachments = ctx.get("attachments") as CraftAttachmentsSeam | undefined;
  if (attachments === undefined) {
    log("craft engine: no attachments seat mounted — engine 'craft' NOT seated");
    return;
  }
  const route = await resolveImageCapableRoute(llm);
  if (route === null) {
    log("craft engine: no image-capable route this boot — engine 'craft' NOT seated (craft stages will refuse at the door)");
    return;
  }
  log(`craft engine: critic route ${route.provider}/${route.model} — engine 'craft' seated`);
  new CraftEngineService(ctx, { provider: route.provider, model: route.model });
}
