/**
 * ProvenanceBadge — the agent-generated marker contract.
 *
 * BACKEND CONTRACT: backend/core/ui/list_filter_schema.py :: Provenance.
 * The closed vocabulary is {agent, user, imported}. This test pins:
 *   1. agent    → renders (Sparkles icon, the marker the operator asked for)
 *   2. imported → renders (Download icon, for past-run hydration)
 *   3. user     → renders NOTHING (the silent default — user is the baseline)
 *   4. undefined→ renders NOTHING (graceful rollout — old call sites unaffected)
 *   5. invalid  → renders NOTHING (defensive against untrusted JSON)
 *
 * The schema-side vocabulary is pinned by tests/unit/test_list_filter_schema.py;
 * together the two tests close the loop between pydantic and the UI.
 */
import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { screen } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

import { ProvenanceBadge } from "@melite/ui/ProvenanceBadge"
import { PROVENANCE_VALUES, isProvenance } from "@melite/contracts"
afterEach(cleanup)

describe("ProvenanceBadge — the agent-generated marker", () => {
  it("renders the agent marker (the operator's explicit ask)", () => {
    renderWithTooltip(<ProvenanceBadge provenance="agent" />)
    expect(screen.getByLabelText("Agent")).toBeTruthy()
    expect(screen.getByLabelText("Agent").textContent).toContain("Agent")
  })

  it("renders the imported marker for past-run hydration", () => {
    renderWithTooltip(<ProvenanceBadge provenance="imported" />)
    expect(screen.getByLabelText("Imported")).toBeTruthy()
  })

  it("renders NOTHING for user — user-authored is the silent default", () => {
    const { container } = renderWithTooltip(<ProvenanceBadge provenance="user" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders NOTHING when provenance is unset — graceful rollout", () => {
    // Existing call sites that haven't been wired yet must render unchanged.
    const { container } = renderWithTooltip(<ProvenanceBadge provenance={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders NOTHING for an invalid value — defensive against drift", () => {
    // If a past run carries a typo like "ai" instead of "agent", the badge
    // silently degrades rather than crashing the card.
    const { container } = renderWithTooltip(
      <ProvenanceBadge provenance={"ai" as never} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("compact mode renders icon-only (no label) — for dense tiles", () => {
    renderWithTooltip(<ProvenanceBadge provenance="agent" compact />)
    const badge = screen.getByLabelText("Agent")
    // The label text node should NOT be present in compact mode.
    expect(badge.textContent).not.toContain("Agent")
  })
})

describe("provenance vocabulary — the closed enum mirror", () => {
  it("matches the backend pydantic enum exactly (no drift)", () => {
    // If this set changes, the backend enum in
    // backend/core/ui/list_filter_schema.py :: Provenance MUST change in the
    // same edit. The schema test pins the backend side.
    expect(PROVENANCE_VALUES).toEqual(["agent", "user", "imported"])
  })

  it("isProvenance guards untrusted input", () => {
    expect(isProvenance("agent")).toBe(true)
    expect(isProvenance("imported")).toBe(true)
    expect(isProvenance("user")).toBe(true)
    expect(isProvenance("ai")).toBe(false)
    expect(isProvenance(undefined)).toBe(false)
    expect(isProvenance(null)).toBe(false)
    expect(isProvenance(123)).toBe(false)
  })
})
