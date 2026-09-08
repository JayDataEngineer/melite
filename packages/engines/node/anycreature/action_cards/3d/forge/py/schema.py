"""schema.py — the forge card's document-construction gate.

THE CARD PATTERN (golden base: action_cards/video/h3-timeline): the
card owns a pydantic document schema — document construction IS the
gate (PYTHON SHAPE LAW rung 2: validation at construction, never
post-hoc walks). Everything that can 4xx dies here, BEFORE any run
registers (QUEUE LANE LAW).

The creature spec anatomy is the ENGINE'S truth (vendor cli.js +
calibration/wolf_green.json, live-probed 2026-09-04): joints is a
keyed DICT name→[x,y,z]; chains is a keyed DICT name→[joint,..];
volumes is a list of profile rows; palette MUST be a dict (the
compiler indexes it for every volume material — an absent palette
crashes the CLI). The engine's own mechanical checks (proportion
rhythm, balance footprint — BLOCK: lines) are the DEEPER semantic
gate at execute time; this floor only refuses what cannot even be
handed to the compiler.
"""

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, field_validator

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


class ForgeParams(BaseModel):
    """The wire param surface (card fields), coerced + validated."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    spec: Dict[str, Any]
    smooth_angle: float = 50.0
    build: str = "default"
    ao: bool = True
    role: str = "npc"
    shading: Optional[Dict[str, Any]] = None

    @field_validator("build")
    @classmethod
    def _build_vocab(cls, v: str) -> str:
        if v not in ("default", "rigid"):
            raise ValueError(
                "build must be 'default' or 'rigid' (got %r)" % v)
        return v

    @field_validator("role")
    @classmethod
    def _role_vocab(cls, v: str) -> str:
        if v not in ("minion", "npc", "boss"):
            raise ValueError(
                "role must be minion/npc/boss (got %r)" % v)
        return v

    @field_validator("smooth_angle")
    @classmethod
    def _angle_range(cls, v: float) -> float:
        if not (1 <= v <= 180):
            raise ValueError("smooth_angle must be 1..180 (got %g)" % v)
        return v

    @field_validator("spec")
    @classmethod
    def _spec_floor(cls, v: dict[str, JsonValue]) -> dict[str, JsonValue]:
        """The structural floor — the engine document's load-bearing
        keys exist with the right SHAPE (joints dict, chains dict,
        volumes list, palette dict). Semantics (rhythm, balance) are
        the engine's BLOCK checks at execute time."""
        if not isinstance(v, dict):
            raise ValueError("spec must be a JSON object")
        missing = [k for k in ("joints", "chains", "volumes", "palette")
                   if k not in v]
        if missing:
            raise ValueError(
                "creature spec is missing %s — the engine document "
                "needs joints (dict name→[x,y,z]), chains (dict "
                "name→[joint,..]), volumes (list of profile rows), "
                "palette (dict, may be empty)" % ", ".join(missing))
        joints = v["joints"]
        if not isinstance(joints, dict) or not joints:
            raise ValueError(
                "spec.joints must be a non-empty dict of "
                "name → [x, y, z]")
        chains = v["chains"]
        if not isinstance(chains, dict) or not chains:
            raise ValueError(
                "spec.chains must be a non-empty dict of "
                "name → [joint names]")
        volumes = v["volumes"]
        if not isinstance(volumes, list) or not volumes:
            raise ValueError(
                "spec.volumes must be a non-empty list of profile "
                "rows (chain, material, sides, profile)")
        if not isinstance(v["palette"], dict):
            raise ValueError(
                "spec.palette must be a dict (may be empty — the "
                "compiler indexes it for every volume material)")
        return v


def parse_card(body: dict[str, JsonValue]) -> ForgeParams:
    """Construct the document from the wire body — raises ValueError
    with the EXACT refusal message (the arm maps it to rc=-3)."""
    params = (body or {}).get("params") or {}
    if not params.get("spec"):
        raise ValueError(
            "required param 'spec' missing — the creature JSON spec "
            "(joints/chains/volumes/parts/anims)")
    return ForgeParams(**params)
