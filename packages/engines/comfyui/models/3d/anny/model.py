# anny — the character-maker lane's family head (C2 stopgap, the
# operator's 2026-09-04 order: "kimido (motion/pose) and anny —
# these can be stopgaps"). The ray character studio's ASSEMBLY
# surface reborn on our own poser pack: composite body+hair+outfit
# into one character GLB, render the 8-view turnaround, segment a
# source photo into hair/outfit sprites via SAM. The estimator
# (SMPLx identity) arc is deliberately deferred — this family is
# what the pack can honestly DO today.
#
# The class IS the unit (PYTHON SHAPE LAW); parity pinned by
# tests/walls/suites/test_python_models.py + the http goldens. SSOT law: this
# file REPLACES model.yaml + variants/.
#
# Lane truth (live-probed 2026-09-04, melite-poser-nodes on the
# managed ComfyUI): CompositeCharacter(body_glb_path; opt hair/
# outfit) → glb_path → RayRenderGLBViews(resolution/framing/focal/
# samples/transparent) → 8 view IMAGEs. RaySAMSegmentHairClothing
# (image) → hair_sprite + outfit_sprite PNGs in the output dir
# (OUTPUT node, ui "images"). The SAM checkpoint self-resolves
# (SAM_VIT_B_CHECKPOINT env > the canonical sams/ mount) — the
# lane_inputs row records the mount fact, no combo to feed.


from melite_models import  KnobRow,Model, Cell, LaneInputs, Provision, Quant, SourceRow, Studio, StudioKind, Variant, Genre, load_mod
from melite_models import (AuthoredParams, CharacterPreset, PresetOrigin,
                           PresetKnobs)

EstimateBodyVerb = load_mod(__file__, "verbs", "EstimateBodyVerb")
# stroke 3: the preset verbs ride the same file (one verb module per
# family; load_mod caches by stem — the second call is a lookup).
SavePresetVerb = load_mod(__file__, "verbs", "SavePresetVerb")
LoadPresetVerb = load_mod(__file__, "verbs", "LoadPresetVerb")
# fit-card stroke 3: dress/prop verbs (same file, same lookup).
DressVerb = load_mod(__file__, "verbs", "DressVerb")
PropVerb = load_mod(__file__, "verbs", "PropVerb")


# The declared neutral body (pilot stroke 2, 2026-09-05 — the first
# MODEL-DECLARED SLOT DEFAULT, design docs/design/anny-base-body.md):
# baked ONCE from the anny pip package (0.6.0) at constructor
# defaults — pose zeros, shape 0.5-fill, local-changes zeros — via the
# reference's own construction (references/anny-fit/annyfit/
# anny_wrapper.py) and the estate's established mesh export
# (references/multi-hmr2 save_results_image: trimesh Trimesh
# process=False → .export .glb; 10475 verts / 20908 faces). PYTHON
# SHAPE LAW rung 4: url+sha256+size_bytes, all-or-nothing.
# PUBLISHED 2026-09-05: huggingface.co/ProtoPomp/anny (the estate's
# live HF identity; Apache 2.0 — the anny pip package's own license
# at anny-0.6.0.dist-info/licenses/LICENSE, verified on disk; the
# NAVER non-commercial license binds AnnyFit + Multi-HMR 2, NOT the
# body model). Serve verified: 377360 bytes, sha round-trips.
_ANNY_BASE_BODY = Provision(
    name='anny-base-body.glb',
    url='https://huggingface.co/ProtoPomp/anny/resolve/main/anny/anny-base-body.glb',
    folder='anny',
    sha256='989eed67a59a4397ac61693e968bcea34504735d2e298eaa1885df6048a95b96',
    size_bytes=494404,
)


class Anny(Model):
    id = 'anny'
    genre = Genre.THREED
    label = 'Anny (character assembly)'
    description = 'Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.'
    engine = 'comfyui'
    card = 'anny'
    form = 'form_3d_anny'
    # The studio-body claim (the G-wall seam: every ui/studio body is
    # claimed by exactly one family). The anny tenant owns the 3JS
    # assembly stage (the shared Stage viewport — the Trellis/Anny/
    # Kimodo "render the same" order) plus the four part-slot subcards;
    # owns_params stays False (the kimodo shape: the body previews and
    # authors PARTS, the card composes — turnaround knobs ride the
    # shell's Node inputs fold + the standard detail form).
    studio = Studio(
        tenant='3d/anny', owns_params=False,
        kind=StudioKind.ASSEMBLY,
        writes=(
            'body_glb', 'source_image',
            # NO CHARACTER BAG (removed 2026-09-06, operator order
            # "NO LEGACY CODEBASE"): the ray-era Shape scratchpad
            # keys (identityModel/coeffs/localChanges/
            # customTargets) rode the wire from the retired body
            # card's bridge, nothing downstream read them, and the
            # family signature never declared them — every
            # Shape-touched Run died at the gate naming all four.
            # Its DECLARED successor (operator order "finish the
            # design", same day): 'sculpt' — the authored-dialect
            # draft (SculptDraft in the card schema) the bridge
            # autosaves, the estimate verb seeds, and Apply posts
            # verbatim. Declared here, typed there, accepted at
            # the gate.
            'sculpt',
            # the turnaround render params (the side-rail order,
            # 2026-09-06: "you didn't add the parameters") — the
            # RayRenderGLBViews knobs, surfaced as rail controls
            # writing through E1 exactly like slots.
            'resolution', 'framing', 'focal_length', 'samples',
            'transparent',
        ),
    )
    # the mounted verbs (SubAction pattern, design
    # docs/design/anny-evolution.md §3 — consumer #1): the estimate
    # verb's runs hydrate body_glb through the attach/writes door;
    # the preset verbs (stroke 3) save/load characters through the
    # tenant ledger + the anny-params flow; the dress/prop verbs
    # (fit-card stroke 3) seat outfits/weapons via the fit-seat flow
    # and hydrate the dressed/armed assembly back into body_glb.
    mods = (EstimateBodyVerb, SavePresetVerb, LoadPresetVerb,
            DressVerb, PropVerb,)
    source = SourceRow(
        repo_id='melite-poser-nodes',
        note='our own pack (vendor/comfyui_extensions/melite-poser-nodes) '
             '— the ray-era poser chain, stopgap arc 2026-09-04',
    )
    # the declared neutral body (see _ANNY_BASE_BODY above) — the
    # card's empty body_glb resolves to it at the phase-1 door.
    provisions = (_ANNY_BASE_BODY,)
    # the studio mannequin (2026-09-06): this provision streams on
    # the base-body door and shows in the viewport while the Body
    # slot is empty. NOTE rung-6 debt: compose.py carries its own
    # _BASE_BODY_NAME constant (another stroke's file, mid-flight —
    # converge on next touch; the wall pins THIS declaration names
    # a real provision).
    base_body = 'anny-base-body.glb'
    # The pack's nodes resolve the SAM checkpoint themselves (env >
    # canonical mount). The row records the mount fact for the lane.
    lane_inputs = LaneInputs(
        family='anny',
        model_path='sam_vit_b_01ec64.pth',
    )
    defaults = dict(
            resolution=768,
            framing=1.2,
            focal_length=50,
            samples=64,
            transparent=True,
        )
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='anny', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='anny'),
        )),
    )
    # estate character presets (stroke 3, 2026-09-06): the ray
    # archetypes, coefficient vectors VERBATIM from
    # packages/melite-3d/models/3d/composite_character/agents/
    # anny_phenotype_map.yaml (order: gender/age/muscle/weight/
    # height/proportions/cupsize/firmness/african/asian/caucasian).
    # The wall pins every vector exactly (inheritance, not drift).
    # The mapping doc's anime pair stays OUT: its local-change names
    # are unvalidated prose (the 189 live labels exist only where
    # the anny package installs — boarding a wrong name would be a
    # silent no-op morph).
    character_presets = (
        CharacterPreset(
            id='neutral', label='Neutral',
            description='Androgynous adult, flat-chested, no gender '
                        'markers. The DEFAULT — only for non-human or '
                        'deliberately androgynous characters.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.5, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='adult_female', label='Adult female',
            description='Young adult woman. NOTE: cupsize=0.45 is BELOW '
                        'neutral — still modest. Bump to 0.55-0.65 for '
                        'curvy/[REDACTED 2026-11-05].',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                1.0, 0.40, 0.35, 0.38, 0.52, 0.52, 0.45, 0.55,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='adult_male', label='Adult male',
            description='Adult male, average build, slight muscle.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.0, 0.45, 0.55, 0.50, 0.55, 0.50, 0.40, 0.55,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='child', label='Child',
            description='Young child (~7yr), androgynous, flat chest, '
                        'large head ratio, short limbs.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.5, 0.08, 0.15, 0.35, 0.20, 0.25, 0.00, 0.50,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='child_female', label='Child (female)',
            description='Young girl (~7yr), same as child but feminine '
                        'face shape.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                1.0, 0.08, 0.15, 0.35, 0.20, 0.25, 0.00, 0.50,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='teen', label='Teen',
            description='Androgynous teenager, slim build, minimal '
                        'secondary [REDACTED 2026-11-05] characteristics.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.5, 0.20, 0.25, 0.40, 0.35, 0.35, 0.20, 0.50,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='hero', label='Hero',
            description='Muscular male hero, broad shoulders, thick '
                        'chest, tall.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.0, 0.40, 0.75, 0.60, 0.65, 0.55, 0.40, 0.65,
                0.5, 0.5, 0.5))),
        CharacterPreset(
            id='elderly', label='Elderly',
            description='Elderly person, lower muscle, softer tissue, '
                        'shorter.',
            origin=PresetOrigin.base_params,
            params=AuthoredParams(phenotype=(
                0.5, 0.85, 0.30, 0.40, 0.45, 0.50, 0.45, 0.30,
                0.5, 0.5, 0.5))),
    )

    # the anny card surface (row 3, 2026-09-06 — thirteenth card in
    # the KnobRow migration). Seven rows: five direct injects onto
    # the headless-rendered graph (body_glb feeds the
    # PrimitiveString constant the composite node forceInputs) plus
    # the turnaround block. source_image is config-gated (the
    # LoadImage+SAM ingest lane builds only when set) — empty-inject
    # row, target comment-recorded. Card vocabulary throughout.
    card_knobs = (
        KnobRow(card='body_glb', inject='PrimitiveString.0.value', kind='s'),
        KnobRow(card='resolution', inject='RayRenderGLBViews.0.resolution', kind='n'),
        KnobRow(card='framing', inject='RayRenderGLBViews.0.framing', kind='n'),
        KnobRow(card='focal_length', inject='RayRenderGLBViews.0.focal_length', kind='n'),
        KnobRow(card='samples', inject='RayRenderGLBViews.0.samples', kind='n'),
        KnobRow(card='transparent', inject='RayRenderGLBViews.0.transparent', kind='b'),
        KnobRow(card='source_image', inject='', kind='s'),
    )

