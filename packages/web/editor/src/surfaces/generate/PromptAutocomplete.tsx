/**
 * E4.7 — Prompt library autocomplete.
 *
 * Wraps the prompt `<textarea>` and shows a dropdown of matching tags
 * from `lib/prompt-tags.ts` as the user types. The dropdown:
 *   • appears when the current token (text after the last comma) has
 *     at least 1 character that matches a tag,
 *   • closes on Escape, blur, or picking a suggestion,
 *   • inserts the chosen tag at the cursor via `insertTagAtToken`,
 *     appending ", " so the user can chain tags.
 *
 * Keyboard (when the dropdown is open):
 *   • ↑ / ↓  — move highlight
 *   • Tab    — insert the highlighted tag (default prevented)
 *   • Enter  — insert the highlighted tag (default prevented)
 *   • Escape — close without inserting
 *
 * The component is a controlled wrapper — it renders the textarea and
 * forwards onChange/onBlur so the inspector's existing wiring is
 * unchanged. Tag suggestions come from the immutable ALL_PROMPT_TAGS
 * list (loaded once from JSON at module init).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from "@melite/ui/button"
import { Textarea } from "@melite/ui/textarea"
import {
  ALL_PROMPT_TAGS,
  filterTags,
  extractCurrentToken,
  insertTagAtToken,
  TAG_CATEGORY_LABELS,
  type PromptTag,
} from "@melite/formats"

interface PromptAutocompleteProps {
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  minChars?: number
}

export function PromptAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  minChars = 1,
}: PromptAutocompleteProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  // Snapshot of the cursor position at the last change event — needed
  // because insertTagAtToken operates on text + cursor, not selection.
  const cursorRef = useRef<number>(value.length)

  const token = useMemo(
    () => extractCurrentToken(value, cursorRef.current),
    [value],
  )

  const suggestions = useMemo<PromptTag[]>(
    () => (token.length >= minChars ? filterTags(ALL_PROMPT_TAGS, token) : []),
    [token, minChars],
  )

  // Open/close the dropdown WHEN THE TOKEN CHANGES. We deliberately do
  // NOT depend on `open` here — otherwise Escape (which sets open=false)
  // would be immediately overridden by this effect re-running and
  // seeing suggestions.length > 0 && !open → setOpen(true). Keying on
  // `token` means a manual dismiss (Escape) sticks until the user types
  // again, at which point the new token legitimately re-evaluates.
  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true)
      setHighlightIdx(0)
    } else {
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Clamp the highlight index when the suggestion list shrinks.
  useEffect(() => {
    if (highlightIdx >= suggestions.length) {
      setHighlightIdx(Math.max(0, suggestions.length - 1))
    }
  }, [suggestions.length, highlightIdx])

  const acceptSuggestion = (tag: PromptTag) => {
    const { text } = insertTagAtToken(value, cursorRef.current, tag.value)
    onChange(text)
    setOpen(false)
    // Re-focus + place cursor at end of inserted text.
    requestAnimationFrame(() => {
      const ta = taRef.current
      if (ta) {
        ta.focus()
        const pos = text.length
        ta.setSelectionRange(pos, pos)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
      // Only intercept Enter when there are suggestions; otherwise let
      // the textarea insert a newline (Shift+Enter always inserts).
      const tag = suggestions[highlightIdx]
      if (tag) {
        e.preventDefault()
        acceptSuggestion(tag)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative" data-prompt-autocomplete>
      <Textarea
        ref={taRef as React.Ref<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => {
          cursorRef.current = e.target.selectionStart ?? e.target.value.length
          onChange(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Defer close so a click on a suggestion registers first.
          setTimeout(() => setOpen(false), 120)
          onBlur?.()
        }}
        onClick={(e) => {
          cursorRef.current = (e.target as HTMLTextAreaElement).selectionStart ?? value.length
        }}
        onKeyUp={(e) => {
          cursorRef.current = (e.target as HTMLTextAreaElement).selectionStart ?? value.length
        }}
        placeholder={placeholder}
        className={className}
        data-prompt-textarea
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-white/10 bg-popover/95 backdrop-blur-sm shadow-xl py-1"
          data-prompt-suggestions
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <Button
              key={`${s.category}-${s.value}`}
              type="button"
              variant="ghost"
              data-suggestion-item={s.value}
              data-highlighted={i === highlightIdx ? 'true' : 'false'}
              role="option"
              aria-selected={i === highlightIdx}
              onMouseDown={(e) => {
                // mousedown (not click) fires before the textarea blur,
                // so we don't need the deferred-close timer to win.
                e.preventDefault()
                acceptSuggestion(s)
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 ${
                i === highlightIdx
                  ? 'bg-white/[0.08] text-foreground/90'
                  : 'text-foreground/60 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[8px] uppercase tracking-wider text-foreground/30 shrink-0">
                {TAG_CATEGORY_LABELS[s.category]}
              </span>
              <span>{s.value}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
