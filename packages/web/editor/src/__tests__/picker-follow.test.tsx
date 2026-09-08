// Auto-follow the GUI picker (2026-09-06): the card reads the DSH
// picker's live selection (same-origin parent DOM) and maps it onto
// a live route. NO FALLBACK: an unreadable or unresolvable selection
// refuses loudly (the editor's pickerLlm throws; these tests pin the
// aria contract, the mapping table, and the standalone guard).
import { describe, it, expect } from "vitest"
import {
  resolvePickerRoute,
  readPickerModel,
  isEmbedded,
  parsePickerAria,
} from "@melite/catalog"

const ROUTES = [
  "deepseek-official/deepseek-v4-flash",
  "opencode-go/muse-spark-1.3-contributor",
  "zai/glm-4.7",
  "zai/glm-4.5-air",
  "openrouter/minimax/minimax-m3:free",
]

describe("resolvePickerRoute (display name → live route)", () => {
  it("exact normalized equality", () => {
    expect(resolvePickerRoute(ROUTES, "GLM 4.7")).toBe("zai/glm-4.7")
    expect(resolvePickerRoute(ROUTES, "glm-4.5-air")).toBe("zai/glm-4.5-air")
  })

  it("unique prefix (short display name)", () => {
    expect(resolvePickerRoute(ROUTES, "Muse Spark")).toBe(
      "opencode-go/muse-spark-1.3-contributor",
    )
  })

  it("ambiguous prefix → null (never a guess)", () => {
    // "GLM 4" prefixes both glm-4.7 and glm-4.5-air
    expect(resolvePickerRoute(ROUTES, "GLM 4")).toBeNull()
  })

  it("unknown → null", () => {
    expect(resolvePickerRoute(ROUTES, "Nonexistent Model")).toBeNull()
    expect(resolvePickerRoute(ROUTES, "")).toBeNull()
  })
})

describe("parsePickerAria (live-probed aria contract)", () => {
  it("extracts the current model name", () => {
    expect(
      parsePickerAria("Select model, current Muse Spark 1.3 (Contributor), reasoning effort Xhigh"),
    ).toBe("Muse Spark 1.3 (Contributor)")
    expect(parsePickerAria("Select model, current GLM 4.7, reasoning effort Max")).toBe("GLM 4.7")
  })

  it("no current selection → null", () => {
    expect(parsePickerAria("Select model")).toBeNull()
    expect(parsePickerAria("Completely unrelated")).toBeNull()
  })

  it("display names with parens resolve exactly (live case)", () => {
    expect(resolvePickerRoute(ROUTES, "Muse Spark 1.3 (Contributor)")).toBe(
      "opencode-go/muse-spark-1.3-contributor",
    )
  })
})

describe("readPickerModel (parent DOM scrape)", () => {
  it("standalone editor (parent === window) → null", () => {
    expect(readPickerModel()).toBeNull()
  })

  it("standalone editor is not embedded (host default is legal there)", () => {
    expect(isEmbedded()).toBe(false)
  })
})
