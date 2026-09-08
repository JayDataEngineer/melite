/**
 * embedMode — is this editor instance EMBEDDED in DSH?
 *
 * The DSH plugins (card-deck takeover, chat toolview) mount /editor/ in a
 * same-origin iframe. When embedded, the surfaces DSH already owns are
 * DEAD LANES here and must not render (operator law 2026-08-22: "we no
 * longer need that icon stuff — the right sidebar panel, key button,
 * GPU button"):
 *   - the LLM key button + endpoint dialog (DSH owns the LLM),
 *   - the Comfy/GPU status icon (the run door lives in DSH's cards),
 *   - the right panel + its toggle (DSH's right sidebar is the panel).
 *
 * Detection: the editor is only ever iframed by DSH — a top-level window
 * (dev :5173, vitest jsdom) has parent === window and keeps every lane.
 */
export const isDshEmbed: boolean =
  typeof window !== "undefined" && window.parent !== window
