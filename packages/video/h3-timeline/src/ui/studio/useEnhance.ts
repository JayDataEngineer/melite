/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useState } from "react"
import { H3_ENHANCE_SYSTEM } from "./docModel"

/** Per-prompt H3-style enhancement (tenant §7). Verbatim lines 2044–2086. */
export function useEnhance() {
  // ── Per-prompt H3-style enhancement (Layer B ✨). Keyed by row:
  // "call-i" (plain-text call) / "call-i-beat-j" (segment row).
  const [enhancing, setEnhancing] = useState<Record<string, boolean>>({})
  const [enhanceErr, setEnhanceErr] = useState<Record<string, string | null>>({})
  const [enhanceUndo, setEnhanceUndo] = useState<Record<string, string>>({})
  const setEnhancingKey = (k: string, v: boolean) =>
    setEnhancing((m) => ({ ...m, [k]: v }))

  /** ✨ Enhance ONE prompt (call text or beat segment) into H3 style.
   * Zero-setup path first (the DSH harness model), keystore LLM second —
   * same enhancePrompt the host's ✨ buttons use. The card LLM
   * preference (the ✦ rail's dropdown, @melite/catalog's store)
   * threads through: unset = Auto (the estate's preference chain,
   * muse-spark over glm-5v). Never silent: errors render inline; the
   * previous text is kept for one-click undo. */
  const enhanceOne = async (key: string, text: string, apply: (t: string) => void) => {
    const cur = text.trim()
    if (!cur || enhancing[key]) return
    setEnhancingKey(key, true)
    setEnhanceErr((m) => ({ ...m, [key]: null }))
    try {
      const { enhancePrompt, cardLlmArg } = await import("@melite/catalog")
      const result = await enhancePrompt(H3_ENHANCE_SYSTEM, cur, cardLlmArg())
      if (!result?.positive) throw new Error("empty enhancement result")
      setEnhanceUndo((m) => ({ ...m, [key]: text }))
      apply(result.positive)
    } catch (e) {
      setEnhanceErr((m) => ({
        ...m,
        [key]: e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160),
      }))
    } finally {
      setEnhancingKey(key, false)
    }
  }

  /** ↩ Undo — restores the pre-enhancement text for one row. */
  const undoEnhance = (key: string, apply: (t: string) => void) => {
    const prev = enhanceUndo[key]
    if (prev === undefined) return
    apply(prev)
    setEnhanceUndo((m) => {
      const { [key]: _drop, ...rest } = m
      return rest
    })
  }
  return { enhancing, enhanceErr, enhanceUndo, enhanceOne, undoEnhance }
}
