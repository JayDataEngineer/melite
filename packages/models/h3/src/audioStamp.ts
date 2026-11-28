// audioStamp.ts — the dialogue stamp's PROMPT half: ONE owner for
// the sentences every window that can hear a line is told (the film
// loop in actions.ts and the extension's fresh window in extend.ts).
// The stamp's arithmetic (slice, delay, the lane law) lives in
// filmMix.ts (laneStamps); the words the model reads about a line
// and their ASSEMBLY onto a window's text (lanePromptText) live
// here, so a film window and an extension cannot drift into telling
// the model two different things about one row.
import type { FilmMixClipClass, LaneStamp } from './filmMix.ts'

/** The stamp fields the sentences read — the film loop's Stamp and
 *  the extension's single-window stamp both carry exactly these. */
export interface DialogueStampText {
  readonly delay_seconds: number
  readonly slice_duration_seconds: number
  readonly text: string
  readonly fromHead: boolean
  readonly endsHere: boolean
}

/** MM:SS.mmm on the window's own clock (the generation clock the
 *  stamp's delay speaks — one clock feeds the pin and the words).
 *  @param t seconds from the window's generation start
 *  @returns the clock text the prompt sentences carry */
export function stampClock(t: number): string {
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(Math.floor(t % 60)).padStart(2, '0')
  const mmm = String(Math.round((t % 1) * 1000)).padStart(3, '0')
  return `${mm}:${ss}.${mmm}`
}

/** The spoken form in an authored text — `<d>[Language] words</d>`.
 *  Under a row that owns the window's dialogue the form would double
 *  the line (the heard-twice burn, 2026-11-20); the doors that know
 *  the ownership refuse it.
 *  @param text the window's authored prompt text
 *  @returns whether a spoken-form tag is present */
export function spokenLineIn(text: string): boolean {
  return /<d>\[[A-Za-z -]+\][^<]*<\/d>/.test(text)
}

/** The bracket's language for the spoken-form tags: the doc's
 *  speech_language when stated (trimmed), English otherwise (brief
 *  M-T2: an unintended line at least lands in the named language).
 *  @param p the walked doc params
 *  @returns the language tag's text */
export function speechLanguageOf(p: Readonly<Record<string, unknown>>): string {
  return typeof p.speech_language === 'string' && p.speech_language.trim() !== ''
    ? p.speech_language.trim()
    : 'English'
}

/** The dialogue sentence(s) for one window, in lane order.
 *  THE WORDS RIDE WHERE THE TAKE IS HEARD FROM ITS HEAD (2026-11-26):
 *  a window that hears the take from its head is given the line; a
 *  window that picks it up mid-way is told the voice continues, never
 *  restarted. THE LINE'S END IS STATED (F11, 2026-11-27 — the line
 *  heard, then heard again from the model's own track): a row that
 *  ENDS inside this window is told where, on the window's own clock,
 *  and that nobody speaks after it; a row that runs past the window's
 *  end is continued by the next window and states no end here (a
 *  false end would silence a line still being spoken). The film
 *  track's duck holds over the same frames (computeFilmMix's ghost
 *  hold): the prompt asks, the mix guarantees.
 *  @param stamp the window's dialogue stamp
 *  @param speechLang the bracket's language (the doc's
 *  speech_language; English when unstated)
 *  @returns the sentences, joined by the caller under one
 *  overall_soundscape field */
export function dialogueSentences(stamp: DialogueStampText, speechLang: string): string[] {
  const t = stampClock(stamp.delay_seconds)
  const lineEnd = stamp.delay_seconds + stamp.slice_duration_seconds
  const lineEndSentence = stamp.endsHere
    ? `\nThe line ends at ${stampClock(lineEnd)}; after it nobody speaks — room tone only.`
    : ''
  if (!stamp.fromHead) {
    return [
      `At ${t} the same voice is already speaking: the line began before this shot, so the speaker is mid-sentence — mouth articulating the continuing voice; never restart the line.${lineEndSentence}`,
    ]
  }
  return [
    `At ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[${speechLang}] ${stamp.text}</d>${lineEndSentence}`,
  ]
}

/** The sfx stamp's sentence — the event's onset on the window's own
 *  clock. THE ONE-CLOCK LAW (2026-09-24): an authored text that
 *  already opens with its own "At MM:SS.mmm," clock carries no second
 *  clock — the stamp's is canonical, the authored one is trimmed. THE
 *  SAME LAW FOR THE EVENT (2026-11-26): an sfx row the window picks up
 *  mid-way is a sound already under way — stating it at its own onset
 *  clock would re-strike the event at 00:00; the event stays NAMED (the
 *  model times the visual to it) and is marked as continuing.
 *  @param stamp the window's sfx stamp
 *  @returns the soundscape sentence */
export function sfxSentence(stamp: DialogueStampText): string {
  const sfxText = stamp.text
    .replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, '')
  return stamp.fromHead
    ? `At ${stampClock(stamp.delay_seconds)}, ${sfxText}`
    : `At ${stampClock(stamp.delay_seconds)}, already under way from before this shot: ${sfxText} (the event continues; no fresh onset)`
}

/** The music stamp's field. MUSIC stays one sentence per window it
 *  rides, crossers included: a score is a STATE, not an onset —
 *  restating "a low synth pad" is what keeps the bed the same bed
 *  across a seam. There is no performed word to copy (the 2026-11-26
 *  law is about takes and events, never about the score's
 *  description).
 *  @param text the window's prompt text so far
 *  @param musicText the music row's text
 *  @returns the text with the field appended */
export function musicField(text: string, musicText: string): string {
  return text.replace(/\s+$/, '') + `\n\nnon_diegetic_music:\n${musicText}`
}

/** THE NO-SPEECH INDICATOR (2026-09-24, the operator's gibberish law,
 *  paid for on the BRIEF9 films): unless the model is told 'no speech'
 *  OR given speech-carrying audio, it INVENTS random gibberish
 *  dialogue. The card stamps the indicator itself — model memory is
 *  not a seat. */
export const NO_SPEECH_SENTENCE = 'No speech or dialogue in this shot — ambient and effects only; nobody speaks on screen and there is no voice-over.'

/** The indicator as one appended field. */
export const NO_SPEECH_FIELD = '\n\noverall_soundscape:\n' + NO_SPEECH_SENTENCE

/** An authored indication of any spelling ('no speech', 'no
 *  dialogue', 'no voice') is honored, never doubled.
 *  @param text the window's authored prompt text
 *  @returns whether the author already indicated no speech */
export function authoredNoSpeech(text: string): boolean {
  return /\bno[\s_-]*(speech|dialogue|voice)/i.test(text)
}

/** The per-class stamps one window carries (absent where no row owns
 *  the lane) — laneStamps' return. */
export type LaneStamps = Readonly<Partial<Record<FilmMixClipClass, LaneStamp>>>

/** lanePromptText's seats — what the assembly cannot derive. */
export interface LanePromptSeats {
  /** the bracket's language (the doc's speech_language; English when
   *  unstated) */
  readonly speechLang: string
  /** a live ref-audio rail reaches this window's conditioning — the
   *  no-speech indicator stands down (speech-carrying audio is
   *  present); a pinned/sfx window or a rail-less arm passes false */
  readonly hearsRefAudio: boolean
  /** the door's own name for the refusal's prefix (`window 3`,
   *  `extend`) */
  readonly where: string
  /** the authored text's seat name for the refusal (`the call
   *  text`, `extend_prompt`) */
  readonly textSeat: string
}

/** THE LANE PROMPT — the one assembly of a window's text under its
 *  stamps, in lane order: dialogue first, then sfx, under ONE
 *  overall_soundscape field (each sentence keeps its own lane clock —
 *  the one-clock law trims a doubled clock off ONE text, never across
 *  lanes); music rides non_diegetic_music; then the no-speech
 *  indicator where no dialogue row and no live ref audio carries
 *  speech (an sfx/music bed does NOT count — the BRIEF9 law).
 *  THE ROW-OWNS-THE-WORDS LAW (2026-11-20 — the heard-twice burn
 *  run-cba5d49f4131-f9f58337: the row's line at 2.67 s, the model's
 *  own reading 3.1–9.9 s, a duck that changed nothing): a window
 *  whose dialogue row owns the lane must not ALSO speak the words in
 *  its own text — the <d> spoken form doubles the line. Refuses
 *  loud, naming the door and the cure.
 *  @param text the window's authored prompt text
 *  @param stamps the window's per-class stamps
 *  @param seats the language, the ref-audio fact and the refusal's names
 *  @returns the text the window's prompt carries
 *  @throws when the text carries a <d> spoken line under a dialogue row */
export function lanePromptText(text: string, stamps: LaneStamps, seats: LanePromptSeats): string {
  const soundscapeSentences: string[] = []
  if (stamps.dialogue !== undefined && stamps.dialogue.text !== '') {
    if (spokenLineIn(text)) {
      throw new Error(
        `h3-timeline ${seats.where}: ${seats.textSeat} carries a <d> spoken line while an audio_clips row owns this window's dialogue — ` +
        `the line would be heard twice (the row places the take; the model reads the text). ` +
        `Keep ${seats.textSeat} free of dialogue: the row is the only voice (SPOKEN-FORM's own advice, refused here where ownership is known)`,
      )
    }
    soundscapeSentences.push(...dialogueSentences(stamps.dialogue, seats.speechLang))
  }
  if (stamps.sfx !== undefined && stamps.sfx.text !== '') {
    soundscapeSentences.push(sfxSentence(stamps.sfx))
  }
  let out = text
  if (soundscapeSentences.length > 0) {
    out = out.replace(/\s+$/, '') + '\n\noverall_soundscape:\n' + soundscapeSentences.join('\n')
  }
  if (stamps.music !== undefined && stamps.music.text !== '') {
    out = musicField(out, stamps.music.text)
  }
  if (stamps.dialogue === undefined && !seats.hearsRefAudio && !authoredNoSpeech(out)) {
    out = out.replace(/\s+$/, '') + NO_SPEECH_FIELD
  }
  return out
}
