// pluginKinds — the kinds lane's frontend gate (the fourth lane,
// 2026-08-19). Pins:
//   1. syncPluginKinds registers the wire's kinds (flags served by
//      kindDef; icon NAME resolved to a component via the closed map).
//   2. The diff disposes gone kinds — a flip off reads UNKNOWN (the
//      fail-safe) — and does NOT churn unchanged kinds.
//   3. The registry version bumps on register AND dispose (the
//      useSyncExternalStore plumbing behind live flips).
//   4. A duplicate on the wire is logged, never thrown (sync cannot
//      brick boot).
import { describe, it, expect, vi, afterEach } from "vitest"
import { act, render } from "@testing-library/react"
import {
  getCardKindsVersion,
  kindDef,
} from "@melite/slots"
import {
  syncPluginKinds,
  useCardKindsVersion,
} from "@/surfaces/flow/pluginKinds"
import type { KindEntry } from "@/rpc/editorApi"

const entry = (over: Partial<KindEntry>): KindEntry => ({
  kind: "gate-kind",
  runnable: true,
  executable: true,
  formSpec: false,
  compound: false,
  opensStudio: false,
  badgeTone: "default",
  ...over,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("kinds lane frontend (pluginKinds)", () => {
  it("sync registers the wire's kinds — flags + icon component", () => {
    syncPluginKinds([
      entry({ kind: "gate-mux", runnable: false, executable: false }),
      entry({ kind: "gate-boxed", icon: "Box" }),
    ])
    expect(kindDef("gate-mux").runnable).toBe(false)
    expect(kindDef("gate-mux").executable).toBe(false)
    expect(kindDef("gate-boxed").icon).toBeTruthy()
    expect(kindDef("gate-boxed").badgeTone).toBe("default")
    syncPluginKinds([])
  })

  it("the diff disposes gone kinds — a flip off reads UNKNOWN (fail-safe)", () => {
    syncPluginKinds([entry({ kind: "gate-transient" })])
    expect(kindDef("gate-transient").runnable).toBe(true)
    syncPluginKinds([])
    const gone = kindDef("gate-transient")
    expect(gone.kind).toBe("(unknown)")
    expect(gone.runnable).toBe(false)
    expect(gone.formSpec).toBe(false)
  })

  it("an unchanged kind is NOT re-registered (no dispose churn)", () => {
    syncPluginKinds([entry({ kind: "gate-stable" })])
    const v1 = getCardKindsVersion()
    syncPluginKinds([entry({ kind: "gate-stable" })])
    expect(getCardKindsVersion()).toBe(v1)
    syncPluginKinds([])
  })

  it("the version bumps on register and on dispose — the store organ", () => {
    const v0 = getCardKindsVersion()
    syncPluginKinds([entry({ kind: "gate-ver" })])
    const v1 = getCardKindsVersion()
    expect(v1).toBeGreaterThan(v0)
    syncPluginKinds([])
    expect(getCardKindsVersion()).toBeGreaterThan(v1)
  })

  it("a duplicate on the wire is logged, never thrown", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    const e = entry({ kind: "gate-dup" })
    expect(() => syncPluginKinds([e, { ...e }])).not.toThrow()
    expect(err).toHaveBeenCalled()
    expect(kindDef("gate-dup").runnable).toBe(true)
    syncPluginKinds([])
  })

  it("useCardKindsVersion re-renders a subscriber on a flip", () => {
    let seen = 0
    let renders = 0
    const Probe = (): null => {
      seen = useCardKindsVersion()
      renders++
      return null
    }
    render(<Probe />)
    const before = renders
    act(() => {
      syncPluginKinds([entry({ kind: "gate-live" })])
    })
    expect(renders).toBeGreaterThan(before)
    expect(seen).toBe(getCardKindsVersion())
    act(() => {
      syncPluginKinds([])
    })
  })
})
