/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import type { BeatKnobs, DocCall, DocKeyframe } from "./docModel.ts"
import { CALL_KNOB_KEYS, GUIDE_KINDS, STARTER_CALLS } from "./docModel.ts"
import { joinRefList, migrateCallKnobKey, splitRefList } from '@melite/models-h3/timelineContract'
import { healOffGridCalls } from "./docGrid.ts"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts/timelineTypes"
import { isImageUrl } from '@melite/card-base/client'
import { studioCopy } from "./studioCopy.ts"

/** An array-SHAPED string that will not parse (or parses to a
 * non-array) is a CORRUPT calls/beats document — the 2026-08-30 crime
 * class ("the persist effect wrote 1 call back, and the multi-call
 * plan was destroyed permanently"). The parseable case self-heals
 * (parse → the mount commit writes it as a real array); the
 * corrupt case must never fall to the starter SILENTLY. The studio
 * shows the starter as VIEW state, the corruption is named loudly
 * here, and useShownDoc's sentinel treats the field as PRESENT so no
 * mount commit ever writes the starter back over the corrupt
 * source. Non-array-shaped strings ("not-json") are foreign values
 * the vocabulary has always tolerated — not this crime. */
export function corruptCallsField(raw: { calls?: unknown; beats?: unknown }): "calls" | "beats" | null {
  for (const field of ["calls", "beats"] as const) {
    const v = raw[field]
    if (typeof v !== "string" || !v.trimStart().startsWith("[")) continue
    try {
      if (Array.isArray(JSON.parse(v))) continue
    } catch {
      /* unparseable — corrupt */
    }
    return field
  }
  return null
}

export function hydrateCalls(raw: { calls?: unknown; beats?: unknown }): DocCall[] {
  // Layer B: `calls` is the vocabulary (2026-08-16, the B/C conflation
  // fix). Legacy docs wrote `beats` where every beat was a call in
  // disguise — map 1:1 (text, no inner segments; the family does the
  // same). Both present = a backend hard error (never a silent choice);
  // the studio renders `calls` — the compile refuses the ambiguous doc.
  //
  // STRING CALLS (2026-08-30 "it only shows the first gen"): legacy
  // docs stored `calls` as a JSON string (`"[{...}]"`). Array.isArray
  // on a string is false — the function fell through to STARTER_CALLS
  // (1 default call), the persist effect wrote 1 call back, and the
  // multi-call plan was destroyed permanently. Parse string-encoded
  // arrays before checking Array.isArray; reject everything else.
  const corrupt = corruptCallsField(raw)
  if (corrupt !== null) {
    // THE SILENT REPLACEMENT (the fallback audit's CRITICAL-1,
    // 2026-09-28): an unparseable array-shaped string used to fall
    // through to STARTER_CALLS with a save armed — the
    // corrupt source was overwritten by a 1-call default and the
    // plan was destroyed with no trace. The starter is VIEW state
    // only now; the crime is named, and useShownDoc holds the source.
    console.error(
      `VideoTimelineStudio: params.${corrupt} is array-shaped but unparseable — the document is corrupt. ` +
        `The starter is shown as view state ONLY; nothing persists over the corrupt source until you edit.`,
    )
  }
  let callsRaw = raw.calls
  if (typeof callsRaw === "string" && callsRaw.trimStart().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(callsRaw)
      if (Array.isArray(parsed)) callsRaw = parsed
    } catch { /* unparseable — fall through to beats / STARTER */ }
  }
  let beatsRaw = raw.beats
  if (typeof beatsRaw === "string" && beatsRaw.trimStart().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(beatsRaw)
      if (Array.isArray(parsed)) beatsRaw = parsed
    } catch { /* unparseable — fall through */ }
  }
  const list = Array.isArray(callsRaw) && callsRaw.length > 0
    ? callsRaw
    : Array.isArray(beatsRaw) && beatsRaw.length > 0
      ? beatsRaw
      : null
  if (!list) return STARTER_CALLS
  const calls: DocCall[] = []
  for (const [index, c] of list.entries()) {
    // EVERY DROP IS NAMED (2026-10-16, audit 3f0b7c1a ui-truth-gap
    // #6): both row drops below used to `continue` in silence — a
    // corrupt or reversed row vanished and the plan silently lost a
    // shot. The audio-clip pattern's voice, one channel over.
    if (typeof c !== "object" || c === null) {
      console.warn(`VideoTimelineStudio: calls[${index}] is not a call row — dropped.`)
      continue
    }
    const r = c as Record<string, unknown>
    const start = Number(r.start_frame)
    const end = Number(r.end_frame)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      console.warn(
        `VideoTimelineStudio: calls[${index}] has an unusable span (start_frame=${String(r.start_frame)}, end_frame=${String(r.end_frame)}) — dropped; a shot needs two finite frames with end > start.`,
      )
      continue
    }
    const call: DocCall = { text: "", start_frame: Math.round(start), end_frame: Math.round(end) }
    // The prompt: ONE textarea. (2026-09-15, the operator's cut: no
    // prompt segments, no prompt beats.) Old docs carrying per-call
    // `beats` hydrate by JOINING their texts into the prompt — no
    // word ever lost, one console warn; the wire still admits beats
    // (the compiler's vocabulary), the studio never authors them.
    const rawSegs = r.beats
    if (Array.isArray(rawSegs) && rawSegs.length > 0) {
      const joined: string[] = []
      for (const sg of rawSegs) {
        if (typeof sg === "object" && sg !== null) {
          const t = (sg as Record<string, unknown>).text
          if (typeof t === "string" && t.trim()) joined.push(t.trim())
        }
      }
      if (joined.length) {
        console.warn(
          `VideoTimelineStudio: call ${calls.length} carried prompt segments — their texts joined into the one prompt (segments were cut 2026-09-15; no words lost)`,
        )
        call.text = joined.join(" ")
      }
    }
    // (call.text is always a string here: initialized "" above, only
    // ever reassigned the joined string — the `!` records the
    // definite-assignment proof; a `?? ""` default would be dead.)
    if (!call.text!.trim() && typeof r.text === "string") call.text = r.text
    // Call-attached guides: string sources only, blank trimmed away.
    for (const kind of GUIDE_KINDS) {
      const src = r[kind]
      if (typeof src === "string" && src.trim()) call[kind] = src
    }
    // Frame-conditioning: the prev-video opener survives (positive
    // number; foreign types drop — forgiving hydration, never a
    // re-send of an invalid doc). last_frame RIDES (calls-stanza
    // audit (e), 2026-11-06): the compose's no-drop law (2026-10-26)
    // READS it at the seat union, so a cutting hydrate made hops 2
    // and 5 disagree — an agent-authored anchor composed while a
    // studio round-trip deleted it. Carried display-owned (no
    // studio control authors it; the compose's own law admits
    // string sources, blank trimmed away like every guide).
    if (typeof r.last_frame === "string" && r.last_frame.trim()) {
      call.last_frame = r.last_frame.trim()
    }
    // THE DEAD GUIDE SLOTS (2026-10-16, audit 3f0b7c1a ui-truth-gap
    // #3): a legacy doc may carry per-call clip/audio guides — both
    // round-tripped (GUIDE_KINDS hydrated them, CALL_KEYS admitted
    // them) and NEITHER had a compose reader: the reference bus and
    // the D-M-E audio lanes own conditioning, so the pair was UI
    // truth over an engine-deaf wire (the strip even painted a
    // speaker dot for it). Named, never silent — the last_frame
    // precedent. They are out of GUIDE_KINDS and out of CALL_KEYS, so
    // a NEW doc stating one refuses loud at the schema's call walk.
    for (const kind of ["clip", "audio"] as const) {
      const src = r[kind]
      if (typeof src === "string" && src.trim()) {
        console.warn(
          `VideoTimelineStudio: call ${calls.length} carried a ${kind} guide (${src}) — dropped; no compose arm reads a per-call ${kind} (the reference bus and the audio lanes own conditioning)`,
        )
      }
    }
    if (r.transition === "extend" || r.transition === "cut") {
      call.transition = r.transition
    }
    const refs: NonNullable<DocCall["refs"]> = {}
    const rr = r.refs !== null && typeof r.refs === "object" && !Array.isArray(r.refs)
      ? r.refs as Record<string, unknown>
      : {}
    const im = joinRefList(rr.images ?? r.ref_images)
    const vi = joinRefList(rr.videos ?? r.ref_videos)
    const au = joinRefList(rr.audios ?? r.ref_audios)
    // THE MODS SEAT (2026-10-26, the persistence audit's CRITICAL-1):
    // refs.mods is studio-authorable (the ModsBucket's picked
    // .safetensors stems) and compose-read (RefMods loader) — a
    // hydrate that drops it is "close/reopen, chips gone" on this
    // lane. Engine-side PATH entries, same comma-string law.
    const mo = joinRefList(rr.mods)
    if (im) refs.images = im
    if (vi) refs.videos = vi
    if (au) refs.audios = au
    if (mo) refs.mods = mo
    if (Object.keys(refs).length) call.refs = refs
    // Per-call knobs: vocabulary-gated hydration — a foreign key is
    // dropped with a warning, NEVER re-sent (the card's compose
    // reads only its declared knobs; the UI must not author others).
    // Legacy retired spellings migrate through LEGACY_KNOB_KEY first
    // (2026-09-17: the wire names are the only vocabulary now).
    if (r.knobs !== null && typeof r.knobs === "object") {
      const knobs: BeatKnobs = {}
      for (const [rawK, v] of Object.entries(r.knobs as Record<string, unknown>)) {
        const k = migrateCallKnobKey(rawK)
        if (!CALL_KNOB_KEYS.has(k)) {
          console.warn(`VideoTimelineStudio: dropping unknown call knob "${rawK}" (the card's knob vocabulary)`)
          continue
        }
        if (v === null || v === undefined || v === "") continue
        const target = knobs as unknown as Record<string, unknown>
        if (k === "length" || k === "steps" || k === "denoise"
            || k === "shift_video" || k === "shift_audio"
            || k === "sla_sparsity" || k === "sla_min_seq_len"
            || k === "sla_dense_last_steps" || k === "sharpen_strength"
            || k === "sharpen_radius" || k === "sharpen_threshold"
            || k === "sharpen_iterations" || k === "interp_multiplier") {
          const n = Number(v)
          if (Number.isFinite(n)) target[k] = n
        } else if (k === "sampler_name" || k === "sched_name") {
          if (typeof v === "string" && v.trim()) target[k] = v
        } else if (k === "sla_block_size") {
          if (v === "32" || v === "64" || v === "128") target.sla_block_size = v
        } else if (k === "sla_reference_protection") {
          if (v === "Off" || v === "Light" || v === "Heavy Enforcement") target.sla_reference_protection = v
        } else if (k === "sla_dense_backend") {
          if (v === "comfy_kitchen" || v === "pytorch" || v === "auto") target.sla_dense_backend = v
        } else if (k === "sla_dense_steps") {
          if (typeof v === "string" && /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/.test(v.trim())) {
            target.sla_dense_steps = v.trim()
          }
        } else if (k === "sharpen_method") {
          if (v === "rcas" || v === "adaptive_usm" || v === "high_pass" || v === "deconvolution") {
            target.sharpen_method = v
          }
        } else if (k === "interp_model") {
          if (v === "film_net_fp16.safetensors" || v === "rife47.pth") target.interp_model = v
        } else {
          // the boolean-valued keys + stringified forms
          const b = typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : undefined
          if (b !== undefined) target[k] = b
        }
      }
      if (Object.keys(knobs).length) call.knobs = knobs
    }
    calls.push(call)
  }
  if (calls.length === 0) return STARTER_CALLS
  // Sorted (plan_windows' vocabulary is sorted calls); NOT re-tiled — a
  // hand-authored gap stays visible and the compiler's refusal stays the
  // honest gate. The tenant's own writes always maintain contiguity.
  // (operator 2026-11-05: "I can't even run defaults" — a legacy or
  // drag-authored doc carried off-grid lengths and the compose
  // refused the WHOLE run. The heal snaps lengths onto their grid and
  // rebases the tiling: gaps die into contiguity, every window
  // becomes engine-renderable, and the compose's span gate stays
  // armed for anything that still slips through.)
  return healOffGridCalls(calls.sort((a, b) => a.start_frame - b.start_frame))
}

/** The keyframe pin channel's hydration (the keyframe lane's shape,
 *  2026-11-05: `{image, frame}` — FILM-absolute frame, square-grammar
 *  source). Forgiving like every channel: non-object rows and rows
 *  without a finite frame skip. LEGACY MIGRATION (the kinded rows —
 *  `{frame, kind, source}`): the `source` alias rides onto `image`
 *  for image-kind (and kind-absent) rows — no source lost; clip/audio
 *  rows drop with a LOUD warn (the pin channel is image pins only;
 *  a clip/audio diamond never had a compose meaning — the last_frame
 *  precedent: named, never silent). Sorted by frame (the plan
 *  vocabulary is sorted pins — hydrateCalls' own law). */
export function hydrateKeyframes(raw: unknown): DocKeyframe[] {
  if (!Array.isArray(raw)) return []
  const out: DocKeyframe[] = []
  for (const k of raw) {
    if (typeof k !== "object" || k === null) continue
    const r = k as Record<string, unknown>
    const frame = Number(r.frame)
    if (!Number.isFinite(frame)) continue
    const kind = typeof r.kind === "string" && r.kind !== "" ? r.kind : "image"
    const legacySource = typeof r.source === "string" ? r.source : ""
    const image = typeof r.image === "string" ? r.image : legacySource
    if (kind !== "image") {
      console.warn(
        `VideoTimelineStudio: keyframe at frame ${Math.round(frame)} carried kind "${kind}" — dropped; ` +
          `the pin channel is image pins (a ${kind} diamond had no compose meaning)`,
      )
      continue
    }
    out.push({ image, frame: Math.round(frame) })
  }
  return out.sort((a, b) => a.frame - b.frame)
}

/** The keyframes channel's persisted shape (the sorted-write law,
 *  2026-11-05): vocabulary-only rows `{image, frame}`, sorted by
 *  frame — the door never carries a stale kind/source spelling, and
 *  row order is the frame order (the retirement digest is
 *  order-sensitive, so both doors ride THIS serializer). */
export function serializeKeyframes(kfs: DocKeyframe[]): DocKeyframe[] {
  return [...kfs]
    .sort((a, b) => a.frame - b.frame)
    .map((k) => ({ image: k.image, frame: k.frame }))
}

export const hasKnobs = (c: DocCall): boolean =>
  !!c.knobs && Object.keys(c.knobs).length > 0

/** Document → bar prompts. end_frame inclusive; uuid is the call's index
 * (index-derived ids are stable for the life of a gesture — no gesture
 * spans a structural change, and every render re-derives consistently).
 * `override` = the call carries per-call knobs → the cyan dot (Layer C
 * shows where a call departs from the run's globals). */
export function callsToPrompts(calls: DocCall[], fps?: number): TimelinePrompt[] {
  // The clock default rides at read (the pin law, R2): an unstated
  // fps is undefined on Layer A — same fallback as stemToClip.
  const clock = typeof fps === "number" && fps > 0 ? fps : DEFAULT_SEGMENT_PARAMS.fps
  return calls.map((c, i): TimelinePrompt => ({
    uuid: `call-${i}`,
    // Compact clip header: index + duration scan before the prompt text
    // (the strip truncates long prompts — the prefix survives the cut).
    // (F-B1, 2026-11-05) the format face is the dictionary's
    // (the spanReadout class), not a literal — its consumption seat is
    // walled by studio-doc-calls' F-B1 arm.
    text: studioCopy.clipHeader(
      i,
      ((c.end_frame - c.start_frame) / Math.max(1, clock)).toFixed(1),
      c.text ?? "",
    ),
    start_frame: c.start_frame,
    end_frame: c.end_frame - 1,
    color: null,
    override: hasKnobs(c),
    // (Layer B) this call carries a reference-audio guide — the violet
    // speaker dot; absent = no reference audio for this window.
    audio: !!(c.audio ?? "").trim(),
    // (Layer B) total reference-image count: the guide image + the
    // per-call refs.images extras. 0 = no badge on the clip.
    refImages: (() => {
      const extras = splitRefList(c.refs?.images).length
      const guide = (c.image ?? "").trim() ? 1 : 0
      return extras + guide
    })(),
    // (F9) seam mode — rendered as a glyph at the clip's right edge so
    // the cut-vs-extend distinction is visible at a glance on the bar.
    // ABSENT = EXTEND (the stitching default — operator catch d
    // 2026-09-22: "the model chose hard cuts instead of our system
    // of stitching"; the card's spanOverlap law treats absent as
    // extend, the UI glyph must never disagree — only an explicit
    // "cut" reads as a cut).
    seam: c.transition === "cut" ? "cut" : "extend",
  }))
}

/** The chip thumb's displayable-source check (slice 3, 2026-11-05):
 *  the SHARED isImageUrl rule (card-base square.ts — the same law the
 *  Link2 groups ride: data:image/blob, or an http(s)/root-relative
 *  path with an image extension). Anything else is a bare artifact
 *  NAME (or a foreign seat) — the derived view resolves names through
 *  artifactIndex.byName, and an unresolvable name leaves the thumb
 *  ABSENT (the diamond-only chip — never a broken <img>).
 *
 * @param src the pin's square-grammar source.
 * @returns true when the source renders in an <img> verbatim. */
export function displayableThumbUrl(src: string): boolean {
  return src !== "" && isImageUrl(src)
}

/** Document keyframes → bar diamonds. Same index-derived uuid contract.
 *  Every pin rides the IMAGE track — the pin channel is image pins
 *  (the keyframe lane's design); the clip/audio lane decls stay for
 *  the strip's track table, they simply carry no diamonds. Legacy/
 *  frame-exact keyframes only — beat-attached guides are NOT lane
 *  diamonds (2026-08-15): the beat is one entity and its guides live in
 *  the beat panel; the lanes render only when the document actually
 *  carries hand keyframes. (Slice 3) a displayable source rides the
 *  chip's `thumbUrl` (displayableThumbUrl — names resolve in the
 *  derived view, never here: this mapper stays index-free). */
export function keyframesToLanes(kfs: DocKeyframe[]): TimelineKeyframe[] {
  return kfs.map((k, i): TimelineKeyframe => {
    return {
      uuid: `kf-${i}`,
      track_id: "image",
      frame: k.frame < 0 ? 0 : k.frame, // negative frames refuse at the plan
      // door (outside every window); the lane clamps them to 0 — the raw
      // value survives in the panel's frame field for exact editing.
      value: null,
      // (the key stays ABSENT, never undefined-valued: the pure-mapper
      // arms deepEqual the exact diamond shape)
      ...(displayableThumbUrl(k.image) ? { thumbUrl: k.image } : {}),
    }
  })
}

/** Calls → the persisted document shape (the `calls` vocabulary, Layer
 * B): guide keys ride ONLY when non-blank (blank = none — the planner's
 * contract, kept here so the saved doc never carries "" noise); knobs
 * ride only when non-empty, and every knob value is written VERBATIM
 * (undefined was never stored — the setter deletes the key, so absent
 * IS inherit, never null). The prompt is ONE `text` — segments were
 * cut 2026-09-15 (hydration joins old beats' texts; the serializer
 * never writes beats). */
export function serializeCalls(calls: DocCall[]): DocCall[] {
  return calls.map((c) => {
    const out: DocCall = {
      text: c.text ?? "",
      start_frame: c.start_frame,
      end_frame: c.end_frame,
    }
    for (const kind of GUIDE_KINDS) {
      const src = c[kind]
      if (src && src.trim()) out[kind] = src
    }
    // last_frame rides the same law (display-owned, compose-read —
    // the (e) cure: a lane the compose reads must serialize)
    if (c.last_frame && c.last_frame.trim()) out.last_frame = c.last_frame.trim()
    // first_frame_prev_sec is never written — cut 2026-09-20 (the
    // seam is automatic).
    if (c.transition === "extend" || c.transition === "cut") out.transition = c.transition
    // Per-call refs: the wire form is the COMMA STRING (the card's
    // wireList law — trimmed entries, empties absent). All four
    // buckets ride: images, videos, audios, mods (video_audios died
    // with the run-level refs panel — the bundle never mounted it).
    // Data:-aware split (an inline upload carries its own comma).
    // mods rides the same law (the persistence audit's CRITICAL-1:
    // the lane that compose-reads must serialize — engine-side
    // paths, no data: forms, but the split/join is shape-identical).
    if (c.refs) {
      const images = joinRefList(splitRefList(c.refs.images))
      const videos = joinRefList(splitRefList(c.refs.videos))
      const audios = joinRefList(splitRefList(c.refs.audios))
      const mods = joinRefList(splitRefList(c.refs.mods))
      if (images || videos || audios || mods) {
        out.refs = {
          ...(images ? { images } : {}),
          ...(videos ? { videos } : {}),
          ...(audios ? { audios } : {}),
          ...(mods ? { mods } : {}),
        }
      }
    }
    if (hasKnobs(c)) out.knobs = { ...c.knobs }
    return out
  })
}

export const callIndexOf = (id: string): number => {
  const i = Number(id.replace(/^call-/, ""))
  return Number.isInteger(i) ? i : -1
}
export const kfIndexOf = (id: string): number => {
  const i = Number(id.replace(/^kf-/, ""))
  return Number.isInteger(i) ? i : -1
}
