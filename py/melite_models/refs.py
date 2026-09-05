"""Estate file refs — composable paths, validated at the door.

The compile-time side of the 2026-09-06 orders ("WHERE THE [REDACTED 2026-11-05] IS
COMPILE TIME ERRORS"): a photo initial that is browser-local or
points at nothing on disk must 4xx at the start/validate doors
(BEFORE any run registers), never burn a serial-GPU queue slot and
die in the engine with a node traceback. Flows declare it via
initial_validators={"photo": EstatePhotoRef} (the AnnyBakeParams
door pattern — no core change).
"""

from __future__ import annotations

import os
import re

from pydantic import BaseModel, ConfigDict, model_validator

_FROZEN = ConfigDict(frozen=True, extra="forbid")

# The stageable image set — restated from the submit-time SSOT
# (plugins/engines/comfyui/compose/artifact.py _EXTS[Kind.IMAGE];
# a compose import would drag plugin path mechanics into the shared
# models — the wall pins literal == table, the params-artifact
# precedent in presets.py). What the lane stages is what the door
# admits — never restated coordinates without the pin.
_PHOTO_EXTS = frozenset((".png", ".jpg", ".jpeg", ".webp", ".gif",
                          ".bmp", ".avif", ".tiff"))


class EstatePhotoRef(BaseModel):
    """A photo initial that WILL stage to the engine.

    Accepts the wire STRING (the flow's initial input is a string).
    Refuses, in order: non-strings; browser-local refs (data:/blob:
    — "upload it; the lane composes estate files"); non-image
    extensions; paths with no file on disk (relative paths resolve
    against the gateway cwd — the repo root in production, where
    data/input/<file> lands). Refusals are field-clean ValueErrors
    (FlowError text at the door, 4xx upstream)."""

    model_config = _FROZEN

    path: str

    @model_validator(mode="before")
    @classmethod
    def _wire_string(cls, v: object) -> object:
        if isinstance(v, str):
            return {"path": v}
        if isinstance(v, dict):
            return v
        raise ValueError("photo must be an estate path string, got %s"
                         % type(v).__name__)

    @model_validator(mode="after")
    def _stageable(self) -> "EstatePhotoRef":
        p = self.path.strip()
        if re.match(r"^(data|blob):", p, re.IGNORECASE):
            raise ValueError(
                "photo is browser-local — the lane composes estate "
                "files (upload it first; the slot then holds "
                "data/input/<file>)")
        if not p.lower().endswith(tuple(sorted(_PHOTO_EXTS))):
            raise ValueError(
                "photo %r is not a stageable image (want %s)"
                % (self.path, " ".join(sorted(_PHOTO_EXTS))))
        cand = p if os.path.isabs(p) else os.path.join(os.getcwd(), p)
        if not os.path.isfile(cand):
            raise ValueError(
                "photo %r is not on disk — nothing would stage to "
                "the engine" % (self.path,))
        return self
