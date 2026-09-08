# krea-2's lora mod — the family flavor of LorasMod.
#
# ONE SYSTEM FOR MODS: LorasMod/LanPaintMod/ControlNetMod and every
# per-family flavor subclass the single Mod parent. The mod's catalog
# data (LoraRow rows) lives HERE, in the family's own mods/ package —
# not crammed into model.py. model.py declares:
#     mods = (Loras,)
# and the rows ride through the declaration, boot-validated.
#
# Every row carries its upstream source_url (resolve/ form) — the
# `user_provided=True` era (linkless rows, "the operator just has the
# files") is dead: no link, no row. Style loras + the Turbo step-
# reducer ride the official Comfy-Org/Krea-2 mirror (same repo the
# family's checkpoints pull from); realism and filterbypass3 are the
# community originals. Files land in COMFYUI loras/<filename>.

from melite_cards import LorasMod
from melite_models import LoraRow

_ORG = "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras"


class Loras(LorasMod):
    """krea-2's loras — the Raw-variant training set, applied on Turbo
    (train on Raw: 52 steps, CFG 3.5)."""
    pack = "loras"
    rows = (
        LoraRow(id="krea2_realism_lora",
                filename="krea-2/krea2_realism_lora.safetensors",
                source_url=("https://huggingface.co/gokaygokay/"
                            "Krea-2-Realism-LoRA/resolve/main/"
                            "krea2_realism_lora.safetensors"),
                label="Realism", category="photorealism",
                default_strength=0.7),
        LoraRow(id="krea2_turbo_lora_rank_64_bf16",
                filename="krea-2/krea2_turbo_lora_rank_64_bf16.safetensors",
                source_url=_ORG + "/krea2_turbo_lora_rank_64_bf16.safetensors",
                label="Turbo Rank-64 (BF16)", category="quality",
                default_strength=1.0),
        LoraRow(id="krea2_darkbrush",
                filename="krea-2/krea2_darkbrush.safetensors",
                source_url=_ORG + "/krea2_darkbrush.safetensors",
                label="Dark Brush", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_dotmatrix",
                filename="krea-2/krea2_dotmatrix.safetensors",
                source_url=_ORG + "/krea2_dotmatrix.safetensors",
                label="Dot Matrix", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_kidsdrawing",
                filename="krea-2/krea2_kidsdrawing.safetensors",
                source_url=_ORG + "/krea2_kidsdrawing.safetensors",
                label="Kids Drawing", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_neondrip",
                filename="krea-2/krea2_neondrip.safetensors",
                source_url=_ORG + "/krea2_neondrip.safetensors",
                label="Neon Drip", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_rainywindow",
                filename="krea-2/krea2_rainywindow.safetensors",
                source_url=_ORG + "/krea2_rainywindow.safetensors",
                label="Rainy Window", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_retroanime",
                filename="krea-2/krea2_retroanime.safetensors",
                source_url=_ORG + "/krea2_retroanime.safetensors",
                label="Retro Anime", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_softwatercolor",
                filename="krea-2/krea2_softwatercolor.safetensors",
                source_url=_ORG + "/krea2_softwatercolor.safetensors",
                label="Soft Watercolor", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_sunsetblur",
                filename="krea-2/krea2_sunsetblur.safetensors",
                source_url=_ORG + "/krea2_sunsetblur.safetensors",
                label="Sunset Blur", category="style",
                default_strength=0.8),
        LoraRow(id="krea2_vintagetarot",
                filename="krea-2/krea2_vintagetarot.safetensors",
                source_url=_ORG + "/krea2_vintagetarot.safetensors",
                label="Vintage Tarot", category="style",
                default_strength=0.8),
        LoraRow(id="krea2filterbypass3",
                filename="krea-2/krea2filterbypass3.safetensors",
                source_url=("https://huggingface.co/uzumix/"
                            "krea2filterbypass3.safetensors/resolve/main/"
                            "krea2filterbypass3.safetensors"),
                label="Filter Bypass 3", category="style",
                default_strength=0.8),
    )
