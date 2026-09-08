/**
 * THE HIERARCHY PROOF (2026-08-16 operator demand, verbatim):
 *
 *   "MODEL FILTERS VARIANT. VARIANT FILTERS QUANT. IT IS A HIERARCHY.
 *    YOUR [REDACTED 2026-11-05] BREAKS."
 *
 * And the standing doctrine: "MODELS COME FROM FOLDER. NAME." — the
 * Model dropdown's option text is the catalog FOLDER/route name and a
 * variant/quant CELL (qwen-img-edit-2511-int8) is never a Model option.
 *
 * This file exercises the REAL loader path end-to-end:
 *   • the REAL catalog JSON (fetched from the gateway /v1/model-catalog
 *     and snapshotted in fixtures/real-catalog.json) seeds the REAL
 *     loader cache via primeCatalog() — NO modelCatalog mock;
 *   • the REAL matrix machinery runs: dropdownModels, the effect's
 *     tree-head filter, routeCoordinates, axisCellExists,
 *     composeVariantRoute, activeVariantId, activeVariantForRoute;
 *   • the REAL form-spec JSONs (fetched from /v1/form-spec?model=…,
 *     fixtures/spec_*.json) drive the axis dropdowns through a
 *     specContractStore stub — the ONLY mock.
 *
 * The assertions ARE the invariant:
 *   1. the Model list is the form's tree-head FOLDER set, and it is
 *      byte-identical before and after every axis pick;
 *   2. no cell route ever appears in the Model list;
 *   3. a revived card sitting on a cell displays the cell's FOLDER in
 *      the Model select;
 *   4. Model filters Variant: swapping the Model changes which axis
 *      dropdowns exist;
 *   5. Variant filters Quant: the Quant options recompose against the
 *      active Variant's cells;
 *   6. (2026-08-17) the qwen head renders the LITERAL acceptance
 *      criterion — Model=qwen-img-edit-2511, Variant=standard,
 *      Quant=INT8 — and picking Quant NEVER changes the Variant row
 *      ("WHEN I GO TO QUANT AND CHANGE IT, VARIANTS CHANGE" was the
 *      bug; the Variant row IS the model's variant folder set, served
 *      identically on every route).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { useCallback, useState, type ReactElement } from "react"

// ── REAL catalog + REAL specs (no modelCatalog mock anywhere) ──────────
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
// vitest runs with cwd = web/editor — process.cwd()-relative is stable
// both at top level and inside the hoisted vi.mock factory (import.meta
// .url is mangled there).
const readFixture = (f: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), "src/__tests__/fixtures", f), "utf8"))

const REAL_CATALOG = readFixture("real-catalog.json")

// Only the contract store is stubbed (the card's spec-fetch boundary).
// The specs are REAL gateway payloads — features.variants/variant_groups
// are the served truth, exactly what the axis dropdowns render from.
vi.mock("../surfaces/shared/specContractStore", () => {
  const readFixture = (f: string) =>
    JSON.parse(
      require("node:fs").readFileSync(
        resolve(process.cwd(), "src/__tests__/fixtures", f),
        "utf8",
      ),
    )
  const SPECS: Record<string, unknown> = {
    "qwen-img-edit-2511": readFixture("spec_qwen-img-edit-2511.json"),
    "qwen-img-edit-2511-int8": readFixture("spec_qwen-img-edit-2511-int8.json"),
    "qwen-img-edit-2511-lightning4": readFixture("spec_qwen-img-edit-2511-lightning4.json"),
    "krea-2": readFixture("spec_krea-2.json"),
    "krea-2-raw": readFixture("spec_krea-2-raw.json"),
    "ace-step": readFixture("spec_ace-step.json"),
    "ace-step-base": readFixture("spec_ace-step-base.json"),
    "ace-step-bf16": readFixture("spec_ace-step-bf16.json"),
    "ace-step-xl": readFixture("spec_ace-step-xl.json"),
    "moss-tts": readFixture("spec_moss-tts.json"),
    "music3": readFixture("spec_music3.json"),
    "h3": readFixture("spec_h3.json"),
    "wan-vace": readFixture("spec_wan-vace.json"),
    "z-image": readFixture("spec_z-image.json"),
    "z-image-base": readFixture("spec_z-image-base.json"),
  }
  const FALLBACK: Record<string, any> = {
    form: "form_generate",
    genre: "image",
    variants: [],
    features: { variant_groups: {}, modifiers: [], outputs: [], retake: {} },
    fields: [{ name: "prompt", type: "text" }],
    defaults: { prompt: "" },
    schema_groups: [],
  }
  const records: Record<string, any> = {}
  const stateRef = { records }
  async function loadFormSpec(service: string): Promise<any> {
    const record: Record<string, any> = {
      spec: SPECS[service] ?? FALLBACK,
      state: "loaded",
      violations: [],
      error: null,
    }
    records[service] = record
    return record
  }
  // zustand-shaped stub: callable hook + getState (the pattern the
  // flow-card suite uses — the selector reads stateRef.records).
  const useSpecContractStore = Object.assign(
    (selector: (s: { records: Record<string, any> }) => any) => selector(stateRef),
    { getState: () => ({ loadFormSpec, records, retryFormSpec: () => {} }) },
  )
  return { useSpecContractStore }
})

import { primeCatalog } from "@melite/catalog"
import { ParamEditor } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
// ── Harness: mirrors the app's route-carrier sync — onDraftChange with
// a service flushes stage.service (the store's updateStageParams path
// that re-triggers the Model-list effect in the real app). ──────────────
function Harness({ initial }: { initial: CardStage }) {
  const [stage, setStage] = useState(initial)
  // Stable identity is load-bearing: ParamEditor's live-draft effect
  // depends on onDraftChange — an inline arrow re-creates the reference
  // every render, the effect re-fires every render, the flush re-renders,
  // and the update loop trips React's depth guard. The real card modal
  // passes a stable callback; the harness must too.
  const apply = useCallback((params: Record<string, unknown>, service?: string) => {
    setStage((s) => ({ ...s, params, ...(service !== undefined ? { service } : {}) }))
  }, [])
  return <ParamEditor stage={stage} onSave={apply} onDraftChange={apply} />
}

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Generate",
    subtitle: "probe",
    kind: "generation",
    service: "qwen-img-edit-2511",
    params: { prompt: "a waifu" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

/** The Model combobox — aria-label="Model" is its accessible name. */
const modelBox = async () =>
  await screen.findByRole("combobox", { name: "Model" }) as HTMLElement
/** The axis combobox whose options contain `text` (Quant/Variant
 * dropdown). Kit-Select options portal on open, so each combobox is
 * opened, read, and closed in turn. */
const axisBoxWithOption = async (text: string) => {
  const all = screen.getAllByRole("combobox")
  for (const box of all) {
    if ((await boxOptions(box as HTMLElement)).some((o) => o === text)) {
      return box as HTMLElement
    }
  }
  throw new Error(`no axis select offers "${text}"`)
}
/** Open a combobox → its portal listbox. */
async function openBox(box: HTMLElement) {
  fireEvent.click(box)
  return await screen.findByRole("listbox")
}
/** Option label texts of a combobox (open → read → close). */
async function boxOptions(box: HTMLElement): Promise<string[]> {
  const listbox = await openBox(box)
  const texts = within(listbox).getAllByRole("option")
    .map((o) => o.textContent ?? "")
  fireEvent.keyDown(listbox, { key: "Escape", code: "Escape" })
  await waitFor(async () => {
    expect(screen.queryByRole("listbox")).toBeNull()
  })
  return texts
}
/** The active coordinate id (data-value on the trigger). */
const boxValue = (box: HTMLElement) => box.dataset["value"] ?? ""
/** Pick an option by visible label text (pointerDown first — Base
 * UI items ignore a bare click in jsdom). */
async function pickBoxOption(box: HTMLElement, text: string) {
  const listbox = await openBox(box)
  const opts = within(listbox).getAllByRole("option")
  const hit = opts.find((o) => o.textContent === text)
  expect(hit, `option "${text}" not offered`).toBeTruthy()
  fireEvent.pointerDown(hit!)
  fireEvent.click(hit!)
  await waitFor(async () => {
    expect(screen.queryByRole("listbox")).toBeNull()
  })
}

beforeEach(() => {
  primeCatalog(REAL_CATALOG)
})
afterEach(() => {
  cleanup()
})

describe("THE HIERARCHY: MODEL FILTERS VARIANT. VARIANT FILTERS QUANT. (REAL catalog)", () => {
  it("qwen-img-edit-2511: THE LITERAL criterion — Model=qwen-img-edit-2511, Variant=standard, Quant=INT8; Quant picks NEVER shift the Variant row", async () => {
    renderWithTooltip(<Harness initial={makeStage({ service: "qwen-img-edit-2511" })} />)
    const model = await modelBox()
    await waitFor(async () => {
      expect(await boxOptions(model)).toEqual(["qwen-img-edit-2511"])
    })
    // The form_edit tree has ONE head — the Model list is the folder set,
    // not the folder + every quant cell.
    expect(await boxOptions(model)).toEqual(["qwen-img-edit-2511"])

    // THE ACCEPTANCE CRITERION (2026-08-17 operator demand): the pristine
    // head card shows the variant FOLDER SET on the Variant row — the
    // folders, never the route-filtered view — and the active row is
    // standard (the owner chain: the active INT8 cell's owner).
    const variantRow = await axisBoxWithOption("Standard (20-step)")
    expect(await boxOptions(variantRow)).toEqual([
      "⚡ Lightning (4-step)",
      "Standard (20-step)",
    ])
    expect(boxValue(variantRow)).toBe("standard")

    // The Quant row = the ACTIVE VARIANT's cells: INT8 ConvRot is the ONE
    // quant DECLARED inside variants/standard/variant.yaml (Q8/Q5 GGUF
    // retired 2026-08-21 — ComfyUI-approved safetensors only) — FP8
    // Lightning belongs to the lightning folder and is not here.
    const quant = await axisBoxWithOption("INT8 ConvRot")
    expect(await boxOptions(quant)).toEqual(["INT8 ConvRot"])
    expect(boxValue(quant)).toBe("int8")
    expect(boxValue(model)).toBe("qwen-img-edit-2511")

    // Re-pick the single Quant cell → compose stays on the head (the int8
    // merge IS the head body; the cell rides the Quant row, never the
    // Model list).
    const variantRowBefore = await boxOptions(variantRow)
    await pickBoxOption(quant, "INT8 ConvRot")
    await waitFor(async () => {
      expect(boxValue(model)).toBe("qwen-img-edit-2511")
    })
    // THE INVARIANT (the reported bug): the Quant pick NEVER changed the
    // Variant row — it is byte-identical (same options, same active
    // value), because the row IS the model's folder set.
    expect(await boxOptions(variantRow)).toEqual(variantRowBefore)
    expect(boxValue(variantRow)).toBe("standard")
    // Model list identical after the pick; the cell never appears.
    expect(await boxOptions(model)).toEqual(["qwen-img-edit-2511"])
    // The quant select now shows the cell as its active coordinate.
    expect(boxValue(quant)).toBe("int8")
    // The Model select displays the FOLDER name while the cell rides the
    // Quant row.
    expect(boxValue(model)).toBe("qwen-img-edit-2511")

    // Back to the head, then VARIANTS FILTER QUANT: picking the Lightning
    // FOLDER route-switches to its primary cell (lightning4 — the honest
    // fused 4-step, never a patch-in-place double distillation on the
    // INT8 head) and the Quant row becomes LIGHTNING's ONE cell.
    await pickBoxOption(model, "qwen-img-edit-2511")
    await waitFor(async () => {
      expect(boxValue(await axisBoxWithOption("Standard (20-step)"))).toBe("standard")
    })
    await pickBoxOption(await axisBoxWithOption("Standard (20-step)"), "⚡ Lightning (4-step)")
    await waitFor(async () => {
      expect(boxValue(model)).toBe("qwen-img-edit-2511")
    })
    const quantLightning = await axisBoxWithOption("FP8 Lightning (4-step)")
    // THE NO-GHOST CONTRACT (2026-08-17): Lightning exists in EXACTLY
    // ONE form — the lightx2v FUSED FP8 artifact. There is no Lightning
    // Q8/Q5 upstream, so the Quant row offers NOTHING else: the old
    // patch-base merge (⚡ + Q8/Q5 offered as quant cells with no
    // artifact behind them) is dead, and its ghost can never re-render.
    expect(await boxOptions(quantLightning)).toEqual(["FP8 Lightning (4-step)"])
    expect(boxValue(quantLightning)).toBe("lightning4")
    expect(boxValue(await axisBoxWithOption("⚡ Lightning (4-step)"))).toBe("lightning")
    // INT8 is GONE — the lightning folder declares no INT8 cell.
    expect(await boxOptions(quantLightning)).not.toContain("INT8 ConvRot")
    expect(await boxOptions(quantLightning)).not.toContain("Q8 GGUF")
    expect(await boxOptions(quantLightning)).not.toContain("Q5 GGUF")
  })

  it("krea-2: Model list is the form_generate folder set and never shifts across Variant+Quant picks", async () => {
    renderWithTooltip(<Harness initial={makeStage({ service: "krea-2" })} />)
    const model = await modelBox()
    await waitFor(async () => {
      expect(await boxOptions(model)).toEqual(["anima", "krea-2", "z-image"])
    })
    // The krea-2 matrix: Variant (Turbo/Raw) × Quant (INT8 ConvRot — the
    // one ComfyUI-approved tier; Q8/Q5 GGUF retired 2026-08-21).
    expect(await boxOptions(await axisBoxWithOption("Turbo"))).toEqual(["Turbo", "Raw"])
    expect(await boxOptions(await axisBoxWithOption("INT8 ConvRot"))).toEqual(["INT8 ConvRot"])

    // Pick Variant=Raw → draftService composes to krea-2-raw.
    const variant = await axisBoxWithOption("Turbo")
    await pickBoxOption(variant, "Raw")
    await waitFor(async () => {
      expect(boxValue(model)).toBe("krea-2")
    })
    // Model list identical after the Variant pick.
    expect(await boxOptions(model)).toEqual(["anima", "krea-2", "z-image"])
    // Variant filters Quant: raw's one quant (INT8 ConvRot — the primary
    // body).
    const quant = await axisBoxWithOption("INT8 ConvRot")
    expect(await boxOptions(quant)).toEqual(["INT8 ConvRot"])
    expect(boxValue(variant)).toBe("raw")

    // Re-pick the single Quant cell → the Model select keeps the folder
    // head (raw's int8 IS the raw primary body).
    await pickBoxOption(quant, "INT8 ConvRot")
    await waitFor(async () => {
      expect(boxValue(model)).toBe("krea-2")
    })
    expect(await boxOptions(model)).toEqual(["anima", "krea-2", "z-image"])
    // Variant row preserved the raw tier; Quant shows INT8.
    expect(boxValue(await axisBoxWithOption("Turbo"))).toBe("raw")
    expect(boxValue(await axisBoxWithOption("INT8 ConvRot"))).toBe("int8")
  })

  it("ace-step: picking Quant=BF16 keeps form_music's folder heads [ace-step, music3]", async () => {
    renderWithTooltip(<Harness initial={makeStage({ service: "ace-step", title: "Make music" })} />)
    const model = await modelBox()
    await waitFor(async () => {
      // The folder set of form_music — ace-step's cells (base/sft/xl/
      // bf16) are NOT folders and must not appear under Model.
      expect(await boxOptions(model)).toEqual(["ace-step", "music3"])
    })
    const quant = await axisBoxWithOption("Q8")
    expect(await boxOptions(quant)).toEqual(["Q8", "BF16"])

    await pickBoxOption(quant, "BF16")
    await waitFor(async () => {
      expect(boxValue(model)).toBe("ace-step")
    })
    expect(await boxOptions(model)).toEqual(["ace-step", "music3"])
    expect(boxValue(await axisBoxWithOption("Q8"))).toBe("bf16")
  })

  it("MODEL FILTERS VARIANT: swapping the Model from krea-2 to anima removes the axis dropdowns", async () => {
    renderWithTooltip(<Harness initial={makeStage({ service: "krea-2" })} />)
    const model = await modelBox()
    await waitFor(async () => {
      expect(await boxOptions(model)).toEqual(["anima", "krea-2", "z-image"])
    })
    expect(await axisBoxWithOption("Turbo")).toBeTruthy()
    expect(await axisBoxWithOption("INT8 ConvRot")).toBeTruthy()

    await pickBoxOption(model, "anima")
    // anima declares no variant axes — its card form has no axis row.
    await waitFor(async () => {
      const box = screen.queryByRole("combobox", { name: "Model" }) as HTMLElement | null
      expect(box && boxValue(box)).toBe("anima")
    })
    await waitFor(async () => {
      expect(screen.queryByRole("combobox", { name: "Model" })).toBeTruthy()
    })
    const combos = screen.getAllByRole("combobox")
    expect(combos.length).toBe(1) // Model only — the axes came FROM the model

    // And back — the axis row returns with krea-2's matrix.
    await pickBoxOption(screen.getByRole("combobox", { name: "Model" }) as HTMLElement, "krea-2")
    await waitFor(async () => {
      expect(await axisBoxWithOption("Turbo")).toBeTruthy()
    })
    expect(await boxOptions(screen.getByRole("combobox", { name: "Model" }) as HTMLElement)).toEqual([
      "anima",
      "krea-2",
      "z-image",
    ])
  })

  it("SPARSE FAMILY (2026-08-17): ace-step-xl's matrix has NO Base/SFT XL cells — the Variant row still renders the FULL folder set (THE leak proof)", async () => {
    // The leak's anatomy: the old VariantSelect filter kept a variant
    // row only when axisCellExists(activeRoute, row) — which composes
    // (row's OWN variant, ACTIVE quant) and asks the CATALOG for that
    // cell. On the ace-step-xl route (a family-override cell whose
    // matrix is Turbo/BF16 only — "no Base XL exists") the base and sft
    // rows' (base, bf16) / (sft, bf16) cells do not exist, so the old
    // code silently DROPPED them from the Variant dropdown: the row was
    // a quant-filtered subset, the exact "WHEN I GO TO QUANT AND CHANGE
    // IT, VARIANTS CHANGE" class. The qwen matrix never showed it
    // because its rows are all base cells — every (base, quant) combo
    // exists by construction. The row IS the model's folder set; it
    // renders everywhere.
    renderWithTooltip(
      <Harness
        initial={makeStage({
          service: "ace-step-xl",
          params: { model: "ace-step-xl" },
        })}
      />,
    )
    const model = await modelBox()
    await waitFor(async () => {
      expect(await boxOptions(model)).toEqual(["ace-step", "music3"])
    })

    // THE leak proof: all four FOLDER rows — Turbo, Base, SFT, XL Turbo.
    const variantRow = await axisBoxWithOption("Base")
    expect(await boxOptions(variantRow)).toEqual(["Turbo", "Base", "SFT", "XL Turbo"])
    // The active row is the cell's own row: the xl route's variant row.
    expect(boxValue(variantRow)).toBe("xl")

    // The Quant row = the route's own tier: BF16 only.
    const quant = await axisBoxWithOption("BF16")
    expect(await boxOptions(quant)).toEqual(["BF16"])
    expect(boxValue(quant)).toBe("bf16")

    // A variant pick composes to the row's own route — the row never
    // shifts under a quant switch (only one quant exists, but the row
    // stays byte-identical regardless).
    const variantRowBefore = await boxOptions(variantRow)
    await pickBoxOption(variantRow, "XL Turbo")
    await waitFor(async () => {
      expect(boxValue(await axisBoxWithOption("BF16"))).toBe("bf16")
    })
    expect(await boxOptions(variantRow)).toEqual(variantRowBefore)
    expect(boxValue(variantRow)).toBe("xl")
    expect(await boxOptions(model)).toEqual(["ace-step", "music3"])
  })

  it("REVIVED CARD on a cell route: Model shows the FOLDER, options are heads-only, Quant keeps the cell, Variant shows the owner", async () => {
    // A saved flow card sitting on qwen-img-edit-2511-int8 — the
    // route-carrier sync puts the cell in both service and params.model.
    renderWithTooltip(
      <Harness
        initial={makeStage({
          service: "qwen-img-edit-2511-int8",
          params: { prompt: "a waifu", model: "qwen-img-edit-2511-int8" },
        })}
      />,
    )
    const model = await modelBox()
    await waitFor(async () => {
      expect(await boxOptions(model)).toEqual(["qwen-img-edit-2511"])
    })
    // The Model row displays the FOLDER (the model row IS a directory)…
    expect(boxValue(model)).toBe("qwen-img-edit-2511")
    // …and the Quant row carries the cell.
    const quant = await axisBoxWithOption("INT8 ConvRot")
    expect(boxValue(quant)).toBe("int8")
    // The Variant row shows the cell's OWNER folder — standard (the
    // int8 cell is declared inside variants/standard/variant.yaml).
    expect(boxValue(await axisBoxWithOption("Standard (20-step)"))).toBe("standard")
  })
})
