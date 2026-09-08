/**
 * Unit tests for surfaces/generate/useFormController.ts — the orchestration
 * hook that layers value state + default-merge + payload builder on top of
 * useFormSpecContract.
 *
 * Mocks useFormSpecContract so tests can fire the onSpec callback at
 * controlled moments (initial load, model swap), and mocks buildPayload so
 * we can verify the controller passes the right (model, values, service,
 * allowedFields).
 *
 * Coverage:
 *   - Initial state (empty values, null spec, payload() returns empty).
 *   - onSpec default-seed: values populated from spec.defaults.
 *   - Model swap preserves user-entered values for fields that still exist.
 *   - preserveAcrossSwap: false → user values wiped on swap.
 *   - onChange updates a single field.
 *   - setValues exposed for bulk updates.
 *   - payload() passes service, model, values, AND spec.fields as an
 *     allowedFields set (the schema-violation guard).
 *
 * Zero prior coverage. A regression in the default-merge would either wipe
 * user values on every model swap (frustrating) or leak stale values for
 * fields that no longer exist (wrong payload).
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { FormSpec } from "@melite/contracts"

// ── Mocks ───────────────────────────────────────────────────────────────────
// useFormSpecContract mock: capture the onSpec callback so tests can fire it.
let onSpecCb: ((s: { fields: { name: string }[]; defaults: Record<string, unknown> }) => void) | null = null
let mockSpec: FormSpec | null = null
let mockLoading = true
let mockError: string | null = null

vi.mock("../surfaces/shared/specContractStore", () => ({
  useFormSpecContract: (
    _model: string,
    cb: (s: { fields: { name: string }[]; defaults: Record<string, unknown> }) => void,
  ) => {
    onSpecCb = cb
    return { spec: mockSpec, loading: mockLoading, error: mockError, state: "loaded", violations: [] as never[], retry: () => {} }
  },
}))

// buildPayload mock: capture the call args so tests can assert.
const buildPayloadMock = vi.fn()
vi.mock("../surfaces/generate/SchemaForm.utils", () => ({
  // Wrapper defers the buildPayloadMock lookup to CALL time, so the
  // hoisted vi.mock factory doesn't capture the binding before init.
  buildPayload: (...args: unknown[]) => buildPayloadMock(...args),
}))

import { useFormController } from "../surfaces/generate/useFormController"

beforeEach(() => {
  onSpecCb = null
  mockSpec = null
  mockLoading = true
  mockError = null
  buildPayloadMock.mockClear()
})

// ── Tests ───────────────────────────────────────────────────────────────────
describe("useFormController — initial state", () => {
  it("returns the useFormSpecContract passthrough (spec/loading/error)", () => {
    mockSpec = {
      model: "x", form: "f", genre: "image", service: "s", label: "X",
      fields: [], schema_groups: [], features: {}, guide: null, defaults: {},
    }
    mockLoading = false
    mockError = null
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    expect(result.current.spec).toBe(mockSpec)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
  it("starts with empty values", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    expect(result.current.values).toEqual({})
  })
  it("payload() before any spec load still invokes buildPayload (with undefined allowedFields)", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    act(() => result.current.payload())
    expect(buildPayloadMock).toHaveBeenCalledTimes(1)
    // No spec → allowedFields is undefined
    expect(buildPayloadMock.mock.calls[0][3]).toBeUndefined()
  })
})

describe("useFormController — default-seed on spec load", () => {
  it("seeds values from spec.defaults when onSpec fires", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    expect(result.current.values).toEqual({})
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "steps" }],
        defaults: { prompt: "hello", steps: 28 },
      })
    })
    expect(result.current.values).toEqual({ prompt: "hello", steps: 28 })
  })
})

describe("useFormController — model swap preserves user values", () => {
  it("preserveAcrossSwap=true (default): user values for fields that still exist survive", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    // First spec load
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "steps" }],
        defaults: { prompt: "default-prompt", steps: 28 },
      })
    })
    // User changes prompt
    act(() => result.current.onChange("prompt", "my-prompt"))
    expect(result.current.values.prompt).toBe("my-prompt")
    // Model swap — new spec still has `prompt` field, so user value survives.
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "cfg" }],
        defaults: { prompt: "default-2", cfg: 7 },
      })
    })
    expect(result.current.values.prompt).toBe("my-prompt") // preserved
    expect(result.current.values.cfg).toBe(7)               // new default seeded
    expect(result.current.values.steps).toBeUndefined()      // dropped field removed
  })
  it("preserveAcrossSwap=false: user values are wiped on swap (only defaults)", () => {
    const { result } = renderHook(() =>
      useFormController({ model: "x", service: "s", preserveAcrossSwap: false }),
    )
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "steps" }],
        defaults: { prompt: "p1", steps: 10 },
      })
    })
    act(() => result.current.onChange("prompt", "user-edited"))
    expect(result.current.values.prompt).toBe("user-edited")
    // Swap
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "steps" }],
        defaults: { prompt: "p2", steps: 20 },
      })
    })
    // preserveAcrossSwap=false → only defaults; user edit wiped
    expect(result.current.values.prompt).toBe("p2")
    expect(result.current.values.steps).toBe(20)
  })
})

describe("useFormController — onChange", () => {
  it("updates a single field without disturbing others", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    act(() => {
      onSpecCb!({
        fields: [{ name: "a" }, { name: "b" }],
        defaults: { a: 1, b: 2 },
      })
    })
    act(() => result.current.onChange("a", 99))
    expect(result.current.values).toEqual({ a: 99, b: 2 })
  })
  it("can add a field that wasn't in defaults", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    act(() => result.current.onChange("custom", "value"))
    expect(result.current.values.custom).toBe("value")
  })
})

describe("useFormController — setValues (bulk)", () => {
  it("direct setter is exposed for bulk updates", () => {
    const { result } = renderHook(() => useFormController({ model: "x", service: "s" }))
    act(() => result.current.setValues({ foo: 1, bar: 2 }))
    expect(result.current.values).toEqual({ foo: 1, bar: 2 })
  })
})

describe("useFormController — payload()", () => {
  it("passes model, values, service, and allowedFields (from spec.fields)", () => {
    mockSpec = {
      model: "z-image", form: "form_generate", genre: "image", service: "comfyui",
      label: "Z", fields: [{ name: "prompt", type: "textarea" }, { name: "steps", type: "number" }],
      schema_groups: [], features: {}, guide: null, defaults: {},
    }
    const { result } = renderHook(() => useFormController({ model: "z-image", service: "comfyui" }))
    act(() => {
      onSpecCb!({
        fields: [{ name: "prompt" }, { name: "steps" }],
        defaults: { prompt: "hi", steps: 5 },
      })
    })
    act(() => result.current.onChange("steps", 10))
    act(() => { result.current.payload() })
    expect(buildPayloadMock).toHaveBeenCalledTimes(1)
    const [m, v, extra, allowed] = buildPayloadMock.mock.calls[0]
    expect(m).toBe("z-image")
    expect(v).toEqual({ prompt: "hi", steps: 10 })
    expect(extra).toMatchObject({ service: "comfyui" })
    expect(allowed).toBeInstanceOf(Set)
    expect([...(allowed as Set<string>)]).toEqual(["prompt", "steps"])
  })
  it("extra arg merges ON TOP of service (caller can override service)", () => {
    const { result } = renderHook(() => useFormController({ model: "m", service: "default-svc" }))
    act(() => result.current.payload({ foo: "bar" }))
    const extra = buildPayloadMock.mock.calls[0][2] as Record<string, unknown>
    expect(extra).toMatchObject({ service: "default-svc", foo: "bar" })
  })
  it("payload is stable across renders when nothing changes (memoized)", () => {
    const { result, rerender } = renderHook(() => useFormController({ model: "m", service: "s" }))
    const before = result.current.payload
    rerender()
    // Same deps (model/values/service/spec) → same fn reference
    expect(result.current.payload).toBe(before)
  })
})
