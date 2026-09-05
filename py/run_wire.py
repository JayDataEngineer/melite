#!/usr/bin/env python3
"""run_wire — the frozen wire contract for every reconstruction the
runs / flows / drafts doors serve.

Operator order (2026-09-05, verbatim): "This is an issue clearly that
occurs because you aren't testing the reconstruction stuff with
pydantic, there is no validation on workflow outputs or
reconstructions." And the follow-up: "Everything is extensively tested
in our repository, that is the goal. This whole flow is a complete and
total blindspot."

It was. py/editor_runs.py reconstructed rows from sidecar and flow-YAML
TEXT with C-parity string surgery (`buf.find("description:")` +
read-to-newline shipped the block-scalar indicator `>-` as the flow's
description — live on creature-flow and prop-flow the day this module
was born) and nothing between that text and the wire ever validated a
shape. This module is the gate the PYTHON SHAPE LAW demands: every
reconstruction is CONSTRUCTED as a frozen pydantic row — an invalid
reconstruction cannot be built, so it cannot be served. Producers skip
a malformed source row LOUDLY (logged reason, listing continues — the
RESILIENCE LAW); they never ship garbage.

Wire compatibility: the field names, envelopes, and row shapes are the
served contract exactly — the studio, the media panel, and the parity
walls consume these unchanged. What changes is that the shapes are now
TYPED, and the yaml doors parse flow documents with a real YAML parse
instead of line surgery.
"""
from __future__ import annotations

import enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class _Frozen(BaseModel):
    """PYTHON SHAPE LAW rung 2: frozen, no extras, validated at build."""

    model_config = ConfigDict(frozen=True, extra="forbid")


# ── runs family ────────────────────────────────────────────────────

class RunStatus(str, enum.Enum):
    """Closed vocabulary. Members are every status our sidecar writer
    emits, plus the two reconstruction-only values: `success` (a legacy
    dir with no sidecar reads as the C-era success) and `unknown`
    (sidecar present, status key absent). A typo'd status refuses at
    construction instead of drifting to the client."""

    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"
    SUCCESS = "success"      # legacy no-sidecar dir (C parity)
    UNKNOWN = "unknown"      # sidecar without a status key


class ArtifactRow(_Frozen):
    """One media artifact of a run (run_artifacts output shape)."""

    name: str = Field(min_length=1)
    path: str
    bytes: int = Field(ge=0)
    url: str
    type: Literal["image", "video", "audio"]
    size: int = Field(ge=0)


class TruncationRow(_Frozen):
    """The trailing marker when entries went unlisted (image cap /
    non-media skips). Identified by `truncated` being present."""

    truncated: Literal[True]
    listed: int = Field(ge=0)
    total: int = Field(ge=0)


class RunRow(_Frozen):
    """GET /v1/flows/runs row — the reconstruction of one run dir."""

    run_id: str = Field(pattern=r"^run-[A-Za-z0-9_.@-]+$")
    name: str
    flow: str
    status: RunStatus
    created_at: int = Field(ge=0)
    prompt: str
    seed: int
    thumbnail: str
    artifacts: list[ArtifactRow | TruncationRow]
    params: dict[str, Any]
    draft_id: str


class RunsEnvelope(_Frozen):
    """GET /v1/flows/runs envelope. count is the TOTAL collected
    entries (pre-limit) — the C contract; it is >= len(runs)."""

    count: int = Field(ge=0)
    runs: list[RunRow]


# ── drafts family ──────────────────────────────────────────────────

class DraftRow(_Frozen):
    """GET /v1/flows/drafts row — the merged drafts index."""

    draft_id: str = Field(min_length=1)
    model: str
    name: str


class DraftsEnvelope(_Frozen):
    count: int = Field(ge=0)
    drafts: list[DraftRow]


# ── the gate ───────────────────────────────────────────────────────

def refusal_reason(error: ValidationError) -> str:
    """One-line, field-named reason for a reconstruction refusal — the
    LOUD part of skip-and-continue (RESILIENCE LAW: document, then
    continue)."""

    parts = []
    for e in error.errors():
        loc = ".".join(str(x) for x in e["loc"]) or "<root>"
        parts.append(f"{loc}: {e['msg']}")
    return "; ".join(parts)
