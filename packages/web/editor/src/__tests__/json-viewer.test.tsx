
/**
 * JsonViewer + AssetMedia JSON branch (2026-08-25 bug 3: ".json is
 * unsupported type for viewing").
 *
 * Contract pinned here:
 *   • a .json asset renders the JsonViewer in dialog mode — NEVER the
 *     "Unsupported asset type" fallback;
 *   • valid JSON is pretty-printed (2-space indent) with a Copy button;
 *   • invalid JSON shows the RAW bytes with an honest "not valid JSON" hint;
 *   • fetch failure shows an explicit error state, never a fake body.
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import type { MediaAsset } from "../surfaces/library/media"

let copyTextMock: (text: string) => Promise<boolean> = vi.fn(async () => true)
vi.mock("@melite/ui", () => ({ copyText: (t: string) => copyTextMock(t) }))

import { JsonViewer } from "../surfaces/assets/JsonViewer"
import { AssetMedia } from "../surfaces/assets/AssetMedia"

function jsonAsset(url: string): MediaAsset {
  return {
    id: url,
    runId: "run-1",
    name: url.split("/").pop() ?? "x.json",
    category: "other",
    url,
    type: "other",
    size: 100,
    prompt: "",
    thumbnail: "",
    createdAt: 0,
    runStatus: "completed",
    runParams: {},
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  copyTextMock = vi.fn(async () => true)
})

describe("JsonViewer", () => {
  it("pretty-prints valid JSON with a Copy button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"b":1,"a":[2,3]}')))
    render(<JsonViewer url="/media/x.json" />)
    await waitFor(() => expect(screen.getByText(/pretty-printed/)).toBeTruthy())
    // 2-space pretty print: keys re-ordered + indented
    const pre = document.querySelector("pre")!
    expect(pre.textContent).toContain('"a": [')
    expect(pre.textContent).toContain('"b": 1')
    expect(screen.getByRole("button", { name: "Copy JSON" })).toBeTruthy()
    expect(copyTextMock).not.toHaveBeenCalled() // copy only on click
  })

  it("shows RAW bytes with an honest hint for invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json at all {")))
    render(<JsonViewer url="/media/bad.json" />)
    await waitFor(() => expect(screen.getByText("raw (not valid JSON)")).toBeTruthy())
    expect(document.querySelector("pre")!.textContent).toBe("not json at all {")
  })

  it("shows an explicit error state when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })))
    render(<JsonViewer url="/media/missing.json" />)
    await waitFor(() => expect(screen.getByText("Could not load JSON")).toBeTruthy())
    expect(screen.getByText("HTTP 404")).toBeTruthy()
  })

  it("truncates oversized payloads with a notice (no multi-MB parse)", async () => {
    const big = "[" + "1,".repeat(1_500_000) + "1]" // > 2MB of raw text
    vi.stubGlobal("fetch", vi.fn(async () => new Response(big)))
    render(<JsonViewer url="/media/huge.json" />)
    await waitFor(() => expect(screen.getByText(/showing first 2 MB/)).toBeTruthy())
    const pre = document.querySelector("pre")!
    expect((pre.textContent ?? "").length).toBeLessThanOrEqual(2 * 1024 * 1024)
  })
})

describe("AssetMedia JSON branch (dialog mode)", () => {
  it("renders the JsonViewer for a .json asset — never the unsupported fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"ok":true}')))
    render(<AssetMedia asset={jsonAsset("/media/flow.json")} mode="full" />)
    await waitFor(() => expect(screen.getByText(/pretty-printed/)).toBeTruthy())
    expect(screen.queryByText("Unsupported asset type")).toBeNull()
  })
})
