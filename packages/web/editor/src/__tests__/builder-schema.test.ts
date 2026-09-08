/**
 * Form spec schema_groups: visible_when evaluator + payload builder tests.
 *
 * One system — everything comes from /v1/form-spec.
 */
import { describe, it, expect } from "vitest"
import { evalVisibleWhen } from "@melite/contracts"
import { buildPayload } from "../surfaces/generate/SchemaForm.utils"

describe("evalVisibleWhen", () => {
 it("returns true when expr is null/undefined", () => {
 expect(evalVisibleWhen(null, {})).toBe(true)
 expect(evalVisibleWhen(undefined, {})).toBe(true)
 expect(evalVisibleWhen("", {})).toBe(true)
 })

 it("bare field name → truthy check", () => {
 expect(evalVisibleWhen("teacache_enabled", { teacache_enabled: true })).toBe(true)
 expect(evalVisibleWhen("teacache_enabled", { teacache_enabled: false })).toBe(false)
 })

 it("equality with boolean", () => {
 expect(evalVisibleWhen("teacache_enabled == true", { teacache_enabled: true })).toBe(true)
 expect(evalVisibleWhen("teacache_enabled == true", { teacache_enabled: false })).toBe(false)
 })

 it("inequality with null", () => {
 expect(evalVisibleWhen("input_image != null", { input_image: "base64data" })).toBe(true)
 expect(evalVisibleWhen("input_image != null", { input_image: null })).toBe(false)
 })

 it("numeric greater than", () => {
 expect(evalVisibleWhen("vfi_multiplier > 1", { vfi_multiplier: 2 })).toBe(true)
 expect(evalVisibleWhen("vfi_multiplier > 1", { vfi_multiplier: 1 })).toBe(false)
 })

 it("numeric less than", () => {
 expect(evalVisibleWhen("cfg < 10", { cfg: 5 })).toBe(true)
 expect(evalVisibleWhen("cfg < 10", { cfg: 15 })).toBe(false)
 })

 it("unknown expression defaults to visible", () => {
 expect(evalVisibleWhen("some weird expr", {})).toBe(true)
 })

 // ── compound expressions (&&, ||) ──────────────────────────────

 it("AND: both atoms true → visible", () => {
 expect(evalVisibleWhen(
 "director_guide_enabled == true && use_tiled_encode == true",
 { director_guide_enabled: true, use_tiled_encode: true },
 )).toBe(true)
 })

 it("AND: one atom false → hidden (regression: was ALWAYS hidden)", () => {
 // Before the fix, compound expressions fell through to a string
 // comparison that always returned false. Now && splits correctly.
 expect(evalVisibleWhen(
 "director_guide_enabled == true && use_tiled_encode == true",
 { director_guide_enabled: true, use_tiled_encode: false },
 )).toBe(false)
 })

 it("AND: first atom false → short-circuits hidden", () => {
 expect(evalVisibleWhen(
 "director_guide_enabled == true && use_tiled_encode == true",
 { director_guide_enabled: false, use_tiled_encode: true },
 )).toBe(false)
 })

 it("OR: either atom true → visible", () => {
 expect(evalVisibleWhen(
 "audio_mode == 'native' || audio_mode == 'lipSync'",
 { audio_mode: "native" },
 )).toBe(true)
 expect(evalVisibleWhen(
 "audio_mode == 'native' || audio_mode == 'lipSync'",
 { audio_mode: "lipSync" },
 )).toBe(true)
 })

 it("OR: both atoms false → hidden", () => {
 expect(evalVisibleWhen(
 "audio_mode == 'native' || audio_mode == 'lipSync'",
 { audio_mode: "none" },
 )).toBe(false)
 })

 it("mixed: && binds tighter than ||", () => {
 // a && b || c → (a && b) || c
 expect(evalVisibleWhen(
 "a == true && b == true || c == true",
 { a: true, b: false, c: true },
 )).toBe(true)
 expect(evalVisibleWhen(
 "a == true && b == true || c == true",
 { a: true, b: false, c: false },
 )).toBe(false)
 })

 it("AND with != null atom (lip-sync visibility pattern)", () => {
 expect(evalVisibleWhen(
 "reference_audio != null && audio_mode == 'lipSync'",
 { reference_audio: "clip.wav", audio_mode: "lipSync" },
 )).toBe(true)
 expect(evalVisibleWhen(
 "reference_audio != null && audio_mode == 'lipSync'",
 { reference_audio: "clip.wav", audio_mode: "native" },
 )).toBe(false)
 expect(evalVisibleWhen(
 "reference_audio != null && audio_mode == 'lipSync'",
 { reference_audio: null, audio_mode: "lipSync" },
 )).toBe(false)
 })

 // ── >= and <= operators ────────────────────────────────────────

 it("numeric >= and <=", () => {
 expect(evalVisibleWhen("n >= 5", { n: 5 })).toBe(true)
 expect(evalVisibleWhen("n >= 5", { n: 4 })).toBe(false)
 expect(evalVisibleWhen("n <= 5", { n: 5 })).toBe(true)
 expect(evalVisibleWhen("n <= 5", { n: 6 })).toBe(false)
 })

 // ── null ≡ undefined (family-filtered field support) ───────────
 //
 // When a field is family-filtered out of the form spec, it never gets
 // seeded into the form data, so values[field] is undefined. For
 // visibility purposes this is the same as null — the field is absent.

 it("== null matches both null and undefined", () => {
 expect(evalVisibleWhen("x == null", { x: null })).toBe(true)
 expect(evalVisibleWhen("x == null", {})).toBe(true) // x is undefined
 expect(evalVisibleWhen("x == null", { x: "val" })).toBe(false)
 })

 it("!= null excludes both null and undefined", () => {
 expect(evalVisibleWhen("x != null", { x: "val" })).toBe(true)
 expect(evalVisibleWhen("x != null", { x: null })).toBe(false)
 expect(evalVisibleWhen("x != null", {})).toBe(false) // x is undefined
 })

 it("cross-family OR pattern (audio_mode filtered on non-LTX)", () => {
 // audio_mode == 'lipSync' || audio_mode == null
 // LTX lipSync → visible, LTX native → hidden, Wan VACE (undefined) → visible
 const expr = "audio_mode == 'lipSync' || audio_mode == null"
 expect(evalVisibleWhen(expr, { audio_mode: "lipSync" })).toBe(true)
 expect(evalVisibleWhen(expr, { audio_mode: "native" })).toBe(false)
 expect(evalVisibleWhen(expr, { audio_mode: "none" })).toBe(false)
 expect(evalVisibleWhen(expr, {})).toBe(true) // Wan VACE: field absent
 })

 // ── parenthesized grouping ─────────────────────────────────────

 it("parenthesized OR inside AND", () => {
 // a != null && (b == 'x' || b == null)
 // Without paren support, the (b == 'x' || b == null) sub-expression
 // would fall through to "default visible" and always return true.
 const expr = "a != null && (b == 'lipSync' || b == null)"
 expect(evalVisibleWhen(expr, { a: "clip", b: "lipSync" })).toBe(true)
 expect(evalVisibleWhen(expr, { a: "clip", b: "native" })).toBe(false)
 expect(evalVisibleWhen(expr, { a: "clip", b: null })).toBe(true) // Wan VACE
 expect(evalVisibleWhen(expr, { a: null, b: "lipSync" })).toBe(false)
 })

 it("fully wrapped expression", () => {
 expect(evalVisibleWhen("(x == true)", { x: true })).toBe(true)
 expect(evalVisibleWhen("(x == true)", { x: false })).toBe(false)
 })

 it("does NOT strip parens that don't wrap the whole expr", () => {
 // (a == true) && (b == true) — outer parens are per-atom, not wrapping
 // These get stripped correctly because each is balanced individually
 // after the && split processes them.
 expect(evalVisibleWhen(
 "(a == true) && (b == true)",
 { a: true, b: true },
 )).toBe(true)
 expect(evalVisibleWhen(
 "(a == true) && (b == true)",
 { a: true, b: false },
 )).toBe(false)
 })
})

describe("buildPayload", () => {
 it("strips null and undefined values", () => {
 const payload = buildPayload("wan-vace", {
 prompt: "a cat",
 width: 832,
 seed: null,
 end_image: undefined,
 loras: [],
 })
 expect(payload).toEqual({
 model: "wan-vace",
 prompt: "a cat",
 width: 832,
 })
 })

 it("includes falsy values like 0 and false", () => {
 const payload = buildPayload("test", {
 cfg: 0,
 teacache_enabled: false,
 width: 832,
 })
 expect(payload).toEqual({
 model: "test",
 cfg: 0,
 teacache_enabled: false,
 width: 832,
 })
 })

 it("merges extra params", () => {
 const payload = buildPayload("test",
 { prompt: "hi" },
 { workflow: "some_workflow" },
 )
 expect(payload).toEqual({
 model: "test",
 workflow: "some_workflow",
 prompt: "hi",
 })
 })

 // ── NO SILENT LEAKS — schema-driven payload filter ───────────────────
 //
 // The original "Edit page sends GLB to backend" bug: stray field values
 // from stale form state rode through buildPayload into /v1/run. The fix
 // adds an optional `allowedFields` set; production callers (AssetsTab,
 // useFormController) pass the live schema's field names. These pin the
 // behavior so a future refactor can't silently reintroduce the leak.

 it("DROPS unknown fields when allowedFields is provided", () => {
 const payload = buildPayload(
 "qwen-image-edit",
 {
 prompt: "a red panda",
 width: 1024,
 // Stale state from a prior SOMAX tab — must NOT leak
 rigged_path: "data:model/gltf-binary;base64,AAAA",
 source_glb: "data:model/gltf-binary;base64,BBBB",
 // Stale NPZ from a prior Kimodo tab
 npz_path: "data:application/octet-stream;base64,CCCC",
 },
 undefined,
 new Set(["prompt", "width"]), // schema qwen-image-edit declares only these
 )
 expect(payload).toEqual({
 model: "qwen-image-edit",
 prompt: "a red panda",
 width: 1024,
 })
 expect(payload).not.toHaveProperty("rigged_path")
 expect(payload).not.toHaveProperty("source_glb")
 expect(payload).not.toHaveProperty("npz_path")
 })

 it("PRESERVES unknown fields when allowedFields is undefined (test back-compat)", () => {
 // The 4th arg is optional — existing tests that don't pass it must
 // keep working so we don't break the test suite while rolling out
 // the schema filter to production callers.
 const payload = buildPayload("test", {
 prompt: "hi",
 some_unknown_field: "leaks-by-design-here",
 })
 expect(payload).toEqual({
 model: "test",
 prompt: "hi",
 some_unknown_field: "leaks-by-design-here",
 })
 })

 it("PRESERVES known fields when allowedFields matches", () => {
 const payload = buildPayload(
 "z-image",
 { prompt: "a cat", width: 1024, seed: 42 },
 undefined,
 new Set(["prompt", "width", "seed", "negative_prompt"]),
 )
 expect(payload).toEqual({
 model: "z-image",
 prompt: "a cat",
 width: 1024,
 seed: 42,
 })
 })
})
