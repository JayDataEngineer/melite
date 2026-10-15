// @vitest-environment happy-dom
// construct-card.spec.tsx — THE FLOW LINK (operator 2026-11-05:
// "when it edits a flow, the clickable link opens the right sidebar
// flow view"): a melite_construct call edits THE SHARED BENCH (no
// draft to card), so its chat face is the verdict title plus the
// clickable link that opens the edited flow's bench address through
// the shell's navigation face. Three laws: (1) the link derives from
// the NATIVE channel only (presentationMeta {bench} — never prose,
// never args); (2) a block without meta renders title-only, never a
// dead link; (3) without the shell face the link does not render,
// and a shell refusal stays put — never a throw. The control rides
// the catalog Button (ghost sm + the link-read class — never a
// hand-rolled seat: the chrome canon; no title: the tip canon).
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { ConstructCard, constructTitleOf, parseConstructBlock } from "../src/client/construct-card.tsx"
import type { ToolCallBlockView } from "../src/client/types.ts"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** A settled construct result block (presentationMeta rides meta). */
function settled(over: Record<string, unknown> = {}): ToolCallBlockView {
  return {
    kind: "tool-result",
    callId: "c1",
    call: { name: "melite_construct", argsRaw: JSON.stringify({ verb: "patch", stage: "s1" }) },
    isError: false,
    meta: { bench: "s_chat7" },
    content: [{ type: "text", text: "bench patch → rev 6" }],
    ...over,
  } as unknown as ToolCallBlockView
}

/** A running (unsettled) construct call — no meta exists yet. */
function running(argsRaw: string): ToolCallBlockView {
  return { callId: "c1", name: "melite_construct", argsRaw } as unknown as ToolCallBlockView
}

describe("the flow link (ConstructCard × the inject share)", () => {
  test("a settled edit links the conversation's flow — click opens its bench address", () => {
    const seen: string[] = []
    render(h(ConstructCard, {
      block: settled(),
      openSurface: (address) => { seen.push(address); return true },
    }))
    expect(screen.getByText("Bench patch · s1")).toBeTruthy()
    const link = screen.getByRole("button", { name: "open flow" })
    fireEvent.click(link)
    // the literal wire address — the Cards tab's bench arm for this conversation
    expect(seen).toEqual(["dsh-resource://cards/bench/s_chat7"])
  })

  test("the main bench links the bare bench arm", () => {
    const seen: string[] = []
    render(h(ConstructCard, {
      block: settled({ meta: { bench: "main" } }),
      openSurface: (address) => { seen.push(address); return true },
    }))
    fireEvent.click(screen.getByRole("button", { name: "open flow" }))
    expect(seen).toEqual(["dsh-resource://cards/bench/main"])
  })

  test("a refused edit keeps the refusal's voice AND the link — the flow is where the operator looks next", () => {
    const seen: string[] = []
    render(h(ConstructCard, {
      block: settled({
        isError: true,
        meta: { bench: "s_chat7", error: "bench moved: rev is 7, caller held 6" },
        content: [{ type: "text", text: "melite_construct REFUSED: bench moved: rev is 7, caller held 6" }],
      }),
      openSurface: (address) => { seen.push(address); return true },
    }))
    // the refusal reads as a refusal, never a clean verdict
    expect(screen.getByRole("alert").textContent).toContain("bench moved")
    fireEvent.click(screen.getByRole("button", { name: "open flow" }))
    expect(seen).toEqual(["dsh-resource://cards/bench/s_chat7"])
  })

  test("a refused edit with no text content still badges (never a silent clean face)", () => {
    render(h(ConstructCard, {
      block: settled({ isError: true, content: [] }),
      openSurface: () => true,
    }))
    expect(screen.getByRole("alert").textContent).toContain("draft failed")
  })

  test("a block without meta renders title-only — never a dead link (pre-projector logs)", () => {
    render(h(ConstructCard, {
      block: settled({ meta: undefined }),
      openSurface: () => true,
    }))
    expect(screen.getByText("Bench patch · s1")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "open flow" })).toBeNull()
  })

  test("junk meta renders title-only — a non-object or keyless meta is no address", () => {
    for (const meta of ["s_chat7", ["s_chat7"], { draft_id: "d1" }, { bench: "" }, { bench: 7 }, null]) {
      cleanup()
      render(h(ConstructCard, {
        block: settled({ meta }),
        openSurface: () => true,
      }))
      expect(screen.queryByRole("button", { name: "open flow" })).toBeNull()
    }
  })

  test("without the shell face the link does not render (the openMedia precedent)", () => {
    render(h(ConstructCard, { block: settled() }))
    expect(screen.getByText("Bench patch · s1")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "open flow" })).toBeNull()
  })

  test("a shell refusal stays put — never a throw", () => {
    render(h(ConstructCard, {
      block: settled(),
      openSurface: () => false,
    }))
    fireEvent.click(screen.getByRole("button", { name: "open flow" }))
    // the card stands (the refusal is the shell's answer, not a crash)
    expect(screen.getByText("Bench patch · s1")).toBeTruthy()
  })

  test("a running call shows the verdict title with no link (no meta exists yet)", () => {
    render(h(ConstructCard, {
      block: running(JSON.stringify({ verb: "add_stage", card: "image-gen" })),
      openSurface: () => true,
    }))
    expect(screen.getByText("Bench add_stage · image-gen")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "open flow" })).toBeNull()
  })

  test("corrupt args badge but keep the meta link — the address never comes from prose", () => {
    const seen: string[] = []
    render(h(ConstructCard, {
      block: settled({ call: { name: "melite_construct", argsRaw: "{oops" } }),
      openSurface: (address) => { seen.push(address); return true },
    }))
    expect(screen.getByText("Bench ?")).toBeTruthy()
    expect(screen.getByText("args unparseable — corrupted call record")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "open flow" }))
    expect(seen).toEqual(["dsh-resource://cards/bench/s_chat7"])
  })

  test("a settled call with no call head reads empty args (window-truncated logs)", () => {
    render(h(ConstructCard, {
      block: settled({ call: null, meta: undefined }),
      openSurface: () => true,
    }))
    expect(screen.getByText("Bench ?")).toBeTruthy()
  })

  test("a call head without args text reads bare (mid-stream truncation, never malformed)", () => {
    render(h(ConstructCard, {
      block: settled({ call: { name: "melite_construct" }, meta: undefined }),
      openSurface: () => true,
    }))
    expect(screen.getByText("Bench ?")).toBeTruthy()
    expect(screen.queryByText("args unparseable — corrupted call record")).toBeNull()
  })

  test("a running call with no args yet reads bare (the first frame, never malformed)", () => {
    render(h(ConstructCard, {
      block: { callId: "c1", name: "melite_construct" } as unknown as ToolCallBlockView,
      openSurface: () => true,
    }))
    expect(screen.getByText("Bench ?")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "open flow" })).toBeNull()
  })
})

describe("constructTitleOf — the host presentCall wording, mirrored", () => {
  test("empty args read bare", () => {
    expect(constructTitleOf("")).toEqual({ title: "Bench ?", malformedArgs: false })
  })

  test("verb + stage, verb + card, bare verb", () => {
    expect(constructTitleOf(JSON.stringify({ verb: "patch", stage: "s1" })).title).toBe("Bench patch · s1")
    expect(constructTitleOf(JSON.stringify({ verb: "add_stage", card: "image-gen" })).title).toBe("Bench add_stage · image-gen")
    expect(constructTitleOf(JSON.stringify({ verb: "read" })).title).toBe("Bench read")
  })

  test("an empty stage falls to the card; both empty read bare", () => {
    expect(constructTitleOf(JSON.stringify({ verb: "patch", stage: "", card: "c" })).title).toBe("Bench patch · c")
    expect(constructTitleOf(JSON.stringify({ verb: "patch", stage: "", card: "" })).title).toBe("Bench patch")
  })

  test("non-string seats fall back (never a throw on wire junk)", () => {
    expect(constructTitleOf(JSON.stringify({ verb: 7, stage: 7, card: 7 })).title).toBe("Bench ?")
    expect(constructTitleOf("{oops")).toEqual({ title: "Bench ?", malformedArgs: true })
  })
})

describe("parseConstructBlock — the native-channel edges", () => {
  test("a running block parses title-only", () => {
    expect(parseConstructBlock(running(JSON.stringify({ verb: "validate" })))).toEqual({
      title: "Bench validate", malformedArgs: false, bench: null, settled: false, isError: false, errorLine: null,
    })
  })

  test("non-text content parts never voice (the error line skips them)", () => {
    const parsed = parseConstructBlock(settled({
      isError: true,
      content: [{ type: "image" }, null, "prose", { text: 7 }, { text: "" }, { text: "second\nline" }],
    }))
    expect(parsed.errorLine).toBe("second")
  })

  test("an error block with no content carries no line (the badge falls back)", () => {
    const parsed = parseConstructBlock(settled({ isError: true, content: undefined }))
    expect(parsed.errorLine).toBeNull()
  })

  test("a single-line refusal voices whole (no newline to cut)", () => {
    const parsed = parseConstructBlock(settled({
      isError: true,
      content: [{ type: "text", text: "melite_construct REFUSED: kablam" }],
    }))
    expect(parsed.errorLine).toBe("melite_construct REFUSED: kablam")
  })
})
