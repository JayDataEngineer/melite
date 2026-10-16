/**
 * VideoTimelineStudio gap rows (2026-09-19) — the knob-fields walk
 * with a SERVED form-spec (useFormSpec resolved): the served fields
 * land in the call card's knob fold, ghosting the schema's own
 * defaults. Without the spec the walk returns {} (the existing
 * specs pin that lane); THIS file pins the served lane through the
 * studio mount: fetch → select the bar clip → the fold owns the
 * served rows. Every row asserts DOM truth — never expect(true).
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { carrier } from "../src/card.ts"

// THE SERVED BYTES — schemastery's own serialization of the card's
// carrier (the same walk the lane serves; fieldsOfEnvelope reads it
// in the tenant). model_defaults ride empty: the fold ghosts the
// schema floor.
const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()

function serveReal(): void {
  vi.stubGlobal("fetch", (url: unknown) => {
    if (typeof url === "string" && url.startsWith("/v1/form-spec")) {
      return Promise.resolve(new Response(
        JSON.stringify({ model: "h3-timeline", schema: REAL_ENV, model_defaults: {} }),
        { headers: { "content-type": "application/json" } },
      ))
    }
    return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 }))
  })
}

const TWO = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80 },
    { text: "two", start_frame: 80, end_frame: 168 },
  ],
  fps: 24,
}

describe("the knob fold with a served form-spec", () => {
  it("selecting a call renders the fold over the served fields (schema defaults ghost)", async () => {
    serveReal()
    const saved: Record<string, unknown>[] = []
    render(
      // THE OWNER MOUNT (the one-truth currency, 2026-10-27).
      <VideoTimelineStudio
        stageId="s_4"
        cardName="h3-timeline"
        row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params: TWO }}
        runStatus=""
        onPatch={(p: Record<string, unknown>) => { saved.push(p) }}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        onSurface={() => {}}
        upstream={[]}
        runId={null}
      />,
    )
    // global rail first (the mode-switch contract still holds served)
    assert.ok(screen.getByTestId("tl-run-panel"))
    // select the first bar clip → the rail swaps to the call's editor
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.ok(document.body.querySelector('[data-call-card="0"]'))
    // the DisclosureRow law (pattern campaign S2): closed folds hold
    // NO hidden DOM — open the knob row before reading its fields
    fireEvent.click(screen.getByText(studioCopy.knobsHead))
    // the fold owns the SERVED steps row (the regolded schema
    // default 6 ghosts the blank — 2026-10-16 upstream-parity
    // audit; the 12 carried no receipt)
    const steps = await screen.findByLabelText("Call 0 knob: steps") as HTMLInputElement
    assert.equal(steps.placeholder, "6")
    expect(steps.placeholder).toBe("6")
    vi.unstubAllGlobals()
  })
})
