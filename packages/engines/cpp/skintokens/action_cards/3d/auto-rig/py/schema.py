"""schema.py — the auto-rig card's document-construction gate.

THE CARD PATTERN (golden base: h3-timeline): the card owns a pydantic
document schema — construction IS the gate (PYTHON SHAPE rung 2).
Everything that can 4xx dies here, BEFORE any run registers
(QUEUE LANE LAW) — including the data:-URL refusal (the anny
precedent: browser-local bytes never compose) and the artifact-ref
existence check on the input mesh.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# the CLI's own closed set (live-probed usage text): auto|cpu|vulkan.
# The card DEFAULTS to cpu — the boarding decision (a second
# bloodstream like audio; vulkan would contend with the ComfyUI GPU).
Device = Literal["cpu", "auto", "vulkan"]

_MESH_EXTS = (".glb", ".t2mesh")


class RigParams(BaseModel):
    """The wire param surface (card fields), coerced + validated."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    input: str
    device: Device = "cpu"
    postprocess: bool = False

    @field_validator("input")
    @classmethod
    def _input_required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError(
                "required param 'input' missing — the static mesh to "
                "rig (.glb or .t2mesh path, or an artifact-ref from a "
                "previous card)")
        if v.startswith("data:"):
            raise ValueError(
                "input refuses a data: URL — browser-local bytes never "
                "compose (the anny precedent). Upload the file first; "
                "the run needs a path on disk")
        return v


def parse_card(body: dict[str, JsonValue]) -> RigParams:
    """Construct the document from the wire body — raises ValueError
    with the EXACT refusal message (the arm maps it to rc=-3)."""
    params = (body or {}).get("params") or {}
    return RigParams(**params)


def input_ref_exists(doc: RigParams) -> str | None:
    """The artifact-ref existence gate: a plain path must exist on
    disk NOW (phase 1 AND phase 2 re-check — registration and
    materialization are two moments), and must be a mesh the CLI
    accepts (.glb/.t2mesh — its own door, refused here LOUDLY
    instead of as CLI stderr). Returns None when satisfied, the
    refusal message otherwise. Non-path refs (previous-node output
    wiring, resolved by the gateway) pass untouched."""
    import os
    ref = (doc.input or "").strip()
    if not ref or ref.startswith("$") or "\n" in ref:
        return None   # gateway-wired ref — resolve_inputs' concern
    if not os.path.isfile(ref):
        return "input mesh not found: %s" % ref
    if not ref.lower().endswith(_MESH_EXTS):
        return ("input mesh must be .glb or .t2mesh (the CLI's only "
                "mesh doors — got %s)" % ref)
    return None
