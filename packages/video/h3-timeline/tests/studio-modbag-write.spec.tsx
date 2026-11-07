// THE MOD-BAG WRITE JOURNEY (the modleaf-add journey audit,
// 2026-11-16 — the operator's burn: "literally does nothing after I
// press add"). The death hop the audit named: the leaf's Add commits
// the bag through CardForm's edit verb into Layer A state, and
// serializeLayerA's hand-maintained vocabulary (LAYERA_EMIT_LOOP_KEYS
// + LAYERA_KEY_UNIVERSE) strips it — useShownDoc's canonical no-op
// law then returns BEFORE onSave: no bench write, no op overlay, no
// error, the leaf already closed. Four planes certified the seat
// (declared, served, gated, mounted) while the WRITE died one hop
// downstream of every wall.
//
// This wall rides the REAL tenant mount (VideoTimelineStudio →
// RunRecipeEngine → CardForm → ModifiersSection → the leaf's Add)
// over the REAL served spec body (specBody boots the door's own
// serve), and judges the write BOTH ways: the press must LAND the
// bag on the bench door (ARM A), and the serializer's vocabulary
// must cover every mod kind the serve offers (ARM B — the reverse
// judge: a served kind with no writable seat reds by name). The
// serializer arms pin the value law (verbatim ride, the delete ride)
// and the control keeps the universe closed (a nonsense key still
// strips — the cure is a seat for the declared bags, never an
// anything-goes pass-through).
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";
import { fireEvent, render, screen } from "@testing-library/react";
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx";
import { serializeLayerA, LAYERA_KEY_UNIVERSE, hydrateLayerA } from "../src/ui/studio/docHydrate.ts";
import { specBody } from "../../../harness/melite-tools/src/discovery.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { theService } from "@melite/comfyui-cordis";

const TWO = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80 },
    { text: "two", start_frame: 80, end_frame: 168 },
  ],
  fps: 24,
}

async function serveReal(): Promise<Record<string, unknown>> {
  const body = specBody(theService(), await loadCardDefs(), {
    card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
  })
  vi.stubGlobal("fetch", (url: unknown) => {
    if (typeof url === "string" && url.startsWith("/v1/form-spec")) {
      return Promise.resolve(new Response(
        JSON.stringify(body),
        { headers: { "content-type": "application/json" } },
      ))
    }
    return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 })
    )
  })
  return body as Record<string, unknown>
}

function mountStudio(saved: Array<Record<string, unknown>>): void {
  render(
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
}

describe("the mod bag's write journey (the dead Add)", () => {
  it("ARM A — THE PRESS LANDS: chip → leaf → Add → the bench door receives the edit bag", async () => {
    await serveReal()
    const saved: Array<Record<string, unknown>> = []
    mountStudio(saved)
    // the slice-5 face: the chips render in the rail; one press opens
    // the one leaf in create mode.
    const chip = await screen.findByRole("button", { name: "Repair a region" })
    fireEvent.click(chip)
    const add = await screen.findByRole("button", { name: "Add" })
    fireEvent.click(add)
    // THE LAW: the press states the bag — SOME payload carries the
    // edit kind as an array (the compose door's own arm reads it).
    const withEdit = saved.filter((p) => Array.isArray(p.edit))
    assert.ok(withEdit.length > 0,
      `the Add press must land the edit bag on the bench door — got payloads: ${JSON.stringify(saved)}`)
  })

  it("ARM B — THE REVERSE JUDGE: every served mod kind has a writable Layer A seat", async () => {
    const body = await serveReal()
    const kinds = ((body.features as Record<string, unknown> | undefined)?.modifiers ?? []) as Array<{ param_key?: string }>
    assert.ok(kinds.length > 0, "the served spec offers mod kinds")
    const missing = kinds
      .map((k) => k.param_key ?? "")
      .filter((k) => k !== "" && !LAYERA_KEY_UNIVERSE.has(k))
    assert.deepEqual(missing, [],
      `served mod kinds with no writable Layer A seat — the press dies silently for exactly these: ${missing.join(", ")}`)
  })

  it("ARM C — THE SERIALIZER RIDES THE BAG VERBATIM (undefined = absent, [] = the explicit empty arm, cleared = the delete ride)", () => {
    const bag = [{ mask_source: "region", region_prompt: "fix the handle" }]
    const out = serializeLayerA({ seed: 1, edit: bag } as never)
    assert.deepEqual(out.edit, bag, "a stated bag rides verbatim")
    const empty = serializeLayerA({ seed: 1, edit: [] } as never)
    assert.deepEqual(empty.edit, [], "the explicit empty bag is the operator's off override — it rides, never deletes")
    const cleared = serializeLayerA({ seed: 1 } as never, { seed: 1, edit: bag })
    assert.equal(cleared.edit, null, "a base-carried bag the state cleared emits the door's delete")
    // the hydrate round-trip: a persisted bag re-enters the state (the
    // leaf reopens over what the doc carries — the second save states
    // it again, never orphans it)
    const hydrated = hydrateLayerA({ seed: 1, edit: bag })
    assert.deepEqual((hydrated as unknown as Record<string, unknown>).edit, bag,
      "a persisted bag hydrates back into Layer A")
  })

  it("ARM D — THE CONTROL: the universe stays closed (a nonsense key still strips)", () => {
    const out = serializeLayerA({ seed: 1, nonsense: [{ x: 1 }] } as never)
    assert.equal("nonsense" in out, false,
      "the cure seats the DECLARED mod bags — never an anything-goes pass-through")
  })
})
