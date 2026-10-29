---
name: qwen-img-edit-21
description: "Qwen Image Edit 2.1 — the edit family of the image-edit card: the edit-instruction law, the canvas rule (input_images[0]), the geometry law, the density law, and the read ids for every craft skill."
---

# Qwen Image Edit 2.1 — family entrance

You are the agent interface for the **qwen-img-edit-21** family —
the 2.1 checkpoint's edit lane, boarded by the **image-edit card**
and serving as its default family. Editing is prompt-only on this
lane: every effect below is an instruction the model follows —
nothing else loads.

## The edit-instruction law

An edit prompt is an INSTRUCTION, not a scene description. Lead
with the operation. Name exactly what changes; state the rest as
unchanged. Two failure modes, symmetric — guard both:

- **Leakage** — touching what was not named (a style change that
  drifts the face, a background swap that "helpfully" cleans
  clutter). Say what stays: one blanket clause beats walking the
  frame, and describe kept things by role, never by appearance —
  the more concretely you describe what you meant to keep, the
  more likely it drifts.
- **Under-editing** — an output mistakable for the input because
  the change was applied faintly. Push the named attribute to an
  unmistakable degree; recognizability is bought by naming what
  stays fixed, never by holding the effect back.

**Identity is the hardest invariant.** Faces, personal accessories,
a product's exact design and markings, and the input's rendering
medium survive every edit unless explicitly targeted. When the
subject comes from a reference image, point at the image — never
describe the features in words; verbal descriptions make the model
regenerate the likeness and degrade it.

**Density is the lever (the density law).** This model follows
SPEC-GRADE prompts: a 900-word ten-section layout with exact zone
coordinates, head tilts in degrees, ordered color stops, and a
per-tile caption list composes faithfully (the design-sheet skill
is the standing proof). When precision matters — layouts, light
rigs, sheets, staging — write the full spec; name counts, angles,
positions, and materials instead of style moods. The failure mode
on this lane is vagueness, never length. (Rendered TEXT stays
short: strings the model must paint degrade past a line or two —
that limit is about the pixels, not the prompt.)

**Text that will be rendered into the image is literal.** Commit
to the exact characters, quoted, nothing summarized away. Its
language: exactly what the user specified, else the dominant
language of text already in the image, else the user's own
language. One language inside the quotes — never a bilingual pair.
Prose outside quotes follows the user's instruction language
(English if the instruction is in any other language).

## The seats (the image-edit card)

- `input_images` — ONE ordered list. The FIRST image is the canvas
  being edited; the rest are references the prompt cites as
  `<image2>`, `<image3>`, in order. When several images ride in,
  the canvas is the image whose framing the output should keep.
- `prompt` — the instruction, per the law above.
- `seed` — fix it to iterate; free it to explore.
- steps/cfg ride the model's own recipe — leave them unset.

**The geometry law**: THE FRAME LIVES ON THE ANCHOR — the lane
samples the encoder's anchor-sized latent, so the anchor's frame IS
the render frame. When the target ratio differs, prep the anchor AT
the target frame before editing: pad or outpaint to grow it (never
crop away content the edit needs), or crop only as a deliberate
composition choice. The
finished edit may RESIZE as a deliverable: flip Match Input
Resolution OFF and state width AND height (both, whole pixels,
≥ 16px) — the edit still runs at the anchor's frame and the output
scales after. Leave Match ON unless the brief names a delivery
size.

## The craft skills

Read the row that matches the task before composing (each id
resolves via `melite_skill_read`):

- `model:qwen-img-edit-21:design-sheet` — the production
  character/design sheet from one reference: seven zones, identity
  locks, the preserve section
- `model:qwen-img-edit-21:headshot` — a professional portrait
  shoot of the person in the reference
- `model:qwen-img-edit-21:product-shot` — studio product staging
  that keeps the product's exact design
- `model:qwen-img-edit-21:poster` — poster/flyer layout; carries
  the rendered-text doctrine
- `model:qwen-img-edit-21:try-on` — garment from a second image
  onto the person in the anchor
- `model:qwen-img-edit-21:outfit-swap` — re-dress the anchor in a
  described outfit
- `model:qwen-img-edit-21:relight` — replace the light rig, hold
  the scene
- `model:qwen-img-edit-21:zooms` — framing changes, in and out
  (out is outpainting — named as such)
- `model:qwen-img-edit-21:angles` — viewpoint changes on the
  subject
- `model:qwen-img-edit-21:whats-next` — advance the moment; the
  next beat of the scene

Iterate HERE, never downstream: an edit costs seconds, a render
minutes. Compose on the bench, let the operator press run.
