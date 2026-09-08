/**
 * assertNoParamDrops — the universal frontend gate against silent parameter
 * drops in generate request bodies.
 *
 * JSON.stringify silently drops `undefined` values and converts NaN/Infinity
 * to `null`. This is the TypeScript version of the Python `**kwargs` absorb
 * pattern — a param can vanish on the wire with zero error. The user's
 * policy: "SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE
 * EVER. HARD FAILS IF ANYTHING LOOKS LIKE IT DROPS."
 */
import { describe, it, expect } from "vitest"
import { assertNoParamDrops, setRequiredEmptyResolver } from "@melite/catalog"

describe("assertNoParamDrops", () => {
 it("passes for a clean body with all serializable values", () => {
 const body = { model: "ace-step", prompt: "funk pop", lyrics: "[verse]\nHello", seed: 42 }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })

 it("passes for null, empty string, 0, and false (all serializable)", () => {
 const body: Record<string, unknown> = { model: "test", prompt: "", seed: 0, flag: false, extra: null }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })

 it("passes for arrays and nested objects", () => {
 const body = { model: "test", loras: ["lora1"], config: { nested: true } }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })

 it("THROWS when body has an undefined value (JSON.stringify drops it silently)", () => {
 const body: Record<string, unknown> = { model: "ace-step", prompt: "test", lyrics: undefined }
 expect(() => assertNoParamDrops(body)).toThrow(/SILENT PARAMETER DROP/)
 expect(() => assertNoParamDrops(body)).toThrow(/lyrics/)
 })

 it("THROWS when body has multiple undefined values", () => {
 const body: Record<string, unknown> = { model: "test", a: undefined, b: "ok", c: undefined }
 try {
 assertNoParamDrops(body)
 expect.fail("should have thrown")
 } catch (e) {
 const msg = String(e)
 // The error names the dropped fields (a, c) but NOT the surviving one
 expect(msg).toMatch(/\ba\b/)
 expect(msg).toMatch(/\bc\b/)
 // "b" should not appear as a standalone dropped field — check the
 // DROPPED list specifically, not the whole message (UNACCEPTABLE
 // contains the letter 'b')
 const droppedPart = msg.match(/DROPPED: \[([^\]]+)\]/)
 expect(droppedPart).toBeTruthy()
 const droppedFields = droppedPart![1].split(", ")
 expect(droppedFields).toContain("a")
 expect(droppedFields).toContain("c")
 expect(droppedFields).not.toContain("b")
 }
 })

 it("THROWS when body has NaN (JSON.stringify converts to null)", () => {
 const body = { model: "test", cfg: NaN }
 expect(() => assertNoParamDrops(body)).toThrow(/SILENT PARAMETER DROP/)
 expect(() => assertNoParamDrops(body)).toThrow(/cfg/)
 expect(() => assertNoParamDrops(body)).toThrow(/NaN/)
 })

 it("THROWS when body has Infinity (JSON.stringify converts to null)", () => {
 const body = { model: "test", steps: Infinity }
 expect(() => assertNoParamDrops(body)).toThrow(/Infinity/)
 })

 it("THROWS when body has a function value (JSON.stringify drops it)", () => {
 const body = { model: "test", callback: () => {} }
 expect(() => assertNoParamDrops(body)).toThrow(/callback/)
 expect(() => assertNoParamDrops(body)).toThrow(/function/)
 })

 it("THROWS when body has a symbol value (JSON.stringify drops it)", () => {
 const body = { model: "test", sym: Symbol("test") }
 expect(() => assertNoParamDrops(body)).toThrow(/sym/)
 expect(() => assertNoParamDrops(body)).toThrow(/symbol/)
 })

 it("THROWS when body has a bigint value (JSON.stringify throws)", () => {
 const body = { model: "test", big: BigInt(123) }
 expect(() => assertNoParamDrops(body)).toThrow(/bigint/)
 })

 it("error message names the SILENT PARAMETER DROPS ARE UNACCEPTABLE policy", () => {
 const body: Record<string, unknown> = { model: "test", dropped: undefined }
 try {
 assertNoParamDrops(body)
 expect.fail("should have thrown")
 } catch (e) {
 expect(String(e)).toContain("UNACCEPTABLE")
 }
 })

 // ── REQUIRED-EMPTY (2026-08-21 flip): the guard derives from the SERVED
 // form-spec (plugin yaml declares required: true) via the resolver seam —
 // core knows ZERO model ids. A missing/unknown model simply skips (the
 // backend's own semantic 400 stands, the old set's tolerance).
 it("THROWS when the resolver says the model requires a field and it is empty", () => {
 setRequiredEmptyResolver((model) =>
 model === "some-audio-model" ? ["prompt"] : null,
 )
 try {
 expect(() => assertNoParamDrops({ model: "some-audio-model", prompt: "" })).toThrow(
 /'prompt' is empty for 'some-audio-model'/,
 )
 expect(() => assertNoParamDrops({ model: "some-audio-model", prompt: "  \n " })).toThrow(
 /'prompt' is empty/,
 )
 // A filled prompt passes.
 expect(() => assertNoParamDrops({ model: "some-audio-model", prompt: "rain" })).not.toThrow()
 } finally {
 setRequiredEmptyResolver(null)
 }
 })

 it("SKIPS silently for models the resolver does not know (no hardcoded set)", () => {
 setRequiredEmptyResolver((model) => (model === "known" ? ["prompt"] : null))
 try {
 expect(() => assertNoParamDrops({ model: "anything-else", prompt: "" })).not.toThrow()
 } finally {
 setRequiredEmptyResolver(null)
 }
 })

 it("SKIPS when no resolver is registered at all (package-level default)", () => {
 expect(() => assertNoParamDrops({ model: "whatever", prompt: "" })).not.toThrow()
 })

 it("passes for an audio model with a real prompt", () => {
 const body = { model: "moss-sfx", prompt: "thunder rumbling" }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })

 it("passes for a NON-audio model with an empty prompt (image models may not require it)", () => {
 const body = { model: "krea-2", prompt: "" }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })

 it("passes when an audio body has no prompt key at all (not declared)", () => {
 const body = { model: "moss-sfx", seed: 1 }
 expect(() => assertNoParamDrops(body)).not.toThrow()
 })
})
