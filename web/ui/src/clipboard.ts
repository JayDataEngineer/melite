// copyText — clipboard that works OUTSIDE secure contexts too (2026-08-18).
//
// The editor is self-hosted and routinely browsed over plain HTTP on a
// Tailscale IP / LAN host (deploy note: "UI over Tailscale"). Browsers
// expose ``navigator.clipboard`` ONLY in secure contexts (https or
// localhost) — on every other origin it is ``undefined``, and each copy
// button that goes through it (CopilotKit's ``copyToClipboard``, our chat
// copy override) silently copies NOTHING while looking fine (operator:
// "Copy button is broken"). The execCommand fallback below is the standard
// escape hatch: a transient off-screen textarea + ``document.execCommand
// ("copy")`` still works in insecure contexts in every browser that ships
// it (all of them, for back-compat).
//
// Returns whether the copy succeeded — callers surface failures (toast /
// console.error) per the NO-SILENT-SWALLOWS policy; never throw for a
// copy failure.
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false

  // Preferred path: the async Clipboard API (secure contexts).
  const nav = navigator as Navigator & {
    clipboard?: { writeText?: (t: string) => Promise<void> }
  }
  if (typeof nav.clipboard?.writeText === "function") {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied / document not focused — fall through to the
      // execCommand path before giving up.
    }
  }

  // Fallback: transient textarea + execCommand — works on plain-HTTP
  // origins where navigator.clipboard is undefined.
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    // Keep it invisible AND off the interaction plane: fixed + far
    // off-screen (opacity alone can still capture iOS auto-zoom focus).
    ta.style.position = "fixed"
    ta.style.top = "-1000px"
    ta.style.opacity = "0"
    ta.setAttribute("readonly", "")
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  } catch {
    return false
  }
}
