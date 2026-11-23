/**
 * @contract gates-aux-model-call-session-log
 * THE AUXILIARY-PLANE LOG LAW (conventions sweep drift ①, ROADMAP
 * 2026-11: "MODEL-VISIBLE ⟺ LOGGED on the auxiliary plane — the
 * enhance/vision/view tool streams reach model requests with ZERO
 * session events").
 *
 * AGENTS.md conventions: "anything that reaches a model request must
 * be reconstructable from the session log; a new model-visible input
 * requires a session event." The compose plane never had the gap (its
 * model-visible inputs are DSH tool executions, logged by the
 * registry); the auxiliary plane did: the enhance completion, the
 * delegated-eye vision verification, and the view tool that fires
 * them all went to the wire with no log entry. The cure: ONE
 * ignorable plugin record (`plugin:melite/aux-model-call`) per
 * auxiliary model call, appended PRE-dispatch, carrying the exact
 * consumed inputs — the session/title-llm-request grammar (DSH's own
 * log-only pre-dispatch record of one auxiliary title request).
 *
 * The wire door: the /melite-tools/enhance HTTP door rides NO session
 * (the editor's ✦ press names no session; opening a store session
 * would pollute the operator's session list) — the audit's
 * documented-exception arm. Its record rides the host logger +
 * `purpose` on the wire. The registry row carries the exception.
 *
 * Arms:
 *   1. ENHANCE — the enhance completion's record lands in a REAL
 *      session log pre-dispatch: assembled system verbatim (recipe +
 *      OUTPUT_CONTRACT), prompt verbatim, route, temperature.
 *   2. VISION — the verification call's record lands: kind, the fixed
 *      question verbatim, and the attachment's durable identity
 *      carriers (id, media type, bytes, geometry).
 *   3. THE REAL DOOR — viewStillArtifact through a blind route with a
 *      session-carrying exec commits the record (the tool plane's
 *      wiring: exec.agent.session is the log home).
 *   4. THE CENSUS — every `llm.stream(` call site in the harness src
 *      traces to a pre-dispatch emission: exactly two sites fire the
 *      model wire, and each module's emission line precedes its wire
 *      line (source-derived, never a hand count).
 *   5. THE WIRE PURPOSE — each stream stamps its auxiliary purpose on
 *      the GenerateOptions the wire receives ('melite-enhance' /
 *      'melite-vision'): the unsessioned exception's reconstruction
 *      rides the same field.
 *   6. THE DOCUMENTED EXCEPTION — the unsessioned face voices the
 *      record naming the exception and the stream, never a silent
 *      skip; the session seat refuses a seat with no append door.
 */
import { describe, expect, it, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { Session, SessionId } from "@deepseek-ai/dsh-session";
import type { SessionEvent } from "@deepseek-ai/dsh-session";
import type { GenerateOptions } from "@deepseek-ai/dsh-llm";
import type { ImageAttachmentRef } from "@deepseek-ai/dsh-attachment";
import {
  ENHANCE_DEADLINE_MS,
  OUTPUT_CONTRACT,
  harnessCompleteOnRoute,
  type LlmStreamSeam,
} from "../../../../packages/harness/melite-tools/src/llm-complete.ts";
import {
  VISION_QUESTIONS,
  verifyVisual,
  type VisionLlmSeam,
  type VisionStreamChunk,
} from "../../../../packages/harness/melite-tools/src/tools/vision-route.ts";
import {
  AUX_MODEL_CALL_RECORD,
  auxCallLogOf,
  unsessionedAuxCallLog,
} from "../../../../packages/harness/melite-tools/src/aux-session-log.ts";
import { viewStillArtifact } from "../../../../packages/harness/melite-tools/src/tools/melite-view.ts";
import type { MediaListRow, ViewExec } from "../../../../packages/harness/melite-tools/src/tools/melite-view.ts";

// ── the real log home ──────────────────────────────────────────────

/**
 * A REAL Session: the plugin-record writer is dsh-session's own
 * (appendPluginRecord brand-checks its receiver), so a fake object
 * cannot receive the record — the wall reads it back from a live log
 * the same way production does.
 */
function sessionSeat(config: { provider: string; model: string }): Session {
  const session = Session.create(SessionId(`sess-aux-wall-${config.provider}-${config.model}`));
  session.append([["request/header", { header: { config }, reason: "initial" }]]);
  return session;
}

/** The wall's read-back: every aux-model-call record in the log. */
function auxRecords(session: Session): Array<SessionEvent & { data: Record<string, unknown> }> {
  return session
    .snapshotEvents()
    .filter((event): event is SessionEvent & { data: Record<string, unknown> } =>
      event.type === AUX_MODEL_CALL_RECORD,
    );
}

// ── the wire fakes ─────────────────────────────────────────────────

const VERDICT = "a red cube on a table, nothing else in frame";
const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

/** The enhance seam: one JSON verdict, the options it received kept
 *  for the wire-purpose arm. */
function enhanceSeam(): LlmStreamSeam & { options: GenerateOptions[] } {
  const options: GenerateOptions[] = [];
  return {
    options,
    listProviders: () => [],
    listModels: async () => [],
    stream: (o: GenerateOptions) => {
      options.push(o);
      async function* gen(): AsyncGenerator<unknown> {
        yield { type: "text-delta", text: '{"positive":"P","negative":"N"}' };
        yield { type: "finish", reason: { kind: "stop" } };
      }
      return gen() as AsyncIterable<never>;
    },
  } as LlmStreamSeam & { options: GenerateOptions[] };
}

/** The eye seam: the delegated verification's shape (the
 *  vision-route units), options kept for the wire-purpose arm. */
function eye(chunks: VisionStreamChunk[] = [
  { type: "text-delta", text: VERDICT },
  { type: "finish", reason: { kind: "stop" } },
]): VisionLlmSeam & { options: GenerateOptions[] } {
  const options: GenerateOptions[] = [];
  return {
    options,
    listProviders: () => [{ id: "chat" }, { id: "vp" }],
    listModels: async (provider: string) =>
      provider === "vp" ? [{ id: "sees" }] : [{ id: "noggin" }],
    resolveModelInfo: async (_p: string, model: string) => ({
      // the caller's chat route is TEXT-ONLY (the blind press), the
      // enumerated vp route sees — the delegated-eye shape
      inputModalities: model === "sees" ? ["text", "image"] : ["text"],
    }),
    stream: (o: GenerateOptions) => {
      options.push(o);
      return (async function* () {
        for (const c of chunks) yield c;
      })() as AsyncIterable<VisionStreamChunk>;
    },
  } as VisionLlmSeam & { options: GenerateOptions[] };
}

// ── ARM 1 — the enhance face ───────────────────────────────────────

describe("aux-model-call session log (drift ①) — the enhance face", () => {
  it("ARM 1 — the record lands pre-dispatch with the exact consumed inputs", async () => {
    const session = sessionSeat({ provider: "gate", model: "keeper" });
    const llm = enhanceSeam();
    const SYSTEM = "enhance: make it loud";
    await harnessCompleteOnRoute(llm, { provider: "gate", model: "keeper" }, {
      system: SYSTEM,
      prompt: "a red boat",
      temperature: 0.7,
      log: auxCallLogOf(session),
    });
    // exactly ONE record, and it entered the log BEFORE the wire call
    const records = auxRecords(session);
    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.ignorable).toBe(true);
    const data = record.data as Record<string, unknown>;
    // identity reconstruction: which stream, which route, what the
    // model actually saw
    expect(data.stream).toBe("enhance");
    expect(data.route).toEqual({ provider: "gate", model: "keeper" });
    expect(data.system).toBe(SYSTEM + OUTPUT_CONTRACT);
    expect(data.prompt).toBe("a red boat");
    expect(data.temperature).toBe(0.7);
    // PRE-dispatch: the record is in the log while the wire saw the
    // SAME assembled system (the record is what the request carried,
    // not a post-hoc paraphrase)
    expect(llm.options).toHaveLength(1);
    expect(llm.options[0]!.system).toBe(data.system);
    // the record rides the plugin-record grammar, not the required-
    // on-read event namespace (an ignorant reader skips it)
    expect(String(record.type)).toMatch(/^plugin:/);
  });

  it("ARM 1b — a non-finite temperature never enters the record", async () => {
    const session = sessionSeat({ provider: "gate", model: "keeper" });
    await harnessCompleteOnRoute(enhanceSeam(), { provider: "gate", model: "keeper" }, {
      system: "s",
      prompt: "p",
      temperature: Number.NaN,
      log: auxCallLogOf(session),
    });
    const data = auxRecords(session)[0]!.data as Record<string, unknown>;
    expect(Object.hasOwn(data, "temperature")).toBe(false);
  });
});

// ── ARM 2 — the vision face ────────────────────────────────────────

describe("aux-model-call session log (drift ①) — the vision face", () => {
  it("ARM 2 — the record carries the fixed question verbatim + the attachment identity", async () => {
    const session = sessionSeat({ provider: "vp", model: "sees" });
    const e = eye();
    const ref = {
      attachmentId: "att_9",
      mediaType: "image/png",
      bytes: PNG_BYTES.byteLength,
      width: 8,
      height: 8,
    } as ImageAttachmentRef;
    const out = await verifyVisual(e, { provider: "vp", model: "sees" }, ref, "film", undefined, auxCallLogOf(session));
    expect(out.verdict).toBe(VERDICT);
    const records = auxRecords(session);
    expect(records).toHaveLength(1);
    expect(records[0]!.ignorable).toBe(true);
    const data = records[0]!.data as Record<string, unknown>;
    expect(data.stream).toBe("vision");
    expect(data.route).toEqual({ provider: "vp", model: "sees" });
    expect(data.kind).toBe("film");
    // the question is the FIXED protocol text (the tool asks, never
    // the caller) — verbatim, self-sufficient for reconstruction
    expect(data.question).toBe(VISION_QUESTIONS.film);
    const image = data.image as Record<string, unknown>;
    expect(image).toEqual({
      attachmentId: "att_9",
      mediaType: "image/png",
      bytes: PNG_BYTES.byteLength,
      width: 8,
      height: 8,
    });
  });
});

// ── ARM 3 — the real door (the tool plane's wiring) ────────────────

describe("aux-model-call session log (drift ①) — the real door", () => {
  const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  let root = "";
  let cleanup = () => {};

  it("ARM 3 — viewStillArtifact through a blind route commits the record to the exec's session", async () => {
    root = mkdtempSync(join(tmpdir(), "aux-wall-door-"));
    const still = join(root, "output", "run-door-still");
    mkdirSync(still, { recursive: true });
    writeFileSync(join(still, "gen_00001_.png"), PNG);
    utimesSync(join(still, "gen_00001_.png"), new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"));
    const eyeSeam = eye();
    const store = {
      attachments: {
        saveImage: async (input: { data: Uint8Array; mediaType: string; name?: string }) => ({
          attachmentId: "att_door",
          mediaType: input.mediaType,
          bytes: input.data.byteLength,
          width: 8,
          height: 8,
        }) as ImageAttachmentRef,
        imageLimits: {
          maxImageBytes: 10_000_000,
          maxMessageImageBytes: 10_000_000,
          maxImageDimension: 8000,
          maxImagePixels: 30_000_000,
          mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        },
      },
    };
    const ctx = {
      get: (name: string): unknown => {
        if (name === "attachments") return store.attachments;
        if (name === "queue") return { stateRoot: root };
        if (name === "llm") return eyeSeam;
        return undefined;
      },
    };
    // the tool plane's log home: the EXEC's session (the record must
    // reach it through sessionSeat(exec) — not through any bypass).
    // The caller rides the blind chat route (the delegation shape:
    // routeImageCapability finds THAT route blind, then the eye lane
    // fires the enumerated seeing route).
    const session = sessionSeat({ provider: "chat", model: "noggin" });
    const exec = {
      signal: AbortSignal.timeout(ENHANCE_DEADLINE_MS),
      agent: { session, options: {} },
    } as unknown as ViewExec;
    const row: MediaListRow = { url: "u", name: "gen_00001_.png", kind: "image", runId: "run-door-still", served_from: root };
    const value = await viewStillArtifact(root, row, "run-door-still", exec, ctx, store.attachments as never);
    expect(String(value.textObservation)).toMatch(/VISUAL VERIFICATION via vp\/sees/);
    const records = auxRecords(session);
    expect(records).toHaveLength(1);
    const data = records[0]!.data as Record<string, unknown>;
    expect(data.stream).toBe("vision");
    expect((data.image as Record<string, unknown>).attachmentId).toBe("att_door");
    cleanup = () => rmSync(root, { recursive: true, force: true });
  });

  afterAll(() => cleanup());
});

// ── ARM 4 — the census (source-derived) ────────────────────────────

describe("aux-model-call session log (drift ①) — the census", () => {
  const SRC = join(import.meta.dirname, "..", "..", "..", "..", "packages", "harness", "melite-tools", "src");

  it("ARM 4 — exactly two modules fire the model wire and each emits its record BEFORE the stream", () => {
    const wire: string[] = [];
    for (const name of ["llm-complete.ts", "tools/vision-route.ts"]) {
      const text = readFileSync(join(SRC, name), "utf8");
      if (text.includes(".stream(")) wire.push(name);
    }
    // the auxiliary plane's whole wire: the enhance completion and the
    // delegated-eye verification — a third site is an unlogged call
    expect(wire).toEqual(["llm-complete.ts", "tools/vision-route.ts"]);
    for (const name of wire) {
      const text = readFileSync(join(SRC, name), "utf8");
      const emission = text.indexOf(".append(");
      const wireCall = text.indexOf(".stream(");
      expect(emission, `${name} carries no emission`).toBeGreaterThanOrEqual(0);
      // PRE-dispatch is a source-order fact: the emission line
      // precedes the wire line, so a reader reconstructs before the
      // call exists
      expect(emission, `${name} emits AFTER the wire (post-hoc, not pre-dispatch)`).toBeLessThan(wireCall);
    }
    // the delegators thread the required seat (no silent hop)
    for (const name of ["doors.ts", "enhance-agent.ts"]) {
      expect(readFileSync(join(SRC, name), "utf8")).toContain("AuxCallLog");
    }
  });
});

// ── ARM 5 — the wire purpose ───────────────────────────────────────

describe("aux-model-call session log (drift ①) — the wire purpose", () => {
  it("ARM 5 — each stream stamps its purpose on the options the wire receives", async () => {
    const enhance = enhanceSeam();
    await harnessCompleteOnRoute(enhance, { provider: "gate", model: "keeper" }, {
      system: "s",
      prompt: "p",
      log: auxCallLogOf(sessionSeat({ provider: "gate", model: "keeper" })),
    });
    expect(enhance.options[0]!.purpose).toBe("melite-enhance");
    const vision = eye();
    await verifyVisual(
      vision,
      { provider: "vp", model: "sees" },
      { attachmentId: "a", mediaType: "image/png", bytes: 12, width: 8, height: 8 } as ImageAttachmentRef,
      "still",
      undefined,
      auxCallLogOf(sessionSeat({ provider: "vp", model: "sees" })),
    );
    expect(vision.options[0]!.purpose).toBe("melite-vision");
  });
});

// ── ARM 6 — the documented exception ───────────────────────────────

describe("aux-model-call session log (drift ①) — the documented exception", () => {
  it("ARM 6 — the unsessioned face voices the record naming the exception, never a silent skip", () => {
    const lines: string[] = [];
    const log = unsessionedAuxCallLog((line) => lines.push(line));
    log.append({
      stream: "enhance",
      route: { provider: "gate", model: "keeper" },
      system: "s",
      prompt: "p",
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[melite aux-call UNSESSIONED — no session log seats the enhance door");
    // the SAME payload rides the line (JSON-recoverable)
    expect(lines[0]).toContain('"stream":"enhance"');
    expect(lines[0]).toContain('"prompt":"p"');
  });

  it("ARM 6b — a seat with no append door refuses LOUD before any model call", () => {
    expect(() => auxCallLogOf({} as { append(type: string, data: unknown): unknown })).toThrow(
      /no append door.*Model-visible ⟺ logged/,
    );
  });
});
