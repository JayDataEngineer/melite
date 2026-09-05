"""Character presets — saved characters as frozen rows (stroke 3,
design docs/design/anny-evolution.md §2).

Two param dialects, NO lossy bridge between them (the record §2: a
preset stores VERBATIM what produced it):

  authored   the 11-dim authoring dialect (ray inheritance:
             plugins/melite-3d phenotype map — gender/age/muscle/
             weight/height/proportions/cupsize/firmness/african/
             asian/caucasian + named local-change morphs). Estate
             rows + hand tweaks speak this.
  estimated  verbatim estimator output (SOMA-X simplified: 6
             phenotypes + 139 indexed detail scales). Saved estimate
             runs speak this — re-instantiation runs the same
             AnnySimplified path, bit-exact, no filter archaeology.

file-origin rows carry NO params (a mesh reference only — applied
via the attach door, never the params flow).

PYTHON SHAPE LAW throughout: frozen rows, closed origin enum,
validation AT CONSTRUCTION (origin↔params↔params_ref coherence is
a model_validator — an estimated row without its params artifact
cannot be BUILT, not merely refused at load).
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from enum import Enum
from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

_FROZEN = ConfigDict(frozen=True, extra="forbid")

# The params artifact filename (written by the commercial worker
# beside its npz, read by gateway save-promotion and the bake's run
# dir — ONE constant, never restated coordinates; PYTHON SHAPE LAW
# rung 6. The standalone worker/bake scripts (their own venv, no
# estate imports) carry the literal — the wall pins literal ==
# constant).
PRESET_PARAMS_FILENAME = "anny_preset.json"

# Ray's 11 authoring dims, tensor order (the phenotype map's contract:
# order-sensitive, 0.0-1.0, 0.5 = neutral adult).
AUTHORED_DIM_COUNT = 11
# The estimator's simplified dialect (convert_identity_backend out).
ESTIMATED_PHENOTYPE_COUNT = 6
ESTIMATED_SCALE_COUNT = 139

_PRESET_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_\-]*$")
_TENANT_RE = re.compile(r"^[a-z0-9]+/[a-z0-9][a-z0-9\-]*$")


class PresetOrigin(str, Enum):
    """Closed vocabulary — a typo is a construction refusal."""
    base_params = "base_params"
    estimated = "estimated"
    file = "file"


class LocalChange(BaseModel):
    """One named detail morph (ray local_change_labels kebab-case,
    e.g. upperarm-fat-incr). Range -1.0..+2.0 per the phenotype map."""
    model_config = _FROZEN

    name: str = Field(min_length=1)
    value: float = Field(ge=-1.0, le=2.0)


class AnnyBakeParams(BaseModel):
    """The AnnyParamsToGlb node's JSON dialect — THE compile-time door
    (operator order, 2026-09-06: "Where is MY GOD DAMNED COMPILE TIME
    VALIDATION?"). ONE validation for three consumers: the presets
    door (serve side), the flow-start door (initial_validators — a
    bad string 4xxes BEFORE any run registers), and the node (belt;
    it keeps its own guard). Accepts the wire STRING (json.loads in
    the before-hook — the flow's initial input IS a string) or the
    already-parsed doc. Refusals are field-clean, never a node
    traceback after a GPU claim:

      authored  -> phenotype exactly 11 floats in 0..1 +
                   local_changes an OBJECT of morph-name -> -1..2
      estimated -> phenotype + scale (both float arrays)

    The local_changes OBJECT (not the AuthoredParams row tuple) is
    the node's wire shape — the door serves canonical_json, the
    studio posts it verbatim, and a LIST (the old silent killer:
    JS `[] || {}` keeps the list) refuses HERE."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    dialect: Literal["authored", "estimated"]
    phenotype: tuple[float, ...]
    local_changes: dict[str, float] = Field(default_factory=dict)
    scale: tuple[float, ...] | None = None

    @model_validator(mode="before")
    @classmethod
    def _parse_wire(cls, v: object) -> object:
        """The wire value IS a JSON string (the flow's initial input);
        accept both it and an already-parsed doc, refuse everything
        else — ONE hook (two hooks raced: the object check fired on
        the unparsed string)."""
        if isinstance(v, (str, bytes, bytearray)):
            try:
                v = json.loads(v)
            except json.JSONDecodeError as e:
                raise ValueError("params_json is not JSON: %s" % e)
        if not isinstance(v, dict):
            raise ValueError(
                "params_json must be a JSON object, got %s"
                % type(v).__name__)
        return v

    @model_validator(mode="after")
    def _dialect_shape(self) -> "AnnyBakeParams":
        if len(self.phenotype) != AUTHORED_DIM_COUNT:
            raise ValueError(
                "%s phenotype wants %d dims, got %d — the dims are "
                "gender/age/muscle/weight/height/proportions/cupsize/"
                "firmness/african/asian/caucasian"
                % (self.dialect, AUTHORED_DIM_COUNT, len(self.phenotype)))
        for i, v in enumerate(self.phenotype):
            if not 0.0 <= v <= 1.0:
                raise ValueError(
                    "%s phenotype[%d] = %r outside 0.0..1.0"
                    % (self.dialect, i, v))
        for name, value in self.local_changes.items():
            if not -1.0 <= value <= 2.0:
                raise ValueError(
                    "local_changes[%r] = %r outside -1.0..2.0"
                    % (name, value))
        if self.dialect == "authored":
            if self.scale is not None:
                raise ValueError(
                    "authored takes local_changes, not scale "
                    "(that is the estimated dialect)")
        elif self.scale is None:
            raise ValueError(
                "estimated wants scale (the estimator run's "
                "measurement vector)")
        return self


class AuthoredParams(BaseModel):
    """The 11-dim authoring dialect (ray inheritance)."""
    model_config = _FROZEN

    phenotype: tuple[float, ...]
    local_changes: tuple[LocalChange, ...] = ()

    @model_validator(mode="after")
    def _check_dims(self) -> "AuthoredParams":
        if len(self.phenotype) != AUTHORED_DIM_COUNT:
            raise ValueError(
                "authored phenotype wants %d dims, got %d"
                % (AUTHORED_DIM_COUNT, len(self.phenotype)))
        for i, v in enumerate(self.phenotype):
            if not 0.0 <= v <= 1.0:
                raise ValueError(
                    "authored phenotype[%d] = %r outside 0.0..1.0" % (i, v))
        seen = set()
        for lc in self.local_changes:
            if lc.name in seen:
                raise ValueError(
                    "duplicate local-change morph %r" % lc.name)
            seen.add(lc.name)
        return self


class EstimatedParams(BaseModel):
    """Verbatim estimator output (SOMA-X simplified dialect)."""
    model_config = _FROZEN

    phenotype: tuple[float, ...]
    scale: tuple[float, ...]

    @model_validator(mode="after")
    def _check_dims(self) -> "EstimatedParams":
        if len(self.phenotype) != ESTIMATED_PHENOTYPE_COUNT:
            raise ValueError(
                "estimated phenotype wants %d dims, got %d"
                % (ESTIMATED_PHENOTYPE_COUNT, len(self.phenotype)))
        if len(self.scale) != ESTIMATED_SCALE_COUNT:
            raise ValueError(
                "estimated scale wants %d entries, got %d"
                % (ESTIMATED_SCALE_COUNT, len(self.scale)))
        return self


class PresetParts(BaseModel):
    """Optional part overlays (artifact URLs; the composite future)."""
    model_config = _FROZEN

    hair: Optional[str] = None
    outfit: Optional[str] = None


class PresetKnobs(BaseModel):
    """Turnaround snapshot. EVERY knob Optional: None means inherit
    the card default at load time — never restate card defaults
    beside the card (rung 6)."""
    model_config = _FROZEN

    resolution: Optional[int] = None
    framing: Optional[str] = None
    focal_length: Optional[float] = None
    samples: Optional[int] = None
    transparent: Optional[bool] = None


class CharacterPreset(BaseModel):
    """One saved character. Estate rows (base_params, on the Model
    class) + user rows (the tenant ledger) share this shape."""
    model_config = _FROZEN

    id: str = Field(pattern=_PRESET_ID_RE.pattern)
    label: str = Field(min_length=1)
    description: str = ""
    origin: PresetOrigin
    params: Optional[Union[AuthoredParams, EstimatedParams]] = None
    # provenance: the params artifact URL (estimated) — the run's
    # anny_preset.json. Required ⟺ estimated (rung 4: an estimated
    # row without its source artifact is unbuildable).
    params_ref: Optional[str] = None
    # the mesh artifact URL (estimated/file saves — preview +
    # provenance; file rows apply it via attach).
    body_ref: Optional[str] = None
    parts: PresetParts = PresetParts()
    knobs: PresetKnobs = PresetKnobs()

    @model_validator(mode="after")
    def _check_origin_coherence(self) -> "CharacterPreset":
        if self.origin is PresetOrigin.file:
            if self.params is not None or self.params_ref is not None:
                raise ValueError(
                    "file-origin preset carries no params — mesh only "
                    "(params/params_ref must be None)")
        else:
            if self.params is None:
                raise ValueError(
                    "%s preset without params — coefficients are the "
                    "character" % self.origin.value)
            if self.origin is PresetOrigin.estimated:
                if not self.params_ref:
                    raise ValueError(
                        "estimated preset without params_ref — the "
                        "source run artifact is the provenance")
                if not isinstance(self.params, EstimatedParams):
                    raise ValueError(
                        "estimated preset must speak the estimated "
                        "dialect (verbatim estimator output)")
            else:  # base_params
                if self.params_ref is not None:
                    raise ValueError(
                        "base_params preset with params_ref — authored "
                        "coefficients ARE the source")
                if not isinstance(self.params, AuthoredParams):
                    raise ValueError(
                        "base_params preset must speak the authored "
                        "dialect (11-dim + named morphs)")
        return self

    def canonical_json(self) -> str:
        """The AnnyParamsToGlb node dialect (sorted keys, compact)."""
        if isinstance(self.params, AuthoredParams):
            doc = {"dialect": "authored",
                   "phenotype": list(self.params.phenotype),
                   "local_changes": {lc.name: lc.value
                                     for lc in self.params.local_changes}}
        elif isinstance(self.params, EstimatedParams):
            doc = {"dialect": "estimated",
                   "phenotype": list(self.params.phenotype),
                   "scale": list(self.params.scale)}
        else:
            raise ValueError(
                "preset %r has no params (file origin) — nothing to "
                "instantiate" % self.id)
        return json.dumps(doc, sort_keys=True, separators=(",", ":"))


class PresetLedgerError(Exception):
    """User-ledger IO or shape failure — 4xx/5xx LOUD, never silent."""


def tenant_ledger_path(data_root: str, tenant: str) -> str:
    """<data_root>/tenants/<tenant>/presets.json. Tenant shape is
    validated (a traversal smuggled through the path param refuses)."""
    if not _TENANT_RE.match(tenant or ""):
        raise PresetLedgerError(
            "bad tenant %r (want <lane>/<name>)" % (tenant,))
    return os.path.join(data_root, "tenants", tenant, "presets.json")


def read_user_presets(data_root: str, tenant: str
                      ) -> tuple[CharacterPreset, ...]:
    """The tenant's user rows (missing file = no rows, never an error)."""
    path = tenant_ledger_path(data_root, tenant)
    try:
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
    except FileNotFoundError:
        return ()
    except (OSError, ValueError) as e:
        raise PresetLedgerError(
            "preset ledger %s unreadable (%s) — user characters "
            "refuse rather than silently drop" % (path, e))
    rows = doc.get("presets") if isinstance(doc, dict) else None
    if not isinstance(rows, list):
        raise PresetLedgerError(
            "preset ledger %s has no presets list" % path)
    out = []
    for i, r in enumerate(rows):
        try:
            out.append(CharacterPreset.model_validate(r))
        except ValueError as e:
            raise PresetLedgerError(
                "preset ledger %s row %d invalid (%s)" % (path, i, e))
    return tuple(out)


def append_user_preset(data_root: str, tenant: str,
                       row: CharacterPreset,
                       estate: tuple[CharacterPreset, ...] = ()
                       ) -> CharacterPreset:
    """Append a user row, assigning its id (user-N). Atomic (tmp +
    rename — the sidecar-write precedent). Estate-id collision
    refuses (user rows never shadow estate rows)."""
    if row.id != "user-pending":
        raise PresetLedgerError(
            "append wants the user-pending sentinel id, got %r" % row.id)
    existing = read_user_presets(data_root, tenant)
    if {p.id for p in estate} & {p.id for p in (*existing,)}:
        raise PresetLedgerError("user ledger shadows an estate preset id")
    n = 0
    for p in existing:
        if p.id.startswith("user-"):
            try:
                n = max(n, int(p.id[len("user-"):]))
            except ValueError:
                pass
    assigned = row.model_copy(update={"id": "user-%d" % (n + 1)})
    path = tenant_ledger_path(data_root, tenant)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    doc = {"presets": [json.loads(p.model_dump_json())
                       for p in (*existing, assigned)]}
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path),
                               prefix="presets-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2, sort_keys=True)
            f.write("\n")
        os.replace(tmp, path)
    except OSError as e:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise PresetLedgerError(
            "preset ledger %s unwritable (%s)" % (path, e))
    return assigned


def delete_user_preset(data_root: str, tenant: str,
                       preset_id: str,
                       estate: tuple[CharacterPreset, ...] = ()) -> bool:
    """Delete a USER row (estate ids refuse — estate rows are code).
    Returns True when a row was removed."""
    if preset_id in {p.id for p in estate}:
        raise PresetLedgerError(
            "preset %r is an estate row — immutable (edit the Model)" %
            preset_id)
    existing = read_user_presets(data_root, tenant)
    kept = tuple(p for p in existing if p.id != preset_id)
    if len(kept) == len(existing):
        return False
    path = tenant_ledger_path(data_root, tenant)
    doc = {"presets": [json.loads(p.model_dump_json()) for p in kept]}
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path),
                               prefix="presets-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2, sort_keys=True)
            f.write("\n")
        os.replace(tmp, path)
    except OSError as e:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise PresetLedgerError(
            "preset ledger %s unwritable (%s)" % (path, e))
    return True


def all_presets(estate: tuple[CharacterPreset, ...],
                user: tuple[CharacterPreset, ...]
                ) -> tuple[CharacterPreset, ...]:
    """The visible list: estate rows first, then user rows. A user id
    shadowing an estate id refuses (the ledger append already guards;
    this is the belt — a hand-edited ledger file must not silently
    replace an archetype)."""
    seen = {p.id for p in estate}
    for p in user:
        if p.id in seen:
            raise PresetLedgerError(
                "user preset %r shadows an estate row" % p.id)
        seen.add(p.id)
    return (*estate, *user)
