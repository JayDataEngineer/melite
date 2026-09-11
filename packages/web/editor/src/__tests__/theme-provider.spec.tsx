// ThemeProvider gate (themes lane, §16, data-only, 2026-08-20). Pins:
//   1. The APPLICATION MECHANISM against a REAL stylesheet + cascade:
//      the default palettes are injected as a <style> rule exactly as
//      tailwind.css ships them (:root + .dark on <html class="dark">);
//      applyThemeVars writes INLINE custom properties on
//      documentElement, and getComputedStyle proves the inline values
//      WIN over both palette blocks — this is what re-skins every
//      utility (Tailwind's @theme inline emits var(--token) inside the
//      utilities, so the token flip is the reskin).
//   2. Default = byte-identical: clearThemeVars returns <html> to the
//      stylesheet palette EXACTLY (computed values match the injected
//      defaults), and no selection writes NOTHING.
//   3. Switching is total: a token only the OLD theme set is removed.
//   4. The provider: fetch once, resolve the persisted selection,
//      select() persists to localStorage (melite:theme) and applies,
//      Default clears the stored key, a vanished selection applies
//      nothing (the unregister is total), a failed fetch logs and
//      never bricks boot.
//   5. The picker lands in PluginsPanel: Default + served themes.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

const { listThemes, listPlugins } = vi.hoisted(() => ({
  listThemes: vi.fn(),
  listPlugins: vi.fn(),
}))
vi.mock("../rpc/editorClient", () => ({
  editorClient: { listThemes, listPlugins },
}))

import {
  ThemeProvider,
  useThemePicker,
  applyThemeVars,
  clearThemeVars,
  readStoredTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from "../shell/themeProvider"
import type { ThemeEntry } from "@melite/contracts"

// The REAL default palettes (web/editor/src/tailwind.css, abridged to
// the tokens under test, verbatim values) injected as a stylesheet so
// the cascade in these tests is the production cascade: :root at
// (0,1,0), .dark at (0,1,0) later in source order (wins), inline
// styles beat both. --blue-3 stands in for the @radix-ui/colors import
// the real .dark block resolves --card through.
const DEFAULT_BRAND_LIGHT = "oklch(0.72 0.17 196)"
const DEFAULT_BRAND_DARK = "oklch(0.84 0.158 196)"

function injectDefaultPalettes(): HTMLStyleElement {
  const style = document.createElement("style")
  style.textContent = `
    :root { --brand: ${DEFAULT_BRAND_LIGHT}; --card: oklch(1 0 0); }
    .dark { --blue-3: #002d47; --brand: ${DEFAULT_BRAND_DARK}; --card: var(--blue-3); }
  `
  document.head.appendChild(style)
  document.documentElement.className = "dark"
  return style
}

const computed = (tok: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(tok).trim()

const noir: ThemeEntry = {
  plugin: "video",
  id: "noir",
  label: "Noir",
  description: "restrained charcoal",
  dark: true,
  vars: { "--brand": "oklch(0.78 0.09 265)", "--card": "oklch(0.22 0.01 265)" },
}
const garish: ThemeEntry = {
  plugin: "hello-plugin",
  id: "garish",
  label: "Garish",
  dark: true,
  vars: { "--brand": "oklch(0.70 0.29 0)" },
}

/** A tiny consumer so the provider's picker state is observable. */
function PickerProbe() {
  const { themes, selected, select } = useThemePicker()
  return (
    <div>
      <div data-testid="theme-count">{themes?.length ?? "null"}</div>
      <div data-testid="theme-selected">{selected}</div>
      <button data-testid="theme-select-noir" onClick={() => select("video/noir")} />
      <button data-testid="theme-select-garish" onClick={() => select("hello-plugin/garish")} />
      <button data-testid="theme-select-default" onClick={() => select("")} />
    </div>
  )
}

let styleEl: HTMLStyleElement | null = null

beforeEach(() => {
  localStorage.clear()
  clearThemeVars()
  document.documentElement.className = ""
  styleEl?.remove()
  styleEl = injectDefaultPalettes()
  vi.clearAllMocks()
})

afterEach(() => {
  clearThemeVars()
  styleEl?.remove()
  styleEl = null
  document.documentElement.className = ""
})

describe("apply/clear — REAL DOM state against the real cascade", () => {
  it("default: the .dark palette wins over :root (source order) — the production default", () => {
    expect(computed("--brand")).toBe(DEFAULT_BRAND_DARK)
  })

  it("applyThemeVars writes inline vars that BEAT both palette blocks (computed)", () => {
    applyThemeVars(noir.vars)
    // inline style attribute carries the tokens (real DOM state)…
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe(
      "oklch(0.78 0.09 265)",
    )
    // …and the COMPUTED value flips from the .dark default to the theme
    expect(computed("--brand")).toBe("oklch(0.78 0.09 265)")
    expect(computed("--card")).toBe("oklch(0.22 0.01 265)")
  })

  it("clearThemeVars returns <html> to the stylesheet palette EXACTLY (byte-identical default)", () => {
    const baselineBrand = computed("--brand")
    const baselineCard = computed("--card")
    applyThemeVars(noir.vars)
    clearThemeVars()
    expect(computed("--brand")).toBe(baselineBrand)
    expect(computed("--card")).toBe(baselineCard)
    expect(document.documentElement.style.length).toBe(0) // zero inline declarations
  })

  it("switching themes is TOTAL — a token only the old theme set is removed", () => {
    const baselineCard = computed("--card")
    applyThemeVars(noir.vars) // sets --brand + --card
    applyThemeVars(garish.vars) // sets --brand only
    expect(computed("--brand")).toBe("oklch(0.70 0.29 0)")
    // --card fell back to the stylesheet default, not noir's leftover
    expect(computed("--card")).toBe(baselineCard)
  })
})

describe("ThemeProvider — fetch, resolve, select, persist", () => {
  it("fetches once and applies the PERSISTED selection at boot", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "video/noir")
    listThemes.mockResolvedValue([noir, garish])
    render(
      <ThemeProvider>
        <PickerProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("theme-count").textContent).toBe("2"))
    expect(listThemes).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("theme-selected").textContent).toBe("video/noir")
    expect(computed("--brand")).toBe("oklch(0.78 0.09 265)") // applied for real
  })

  it("no stored selection → Default: NOTHING written (byte-identical render)", async () => {
    listThemes.mockResolvedValue([noir])
    render(
      <ThemeProvider>
        <PickerProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("theme-count").textContent).toBe("1"))
    expect(screen.getByTestId("theme-selected").textContent).toBe("")
    expect(computed("--brand")).toBe(DEFAULT_BRAND_DARK) // untouched stylesheet value
    expect(document.documentElement.style.length).toBe(0)
  })

  it("select() applies LIVE and persists to localStorage; Default clears the key", async () => {
    listThemes.mockResolvedValue([noir, garish])
    render(
      <ThemeProvider>
        <PickerProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("theme-count").textContent).toBe("2"))

    fireEvent.click(screen.getByTestId("theme-select-garish"))
    expect(computed("--brand")).toBe("oklch(0.70 0.29 0)")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("hello-plugin/garish")

    fireEvent.click(screen.getByTestId("theme-select-noir"))
    expect(computed("--brand")).toBe("oklch(0.78 0.09 265)")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("video/noir")

    fireEvent.click(screen.getByTestId("theme-select-default"))
    expect(computed("--brand")).toBe(DEFAULT_BRAND_DARK)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(null) // key removed
  })

  it("a stored selection whose theme is GONE applies nothing (the unregister is total)", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "gone-plugin/vanished")
    listThemes.mockResolvedValue([noir])
    render(
      <ThemeProvider>
        <PickerProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("theme-count").textContent).toBe("1"))
    expect(screen.getByTestId("theme-selected").textContent).toBe("") // Default shown
    expect(computed("--brand")).toBe(DEFAULT_BRAND_DARK)
    // the stored value SURVIVES (a re-enabled plugin restores the choice)
    expect(readStoredTheme()).toBe("gone-plugin/vanished")
  })

  it("a failed fetch logs and never bricks boot", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    listThemes.mockRejectedValue(new Error("themes failed (500)"))
    render(
      <ThemeProvider>
        <PickerProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(err).toHaveBeenCalled())
    expect(computed("--brand")).toBe(DEFAULT_BRAND_DARK)
    err.mockRestore()
  })
})

describe("persistence helpers", () => {
  it("storeTheme('') removes the key; readStoredTheme tolerates blocked localStorage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "video/noir")
    storeTheme("hello-plugin/garish")
    expect(readStoredTheme()).toBe("hello-plugin/garish")
    storeTheme("")
    expect(readStoredTheme()).toBe("")
  })
})

describe("the picker lands in PluginsPanel (Default + served themes)", () => {
  it("renders the theme dropdown with Default and every served theme", async () => {
    listThemes.mockResolvedValue([noir, garish])
    listPlugins.mockResolvedValue([])
    const { PluginsPanel } = await import("../surfaces/shared/PluginsPanel")
    render(
      <ThemeProvider>
        <PluginsPanel open={true} onClose={() => {}} />
      </ThemeProvider>,
    )
    const select = await waitFor(() => {
      const el = screen.getByTestId("theme-select")
      expect(el).toBeTruthy()
      return el as HTMLSelectElement
    })
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent)
    expect(options).toEqual([
      "Default",
      "Noir · video (dark)",
      "Garish · hello-plugin (dark)",
    ])
    // picking applies + persists
    fireEvent.change(select, { target: { value: "video/noir" } })
    await waitFor(() => expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("video/noir"))
    expect(computed("--brand")).toBe("oklch(0.78 0.09 265)")
  })
})
