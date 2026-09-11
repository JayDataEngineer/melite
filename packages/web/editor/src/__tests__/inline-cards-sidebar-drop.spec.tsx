/**
 * InlineFlowCards — the DSH asset-drop surface (2026-08-22).
 *
 * The DSH "Melite Assets" right-sidebar tab drags TWO payloads onto the chat
 * cards: model tiles (capability MIME → an action card) and MADE-MEDIA
 * tiles (asset MIME {url, type} → an Ops input card). The canvas has
 * spoken both since 2026-08-08/09; the chat grid now does too — this file
 * pins the chat-side contract:
 *
 * 1. capability drop → addStage(kind from payload) + auto-open (focus).
 * 2. asset drop, ACCEPTED type → an Image/Video/Audio Ops input card
 *    seeded with params.source = the artifact url.
 * 3. asset drop, REJECTED type (outside input accepts) → HARD FAIL toast,
 *    NO stage — never a silent swallow (canvas parity).
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, cleanup, fireEvent } from "@testing-library/react"
import { createElement, StrictMode } from "react"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ families: {}, capabilities: {} }) }),
  apiJson: vi.fn().mockResolvedValue({ families: {}, capabilities: {} }),
}))

import { TooltipProvider } from "@melite/ui/tooltip"
import { primeCatalog } from "@melite/catalog"
import type { Catalog } from "@melite/catalog"
import { ASSET_DRAG_MIME, useToastStore } from "@melite/ui"
import { InlineFlowCards } from "../surfaces/flow/InlineFlowCards"
import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { CAPABILITY_DRAG_MIME } from "@melite/formats"
import type { BackendDraft } from "@melite/contracts"

const CAP_MIME = CAPABILITY_DRAG_MIME

function strictRender(el: React.ReactElement) {
  return render(createElement(StrictMode, null, createElement(TooltipProvider, null, el)))
}

function makeDraft(intent: string): BackendDraft {
  return {
    draft_id: `draft_${Math.random().toString(36).slice(2)}`,
    intent,
    stages: [{
      id: "s0",
      title: "Generate",
      kind: "generation",
      service: "z-image",
      params: { prompt: intent },
      inputs: [],
      provenance: "agent",
    }],
    status: "ready" as const,
    createdAt: Date.now(),
    completedAt: null,
  }
}

/** A dataTransfer stub carrying ONE typed payload (jsdom has no DTX). */
function dtWith(mime: string, data: string) {
  return {
    types: [mime],
    getData: (m: string) => (m === mime ? data : ""),
    dropEffect: "none",
  }
}

function dropOn(el: Element, mime: string, data: string) {
  fireEvent.drop(el, { dataTransfer: dtWith(mime, data) })
}

beforeEach(async () => {
  cleanup()
  useAgentFlowStore.getState().clear()
  for (const t of [...(useToastStore.getState().toasts ?? [])]) {
    useToastStore.getState().removeToast(t.id)
  }
  // The input family declares the ingest vocabulary the gate projects
  // against (the catalog is the SSOT — prime it, never hardcode in src).
  primeCatalog({
    families: { input: { accepts: ["image", "video", "audio"] } },
    models: {},
    capabilities: null,
    engine_order: null,
    quant_order: null,
    input_vocabulary: null,
  } as unknown as Catalog)
  await useAgentFlowStore.getState().hydrateDraft(makeDraft("a mountain at dawn"))
})

describe("InlineFlowCards — DSH sidebar drop surface", () => {
  it("a capability drop (model tile) lands an action card", async () => {
    const r = strictRender(createElement(InlineFlowCards))
    const host = r.container.querySelector("[data-flow-instance]")
    expect(host).toBeTruthy()
    dropOn(host!, CAP_MIME, JSON.stringify({
      service: "z-image", title: "Z-Image", params: { prompt: "from the tab" }, kind: "generation", capId: "z-image",
    }))
    await vi.waitFor(() => {
      expect(useAgentFlowStore.getState().flow?.stages.length).toBe(2)
    })
    const added = useAgentFlowStore.getState().flow?.stages[1]
    expect(added?.service).toBe("z-image")
    expect(added?.title).toBe("Z-Image")
    expect((added?.params as Record<string, unknown>).prompt).toBe("from the tab")
  })

  it("a made-media drop (asset MIME, accepted type) lands an Image Ops input card", async () => {
    const r = strictRender(createElement(InlineFlowCards))
    const host = r.container.querySelector("[data-flow-instance]")!
    const url = "/v1/assets/runs/rid1/generate_image_rid1_z-image_output.png"
    dropOn(host, ASSET_DRAG_MIME, JSON.stringify({ url, type: "image" }))
    await vi.waitFor(() => {
      expect(useAgentFlowStore.getState().flow?.stages.length).toBe(2)
    })
    const added = useAgentFlowStore.getState().flow?.stages[1]
    expect(added?.kind).toBe("input")
    expect(added?.title).toBe("Image Ops")
    expect((added?.params as Record<string, unknown>).source).toBe(url)
  })

  it("a made-media drop with a REJECTED type hard-fails (toast, no stage)", async () => {
    const r = strictRender(createElement(InlineFlowCards))
    const host = r.container.querySelector("[data-flow-instance]")!
    dropOn(host, ASSET_DRAG_MIME, JSON.stringify({ url: "/v1/assets/runs/rid1/out.glb", type: "glb" }))
    // No stage appears — the gate rejected it before addStage.
    await new Promise((res) => setTimeout(res, 60))
    expect(useAgentFlowStore.getState().flow?.stages.length).toBe(1)
    // ...and the failure SURFACED (toast), never silently swallowed.
    const toasts = useToastStore.getState().toasts ?? []
    expect(toasts.some((t) => String(t.message).includes("glb"))).toBe(true)
  })
})
