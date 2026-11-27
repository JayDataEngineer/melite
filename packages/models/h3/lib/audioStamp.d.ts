import type { FilmMixClipClass, LaneStamp } from './filmMix.js';
/** The stamp fields the sentences read — the film loop's Stamp and
 *  the extension's single-window stamp both carry exactly these. */
export interface DialogueStampText {
    readonly delay_seconds: number;
    readonly slice_duration_seconds: number;
    readonly text: string;
    readonly fromHead: boolean;
    readonly endsHere: boolean;
}
/** MM:SS.mmm on the window's own clock (the generation clock the
 *  stamp's delay speaks — one clock feeds the pin and the words).
 *  @param t seconds from the window's generation start
 *  @returns the clock text the prompt sentences carry */
export declare function stampClock(t: number): string;
/** The spoken form in an authored text — `<d>[Language] words</d>`.
 *  Under a row that owns the window's dialogue the form would double
 *  the line (the heard-twice burn, 2026-11-20); the doors that know
 *  the ownership refuse it.
 *  @param text the window's authored prompt text
 *  @returns whether a spoken-form tag is present */
export declare function spokenLineIn(text: string): boolean;
/** The bracket's language for the spoken-form tags: the doc's
 *  speech_language when stated (trimmed), English otherwise (brief
 *  M-T2: an unintended line at least lands in the named language).
 *  @param p the walked doc params
 *  @returns the language tag's text */
export declare function speechLanguageOf(p: Readonly<Record<string, unknown>>): string;
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
export declare function dialogueSentences(stamp: DialogueStampText, speechLang: string): string[];
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
export declare function sfxSentence(stamp: DialogueStampText): string;
/** The music stamp's field. MUSIC stays one sentence per window it
 *  rides, crossers included: a score is a STATE, not an onset —
 *  restating "a low synth pad" is what keeps the bed the same bed
 *  across a seam. There is no performed word to copy (the 2026-11-26
 *  law is about takes and events, never about the score's
 *  description).
 *  @param text the window's prompt text so far
 *  @param musicText the music row's text
 *  @returns the text with the field appended */
export declare function musicField(text: string, musicText: string): string;
/** THE NO-SPEECH INDICATOR (2026-09-24, the operator's gibberish law,
 *  paid for on the BRIEF9 films): unless the model is told 'no speech'
 *  OR given speech-carrying audio, it INVENTS random gibberish
 *  dialogue. The card stamps the indicator itself — model memory is
 *  not a seat. */
export declare const NO_SPEECH_SENTENCE = "No speech or dialogue in this shot \u2014 ambient and effects only; nobody speaks on screen and there is no voice-over.";
/** The indicator as one appended field. */
export declare const NO_SPEECH_FIELD: string;
/** An authored indication of any spelling ('no speech', 'no
 *  dialogue', 'no voice') is honored, never doubled.
 *  @param text the window's authored prompt text
 *  @returns whether the author already indicated no speech */
export declare function authoredNoSpeech(text: string): boolean;
/** The per-class stamps one window carries (absent where no row owns
 *  the lane) — laneStamps' return. */
export type LaneStamps = Readonly<Partial<Record<FilmMixClipClass, LaneStamp>>>;
/** lanePromptText's seats — what the assembly cannot derive. */
export interface LanePromptSeats {
    /** the bracket's language (the doc's speech_language; English when
     *  unstated) */
    readonly speechLang: string;
    /** a live ref-audio rail reaches this window's conditioning — the
     *  no-speech indicator stands down (speech-carrying audio is
     *  present); a pinned/sfx window or a rail-less arm passes false */
    readonly hearsRefAudio: boolean;
    /** the door's own name for the refusal's prefix (`window 3`,
     *  `extend`) */
    readonly where: string;
    /** the authored text's seat name for the refusal (`the call
     *  text`, `extend_prompt`) */
    readonly textSeat: string;
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
export declare function lanePromptText(text: string, stamps: LaneStamps, seats: LanePromptSeats): string;
//# sourceMappingURL=audioStamp.d.ts.map
