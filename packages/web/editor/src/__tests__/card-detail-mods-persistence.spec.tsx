import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useState } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import { stableStringify, isAdditiveNormalization } from "../surfaces/flow/flowStoreHelpers"
import type { CardStage } from "@melite/contracts"
import { primeCatalog, type Catalog } from "@melite/catalog"

const CATALOG: Catalog = {
  families: {},
  models: { "z-image": { family: "z-image", form: "form_generate", label: "Z Image" } },
} as unknown as Catalog

// REAL shape from the served z-image spec (2026-08-18 dump): four kinds,
// lora carries 7 options. image_ops-style zero-option kind included.
vi.mock("../rpc/editorClient", () => {
  const SPEC = {
  defaults: { prompt: "", steps: 28, cfg: 4.5, seed: -1 },
  fields: [
    { name: "prompt", type: "textarea" },
    { name: "steps", type: "number" },
    { name: "cfg", type: "number" },
    { name: "seed", type: "number" },
  ],
  schema_groups: [] as never[],
  features: {
    modifiers: [
      { kind: "lora", label: "LoRA Adapters", cardinality: "list", param_key: "loras", upload_dir: "loras",
        fields: [{ name: "name", type: "string", label: "Adapter" }, { name: "strength", type: "number", label: "Strength" }],
        options: Array.from({ length: 7 }, (_, i): { value: string; label: string } => ({ value: `lora_${i}.safetensors`, label: `lora_${i}.safetensors` })) },
      { kind: "image_ops", label: "Image Ops", cardinality: "list", param_key: "image_ops",
        fields: [{ name: "op", type: "select", label: "Op", options: [] as Array<{ value: string; label: string }> }], options: [] as Array<{ value: string; label: string }> },
    ],
  },
}
  return { editorClient: { getFormSpec: vi.fn().mockResolvedValue(SPEC) } }
})
const renderW = (el: ReactElement) => render(<TooltipProvider>{el}</TooltipProvider>)
const stage: CardStage = {
  id: "s0", title: "Gen", kind: "generation", service: "z-image",
  params: { prompt: "x", steps: 28, cfg: 4.5, seed: -1 },
  inputs: [], inputIndices: [], result: null, status: "pending", meta: {},
}

beforeEach(() => primeCatalog(CATALOG))

describe("MOD add — the full flow", () => {
  it("+ Mod → pick LoRA → select adapter → Add → tile appears + bag committed", async () => {
    const onEditSave = vi.fn()
    renderW(<CardDetailInline stage={stage} upstreams={[]} running={false} actions={{ onEditSave }} />)
    // Spec lands → the + Mod tile appears.
    const addBtn = await waitFor(() => {
      const b = document.querySelector('[data-subcard-add="mod"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    })
    fireEvent.click(addBtn)
    // Kind picker modal (portaled).
    const pick = await waitFor(() => {
      const b = document.querySelector('[data-mod-pick="lora"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    })
    fireEvent.click(pick)
    // SubcardModal create — select the first adapter + Add.
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy())
    // shadcn Select — open the combo and pick lora_0.
    const combo = screen.getByRole("combobox")
    fireEvent.click(combo)
    const opt = await waitFor(() => screen.getByRole("option", { name: /lora_0/ }))
    fireEvent.click(opt)
    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    // THE assertion: the bag now carries the lora.
    await waitFor(() => {
      const last = onEditSave.mock.calls.at(-1)
      expect(last?.[1]).toMatchObject({ loras: [{ id: "lora_0.safetensors", strength: 1.0 }] })
    })
  })

  // ── THE REGRESSION (2026-08-18: "I can click and add, but I can NOT
  // actually see them persist!") ── ParamEditor's draft is a MOUNT
  // SNAPSHOT; its auto-save payload used to carry the snapshot's mod key
  // (`loras: null` — the catalog default). updateStageParams merges
  // {...stage.params, ...params}, so the explicit null WON over the
  // just-committed array and the tile silently vanished ~300ms after the
  // add. The ownership fix: the params editor NEVER writes keys the Mods
  // zone owns (specModifierKeys) — every ParamEditor-originated payload
  // (auto-save, onDraftChange, the Run flush) omits them, and the merge
  // preserves the committed bag.
  it("a ParamEditor edit after a mod add NEVER re-clobbers the committed bag", async () => {
    // The real qwen-int8 wire: the catalog default seeds loras: null.
    const onEditSave = vi.fn()
    // Stateful harness mirroring the store: onEditSave merges into the
    // stage (updateStageParams semantics — {...stage.params, ...params}).
    // This makes the persistence END-TO-END: the committed bag must
    // survive the card's own re-render + every later auto-save.
    let stageState = {
      ...stage,
      params: { prompt: "x", steps: 28, cfg: 4.5, seed: -1, loras: null } as Record<string, unknown>,
    }
    const rerender = { fn: (_s: typeof stage) => {} }
    function Harness() {
      const [, force] = useState(0)
      rerender.fn = (next: typeof stageState) => { stageState = next; force((n) => n + 1) }
      return (
        <CardDetailInline
          stage={stageState}
          upstreams={[]}
          running={false}
          actions={{ onEditSave: (id: string, params: Record<string, unknown>, _svc?: string, opts?: { userEdit?: boolean }) => {
            onEditSave(id, params, _svc, opts)
            // updateStageParams, mirrored EXACTLY (flowRunSlice):
            // merge → no-op guard → additive-normalization swallow
            // UNLESS the commit is a flagged user edit. This is the
            // machinery that used to eat the mod add wholesale.
            const merged = { ...stageState.params, ...params }
            if (stableStringify(merged) === stableStringify(stageState.params)) return
            if (!opts?.userEdit && isAdditiveNormalization(stageState.params, merged)) return
            rerender.fn({ ...stageState, params: merged })
          } }}
        />
      )
    }
    renderW(<Harness />)

    // Add the mod first (+ Mod → LoRA → adapter → Add).
    fireEvent.click(await waitFor(() => {
      const b = document.querySelector('[data-subcard-add="mod"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    }))
    fireEvent.click(await waitFor(() => {
      const b = document.querySelector('[data-mod-pick="lora"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    }))
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy())
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await waitFor(() => screen.getByRole("option", { name: /lora_0/ })))
    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    // The commit landed AND the tile renders from the merged stage.
    await waitFor(() => {
      expect(document.querySelector('[data-subcard="lora-lora_0.safetensors"]')).toBeTruthy()
    })

    // Now the user edits a PARAM (the classic clobber trigger — the
    // debounced auto-save re-fires on every draft change and, pre-fix,
    // shipped the mount snapshot's `loras: null` back over the committed
    // array, silently deleting the tile ~300ms after it appeared).
    const prompt = (await screen.findByLabelText("Prompt")) as HTMLTextAreaElement
    fireEvent.change(prompt, { target: { value: "typed after the mod add" } })
    await waitFor(() => {
      expect(onEditSave.mock.calls.some((c) => (c[1] as Record<string, unknown>).prompt === "typed after the mod add")).toBe(true)
    })

    // THE OWNERSHIP RULE: only SubcardGrid's own commits carry the key
    // (the ARRAY) — no payload ever re-ships `loras: null`.
    for (const call of onEditSave.mock.calls) {
      expect((call[1] as Record<string, unknown>).loras ?? "array").not.toBe(null)
    }
    // THE PERSISTENCE: the tile is still on screen after the param edit's
    // auto-save merged through — the mod survived.
    await waitFor(() => {
      expect(document.querySelector('[data-subcard="lora-lora_0.safetensors"]')).toBeTruthy()
    })
  })

  // ── CASE A — the exact live symptom (2026-08-18: "I CLICK ADD, NOTHING
  // APPEARS! WHERE ARE MY MODS") ── a card whose params carry NO loras key
  // (z-image / krea-2 class — the catalog defaults never seed one). Adding
  // the first mod is PURELY ADDITIVE, and updateStageParams's additive
  // normalization swallow — written for ParamEditor's schema-defaults seed
  // — treated the real commit as a no-op and returned WITHOUT set(): the
  // store never learned the mod, the tile never rendered. Zone commits
  // (SubcardGrid / SlotGrid / attaches) now pass { userEdit: true } and
  // bypass ONLY that swallow; the ParamEditor seeding path keeps it.
  it("adding the FIRST mod to a key-less bag lands — the additive swallow never eats a user edit", async () => {
    const onEditSave = vi.fn()
    let stageState = {
      ...stage,
      params: { prompt: "x", steps: 28, cfg: 4.5, seed: -1 } as Record<string, unknown>,
    }
    const rerender = { fn: (_s: typeof stage) => {} }
    function Harness() {
      const [, force] = useState(0)
      rerender.fn = (next: typeof stageState) => { stageState = next; force((n) => n + 1) }
      return (
        <CardDetailInline
          stage={stageState}
          upstreams={[]}
          running={false}
          actions={{ onEditSave: (id: string, params: Record<string, unknown>, _svc?: string, opts?: { userEdit?: boolean }) => {
            onEditSave(id, params, _svc, opts)
            const merged = { ...stageState.params, ...params }
            if (stableStringify(merged) === stableStringify(stageState.params)) return
            if (!opts?.userEdit && isAdditiveNormalization(stageState.params, merged)) return
            rerender.fn({ ...stageState, params: merged })
          } }}
        />
      )
    }
    renderW(<Harness />)

    fireEvent.click(await waitFor(() => {
      const b = document.querySelector('[data-subcard-add="mod"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    }))
    fireEvent.click(await waitFor(() => {
      const b = document.querySelector('[data-mod-pick="lora"]') as HTMLButtonElement
      expect(b).toBeTruthy()
      return b
    }))
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy())
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await waitFor(() => screen.getByRole("option", { name: /lora_0/ })))
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    // The commit carried the userEdit flag (the zone-commit contract)…
    await waitFor(() => {
      expect(onEditSave.mock.calls.some((c) => (c[3] as { userEdit?: boolean } | undefined)?.userEdit === true)).toBe(true)
    })
    // …and the TILE RENDERS — purely-additive or not, the mod is on the
    // card. (Pre-fix: the swallow ate the commit — no flag existed, no
    // set(), nothing appeared.)
    await waitFor(() => {
      expect(document.querySelector('[data-subcard="lora-lora_0.safetensors"]')).toBeTruthy()
    })
  })
})
