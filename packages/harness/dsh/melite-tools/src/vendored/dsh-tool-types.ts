/**
 * Vendored tool-registry type surface — src-copy, not a hand mirror.
 *
 * Upstream: https://github.com/deepseek-ai/deepseek-harness
 * Pinned at commit `141eb6f` (2026-08-19).
 * - `ToolSchema`, `TextBlock` ← `packages/llm/llm/src/types.ts`
 *   (ToolSchema:333-338, TextBlock:53-57).
 * - `JsonSchemaType`, `JsonSchemaScalar`, `JsonSchemaNode` ←
 *   `packages/core/tools/src/json-schema.ts` (18-21, 31-50).
 * - `JsonValue` ← `packages/core/session/src/json.ts` (13).
 * - `ToolOutputDefinition`, `ToolDefinition`, `ToolResult`,
 *   `GenericCallView`, `GenericResultView`, `ToolCallKind` ←
 *   `packages/core/tools/src/index.ts` (ToolOutputDefinition:212-219,
 *   ToolDefinition:222-290, ToolResult:292-303) and `src/presentation.ts`
 *   (ToolCallKind:17, GenericCallView:51-77, GenericResultView:143-154).
 *
 * License: MIT, Copyright (c) 2026 DeepSeek (upstream notice preserved
 * in this file's tail).
 *
 * ADAPTATIONS (declared, with cause — DSH-AS-LANGUAGE ledger):
 *
 * 1. `execute` takes `exec: ToolExec` ({ signal }) where upstream takes
 *    `ToolRunContext`. Cause: the full context chain (ToolExecution →
 *    ToolExecutionInput → Agent, UserMessage, tokens) is host-plane
 *    machinery this plugin never touches — every body below uses only
 *    `exec.signal`. The narrowing is contravariant-safe: a body that
 *    accepts { signal } accepts any ToolRunContext at runtime.
 * 2. `output.render` returns `TextBlock[]` where upstream returns
 *    `ContentBlock[]`. Cause: this plugin renders text only (its
 *    TextBlock is upstream's TextBlock verbatim, so the array type is
 *    assignable upward — no practical divergence).
 * 3. Omitted optional members (never used by this plugin; omission is
 *    the designed default): `finalizeContent` (needs the ToolExecution
 *    chain), `timeoutMs`, `isConcurrencySafe`, `presentationMeta`,
 *    `presentResult` (see 4), terminal/diff/search/read/web view
 *    variants (this plugin's calls are gateway fetches — generic
 *    cards only).
 * 4. `presentResult` is vendored in the type but intentionally
 *    UNIMPLEMENTED by every tool below. Cause: it receives
 *    (args, result: ToolResult) where result carries RENDERED content
 *    blocks, not the canonical value — a completion title naming e.g.
 *    the draft id would mean re-parsing rendered text. Omission keeps
 *    the pending title + raw result content, which is the designed
 *    default and already carries the ids (the render-text contract).
 *
 * RUNTIME contract (verified against the registry — carried over from
 * the mirror this file replaces; behavior, not types):
 * - `ToolRuntime.register(definition)` requires `output { schema,
 *   render }`, asserts `output.schema` against the supported
 *   JSON-Schema subset (the keywords below + annotations
 *   description/title/default/examples; type arrays NOT supported),
 *   and rejects the reserved name `run_code`.
 * - `parameters` is projected verbatim as the model-facing JSON
 *   Schema — an object root with `properties` / `required`.
 * - A thrown `execute` is materialized by the registry as an error
 *   result whose content is the error message — that is how gateway
 *   4xx bodies reach the model verbatim.
 * - `presentCall` must be pure and side-effect-free: a UI may call it
 *   during live streaming AND session-log replay, so it depends only
 *   on `args` and must never throw on malformed input.
 */

/** Lossless JSON value (dsh session/src/json.ts:13, verbatim). */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Scalar-only schema types accepted by literal constraints. */
export type JsonSchemaScalar = string | number | boolean | null;

/** Single-type keywords accepted by the enforced subset. */
export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'null';

/**
 * One raw JSON Schema node in the enforced subset (dsh-tools
 * src/json-schema.ts:31-50, verbatim).
 */
export interface JsonSchemaNode {
  /** Omit with no constraints for any JSON value, or use `oneOf`. */
  type?: JsonSchemaType
  /** Exactly one branch must validate; at least two branches are required. */
  oneOf?: JsonSchemaNode[]
  /** Nested property schemas (`type: 'object'` only). */
  properties?: Record<string, JsonSchemaNode>
  /** Required property names; each must appear in `properties`. */
  required?: string[]
  /** `false` rejects undeclared keys; absent/`true` follows JSON Schema's open default. */
  additionalProperties?: boolean
  /** Item schema (`type: 'array'` only); absent accepts any JSON item. */
  items?: JsonSchemaNode
  /** Allowed values for a scalar node. */
  enum?: JsonSchemaScalar[]
  /** The single allowed value for a scalar node. */
  const?: JsonSchemaScalar
  /** Annotation, ignored for validation. */
  description?: string
  /** Annotation, ignored for validation. */
  title?: string
  /** Annotation, ignored for validation but required to be lossless JSON. */
  default?: JsonValue
  /** Annotation, ignored for validation but required to be lossless JSON. */
  examples?: JsonValue
}

/** Plain text visible to the end user (dsh-llm src/types.ts:53-57, verbatim). */
export interface TextBlock {
  type: 'text'
  text: string
}

/**
 * A tool's model-facing shape: name, description, arguments schema
 * (dsh-llm src/types.ts:333-338, verbatim).
 */
export interface ToolSchema {
  name: string
  description: string
  /** JSON Schema object for the arguments. */
  parameters: Record<string, unknown>
}

/** Execution identity handed to a tool body (adaptation 1: narrowed). */
export interface ToolExec {
  readonly signal: AbortSignal
}

/**
 * Mandatory canonical output declaration (dsh-tools src/index.ts:212-219,
 * verbatim except adaptation 2 on `render`).
 */
export interface ToolOutputDefinition {
  /** Raw supported JSON Schema enforced against every successful canonical value. */
  readonly schema: JsonSchemaNode
  /** Pure projection from validated arguments and value to model content. */
  render(args: unknown, value: JsonValue): TextBlock[]
  // Omitted (adaptation 3): presentationMeta.
}

/**
 * Category of a tool call, used by a UI to pick an icon or treatment
 * (dsh-tools src/presentation.ts:17, verbatim).
 */
export type ToolCallKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'fetch'
  | 'other';

/**
 * The default pending-call card (dsh-tools src/presentation.ts:51-77,
 * verbatim). Any tool whose call is not a terminal or a diff uses this.
 */
export interface GenericCallView {
  card: 'generic'
  /**
   * Human-readable, always-visible label describing what THIS call does.
   * Keep it short — a UI shows it as a card header / log line.
   */
  title: string
  /** Category for icon/treatment; defaults to `other` when omitted. */
  kind?: ToolCallKind
  /**
   * The salient input to show in a detail/expanded view. Omit to show
   * nothing; a string renders as-is, an object as pretty JSON. NOT the
   * full raw args object unless that is genuinely what a reader wants.
   */
  rawInput?: unknown
}

/**
 * The default completed card (dsh-tools src/presentation.ts:143-154,
 * verbatim except the TextBlock adaptation — same cause as `render`).
 * Vendored for the `presentResult` signature; no tool below implements it.
 */
export interface GenericResultView {
  card: 'generic'
  /** Replacement title for the completed call. Omit to keep the pending-state title. */
  title?: string
  /**
   * UI-facing result content, reformatted from the model-facing result.
   * Omit to let the UI render the raw result content.
   */
  content?: TextBlock[]
}

/**
 * The completed outcome handed to `presentResult` (dsh-tools
 * src/index.ts:292-303, verbatim; vendored for the signature even
 * though this plugin implements no presentResult — adaptation 4).
 */
export interface ToolResult {
  /** The final model-facing content (or the rendered error text on failure). */
  content: TextBlock[]
  /** Whether the call failed. */
  isError: boolean
  /**
   * The tool-private presentation payload projected by its output
   * declaration and threaded verbatim from the `tool/result` event.
   * Absent when the tool declared no projector or the call was nested
   * under a composite transport.
   */
  meta?: JsonValue
}

/**
 * A registered tool: its schema plus the execution function (dsh-tools
 * src/index.ts:222-290 — vendored subset; see adaptations 1-4).
 */
export interface ToolDefinition extends ToolSchema {
  /** Mandatory canonical output declaration. */
  readonly output: ToolOutputDefinition
  /**
   * Run one accepted call and return only its canonical lossless-JSON value.
   * Async work must observe or forward `exec.signal` and settle only after its
   * owned work reaches quiescence.
   * @param args - losslessly snapshotted, frozen model arguments.
   * @param exec - execution identity and cancellation signal (narrowed — adaptation 1).
   * @returns the canonical value declared by `output.schema`.
   */
  execute(args: unknown, exec: ToolExec): Promise<unknown>
  /**
   * Optional: how to present the PENDING state of one call in a UI, derived
   * from the call's `args`. Returns a `card`-tagged render intent, or
   * `undefined` (or omit the method) to fall back to a generic presentation
   * (title = tool name, raw args as input). Pure and side-effect-free.
   */
  presentCall?(args: unknown): GenericCallView | undefined
  /**
   * Optional: how to present the COMPLETED state. UNIMPLEMENTED by this
   * plugin — adaptation 4 records why; the signature rides along so the
   * vendored shape stays recognizable.
   */
  presentResult?(args: unknown, result: ToolResult): GenericResultView | undefined
}
