/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. (2026-09-15, the operator's cut: NO
 * prompt segments, NO prompt beats — text mode only, forever.)
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { cn } from "@melite/card-base/chrome"
import s from "./studio.module.css"
import type { DocCall } from "./docModel"

/** One call's prompt editor: ONE textarea + ✨ H3 style. */
export function CallCardPrompt({
  c, i,
  handlePromptUpdate,
  enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo,
}: {
  c: DocCall
  i: number
  handlePromptUpdate: (id: string, text: string) => void
  enhanceOne: (key: string, text: string, apply: (t: string) => void) => void
  undoEnhance: (key: string, apply: (t: string) => void) => void
  enhancing: Record<string, boolean>
  enhanceErr: Record<string, string | null>
  enhanceUndo: Record<string, string>
}) {
  return (
    <div className={s.beatsWrap}>
      <div className={s.textHead}>
        <span className={s.textLabel}>the prompt this call sends to H3</span>
        <span className={s.enhanceRow}>
          <Button
            type="button"
            title="Rewrite this call's prompt in H3 cinematic style"
            aria-label={"Enhance call " + i + " prompt"}
            data-testid="tl-call-enhance"
            disabled={!(c.text ?? "").trim() || enhancing["call-" + i] === true}
            onClick={() => void enhanceOne(
              // (the button is disabled unless the text is non-blank, so
              // text is a string here — the `!` records that proof.)
              "call-" + i, c.text!,
              (t) => handlePromptUpdate("call-" + i, t),
            )}
            className={s.enhanceBtn}
          >
            {enhancing["call-" + i] === true ? "enhancing…" : "\u2728 H3 style"}
          </Button>
          {enhanceUndo["call-" + i] !== undefined && (
            <Button
              type="button"
              aria-label={"Undo enhance call " + i + " prompt"}
              data-testid="tl-call-enhance-undo"
              onClick={() => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t))}
              className={s.undoBtn}
            >
              {"\u21a9 undo"}
            </Button>
          )}
        </span>
      </div>
      {enhanceErr["call-" + i] && (
        <span className={s.beatErr} data-testid="tl-call-enhance-error">
          {enhanceErr["call-" + i]}
        </span>
      )}
      <textarea
        value={c.text ?? ""}
        placeholder="describe the action, camera, and mood for this call — empty calls refuse the plan"
        aria-label={`Call ${i} prompt`}
        data-testid="tl-call-prompt"
        rows={2}
        onChange={(e) => handlePromptUpdate(`call-${i}`, e.target.value)}
        className={cn(s.promptBox, !(c.text ?? "").trim() && s.promptBoxEmpty)}
      />
    </div>
  )
}
