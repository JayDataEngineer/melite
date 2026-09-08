# anny's estimate verb — the FIRST SubAction (consumer #1 of the
# pattern, never the specification).
#
# ONE verb, ONE engine (operator order, 2026-09-06, verbatim:
# "I ONLY WANT HTE COMMERICAL FLOW. I DON't WANT A DROPDOWN DUDE"
# — the engine vocabulary is ROWS, design
# docs/design/anny-evolution.md §3, and this verb's row is the
# licensed SAM 3D Body chain — design
# docs/design/commercial-estimator-chain.md). No picker, no
# research lane, no dead refine button: the chip is one button that
# posts anny-hmr-commercial.
#
# The verb's knob block (person_index) rides HERE — never the card
# surface (zone-law rule 2). The interim chip renderer
# (ui/studio/component.tsx ANNY_VERBS) speaks this declaration's
# id + engine flows; the wall pins the parity.

from melite_cards import Number, Select, SubActionMod, Text, VerbEngine


class EstimateBodyVerb(SubActionMod):
    id = "hmr-estimate"
    label = "Estimate body from photo"
    engines = (
        VerbEngine(id="commercial", flow="anny-hmr-commercial"),
    )
    writes = ("body_glb",)
    requires = ("melite-kimodo-nodes",)
    # the verb's OWN knob (which detected person to fit) — the card
    # schema gate never sees it; the eager run's invocation doc does.
    person_index = Number(label="Person", default=0, min=0, step=1,
                          tooltip="Which detected person to fit (0 = "
                                  "the most confident detection).")


class DressVerb(SubActionMod):
    """Seat an outfit onto the stage character (fit-card stroke 3).

    The dress engine posts flows/fit-seat/flow.py: FitRow assembles the
    meld row from THESE knobs, FitProp grafts, the turnaround proves.
    Knob NAMES equal the flow initials (the handshake — a rename here
    silently drops the value at the flow door, pinned by the stroke-3
    wall). The body comes from the stage Body slot (never a knob —
    knobs ∩ card fields would leak onto the surface); the dressed
    assembly hydrates body_glb through writes. Socket-law defaults
    (coat onto Spine); hats/fit/grip cases edit the knobs."""
    id = "dress"
    label = "Dress with outfit"
    engines = (
        VerbEngine(id="seat", flow="fit-seat"),
    )
    writes = ("body_glb",)
    requires = ("melite-poser-nodes",)
    prop = Text(label="Outfit GLB", required=True,
                tooltip="The outfit/prop mesh (.glb estate path or run artifact ref).")
    model_name = Text(label="Prop name", default="",
                      tooltip="Unity lookup name — the chip fills the outfit filename stem; empty seats as 'prop'.")
    bone = Text(label="Bone", default="mixamorig:Spine",
                tooltip="Which bone carries the outfit (coat: Spine, hat: mixamorig:Head).")
    align = Select(label="Law", default="socket",
                   options=["socket", "fit", "grip"],
                   tooltip="socket: hang (coat); fit: measure + scale (hat); grip: hand-lock (weapon — the prop verb's default).")
    position = Text(label="Offset", default="0,0,0",
                    tooltip="x,y,z meters added after the law (grip forbids non-zero).")
    rotation = Text(label="Rotation", default="0,0,0",
                    tooltip="x,y,z Unity degrees applied pre-seat (grip forbids non-zero).")
    fit_ratio = Number(label="Fit ratio", default=0, min=0, step=0.01,
                       tooltip="fit law: prop width as a fraction of the bone span (hat: 1).")
    fit_ref_bone = Text(label="Measure to", default="",
                        tooltip="fit law: the span's far bone (required when fit_ratio > 0).")
    fit_ref_bone2 = Text(label="Measure from", default="",
                         tooltip="fit law: the span's near bone (hat: mixamorig:Neck).")
    seat_ratio = Number(label="Seat ratio", default=0.22, min=0, max=1, step=0.01,
                        tooltip="How far down the span the prop seats (hat: 0.22). Grip ignores this.")
    finger_bone = Text(label="Finger bone", default="",
                       tooltip="grip law: the blade-axis finger (weapon: mixamorig:RightHandMiddle1).")
    thumb_bone = Text(label="Thumb bone", default="",
                      tooltip="grip law: the clamp thumb (weapon: mixamorig:RightHandThumb1).")
    target_width = Number(label="Target width", default=0, min=0, step=0.01,
                          tooltip="grip law: scale-then-grip width in meters (sword: 0.25). fit forbids non-zero.")


class PropVerb(SubActionMod):
    """Lock a weapon/prop into the character's hand (fit-card stroke 3).

    The same fit-seat engine with grip-law defaults (sword into
    RightHand on RightHandMiddle1, 0.25 m scale-then-grip). Same
    handshake, same writes, same requires as DressVerb — one engine,
    two knob blocks."""
    id = "prop"
    label = "Seat prop in hand"
    engines = (
        VerbEngine(id="seat", flow="fit-seat"),
    )
    writes = ("body_glb",)
    requires = ("melite-poser-nodes",)
    prop = Text(label="Prop GLB", required=True,
                tooltip="The weapon/prop mesh (.glb estate path or run artifact ref).")
    model_name = Text(label="Prop name", default="",
                      tooltip="Unity lookup name — the chip fills the prop filename stem; empty seats as 'prop'.")
    bone = Text(label="Bone", default="mixamorig:RightHand",
                tooltip="Which bone carries the prop (weapon: the hand).")
    align = Select(label="Law", default="grip",
                   options=["socket", "fit", "grip"],
                   tooltip="grip: hand-lock (weapon default); socket/fit: hang or measure a carried prop.")
    position = Text(label="Offset", default="0,0,0",
                    tooltip="x,y,z meters added after the law (grip forbids non-zero).")
    rotation = Text(label="Rotation", default="0,0,0",
                    tooltip="x,y,z Unity degrees applied pre-seat (grip forbids non-zero).")
    fit_ratio = Number(label="Fit ratio", default=0, min=0, step=0.01,
                       tooltip="fit law only (grip + socket leave 0).")
    fit_ref_bone = Text(label="Measure to", default="",
                        tooltip="fit law: the span's far bone.")
    fit_ref_bone2 = Text(label="Measure from", default="",
                         tooltip="fit law: the span's near bone.")
    seat_ratio = Number(label="Seat ratio", default=0.22, min=0, max=1, step=0.01,
                        tooltip="socket/fit seating depth. Grip ignores this.")
    finger_bone = Text(label="Finger bone", default="mixamorig:RightHandMiddle1",
                       tooltip="grip law: the blade-axis finger.")
    thumb_bone = Text(label="Thumb bone", default="mixamorig:RightHandThumb1",
                      tooltip="grip law: the clamp thumb.")
    target_width = Number(label="Target width", default=0.25, min=0, step=0.01,
                          tooltip="grip law: scale-then-grip width in meters (sword: 0.25).")


class RigSomaxVerb(SubActionMod):
    """Convert the stage body to a SOMAX rig (pipeline step c).

    Operator musing, implemented as an anny verb (never a dropdown on
    the card): posts flows/body-to-somax/flow.py — the autorig pack\u2019s
    BAKED SOMA-77 template weight transfer behind the scenes — and the
    rigged assembly hydrates body_glb through writes. KNOBLESS: the
    conversion takes no parameters; the stage Body feeds the flow\u2019s
    `glb` initial (the dress-verb body-slot shape). Requires the
    autorig pack, never the poser pack.
    """
    id = "rig-somax"
    label = "Convert to SOMAX rig"
    engines = (
        VerbEngine(id="convert", flow="body-to-somax"),
    )
    writes = ("body_glb",)
    requires = ("melite-autorig-nodes",)

class ApplySkinVerb(SubActionMod):
    """Coat the stage character with seeded skin detail (skin-card stroke 3).

    The apply-skin engine posts flows/skin-apply/flow.py: SkinPack
    generates the seeded maps, SkinSidecar assembles the controller
    sidecar from THESE knobs, SkinApply grafts, the turnaround proves.
    Knob NAMES equal the flow initials (the handshake — a rename here
    silently drops the value at the flow door, pinned by the stroke-3
    wall). The body comes from the stage Body slot (never a knob); the
    skinned assembly hydrates body_glb through writes. Tint stays DATA
    (the kind sidecar), never baked — the 6 textures / infinite kinds
    economy survives the verb path too.
    """
    id = "apply-skin"
    label = "Apply skin detail"
    engines = (
        VerbEngine(id="coat", flow="skin-apply"),
    )
    writes = ("body_glb",)
    requires = ("melite-poser-nodes",)
    kind = Select(label="Kind", default="keeper",
                  options=["keeper", "ash_nomad", "villager_elder",
                            "villager", "caravan_trader", "amf_warden",
                            "cherusci_scrivener", "marrow_raider",
                            "amalgam_horror", "arena_factor", "bone_crane",
                            "dune_hound", "emberwing", "gloom_tortoise",
                            "husk_stalker", "ironvein_construct",
                            "meld_creature", "moss_elk", "ridge_lizard",
                            "sand_skimmer"],
                  tooltip="Which meld kind skins the body (tint stays data in the sidecar).")
    map_size = Select(label="Map size", default="512",
                      options=["256", "512", "1024", "2048"],
                      tooltip="Detail-map resolution (SkinPack + SkinSidecar must agree — one knob feeds both).")
    seed = Number(label="Seed", default=20260906, min=0, step=1,
                  tooltip="The deterministic detail seed (SKIN_SEED — same seed, same pores).")

class SavePresetVerb(SubActionMod):
    """Save the current character into the tenant ledger (stroke 3).

    A TENANT-LOCAL verb (local engine — synchronous gateway work,
    never a queue slot): the studio POSTs the stage snapshot to the
    presets door, which validates + appends the user row. writes is
    EMPTY — a ledger write hydrates no card field (contract-pinned).
    """
    id = "preset-save"
    label = "Save character as preset"
    engines = (
        VerbEngine(id="save", local="save-preset"),
    )
    writes = ()
    requires = ()
    # the verb's OWN knob: the new row's label. The snapshot (origin
    # + params/refs + knobs) rides the POST body, never the
    # declaration.
    name = Text(label="Preset name", required=True,
                tooltip="Label for the saved character row.")


class LoadPresetVerb(SubActionMod):
    """Load a character preset (stroke 3): estate archetype or user
    row → params→GLB instantiation through the queue door → the GLB
    hydrates body_glb via writes. File-origin rows carry no params
    and never reach this verb (the studio applies their mesh via the
    attach door — no queue slot for a file copy)."""
    id = "preset-load"
    label = "Load character preset"
    engines = (
        VerbEngine(id="instantiate", flow="anny-params"),
    )
    writes = ("body_glb",)
    requires = ("melite-kimodo-nodes",)
    # the verb's OWN knob: which row. Estate + user ids merge at
    # RUNTIME (the studio fetches the presets door) — the declaration
    # names the knob, never the list.
    preset_id = Text(label="Preset", required=True,
                     tooltip="Estate archetype id or user row id "
                             "(user-N).")
