/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. (2026-09-15, the operator's cut: NO
 * prompt segments, NO prompt beats — text mode only, forever.)
 *
 * WHY-NOT SpecAtom (2026-10-27, UI-conformance audit job 3): the
 * textarea is bound to the DocCall DOCUMENT (c.text via
 * handlePromptUpdate), not a FormSpec field — SpecAtom's textarea
 * face needs a field spec + resolveValue/onSet, so seating it here
 * would mean a synthetic field + adapter for zero gain (LAW 2).
 * The enhance/undo/error chrome (useEnhance, tl-call-enhance
 * testids) is H3 behavior no atom owns. This file is inside h3's
 * sanctioned cards.stage.view takeover (client/index.ts:1-19, the
 * mount law: the card package's own studio on the bench slot —
 * content no renderer can declare rides beside the renderer, never
 * a fork) — a doc-model editor, not a spec row. Revisit only if the
 * prompt ever becomes a real spec field.
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { SectionLabel, cn } from '@melite/card-base/client'
import s from "./studio.module.css"
import type { DocCall } from "./docModel.ts"
import { studioCopy } from "./studioCopy.ts"

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
        {/* (Sahar R4, 2026-11-06) the head label rides the shared
            SectionLabel — the hand-rolled textLabel span is dead. */}
        <SectionLabel className={s.textLabel}>{studioCopy.promptHead}</SectionLabel>
        <span className={s.enhanceRow}>
          <Button
            type="button"
            title={studioCopy.enhanceAction}
            aria-label={studioCopy.enhanceCallPromptLabel(i)}
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
            {enhancing["call-" + i] === true ? studioCopy.enhancingNow : studioCopy.enhanceStyleAction}
          </Button>
          {enhanceUndo["call-" + i] !== undefined && (
            <Button
              type="button"
              aria-label={studioCopy.undoEnhanceCallPromptLabel(i)}
              data-testid="tl-call-enhance-undo"
              onClick={() => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t))}
              className={s.undoBtn}
            >
              {studioCopy.undoAction}
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
        placeholder={studioCopy.promptPlaceholder}
        aria-label={studioCopy.callPromptAria(i)}
        data-testid="tl-call-prompt"
        rows={2}
        onChange={(e) => handlePromptUpdate(`call-${i}`, e.target.value)}
        className={cn(s.promptBox, !(c.text ?? "").trim() && s.promptBoxEmpty)}
      />
    </div>
  )
}
