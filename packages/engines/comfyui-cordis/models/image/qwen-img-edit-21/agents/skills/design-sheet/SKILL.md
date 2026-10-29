---
name: design-sheet
model: qwen-img-edit-21
description: "Production character/design sheet from one reference — the verbatim drafting contract: identity locks, design system, seven zones, ten sections. Use for full turnaround sheets and video references."
---

# Design Sheet

## What it is, and which sheet to reach for

A design sheet is a single 3:2 landscape image carrying a character
or object from every angle a downstream lane needs to re-identify
it, built FROM one reference image — the reference is the sole
identity and design source. This is the edit-lane sheet: the full
production layout for subjects DEFINED by their details (weapons,
gear, powers, signature optical effects, asymmetries).

For a plain human in plain clothes, the simple four-panel
turnaround is enough and cheaper — that is the OTHER sheet: the
`character-sheet` skill on the qwen-img-21 family. Route: plain
subject → four-panel; accessorized/defined-by-details subject →
this sheet.

The sheet is input, not a deliverable: pass it as the reference or
first frame to the video lane (the estate's H3 timeline composes
on it directly).

## The drafting contract (verbatim)

The community's architect instruction, verbatim — the author's
clean text (LeebLaab's Qwen 2.1 workflow, original credit
BleynSpecnaz), from
github.com/leeblaab/ComfyUI-Workflows. YOU are the architect: the
reference image and the entity name are the input, and the ten
sections you draft become the edit prompt below.

```text
# ROLE
You are a Character Sheet Prompt Architect. Input: ONE reference image + entity name. Output: ONE complete, production-ready character/design sheet prompt for a diffusion model. The reference image is the sole identity and design source.

## OUTPUT CONTRACT
- Exactly ten numbered sections ("1." … "10."), each ONE paragraph, no line breaks inside sections.
- No preamble, no markdown fences, no JSON, no notes.
- Descriptive prose: English.
- Every string rendered as visible text inside the sheet: English only (user-given proper nouns excepted), in double quotes, exact spelling and capitalization, monolingual.
- No pixel resolutions; sheet ratio expressed only as "3:2 landscape composition".
- Density: 60–180 words per section, 900–1600 words total.

## INTERNAL STEPS (do not output)
STEP 0 — VISUAL AUDIT: classify ENTITY_TYPE ∈ {ANIMAL, STYLIZED_CHARACTER, HUMAN, ROBOT, VEHICLE, OBJECT, CREATURE}; identify rendering medium; list only verifiable facts: face/head, hair/surface, accessories (with side), wardrobe, signature optical effects (exact color order + location), background, asymmetries. Never invent.
STEP 1 — IDENTITY LOCKS: condense audit into 4–7 precise bullets (color + shape + position). Must reappear in Sections 3 and 10 and drive Section 8 tiles.
STEP 2 — DESIGN SYSTEM:
- SIGNATURE GRADIENT: subject's most distinctive multi-color sequence (e.g. iridescent band) as ordered stops. If none, derive 3–4 stops from two dominant colors + intermediate. Used ONLY for: frame corner ticks, column divider, header dot icons, swatch borders, subject's own effect.
- HERO BACKDROP: replicate reference background (hue, gradient, particles). Reserved EXCLUSIVELY for hero panel.
- CLOSED PALETTE: ink black; warm dark gray / warm brown secondary text; pale silver metal accent (only if metal present); warm off-white paper; light warm gray hairlines; plus SIGNATURE GRADIENT. No other hue.
- TYPOGRAPHY: high-contrast Didone display serif → main title only; medium-bold warm dark gray letter-spaced uppercase sans-serif → section headers with gradient dot icons; regular small ink-black sans-serif → labels, values, captions.
STEP 3 — ZONE MAP (always these coordinates):
Frame: thin ink-black border inset 3% from every edge + signature-gradient corner ticks.
Zone A LEFT METADATA COLUMN: x 0–18%.
Zone B CENTRAL HERO: x 18–62%.
Zone C TOP-RIGHT TURNAROUND ROW: right block, y 8–30%.
Zone D MID-RIGHT ACTION PANEL: right block, y 30–62%.
Zone E BOTTOM-LEFT SILHOUETTE STUDY: lower-left quadrant.
Zone F BOTTOM-CENTER EXPRESSION/STATE STUDY: lower-middle.
Zone G BOTTOM-RIGHT DETAIL GRID: remaining lower-right area.
Hairline dividers between zones.

## SECTION-BY-SECTION SPEC
1. OVERALL CANVAS & GLOBAL RENDERING STYLE: State 3:2 landscape; warm off-white paper; frame + corner ticks; seven zones with exact coordinates; hairline dividers; global rendering clause matched to reference medium (anime: crisp variable-weight line art, soft cel shading, cinematic lighting; photoreal human: high-end live-action photography, accurate anatomy, no illustrated qualities; animal: naturalistic wildlife concept art; robot: hard-surface concept art with functional joints; object: premium photoreal product rendering; creature: fantastical creature concept art); hero-only backdrop sentence; cohesion sentence naming closed palette and typography.
2. LEFT METADATA COLUMN: Title = user-given name in quotes, Didone serif; caption in quotes = entity type words + " DESIGN SHEET" in letter-spaced uppercase sans; signature-gradient divider; three identity rows (icon + quoted uppercase label + quoted uppercase value) from three most identity-critical visible facts (default: hair, eyes, most distinctive accessory/marking); one row of three circular material swatches from real subject colors with quoted labels below; all left-aligned.
3. CENTRAL HERO VIEW: One dominant full-body figure (three-quarter acceptable for vehicles/large objects): pose (stance, weight leg, head tilt degrees, gaze, expression); FULL restatement of every identity lock (hair, eyes, skin, signature effect with exact color order and location, wardrobe with fabric behavior); cinematic light rig (key direction from reference, rim highlight, warm fill); hero-only backdrop with particles; caption in quotes "CENTRAL HERO VIEW" with gradient dot.
4. TOP-RIGHT TURNAROUND ROW: Header in quotes "TURNAROUND ROW" + dot; three full-body neutral views at IDENTICAL scale on thin ink-gray baseline with soft gray oval contact shadow: front (accessory side visible), clean side profile (hair/surface volume, effect catching light), back (nape/rear contour, effect glow); centered quoted labels "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
5. MID-RIGHT ACTION PANEL: Header in quotes "ACTION POSE REFERENCE" (OBJECT: "FUNCTIONAL CONFIGURATION REFERENCE"); three bust/detail views in rounded-corner light warm gray tiles: (a) heroic low angle, chin lifted ~15°, rim light, effect flaring; (b) overhead high angle, chin tucked, fringe/upper surface casting shadow; (c) characteristic state — default humanoid: head tilted back ~20° gazing up with effect glow; machines/objects: defining operating state; centered quoted labels ("LOW ANGLE SHOT", "OVERHEAD HIGH ANGLE", "UPWARD GAZE" or state names).
6. BOTTOM-LEFT SILHOUETTE STUDY: Header in quotes "SILHOUETTE STUDY" + dot; three solid ink-black silhouettes with zero interior detail preserving exact outline: frontal (bangs/upper edge arc), pure profile (nose, chin, mouth, mass behind neck), rear (layered edges; signature-tinted rim allowed only here); triangular composition, profile largest at center; tiny quoted labels "FRONTAL", "PROFILE", "REAR".
7. BOTTOM-CENTER EXPRESSION/STATE STUDY: Three compact head studies on shared baseline, keeping exact eye shape and face proportion: neutral (calm closed mouth, relaxed brows); then two contrasting states — default humanoid: surprised (wide round eyes, raised brows, O mouth) and smiling (open-mouth grin, curved happy eyes); ANIMAL/CREATURE: alert and relaxed/aggressive; ROBOT/VEHICLE/OBJECT: powered-off/idle, active, stressed; tiny centered quoted labels.
8. BOTTOM-RIGHT DETAIL CLOSE-UP GRID: Header in quotes "DETAIL CLOSE-UPS" + dot; six rounded-corner square tiles, two rows of three, each extreme macro render with centered quoted caption from ACTUAL observed colors/materials/sides. Mandatory tile order for characters: (1) eye macro, round white catchlight upper left, lash strokes, iris gradient; (2) hair/surface strands under sunlight with layered highlights; (3) accessory macro on exact body side with metallic/material glint; (4) signature optical effect painted across skin/base material as horizontal bands in exact color order; (5) wardrobe fabric weave with sheen on fold ridges, gray gradient in creases; (6) facial profile edge macro: nose bridge, lip line, jaw contour. For non-characters: six most identity-critical features keeping same tile discipline.
9. TYPOGRAPHY HIERARCHY & PALETTE DISCIPLINE: Restate: Didone reserved for hero title only; headers medium-bold warm dark gray letter-spaced uppercase sans with gradient dot icons; labels/values/captions regular small ink-black sans, left-aligned in column, centered under tiles; single signature gradient reused for title underline, header dots, swatch borders, panel corner ticks; all containers warm off-white with light warm gray borders; hero backdrop exclusive to hero panel; closed palette restated; medium consistency restated.
10. IDENTITY PRESERVATION CONSTRAINTS: Open with "Preserve the exact visible design of <Name> from the reference image across all views and tiles:" then one "same …" clause per lock (hair incl. bangs and side locks; eye color AND identical eye shape; accessory with exact side; signature effect running through exact location; wardrobe with identical fabric behavior). Commands: do not redesign, beautify, age-shift, simplify, add accessories; keep reference medium throughout. Close with negative block: no extra character/object, no identity/species/wardrobe/material drift, no inconsistent markings, no changed proportions, no missing extremities, no duplicated limbs, no merged views, no overlapping panels, no logo/watermark/decoration; every rendered text string must appear exactly as quoted above in English with exact spelling and capitalization.

## GOVERNING RULES
- Anchor on image: every spatial/tonal/material claim from what is visibly there.
- Identity invariants survive every zone: face identity, accessory side/count, markings, rendering medium.
- Scale and anatomy discipline: turnaround figures identical scale; all extremities visible; handedness/asymmetry consistent.
- Only what was asked: sheet construction only; never "clean up" or improve subject.
- Labels: English only, short, legible; no lore paragraphs.
- Quoted-string audit: each quoted string monolingual English, exact, and actually needed as rendered text.

## FINAL SELF-CHECK (internal, then output)
(1) Exactly ten numbered single-paragraph sections? (2) Zone coordinates in Section 1? (3) Every audit lock in Sections 3 and 10 and reflected in Section 8 tiles? (4) Signature gradient color order identical in every mention? (5) Accessory side identical in every mention? (6) Hero backdrop only in Sections 1 and 3? (7) All quoted labels defined once and reused verbatim? (8) Nothing invented? If any check fails, rewrite internally, then emit ONLY the ten sections.

# USER
Entity name: {{name}}
```

## Running the contract on this lane

- The contract's OUTPUT CONTRACT (no fences, no JSON) governs the
  DRAFT — here the draft's destination is the edit prompt itself,
  not a chat reply: the ten sections go into `prompt` verbatim.
- The `{{name}}` seat is the entity name the user gives (the
  sheet's title); everything else comes from looking at the
  reference.
- THE FRAME LIVES ON THE ANCHOR: the lane samples the encoder's
  anchor-sized latent — the anchor's frame IS the render frame — so
  prep the anchor AT the target frame (pad or outpaint the reference
  to 3:2; poster's instinct). NEVER crop first: cropping to the ratio
  destroys pixels the sheet needs. The card's width/height pair
  (match OFF) is the DELIVERY resize of the finished edit, never a
  render size; the contract's own "no pixel resolutions" rule and
  this agree — the ratio rides the anchor's frame, never the prompt.
- The density law at work: 900–1600 words is not a risk on this
  model — it is the design. Draft the full spec. The tripwire cuts
  the other way too: a prompt under ~200 words cannot render a
  designed layout — one paragraph per zone, every rendered string
  quoted.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the reference cropped to 3:2], the ten-section draft in `prompt`,
a fixed seed. Lock the draft with the seed in the character's
record so the sheet regenerates identically on iteration; hand the
sheet to the edit or video lane as the identity reference.

## Worked example — a complete ten-section draft

The one clean run in the record consumed a draft of exactly this
shape verbatim (provenance: run `run-a3368f43ccea` — the run's own
request carried this draft as its prompt, 1,708 words, ten
sections, anchor already 1536×1024 at 3:2, no card size pair, no
post-render resize). Read it as the
contract demonstrated, not as a template to copy: every zone is
placed, every label is quoted, the identity locks are restated in
full in §3 and again in §10.

1. 3:2 landscape composition on warm off-white paper with a thin ink-black border inset 3% from every edge and signature-gradient corner ticks in a deep teal to vivid gold to pale silver sequence; seven zones are defined as Zone A left metadata column x 0–18%, Zone B central hero x 18–62%, Zone C top-right turnaround row y 8–30%, Zone D mid-right action panel y 30–62%, Zone E bottom-left silhouette study in the lower-left quadrant, Zone F bottom-center expression study in the lower-middle, and Zone G bottom-right detail grid in the remaining lower-right area, all divided by light warm gray hairlines; global rendering style is stylized anime character illustration with crisp variable-weight line art, soft cel shading, and cinematic lighting, matching the reference medium of painterly digital game art; the hero-only backdrop is a dim torchlit underworld hall with warm ember glow and drifting sparks, exclusive to Zone B; cohesion holds through a closed palette of ink black, warm dark gray, pale silver metal accent, warm off-white paper, and light warm gray hairlines plus the signature gradient used strictly on frame ticks, header dots, swatch borders, and the subject's own effects; typography pairs a Didone display serif for the title only with medium-bold letter-spaced uppercase sans-serif headers and regular small ink-black sans-serif labels.

2. The left metadata column shows the title "HERA" in Didone serif above the quoted caption "STYLIZED CHARACTER DESIGN SHEET" in letter-spaced uppercase sans-serif, separated by a signature-gradient divider line; three identity rows appear with circular icons and quoted uppercase label and value pairs reading "HAIR" "SILVER-WHITE UPDO WITH TEAL STREAKS", "EYES" "DEEP RED WITH BOLD DARK LINER", and "CROWN" "TALL GOLD WITH TEAL GEM", derived directly from visible reference facts; beneath them a single horizontal row of three circular material swatches displays the exact subject colors with quoted labels "INK BLACK SILK", "VIVID GOLD FILIGREE", and "DEEP TEAL FEATHER" centered under each swatch; every element is strictly left-aligned inside the x 0–18% boundary and set in regular small ink-black sans-serif, spaced consistently with no decorative embellishment beyond the reference.

3. The central hero view presents one dominant full-body figure of a tall, full-figured goddess standing with her weight on her right leg and her left hip slightly advanced, chin lowered about five degrees, gaze level and commanding, mouth set in a composed and faintly amused expression; the full identity restatement follows: deep brown skin with warm undertones and a soft sheen across the cheekbones, silver-white hair swept into an elaborate volume atop her head with vivid teal streaks framing the temples and loose strands falling forward, deep red almond eyes with heavy dark liner, and a tall ornate gold crown set with a teal gem rising above her brow; she wears a structured black gown with ornate gold filigree along the neckline and shoulders, a heavy gold collar carrying round gold pendants, large gold hoop earrings, and a layered mantle of deep teal feathers over both shoulders; the light rig keys warm from the upper right with a gold rim tracing her crown, hairline, and shoulder edge, and a warm fill lifting the shadowed side of her face; the hero backdrop holds dim sandstone columns, warm ember glow and drifting sparks exclusively behind her; the caption "CENTRAL HERO VIEW" sits beneath in quotes with a signature-gradient dot.

4. The turnaround row header reads "TURNAROUND ROW" in quoted medium-bold warm dark gray letter-spaced uppercase sans-serif preceded by a signature-gradient dot; three full-body neutral views render at identical scale upon a thin ink-gray baseline with a soft gray oval contact shadow beneath each figure: the front view shows the gold collar and the teal feather mantle fully, the clean side profile reveals the volume of the silver-white updo and the crown's profile silhouette with the feather mantle catching warm light along its edge, and the back view shows the nape below the swept-updo mass, the rear contour of the crown, and the mantle draping down both shoulder blades; centered quoted labels "FRONT VIEW", "SIDE VIEW", and "BACK VIEW" sit beneath their respective figures in regular small ink-black sans-serif, aligned and proportionally spaced inside the y 8–30% zone boundary.

5. The mid-right action panel header states "ACTION POSE REFERENCE" in quoted medium-bold warm dark gray letter-spaced uppercase sans-serif with a signature-gradient dot; three bust studies sit in rounded-corner light warm gray tiles depicting a heroic low angle shot with her chin lifted roughly fifteen degrees, warm rim light along her jaw and gold collar, and the teal feather mantle flaring outward against the ember glow of the hall behind her; an overhead high angle view with her chin tucked, the crown's top surface casting a defined shadow across her forehead and the mantle's feather layering compressed under the top-down light; and a characteristic upward gaze state with her head tilted back about twenty degrees looking upward and her eyes catching the warm ember light as the collar pendants shift against her chest; centered quoted labels "LOW ANGLE SHOT", "OVERHEAD HIGH ANGLE", and "UPWARD GAZE" appear beneath each tile in regular small ink-black sans-serif, uniformly sized and positioned within the y 30–62% zone.

6. The bottom-left silhouette study header displays "SILHOUETTE STUDY" in quoted medium-bold warm dark gray letter-spaced uppercase sans-serif with a signature-gradient dot; three solid ink-black silhouettes with zero interior detail preserve the exact outline: the frontal silhouette shows the crown's tall spires above the updo's arc and the feather mantle broadening both shoulders, the pure profile captures the crown's forward spike, the nose line, the chin projection and the mass of hair behind the neck, and the rear view shows the layered edges of the mantle feathers and the gown's flared hem; the triangular composition places the profile largest at the center flanked by the smaller frontal and rear variants; tiny quoted labels "FRONTAL", "PROFILE", and "REAR" sit beneath each silhouette in regular small ink-black sans-serif, minimal in size and precisely centered within the lower-left quadrant.

7. The bottom-center expression study presents three compact head studies on a shared baseline that keep her exact eye shape, brow weight, and face proportion: the neutral state shows a calm closed mouth with relaxed brows and level gaze; the surprised state widens her deep red eyes into full round shapes with raised arched brows and a small open O mouth; the smiling state shows an open-mouth grin with the corners lifted, curved happy eyes with visible liner flicks, and the teal streaks beside her temples swinging slightly forward; her crown stays fixed in all three studies at the identical height on her brow, and the gold hoop earrings remain in the same position; tiny centered quoted labels "NEUTRAL", "SURPRISED", and "SMILING" appear beneath each head in regular small ink-black sans-serif on one aligned baseline inside the lower-middle zone.

8. The bottom-right detail close-up grid header reads "DETAIL CLOSE-UPS" in quoted medium-bold warm dark gray letter-spaced uppercase sans-serif with a signature-gradient dot; six rounded-corner square tiles in two rows of three hold extreme macro renders with centered quoted captions taken from observed colors and materials: the top row contains "EYE MACRO" showing a deep red iris with a gradient from warm crimson to dark maroon, a round white catchlight at the upper left, and sharp lash strokes, "HAIR STRANDS" showing silver-white strands under warm sunlight with teal streaks layered through the highlights, and "CROWN FILIGREE" showing the engraved gold crown surface with the teal gem's glint and fine chased detail; the bottom row contains "FEATHER MANTLE" showing overlapping deep teal feathers with a graded sheen along each quill, "GOLD COLLAR" showing the round pendants with warm metallic reflection and soft shadow behind them, and "PROFILE EDGE" showing the nose bridge, the red lip line and the jaw contour in soft side light; all captions use regular small ink-black sans-serif centered beneath their tiles.

9. Typography hierarchy reserves the Didone display serif exclusively for the hero title "HERA" while every section header uses medium-bold warm dark gray letter-spaced uppercase sans-serif preceded by a signature-gradient dot icon; labels, values and captions use regular small ink-black sans-serif, left-aligned inside the metadata column and centered beneath tiles and figures; the single signature gradient sequence of deep teal into vivid gold into pale silver reappears without deviation on the title underline, the header dot icons, the material swatch borders and the frame corner ticks; all container panels rest on warm off-white or light warm gray bases with light warm gray border definitions keeping them visually separate; the dim torchlit hall backdrop with ember glow and drifting sparks remains exclusive to the central hero panel in Zone B and never appears in another zone; closed palette discipline restricts the whole sheet to ink black, warm dark gray, pale silver metal accent, warm off-white paper, light warm gray hairlines and the signature gradient; medium consistency requires stylized anime illustration with crisp line art and soft cel shading in all ten sections without stylistic drift.

10. Preserve the exact visible design of "HERA" from the reference image across all views and tiles: the same deep brown skin with warm undertones and soft cheekbone sheen; the same silver-white hair in an elaborate swept-updo with vivid teal streaks at the temples and loose falling strands; the same deep red almond eyes with bold dark liner and the same eye shape; the same tall ornate gold crown set with a teal gem rising above the brow; the same heavy gold collar with round pendants, large gold hoop earrings and gold filigree bracelets; the same structured black gown with ornate gold filigree along the neckline and shoulders; the same layered deep teal feather mantle across both shoulders; do not redesign the face, do not beautify or age-shift her, do not simplify the crown's filigree or the mantle's feather layering, do not move the gem or change its color, do not add accessories or markings absent from the reference, and keep the stylized anime illustration medium throughout; no extra character, object or environmental element beyond the specified zones; no identity, wardrobe or material drift; no changed proportions or limb lengths; no missing extremities, duplicated limbs, merged views or overlapping panels; no logo, watermark or decorative embellishment; every rendered text string must appear exactly as quoted above in English with exact spelling and capitalization.
