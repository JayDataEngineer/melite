/**
 * motionDoc — the studio's live incrementality (THE REWORK, 2026-11-05:
 * one truth, f(doc, pendingOps) — the h3-timeline pendingOps.ts pattern
 * ported to motion's channels; nativity audit F7).
 *
 * THE LAW (DSH architecture: the session log is the source of truth;
 * live UI incrementality is explicitly separated from durable
 * settlements — never a second state joined by a guard): the bench doc
 * (stage.params) is the ONLY document state. React holds no mirror (no
 * tlPrompts/tlKeyframes/tlIntervals useState, no once-only hydration,
 * no echo-guard persist effect). What the operator stated but the doc
 * does not yet carry rides an explicit op log — the transient half:
 *
 * - every gesture commits straight through: onSave(payload) AND one op
 *   appended ({channel, value}).
 * - the shown document is the pure overlay: the projected doc with the
 *   live ops applied (latest op per channel wins).
 * - an op retires the moment the projected doc CONTAINS its value
 *   (content-compared, so out-of-order refreshes can never un-state
 *   what was stated). An external bench write re-hydrates naturally:
 *   the projection re-reads stage.params on every change — there is no
 *   once-only hydration gate to block it.
 *
 * Channel currencies (what retirement compares):
 * - "constraints": the wire JSON string (exactly what onSave carried).
 * - "prompts": the SEMANTIC rows [{text, start_frame, end_frame}] — the
 *   wire form (motion_prompts durations + the single prompt param) is
 *   lossy below the 2-segment threshold, so the rows themselves are the
 *   comparable statement; the wire payload is derived at the door.
 */
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import {
  hydrateConstraints, hydrateMotionPrompts, serializeConstraints,
  serializeMotionPrompts, untanglePrompts,
  MOTION_CONSTRAINTS_PARAM, MOTION_PROMPTS_PARAM,
  type MotionConstraint,
} from "@melite/formats/motionConstraints"

/** The two writable channels — the studio's write-door granularity. */
export type OpChannel = "prompts" | "constraints"

/** One stated-but-unsettled write. */
export interface PendingOp {
  channel: OpChannel
  /** The channel's retirement currency (see the module header). */
  value: unknown
  /** Commit order (latest per channel wins the overlay — never array
   *  position; state batching must not change which op wins). */
  seq: number
}

/** The projected document — the bench row hydrated, no state. */
export interface MotionDoc {
  prompts: TimelinePrompt[]
  keyframes: TimelineKeyframe[]
  payloads: Record<string, MotionConstraint>
}

/** Canonical JSON for content comparison (the h3 A1 law): keys sorted
 *  recursively, arrays order-preserved (row order is semantic),
 *  undefined-valued keys SKIPPED, top-level undefined digests null.
 *  Verbatim with h3's pendingOps.ts — one digest law, estate-wide. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`
  if (v !== null && typeof v === "object") {
    const rec = v as Record<string, unknown>
    const keys = Object.keys(rec).filter((k) => rec[k] !== undefined).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`
  }
  return JSON.stringify(v) ?? "null"
}

/** The wire form of motion_constraints is the persist effect's own JSON
 *  STRING (older docs may hold the object); a corrupt string degrades to
 *  null → empty constraints, never a crash (the corrupt-sentinel law). */
function parseWireJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

/** The semantic prompt row — uuid/color are view identity, not
 *  statements; retirement compares text + frames only. */
function semanticRow(p: TimelinePrompt): SemanticPromptRow {
  return { text: p.text, start_frame: p.start_frame, end_frame: p.end_frame }
}

export interface SemanticPromptRow {
  text: string
  start_frame: number
  end_frame: number
}

/** The retirement's envelope context: settlement runs in DOC SPACE, at
 *  the CURRENT envelope (fps + targetT). */
export interface SettleCtx {
  fps: number
  targetT: number
}

/** The prompts channel's settlement form: both sides of a retirement
 *  comparison are normalized through the SAME serialize→hydrate law at
 *  the current envelope, so the projection's last-segment stretch
 *  (hydrateMotionPrompts extends the last card to targetT-1) can never
 *  wedge a STATEABLE op live forever — a settled wire retires its op
 *  however the envelope has since moved. Below the 2-segment threshold
 *  the wire carries no frames, so the raw rows compare (the seed law:
 *  one card over [0, targetT-1] retires when the doc seeds the same
 *  text); a multi-EMPTY composition is the one unstateable residue —
 *  the wire cannot carry empty cards' existence, so that op stays live
 *  by design until a stateable gesture supersedes it or the stage
 *  switch clears it (the authoring surface the seed exists for). */
export function promptsSettle(rows: SemanticPromptRow[], ctx: SettleCtx): SemanticPromptRow[] {
  const safeFps = ctx.fps > 0 ? ctx.fps : 30
  const wire = serializeMotionPrompts(rows, safeFps)
  if (wire !== "") {
    const hydrated = hydrateMotionPrompts(wire, safeFps, Math.max(1, Math.floor(ctx.targetT)))
    if (hydrated && hydrated.length > 0) return hydrated
  }
  return rows
}

/** Deterministic view identity: prompts hydrate in sequence order, so
 *  the index IS the stable uuid (Date.now() churn would break the bar's
 *  drag identity across re-projections). */
function viewRows(segments: { text: string; start_frame: number; end_frame: number }[]): TimelinePrompt[] {
  return segments.map((s, i) => ({
    uuid: `motion-prompt-${i}`,
    text: s.text,
    start_frame: s.start_frame,
    end_frame: s.end_frame,
    color: null,
  }))
}

/** Pure projection: the bench row hydrated (the doc, verbatim).
 *  Prompts: the persisted multi-segment payload; else the single
 *  `prompt` param seeding one card over [0, targetT-1] (the demo's
 *  authoring surface — always one editable card before any authoring). */
export function projectMotionDoc(
  params: Record<string, unknown> | undefined,
  fps: number,
  targetT: number,
): MotionDoc {
  const safeFps = fps > 0 ? fps : 30
  const safeT = Math.max(1, Math.floor(targetT))
  const constraintJson = parseWireJson(params?.[MOTION_CONSTRAINTS_PARAM])
  const hydrated = constraintJson ? hydrateConstraints(constraintJson) : null
  const segments = hydrateMotionPrompts(params?.[MOTION_PROMPTS_PARAM], safeFps, safeT)
  const prompts = segments && segments.length > 0
    ? viewRows(segments)
    : viewRows([{
      text: typeof params?.prompt === "string" ? params.prompt : "",
      start_frame: 0,
      end_frame: Math.max(0, safeT - 1),
    }])
  return {
    prompts,
    keyframes: hydrated?.keyframes ?? [],
    payloads: hydrated?.payloads ?? {},
  }
}

/** The prompts channel's DOOR payload: the wire params one onSave
 *  carries — motion_prompts ("" below the 2-segment override threshold)
 *  plus the single-prompt mirror param the node reads in that case. */
export function serializePromptsParams(rows: TimelinePrompt[], fps: number): Record<string, unknown> {
  const safeFps = fps > 0 ? fps : 30
  return {
    [MOTION_PROMPTS_PARAM]: serializeMotionPrompts(rows, safeFps),
    prompt: rows.find((p) => p.text.trim() !== "")?.text ?? "",
  }
}

/** The constraints channel's wire form: the transport JSON string (empty
 *  string when no live constraint exists — the persist form). */
export function serializeConstraintsParam(doc: MotionDoc): string {
  const json = serializeConstraints(doc.keyframes, doc.payloads)
  const empty = (json.fullbody?.length ?? 0) === 0
    && (json.end_effectors?.length ?? 0) === 0
    && (json.root2d?.length ?? 0) === 0
  return empty ? "" : JSON.stringify(json)
}

/** The retirement currency of one channel against a projected doc.
 *  Constraints: the wire string, digested as parsed content (a
 *  re-ordered-key settlement — the same facts, different bytes — still
 *  retires the op). Prompts: the projection's semantic rows VERBATIM —
 *  the projection IS doc space (it already rode hydrateMotionPrompts;
 *  re-normalizing it would drift the +1 frame convention). */
export function serializeChannel(doc: MotionDoc, channel: OpChannel, _ctx: SettleCtx): unknown {
  if (channel === "prompts") return doc.prompts.map(semanticRow)
  return serializeConstraintsParam(doc)
}

/** The settlement law applied to an op's stored value: raw authored rows
 *  normalize into doc space at the current envelope (the stretch law),
 *  so a stateable op retires however the envelope has since moved. */
export function opCurrency(value: unknown, channel: OpChannel, ctx: SettleCtx): unknown {
  if (channel === "prompts") return promptsSettle(value as SemanticPromptRow[], ctx)
  return value
}

/** The settlement's common currency: strings digest through their PARSED
 *  content, and the constraints object digests with its EMPTY ARRAYS
 *  stripped (serializeConstraints omits empty groups; a foreign writer
 *  may carry them — the same facts in different key shapes are one
 *  statement). null/undefined/"" all state "nothing on this channel". */
function settleCurrency(v: unknown): unknown {
  const parsed = typeof v === "string" ? parseWireJson(v) : v
  if (parsed === null || parsed === undefined || parsed === "") return {}
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const rec = parsed as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(rec)) {
      if (Array.isArray(rec[k]) && (rec[k] as unknown[]).length === 0) continue
      out[k] = rec[k]
    }
    return out
  }
  return parsed
}

/** Content-equal under the door's semantics (canonical digest). */
function settledEquals(a: unknown, b: unknown): boolean {
  return canonicalJson(settleCurrency(a)) === canonicalJson(settleCurrency(b))
}

/** THE SUPERSEDE LAW (motion's refinement of the h3 log — 2026-11-05):
 *  a channel holds ONE live statement. Appending an op retires every
 *  older op on that channel: the door can only ever settle the NEWEST
 *  payload, so an older statement is dead on arrival — kept live it
 *  would re-mask the shown doc the moment the newer op retired (the
 *  zombie-resurface hazard: undo-to-doc-shape would resurrect the last
 *  gesture). Commit order still rides seq (A2); this trims the log. */
export function supersedeOps(ops: PendingOp[], op: PendingOp): PendingOp[] {
  return [...ops.filter((o) => o.channel !== op.channel), op]
}

/** The live ops: ops whose value the projected doc does not yet contain.
 *  Derived per render — never bookkept, so nothing can leak or go stale
 *  (an op is retired by the settlement itself). */
export function liveOps(doc: MotionDoc, ops: PendingOp[], ctx: SettleCtx): PendingOp[] {
  return ops.filter((op) => !settledEquals(serializeChannel(doc, op.channel, ctx), opCurrency(op.value, op.channel, ctx)))
}

/** The shown document: the projection with the live ops applied (latest
 *  op per channel wins; re-hydration re-runs so the shown doc is always
 *  well-formed view state, never raw payload). */
export function overlayMotionDoc(doc: MotionDoc, ops: PendingOp[], ctx: SettleCtx): MotionDoc {
  const live = liveOps(doc, ops, ctx)
  const latest = (channel: OpChannel): PendingOp | undefined => {
    let out: PendingOp | undefined
    for (const op of live) {
      if (op.channel === channel && (out === undefined || op.seq > out.seq)) out = op
    }
    return out
  }
  const promptsOp = latest("prompts")
  const constraintsOp = latest("constraints")
  if (promptsOp === undefined && constraintsOp === undefined) return doc
  const segments = promptsOp === undefined
    ? doc.prompts
    : (promptsOp.value as { text: string; start_frame: number; end_frame: number }[])
  const constraintJson = constraintsOp === undefined
    ? null
    : parseWireJson(constraintsOp.value)
  const hydrated = constraintJson ? hydrateConstraints(constraintJson) : null
  return {
    prompts: viewRows(segments),
    keyframes: hydrated?.keyframes ?? (constraintsOp === undefined ? doc.keyframes : []),
    payloads: hydrated?.payloads ?? (constraintsOp === undefined ? doc.payloads : {}),
  }
}

/** The no-overlap heal rides the write door (the dead effect's law,
 *  kept): every committed prompts shape is a strict sequence. */
export function healPrompts(rows: TimelinePrompt[]): TimelinePrompt[] {
  return untanglePrompts(rows)
}
