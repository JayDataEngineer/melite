/**
 * E4.7 — Prompt tag library + autocomplete helpers.
 *
 * The tag library lives in `src/data/prompt-tags.json` (checked into
 * source — the IaC piece that survives wipes). This module loads it,
 * flattens it into a searchable list, and exposes filtering helpers
 * the PromptAutocomplete component uses to render suggestions.
 *
 * Tags are short phrases (e.g. "golden hour", "dolly in", "teal and
 * orange") that read naturally when appended to a prompt. The current-
 * token extractor finds the substring being typed after the last comma
 * or semicolon, so suggestions apply to the phrase the user is mid-
 * type on, not the whole prompt.
 */
import tagsJson from './prompt-tags.json'

export type PromptTagCategory =
  | 'shot' | 'camera' | 'lighting' | 'style'
  | 'motion' | 'mood' | 'color' | 'subject'

export interface PromptTag {
  /** The phrase as it would be inserted into a prompt. */
  value: string
  /** Category bucket (for grouping in the dropdown). */
  category: PromptTagCategory
}

/** Category display order for the dropdown (matches the JSON key order). */
export const TAG_CATEGORY_ORDER: readonly PromptTagCategory[] = [
  'shot', 'camera', 'lighting', 'style',
  'motion', 'mood', 'color', 'subject',
]

/** Human-readable labels for each category. */
export const TAG_CATEGORY_LABELS: Record<PromptTagCategory, string> = {
  shot: 'Shot',
  camera: 'Camera',
  lighting: 'Lighting',
  style: 'Style',
  motion: 'Motion',
  mood: 'Mood',
  color: 'Color',
  subject: 'Subject',
}

/**
 * Flatten the JSON tag map into a single list of { value, category }.
 * Computed once at module load (the JSON is static) and frozen so
 * callers can't mutate the canonical list.
 */
function flatten(json: typeof tagsJson): PromptTag[] {
  const out: PromptTag[] = []
  for (const cat of TAG_CATEGORY_ORDER) {
    const arr = json[cat]
    if (!Array.isArray(arr)) continue
    for (const value of arr) {
      if (typeof value === 'string' && value.length > 0) {
        out.push({ value, category: cat })
      }
    }
  }
  return out
}

export const ALL_PROMPT_TAGS: readonly PromptTag[] = Object.freeze(flatten(tagsJson))

/** Case-insensitive containment filter — the workhorse for suggestions. */
export function filterTags(
  tags: readonly PromptTag[],
  query: string,
  limit: number = 8,
): PromptTag[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // Prefer prefix matches first (they read better), then substring.
  const prefix: PromptTag[] = []
  const substring: PromptTag[] = []
  for (const tag of tags) {
    const v = tag.value.toLowerCase()
    if (v.startsWith(q)) prefix.push(tag)
    else if (v.includes(q)) substring.push(tag)
  }
  // Stable order within each bucket (JSON order). Prefix bucket wins.
  return [...prefix, ...substring].slice(0, limit)
}

/**
 * Extract the token currently being typed — the text after the last
 * comma or semicolon (trimmed of leading whitespace). Used to scope
 * autocomplete suggestions to just the phrase in progress, not the
 * whole prompt.
 *
 *   extractCurrentToken("a cat, golden") → "golden"
 *   extractCurrentToken("a cat; extreme close") → "extreme close"
 *   extractCurrentToken("a cat") → "a cat"  (no comma yet → whole thing)
 *
 * The cursor position is honored when provided; otherwise the whole
 * string is treated as the token source.
 */
export function extractCurrentToken(
  text: string,
  cursorPos: number = text.length,
): string {
  const upTo = text.slice(0, cursorPos)
  // Find the last comma or semicolon before the cursor.
  const lastComma = Math.max(upTo.lastIndexOf(','), upTo.lastIndexOf(';'))
  const tokenStart = lastComma === -1 ? 0 : lastComma + 1
  // ltrim whitespace + newlines.
  return upTo.slice(tokenStart).replace(/^\s+/, '')
}

/**
 * Insert a tag at the current token position, returning the new text +
 * new cursor position. The token being typed is replaced by the tag
 * value; a comma + space separator is appended so the user can keep
 * adding tags.
 *
 *   insertTagAtToken("a cat, gol", 11, "golden hour")
 *     → { text: "a cat, golden hour, ", cursor: 21 }
 */
export function insertTagAtToken(
  text: string,
  cursorPos: number,
  tagValue: string,
): { text: string; cursor: number } {
  const upTo = text.slice(0, cursorPos)
  const after = text.slice(cursorPos)
  const lastComma = Math.max(upTo.lastIndexOf(','), upTo.lastIndexOf(';'))
  const tokenStart = lastComma === -1 ? 0 : lastComma + 1
  // Keep the prefix (everything before the current token), trimmed.
  const prefix = upTo.slice(0, tokenStart).trimEnd()
  // If there's a prefix, ensure it ends with a separator + space.
  const sep = prefix.length > 0 ? (prefix.endsWith(',') ? ' ' : ', ') : ''
  const insertion = `${prefix}${sep}${tagValue}, `
  const newText = insertion + after
  const newCursor = insertion.length
  return { text: newText, cursor: newCursor }
}
