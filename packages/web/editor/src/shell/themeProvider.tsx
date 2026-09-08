/**
 * themeProvider — the themes lane's frontend materializer (§16 slot
 * lane, data-only, 2026-08-20). The server owns the THEME TABLE
 * (packages/<id>/themes/<theme-id>.yaml, served on GET /v1/themes);
 * this module fetches it ONCE at boot, applies the selected theme, and
 * exposes the picker state. A theme is pure DATA — token → CSS value.
 *
 * ── Application mechanism (the least invasive one that ACTUALLY
 * re-skins) ────────────────────────────────────────────────────────
 * Tailwind v4's `@theme inline` in tailwind.css maps every semantic
 * utility onto the UNDERLYING custom property — `bg-background` emits
 * `background-color: var(--background)`, not a frozen build-time value.
 * So the runtime override point is the custom property itself: writing
 * INLINE custom properties on documentElement (`<html>`) re-skins every
 * utility consumer in one move. Inline style beats every stylesheet
 * selector, including BOTH default palette blocks (`:root` and `.dark`
 * tie at (0,1,0) and lose to inline) — proven in theme-provider.test.tsx
 * against a real injected stylesheet + cascade.
 *
 * The hard rule — "no theme selected = byte-identical render" — holds
 * structurally: with no selection the provider writes NOTHING, and the
 * default palettes in tailwind.css are untouched (values unchanged).
 *
 * (The historic "honest limit" here — the [data-copilotkit] palette
 * block overriding theme tokens inside the chat wrapper — died with the
 * @copilotkit extermination: no such attribute, no such block, nothing
 * scoped. Theme tokens reach every surface now.)
 *
 * ── Selection persistence ──────────────────────────────────────────
 * Client-side localStorage (`melite:theme`) — the existing UI-pref
 * pattern (melite:hiddenRuns, melite:tag-map:v1): the server never persists
 * UI state. Value is `${plugin}/${id}` (namespaced, like the ui-lane
 * claim keys); absent/empty = Default. A stored selection whose theme
 * no longer resolves (plugin disabled) applies NOTHING and shows
 * Default — the unregister is total; the stored value survives so a
 * re-enabled plugin restores the user's choice.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { editorClient } from "@/rpc/editorClient"
import type { ThemeEntry } from "@melite/contracts"

export const THEME_STORAGE_KEY = "melite:theme"

// ── Pure DOM + persistence helpers (exported for the gate test) ────────

/** The tokens the CURRENT applied theme wrote (switch/clear removes
 * exactly these — a theme that drops a token must not leave it set). */
let _appliedTokens: string[] = []

/** Write a theme's vars as inline custom properties on <html>. Clears
 *  any previously applied tokens first so switching is total. */
export function applyThemeVars(vars: Record<string, string>): void {
  clearThemeVars()
  const root = document.documentElement
  for (const [tok, val] of Object.entries(vars)) {
    root.style.setProperty(tok, val)
  }
  _appliedTokens = Object.keys(vars)
}

/** Remove every token the applied theme wrote — <html> returns to the
 *  stylesheet palettes byte-identically. */
export function clearThemeVars(): void {
  const root = document.documentElement
  for (const tok of _appliedTokens) {
    root.style.removeProperty(tok)
  }
  _appliedTokens = []
}

/** The persisted selection key (`${plugin}/${id}`; "" = Default). */
export function readStoredTheme(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? ""
  } catch {
    return "" // localStorage blocked (SSR/privacy) — Default, never throw
  }
}

/** Persist the selection ("" = Default → key removed). */
export function storeTheme(key: string): void {
  try {
    if (key === "") localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, key)
  } catch {
    /* quota / private mode — this session still works, un-persisted */
  }
}

export const themeKey = (t: ThemeEntry): string => `${t.plugin}/${t.id}`

// ── The picker state (context) ─────────────────────────────────────────

export interface ThemePicker {
  /** Served themes (null until the first fetch lands). */
  themes: ThemeEntry[] | null
  /** The selection key ("" = Default — the built-in palettes). */
  selected: string
  /** Select a theme by `${plugin}/${id}` (or "" for Default); applies
   *  + persists. An unknown key applies nothing (fail-safe). */
  select: (key: string) => void
  /** Re-fetch the table (after a plugin flip) and re-resolve the
   *  selection — a vanished theme falls back to Default LIVE. */
  refresh: () => Promise<void>
}

const ThemePickerCtx = createContext<ThemePicker | null>(null)

export function useThemePicker(): ThemePicker {
  const ctx = useContext(ThemePickerCtx)
  if (!ctx) throw new Error("useThemePicker — no ThemeProvider above")
  return ctx
}

/** Provider-optional read (null when no ThemeProvider is mounted —
 *  embeds/tests). The PluginsPanel uses this so it renders fine in
 *  isolation; in the real app the provider is always above. */
export function useOptionalThemePicker(): ThemePicker | null {
  return useContext(ThemePickerCtx)
}

function resolve(themes: ThemeEntry[], key: string): ThemeEntry | null {
  return themes.find((t) => themeKey(t) === key) ?? null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ThemeEntry[] | null>(null)
  const [selected, setSelected] = useState("")

  /** (Re)apply the selection against the current table. */
  const sync = useCallback((list: ThemeEntry[], key: string) => {
    const theme = resolve(list, key)
    if (theme) applyThemeVars(theme.vars)
    else clearThemeVars()
    setSelected(theme ? key : "")
  }, [])

  /** Fetch once at boot; failures are LOGGED, never thrown (a dead
   *  lane must not brick boot — the shell-lane contract). */
  useEffect(() => {
    let alive = true
    editorClient
      .listThemes()
      .then((list) => {
        if (alive) {
          setThemes(list)
          sync(list, readStoredTheme())
        }
      })
      .catch((e) => {
        console.error(`themeProvider: themes lane sync failed — ${e}`)
      })
    return () => {
      alive = false
    }
  }, [sync])

  const select = useCallback(
    (key: string) => {
      storeTheme(key)
      // Apply immediately against the known table; an unknown key (or
      // themes not yet fetched) applies nothing = Default.
      sync(themes ?? [], key)
    },
    [sync, themes],
  )

  const refresh = useCallback(async () => {
    try {
      const list = await editorClient.listThemes()
      setThemes(list)
      sync(list, readStoredTheme())
    } catch (e) {
      console.error(`themeProvider: themes lane refresh failed — ${e}`)
    }
  }, [sync])

  const value = useMemo<ThemePicker>(
    () => ({ themes, selected, select, refresh }),
    [themes, selected, select, refresh],
  )

  return <ThemePickerCtx.Provider value={value}>{children}</ThemePickerCtx.Provider>
}
