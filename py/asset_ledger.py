"""asset_ledger — the cross-run asset index (2026-09-03).

LAWS THIS MODULE SERVES:

- STATE IS NOT CONTRACT (C retirement): the index is DERIVED from disk
  truth at read time. A run's assets are its files; there is no second
  bookkeeping to drift against the run dirs. The sidecar's sparse
  "artifacts" list stays a C-era convenience field, never the source.
- PYTHON SHAPE LAW: rows are frozen pydantic models — an invalid row is
  a construction refusal, not a runtime surprise. kind is a closed
  enum derived from the filename; sha256 is a constrained pattern.
- RESILIENCE LAW: indexing never raises into a route or the queue loop
  — unreadable or malformed files are skipped, and the caller answers
  with what the disk actually holds.
- PLUGIN ARCHITECTURE: the module is core-generic. It knows file kinds
  (extension map), never lanes or engines.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from enum import Enum
from pathlib import Path
from typing import Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field, ValidationError

# ONE type vocabulary with the runs listing (editor_runs.artifact_type)
# — never a second opinion on what a .png is.
_PY = str(Path(__file__).resolve().parent)
if _PY not in sys.path:
    sys.path.insert(0, _PY)
from editor_runs import artifact_type  # noqa: E402


class AssetKind(str, Enum):
    """Closed vocabulary — a typo is a construction refusal."""
    image = "image"
    video = "video"
    audio = "audio"
    model = "model"
    document = "document"
    other = "other"


_KNOWN = {"image": AssetKind.image, "video": AssetKind.video,
          "audio": AssetKind.audio}
_MESH = ("glb", "gltf", "obj", "fbx", "ply", "usdz", "stl")
_DOC = ("json", "yaml", "yml", "txt", "md", "csv")


def kind_for(name: str) -> AssetKind:
    """filename → AssetKind (media from the estate vocab, then mesh/doc)."""
    t = artifact_type(name)
    if t in _KNOWN:
        return _KNOWN[t]
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in _MESH:
        return AssetKind.model
    if ext in _DOC:
        return AssetKind.document
    return AssetKind.other


_SHA256 = "^[0-9a-f]{64}$"


class AssetRow(BaseModel):
    """One delivered file — all-or-nothing facts, frozen at construction."""
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    run_id: str = Field(min_length=1)
    kind: AssetKind
    bytes: int = Field(gt=0)
    sha256: str = Field(pattern=_SHA256)
    url: str


class RunIndex(BaseModel):
    """One run's delivery snapshot (frozen tuple of rows)."""
    model_config = ConfigDict(frozen=True)

    run_id: str = Field(min_length=1)
    name: str = ""
    status: str = "unknown"
    created_at: int = 0
    # L1 of the test/prod barrier (L2 is the assets_index default
    # exclusion). A run is "test" when the caller (or the harness
    # routing it) declared test:true in the start body. The sidecar
    # is the source; missing or false is production.
    test: bool = False
    artifacts: Tuple[AssetRow, ...] = ()


_CHUNK = 1 << 16
SIDECAR = "_pipeline.json"


def _sha256_file(path: str) -> Optional[str]:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while True:
                b = f.read(_CHUNK)
                if not b:
                    break
                h.update(b)
    except OSError:
        return None
    return h.hexdigest()


def scan_run(run_dir: str, sidecar: Optional[dict] = None) -> RunIndex:
    """Disk truth → typed rows. Files starting with `_` are estate
    bookkeeping (sidecars, generated posters), never deliverables.
    sidecar=None reads <run_dir>/_pipeline.json when present."""
    run_id = os.path.basename(run_dir.rstrip("/"))
    if sidecar is None:
        sidecar = _read_sidecar(run_dir)
    sc = sidecar if isinstance(sidecar, dict) else {}
    try:
        names = sorted(os.listdir(run_dir))
    except OSError:
        names = []
    rows = []
    for name in names:
        if name.startswith("_"):
            continue
        full = os.path.join(run_dir, name)
        if not os.path.isfile(full):
            continue
        try:
            size = os.path.getsize(full)
        except OSError:
            continue
        if size <= 0:
            continue
        sha = _sha256_file(full)
        if sha is None:
            continue
        try:
            rows.append(AssetRow(
                name=name, run_id=run_id, kind=kind_for(name),
                bytes=size, sha256=sha,
                url="/editor/assets/runs/%s/%s" % (run_id, name)))
        except ValidationError:
            continue                       # malformed truth: not indexed
    return RunIndex(
        run_id=run_id,
        name=str(sc.get("model") or ""),
        status=str(sc.get("status") or "unknown"),
        created_at=int(sc.get("created_at") or 0),
        test=bool(sc.get("test", False)),
        artifacts=tuple(rows))


def _read_sidecar(run_dir: str) -> dict:
    try:
        return json.loads(Path(run_dir, SIDECAR).read_text())
    except (OSError, ValueError):
        return {}


def assets_index(output_root: str, run: Optional[str] = None,
                 kind: Optional[str] = None, limit: int = 200,
                 include_test: bool = False) -> dict:
    """GET /v1/assets — the cross-run delivery view. Derived at read
    time; ?run= and ?kind= filter; limit caps run rows. Test runs
    (sidecar test:true) are EXCLUDED from the production view by
    default — opt in with include_test=True (logged at the route
    layer). L2 of the test/prod barrier."""
    try:
        want = AssetKind(kind) if kind else None
    except ValueError:
        want = None
    try:
        entries = sorted(os.listdir(output_root), reverse=True)
    except OSError:
        entries = []
    runs, total = [], 0
    for ent in entries:
        if not ent.startswith("run-"):
            continue
        if run and ent != run:
            continue
        rd = os.path.join(output_root, ent)
        idx = scan_run(rd, _read_sidecar(rd))
        if idx.test and not include_test:
            continue                       # L2: the test/prod wall
        arts = idx.artifacts if want is None else tuple(
            a for a in idx.artifacts if a.kind is want)
        total += len(arts)
        runs.append({
            "run_id": idx.run_id, "name": idx.name, "status": idx.status,
            "created_at": idx.created_at, "test": idx.test,
            "artifacts": [a.model_dump() for a in arts],
        })
        if len(runs) >= limit:
            break
    return {"count": len(runs), "artifacts": total, "runs": runs}


def completed_payload(run_dir: str, sidecar: Optional[dict] = None) -> Optional[dict]:
    """The run.completed ledger event payload — None when a run
    delivered nothing (failures stay run.*-quiet in the journal)."""
    idx = scan_run(run_dir, sidecar)
    if not idx.artifacts:
        return None
    return {
        "run_id": idx.run_id, "name": idx.name, "status": idx.status,
        "created_at": idx.created_at, "test": idx.test,
        "artifacts": [
            {**a.model_dump(), "sha16": a.sha256[:16]}
            for a in idx.artifacts
        ],
    }
