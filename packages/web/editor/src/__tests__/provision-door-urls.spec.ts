// provision-door-urls — the 2026-09-06 SOMA-skin 404 class wall:
// studio viewer assets point at DECLARED provisions (the
// /v1/models/<family>/provisions/<name> door — mount-streamed or
// on-demand acquired through the comfy-mcp rail), NEVER at
// vite-public blobs (a committed binary drifts out of the tree; a
// declared row is sha-pinned and auto-provisioned).
import { describe, expect, it } from "vitest"
import { SKIN_URL } from "@melite/formats/somaSkin"

const DOOR = /^\/v1\/models\/[^/]+\/provisions\/[^/]+$/

describe("viewer assets come from provision doors", () => {
  it("the SOMA skin points at the kimodo provision door", () => {
    expect(SKIN_URL).toMatch(DOOR)
    expect(SKIN_URL).toBe(
      "/v1/models/kimodo/provisions/skin_standard.npz")
  })

  it("never a vite-public blob (the 404 class)", () => {
    expect(SKIN_URL.startsWith("/editor/")).toBe(false)
    expect(SKIN_URL.startsWith("/assets/")).toBe(false)
  })
})
