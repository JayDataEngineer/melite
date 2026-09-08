# skin — the character-skinning interface card, PYTHON surface.
#
# ONE CARD, ONE FAMILY (stroke 2): deterministic detail maps onto ANY
# somax-UV body (anny, upload, trellis) + the kind sidecar + 8 proof
# views. The card owns BYTES (skinned GLB + albedo/normal PNGs +
# kind.json); Unity owns LAW (CharacterSkinController consumes the
# sidecar tint row; the shader stays URP Lit, never Graph).
#
# Tint stays data (design §2): no tint knob — the table picks it.
# Age is NOT a knob (no foundation row in stroke 1; inventing knobs
# without rows violates the pattern — deferred, documented).

import os


from melite_cards import (ActionCard, Select, Number, Slider, File)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "3d"))

# the boarded family — the model IS the truth this card serves.
Skin = load_model_py(os.path.join(_MODELS_ROOT, "skin", "model.py"),
                     "comfyui")

# the 20 meld kinds (the card-owned skin_spec.py KIND_TABLE) — hardcoded options
# with a wall pinning equality (the fit align-options precedent: the
# card surface carries spellings, the schema carries law).
SKIN_KINDS = ["keeper", "villager", "villager_elder", "ash_nomad",
              "caravan_trader", "arena_factor", "amf_warden",
              "marrow_raider", "dune_hound", "sand_skimmer",
              "ridge_lizard", "moss_elk", "gloom_tortoise",
              "emberwing", "bone_crane", "husk_stalker",
              "ironvein_construct", "cherusci_scrivener",
              "amalgam_horror", "meld_creature"]


class SkinCard(ActionCard):
    id = 'skin'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Skin textures (albedo + normal)'),
        OutputRow(patterns=('.json',), label='Skin-kind sidecar'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 21
    sidebar = '3d'
    default_service = 'skin'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "skin"
    label = 'Skin'
    description = 'Deterministic skin detail maps onto a SOMAX body (kind sidecar + proof turnaround).'
    genre = '3d'
    icon = 'person'
    api = True
    ability = {"default_family": "skin"}
    models = (Skin,)
    requires = ('melite-poser-nodes',)
    body_glb = File(label="Body GLB", group="parts", order=0, required=True)
    kind = Select(label="Kind", group="skin", order=0, default="keeper", options=SKIN_KINDS)
    map_size = Select(label="Map size", group="skin", order=1, default="512", options=["256", "512", "1024", "2048"])
    seed = Number(label="Seed", group="skin", order=2, min=0, max=2**31 - 1, step=1, default=20260906)
    resolution = Slider(label="View resolution", group="turnaround", order=0, min=256, max=2048, step=64, default=768)
    framing = Slider(label="Framing", group="turnaround", order=1, min=1.0, max=3.0, step=0.05, default=1.2)
    focal_length = Slider(label="Focal length", group="turnaround", order=2, min=18, max=135, step=1, default=50)
    samples = Slider(label="Samples", group="turnaround", order=3, min=8, max=256, step=8, default=64)
    transparent = Select(label="Transparent", group="turnaround", order=4, default="true", options=["true", "false"])
