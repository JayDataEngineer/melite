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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  // the served JSON, read back as the wire record (the same parse the
  // browser side performs — the spec type is the EMIT side)
  const wire = JSON.parse(JSON.stringify(body)) as Record<string, unknown>
  vi.stubGlobal("fetch", (url: unknown) => {
    if (typeof url === "string" && url.startsWith("/v1/form-spec")) {
      return Promise.resolve(new Response(
        JSON.stringify(wire),
        { headers: { "content-type": "application/json" } },
      ))
    }
    return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 })
    )
  })
  return wire
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
  it("ARM A — THE PRESS LANDS: + box → picker → leaf posture switch → Add → the bench door receives the edit bag", async () => {
    await serveReal()
    const saved: Array<Record<string, unknown>> = []
    mountStudio(saved)
    // THE ONE DOOR (2026-11-16): the mod system's entry is the +
    // square and the kind picker — the outer chip row is deleted.
    // The posture press is the SAME gesture, seated INSIDE the leaf.
    const plusBox = await waitFor(
      () => {
        const el = document.querySelector('[data-subcard-add="mod"]')
        assert.ok(el, "the + box must render")
        return el
      },
      { timeout: 3000 },
    )
    fireEvent.click(plusBox)
    fireEvent.click(await screen.findByText("Video edit"))
    const posture = await screen.findByRole("button", { name: "Repair a region" })
    fireEvent.click(posture)
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

describe("the from-flow kind filter (the real thread, not the copy — seat-kind F1's demanded reshape)", () => {
  // each seat gets its own fresh mount: the picker's open replaces
  // the leaf's square subtree, so one arm cannot walk two doors
  const openMaskPicker = async (): Promise<HTMLElement> => {
    const plusBox = await waitFor(() => {
      const el = document.querySelector('[data-subcard-add="mod"]')
      assert.ok(el, "the + box must render")
      return el
    }, { timeout: 3000 })
    fireEvent.click(plusBox)
    fireEvent.click(await screen.findByText("Video edit"))
    fireEvent.click(await screen.findByRole("button", { name: "Static mask pass" }))
    const maskSeat = await waitFor(() => {
      const sq = Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
        .find((s) => (s.getAttribute("aria-label") ?? "").includes("Mask PNG"))
      assert.ok(sq, "the static-mask leaf carries the Mask PNG seat")
      return sq
    }, { timeout: 3000 })
    fireEvent.click(maskSeat)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const sub = await screen.findByText("The other stages’ latest outputs (image)")
    const dlg = sub.closest("[role='dialog']")
    assert.ok(dlg, "the from-flow picker dialog renders")
    return dlg as HTMLElement
  }

  it("ARM E — THE MASK SEAT OFFERS ONLY ITS KIND: a staged .png rides, a staged .mp4 never does", async () => {
    await serveReal()
    render(
      <VideoTimelineStudio
        stageId="s_4" cardName="h3-timeline"
        row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params: TWO }}
        runStatus="" onPatch={() => {}} onRun={() => {}}
        onStop={() => {}} onRemove={() => {}} onSurface={() => {}}
        upstream={[
          { id: "u1", title: "mask.png", url: "/melite-media/runs/r9/img/mask.png" },
          { id: "u2", title: "clip.mp4", url: "/melite-media/runs/r9/vid/clip.mp4" },
        ]}
        runId={null}
      />,
    )
    const dialog = await openMaskPicker()
    const face = dialog.textContent ?? ""
    assert.ok(face.includes("mask.png"), "the image artifact is offered to the image seat")
    assert.ok(!face.includes("clip.mp4"), "the staged video is NEVER offered to the image seat — the thread filters by the seat's file kind")
  })

  it("ARM F — THE VIDEO SEAT KEEPS ITS OWN KIND: the .mp4 rides, the .png never does", async () => {
    await serveReal()
    render(
      <VideoTimelineStudio
        stageId="s_4" cardName="h3-timeline"
        row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params: TWO }}
        runStatus="" onPatch={() => {}} onRun={() => {}}
        onStop={() => {}} onRemove={() => {}} onSurface={() => {}}
        upstream={[
          { id: "u1", title: "mask.png", url: "/melite-media/runs/r9/img/mask.png" },
          { id: "u2", title: "clip.mp4", url: "/melite-media/runs/r9/vid/clip.mp4" },
        ]}
        runId={null}
      />,
    )
    const plusBox = await waitFor(() => {
      const el = document.querySelector('[data-subcard-add="mod"]')
      assert.ok(el, "the + box must render")
      return el
    }, { timeout: 3000 })
    fireEvent.click(plusBox)
    fireEvent.click(await screen.findByText("Video edit"))
    await screen.findByRole("button", { name: "Repair a region" })
    const clipSeat = await waitFor(() => {
      const sq = Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
        .find((s) => (s.getAttribute("aria-label") ?? "").includes("Source clip"))
      assert.ok(sq, "the edit leaf carries the Source clip seat")
      return sq
    }, { timeout: 3000 })
    fireEvent.click(clipSeat)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const dialog = (await screen.findByText(/latest outputs/i)).closest("[role='dialog']") as HTMLElement
    const face = dialog.textContent ?? ""
    assert.ok(face.includes("clip.mp4"), "the video artifact is offered to the video seat")
    assert.ok(!face.includes("mask.png"), "the staged image never rides the video seat")
  })
})
