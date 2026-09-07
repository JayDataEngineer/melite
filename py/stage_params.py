"""stage_params.py — the action-card → flow STAGE-PARAMS LATTICE (Path C,
2026-09-05). Design record: docs/queue/card-stage-typing.md.

Two problems the lattice closes:

  1. The card's body that lands in `Stage.params` is `dict[str, Any]`
     — the per-card `schema.py` row is validated at the validation
     door, then forgotten. A `flow_inline` body, a stage whose params
     came from a queue, or a stage whose params is composed in code
     has no schema gate at the flow level.

  2. The card's I/O contract is whatever the flow author guessed.
     `flow-typed-edges.md` closes the edges; the cards do not
     declare their Kind contract, so the kind check has nothing to
     compare against for card stages.

The lattice is the union of two narrow types:

  * `ParamSchemaRegistry` — a frozen pydantic table, one
    `CardSchemaRow` per action card. The row carries (card_id,
    engine, schema_class, kind_inputs, kind_outputs). The table's
    cross-row invariants (unique card_ids, every schema_class is a
    frozen pydantic model) refuse AT CONSTRUCTION. The schema
    classes are imported LAZILY via a hand-pinned, wall-tested
    boundary (the load_mod pattern: loader owns import mechanics,
    shape law rung 5) — module-top imports would force the
    comfyui bus to mount before any consumer can import this
    module, and a wall test that runs in a clean process would
    not see the bus-mounted modules.

  * `Stage.card` / `Stage.card_io` — two OPTIONAL fields on the
    existing `Stage` row (py/flow.py). Default empty so engine-only
    stages are unchanged. When set, the gate fires.

The gate is two passes (both in py/flow.py):

  (1) Construction: every stage with `card=` validates `params`
      against the registry's schema_class. The schema's
      `extra="forbid"` is what makes a typo'd knob loud (a name
      not on the card's row refuses the `Flow(...)` line, named
      after the field — same shape as every other pydantic refusal
      in the estate).

  (2) Engine load (`validate_engines`): resolves `card_io` from
      the registry when the stage omits it. Runs the typed-edges
      check against the merged output set (Stage.outputs ∪
      card.kind_outputs ∪ engine DEFAULT_OUTPUT).

LAW NOTES:
  * PYTHON SHAPE LAW rung 1: every card schema is one frozen
    pydantic class. The registry is one frozen table of
    `CardSchemaRow` INSTANCES — no class explosion.
  * Rung 2: every type in this module is `frozen=True,
    extra="forbid"`. Validation is construction.
  * Rung 3: `Kind` is the closed vocabulary it already is (it
    lives in py/flow.py; we type-hint it, never duplicate it).
  * Rung 5: the imports below are hand-pinned; the wall test
    fails if a schema exists without an import.
  * Rung 8 (operator order, 2026-09-03): "models don't render;
    cards render". Unchanged. The flow stamps a typed CONTRACT
    here, not a typed render. Rendering still belongs to the
    card's compose arm.
  * PLUGIN ARCHITECTURE LAW: the core imports this module; this
    module imports the schema classes by full path. The
    dependency direction is core → py → plugin — the same
    direction melite_models.load_model_py already goes.

WHAT THIS MODULE DOES NOT DO:
  * It does not collapse card schemas into a universal row. Each
    card keeps its closed-key set. The registry is a LOOKUP, not
    a MERGE.
  * It does not change `Stage.params` to a typed object. The
    engine's params surface stays verbatim (`dict[str, Any]`).
    The validated row's model_dump rides as a diagnostic
    sidecar in `params["_schema_validated"]` so the engine
    (and the sidecar) can read the typed contract without
    changing the engine's surface.
  * It does not retire the per-card `schema.py` row. Those
    rows are the SSOT; the registry points at them.
"""

from __future__ import annotations

import importlib
import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Dict, Optional, Type

from pydantic import BaseModel, ConfigDict, ValidationError, model_validator

# The stage/request body shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


# ── the closed Kind vocabulary lives in py/flow.py; we type-hint it
#    but import lazily to avoid a cycle (flow.py imports stage_params,
#    stage_params -> flow.py would loop). The string-keyed cross-check
#    in `_KindValue` is the construction-time check — a typo'd kind
#    name refuses here, not at runtime.

if TYPE_CHECKING:
    from flow import Kind


# ── the schema-class import boundary ────────────────────────────────
# Loader-owned (shape law rung 5): every card schema is imported by
# its full module path through a LAZY callable. The wall test
# `tests/unit/runtime/test_stage_params.py` enumerates every
# `action_cards/<genre>/<card>/py/schema.py` on disk and refuses a
# registry that lacks a row for it. Adding a new card: write the
# schema.py row, add an import line, add a CardSchemaRow.
#
# Why lazy: each card's `py/` is loaded as a package by the comfyui
# bus (plugins.py EngineRef.load + card_compose's _load_arm_package).
# A module-top import here would force the bus to mount before any
# consumer (test, tool, wall) can import this module. The lazy
# callable resolves the module on FIRST ACCESS (gate or registry
# build) — exactly the way `melite_cards.scan_engine_cards` already
# resolves cards.
#
# The card package alias follows the canonical rule (dir basename,
# hyphens→underscores; e.g. "image-gen" -> "image_gen",
# "h3-timeline" -> "h3_timeline"). The path of the schema module
# inside that package is fixed: "schema".


def _import_schema_lazy(modname: str, classname: str) -> Callable[[], Type[BaseModel]]:
    """Returns a no-arg callable that, on first call, imports the
    module and returns the class. Subsequent calls return the
    cached class. Raises ImportError at call time if the module is
    not mounted (the wall test mounts a stub before invoking)."""
    cached: dict[str, Type[BaseModel] | BaseException] = {}

    def _load() -> Type[BaseModel]:
        if "cls" in cached:
            return cached["cls"]
        if "err" in cached:
            raise cached["err"]
        try:
            mod = importlib.import_module(modname)
        except Exception as e:
            cached["err"] = e
            raise
        cls = getattr(mod, classname, None)
        if cls is None:
            err = ImportError(
                "%s declares no class %r — the schema contract is the "
                "class NAME, not a duck-typed object" % (modname, classname))
            cached["err"] = err
            raise err
        cached["cls"] = cls
        return cls

    return _load


# The wall test enumerates the schema.py tree and pins the import
# list below. A drift in either direction (file on disk without
# import, or import without file) is a wall failure.
#
# STROKE 4 (2026-09-06): _SCHEMA_TARGETS is the ONE source (module,
# class) — _SCHEMA_BY_CARD (lazy loaders) derives from it, and the
# collision-fallback mount in _resolve_schema re-derives from it. A
# card whose dir basename collides across engines (music: comfyui
# AND audio-cpp) resolves under its UNIQUE card-id name
# ("music_native") — never the ambiguous flat dir name.

_SCHEMA_TARGETS: Dict[str, tuple] = {
    "image-gen":      ("image_gen.schema", "ImageGenParams"),
    "image-edit":     ("image_edit.schema", "ImageEditParams"),
    "upscale-tools":  ("upscale_tools.schema", "UpscaleParams"),
    "mask-studio":    ("mask_studio.schema", "MaskStudioParams"),
    "ideogram4":      ("ideogram4.schema", "Ideogram4Params"),
    "video-gen":      ("video_gen.schema", "VideoGenParams"),
    "h3-timeline":    ("h3_timeline.schema", "H3CardDoc"),
    "music":          ("music.schema", "MusicParams"),
    "tts":            ("tts.schema", "TtsParams"),
    "voice-lock":     ("voice_lock.schema", "VoiceLockParams"),
    "sfx":            ("sfx.schema", "SfxParams"),
    "motion":         ("motion.schema", "MotionGenParams"),
    "anny":           ("anny.schema", "AnnyParams"),
    "img-to-mesh":    ("img_to_mesh.schema", "ImgToMeshParams"),
    # ── STROKE 4 (2026-09-06): the eight rows that closed the
    # bijection wall (test_registry_declares_every_action_card_
    # schema was RED on these). kind contracts derived from each
    # card's consuming flow / engine DEFAULT_OUTPUT.
    "fit":            ("fit.schema", "FitParams"),
    "skin":           ("skin.schema", "SkinParams"),
    "tagger":         ("tagger.schema", "TaggerParams"),
    "input-prep":     ("input_prep.schema", "InputPrepDoc"),
    "forge":          ("forge.schema", "ForgeParams"),
    "quad-remesh":    ("quad_remesh.schema", "RemeshParams"),
    "auto-rig":       ("auto_rig.schema", "RigParams"),
    # the cpp music card lives in a dir NAMED "music" (audio-cpp)
    # — mounted under its unique card id to break the flat-name
    # collision with the comfyui music card
    "music-native":   ("music_native.schema", "MusicParams"),
}

_SCHEMA_BY_CARD: Dict[str, Callable] = {
    card: _import_schema_lazy(mod, cls)
    for card, (mod, cls) in _SCHEMA_TARGETS.items()}


# Cards whose on-disk schema.py is missing (or whose card has no
# schema.py at all) — the gate skips them. The wall test pins this
# list against the disk so a card that gains a schema.py file MUST
# join `_SCHEMA_BY_CARD` AND its row must drop out of this set.
_CARDS_WITHOUT_SCHEMA: frozenset = frozenset({"ideogram4"})


# ── the registry rows ──────────────────────────────────────────────


class _Frozen(BaseModel):
    """PYTHON SHAPE LAW rung 2: frozen, no extras, validated at build."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class _KindValue:
    """Stringly-keyed Kind check, type-CHECKED against flow.Kind. A
    typo'd kind name refuses AT CONSTRUCTION of the row (the AI's
    main failure mode: `Kind.imag` instead of `Kind.image`). The
    flow.Kind enum is the closed vocabulary; we resolve against it
    lazily because py/flow.py imports this module."""

    @staticmethod
    def _kinds() -> set[str]:
        from flow import Kind
        return {k.value for k in Kind}

    @staticmethod
    def check(name: str, value: JsonValue, where: str) -> str:
        if not isinstance(value, str):
            raise ValueError(
                "%s kind %r must be a string Kind.value "
                "(one of %s)" % (where, value, sorted(_KindValue._kinds())))
        if value not in _KindValue._kinds():
            raise ValueError(
                "%s kind %r is not in the closed vocabulary %s"
                % (where, value, sorted(_KindValue._kinds())))
        return value


class CardSchemaRow(_Frozen):
    """One action card's typed contract (PYTHON SHAPE LAW rung 2).

    Fields:
      card_id       — the ActionCard.id, the same id the editor serves
      engine        — the engine_type this card's body composes against
                      (always "comfyui" today; the field exists so a
                      future engine gain is a row, not a refactor)
      schema_class  — the existing schema.py row (frozen pydantic
                      model). The flow gate calls
                      `schema_class.model_validate(params)` to gate
                      the body. May be a LAZY callable that resolves
                      on first access; the callable is called
                      exactly once per registry build and the class
                      is then stamped into the row.
      kind_inputs   — closed Kind contract for the card's named
                      inputs (prompt -> text, reference_image -> image,
                      ...). Empty dict = the card has no typed inputs
                      (today: all action cards take whatever the
                      __initial__ pool has; this row is the lever
                      for tightening).
      kind_outputs  — closed Kind contract for the card's named
                      outputs (the names a downstream stage may wire
                      to). The flow gate uses this to type-check
                      `FromStage` edges. Empty = the card is
                      "default-channel only" — the engine's
                      DEFAULT_OUTPUT fills the unnamed "default"
                      channel exactly as it does for a Stage that
                      omits outputs.
    """

    card_id: str
    engine: str
    schema_class: Optional[Type[BaseModel]] = None
    kind_inputs: Dict[str, str] = {}
    kind_outputs: Dict[str, str] = {}
    # STROKE 4 (2026-09-06): when True, a card= STAGE must carry
    # params.model (the model row id the arm composes against — the
    # flow-stage equivalent of the {model:} door). The gate refuses
    # an empty one at Flow construction, so the refusal is compile-
    # time, not a dead run. {model:} requests are unaffected: their
    # model rides the request envelope, not the card doc.
    requires_model: bool = False

    @model_validator(mode="before")
    @classmethod
    def _kind_check(cls, data: JsonValue | CardSchemaRow) -> JsonValue | CardSchemaRow:
        if not isinstance(data, dict):
            return data
        for k in ("kind_inputs", "kind_outputs"):
            d = data.get(k) or {}
            if not isinstance(d, dict):
                raise ValueError(
                    "%s must be a dict[str, str] (got %s)"
                    % (k, type(d).__name__))
            for name, kind in d.items():
                _KindValue.check(name, kind,
                                 "card %r %s[%r]"
                                 % (data.get("card_id", "<no id>"), k, name))
        return data

    @model_validator(mode="after")
    def _schema_is_frozen_model(self) -> "CardSchemaRow":
        cls = self.schema_class
        if cls is None:
            # a row may declare no schema (e.g. cards whose surface
            # is the form, not a schema.py). The gate skips — the
            # row still carries the Kind contract.
            return self
        # pydantic v1/v2 portability: the v2 way is the model's
        # `model_config["frozen"]` flag; v1 used `Config.frozen`.
        # We accept either.
        cfg = getattr(cls, "model_config", None) or getattr(cls, "Config", None)
        frozen = False
        if isinstance(cfg, dict):
            frozen = bool(cfg.get("frozen", False))
        else:
            frozen = bool(getattr(cfg, "frozen", False))
        if not frozen:
            raise ValueError(
                "card %r schema_class %s is not frozen=True — the gate "
                "requires a frozen row (PYTHON SHAPE LAW rung 2: "
                "validation at construction, no post-hoc walks)"
                % (self.card_id, cls.__name__))
        if not (isinstance(cls, type) and issubclass(cls, BaseModel)):
            raise ValueError(
                "card %r schema_class %s is not a pydantic BaseModel "
                "subclass — the gate calls model_validate(params)"
                % (self.card_id, cls.__name__))
        return self


class ParamSchemaRegistry(_Frozen):
    """The declared lattice. Cross-row invariants (duplicate
    card_ids) refuse AT CONSTRUCTION — the wall catches drift.

    `rows` is a tuple of CardSchemaRow instances. The lookup method
    is `get(card_id)` -> CardSchemaRow | None; the gate calls this
    in O(1) per stage.

    The registry is module-level constant (REGISTRY); callers never
    construct it. Walls construct their own rows for testing.
    """

    rows: tuple  # tuple[CardSchemaRow, ...]

    @model_validator(mode="after")
    def _unique_card_ids(self) -> "ParamSchemaRegistry":
        ids = [r.card_id for r in self.rows]
        if len(ids) != len(set(ids)):
            dupes = sorted({i for i in ids if ids.count(i) > 1})
            raise ValueError(
                "ParamSchemaRegistry: duplicate card_id(s) %s — one row "
                "per card, the row IS the declaration"
                % dupes)
        return self

    def get(self, card_id: str) -> CardSchemaRow | None:
        for r in self.rows:
            if r.card_id == card_id:
                return r
        return None

    def card_ids(self) -> tuple[str, ...]:
        return tuple(r.card_id for r in self.rows)


# ── the table ──────────────────────────────────────────────────────
# THE declaration — one frozen instance, every gate reads from it.
# Adding a card: write the schema.py row, add an import to
# _SCHEMA_BY_CARD, add a row here. The wall test enumerates the
# schema.py tree and pins the import list; it also pins this table
# against the import list (drift in either direction is a failure).

REGISTRY = ParamSchemaRegistry(rows=(
    CardSchemaRow(
        card_id="image-gen", engine="comfyui",
        schema_class=None,  # resolved lazily via _SCHEMA_BY_CARD["image-gen"]()
        kind_inputs={"prompt": "text",
                     "reference_image": "image"},
        kind_outputs={"default": "image"}),
    CardSchemaRow(
        card_id="image-edit", engine="comfyui",
        schema_class=None,
        kind_inputs={"prompt": "text",
                     "input_image": "image"},
        kind_outputs={"default": "image"}),
    CardSchemaRow(
        card_id="upscale-tools", engine="comfyui",
        schema_class=None,
        kind_inputs={"image": "image"},
        kind_outputs={"default": "image"}),
    CardSchemaRow(
        card_id="mask-studio", engine="comfyui",
        schema_class=None,
        kind_inputs={"image": "image"},
        kind_outputs={"default": "seg"}),
    CardSchemaRow(
        card_id="ideogram4", engine="comfyui",
        schema_class=None,  # no on-disk schema.py; gate is a no-op
        kind_inputs={"prompt": "text"},
        kind_outputs={"default": "image"}),
    CardSchemaRow(
        card_id="video-gen", engine="comfyui",
        schema_class=None,
        kind_inputs={"prompt": "text",
                     "reference_image": "image",
                     "pose_video": "video"},
        kind_outputs={"default": "video"}),
    CardSchemaRow(
        card_id="h3-timeline", engine="comfyui",
        schema_class=None,
        kind_inputs={"image": "image"},
        kind_outputs={"default": "video"}),
    CardSchemaRow(
        card_id="music", engine="comfyui",
        schema_class=None,
        kind_inputs={"prompt": "text", "lyrics": "text"},
        kind_outputs={"default": "audio"}),
    CardSchemaRow(
        card_id="tts", engine="comfyui",
        schema_class=None,
        # ROW 4 (2026-09-06): the second production card= lane
        # (flows/audio-native-tts) — the arm needs the model row
        # (knobmap existence gate), refused empty at construction.
        requires_model=True,
        kind_inputs={"prompt": "text"},
        kind_outputs={"default": "audio"}),
    CardSchemaRow(
        card_id="voice-lock", engine="comfyui",
        schema_class=None,
        kind_inputs={"text": "text", "voice_file": "audio"},
        kind_outputs={"default": "audio"}),
    CardSchemaRow(
        card_id="sfx", engine="comfyui",
        schema_class=None,
        kind_inputs={"prompt": "text"},
        kind_outputs={"default": "audio"}),
    CardSchemaRow(
        card_id="motion", engine="comfyui",
        schema_class=None,
        kind_inputs={"prompt": "text"},
        kind_outputs={"default": "video"}),
    CardSchemaRow(
        card_id="anny", engine="comfyui",
        schema_class=None,
        kind_inputs={"source_image": "image"},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        card_id="img-to-mesh", engine="comfyui",
        schema_class=None,
        kind_inputs={"input_image": "image"},
        kind_outputs={"default": "mesh"}),
    # (the cpp kimodo text-to-motion row is RETIRED 2026-09-06 —
    # the ONE-implementation rule: the NVIDIA-package wrap
    # (melite-kimodo-nodes, comfyui lane, card='motion') is THE
    # kimodo; the ggml second implementation died with its tree)
    # ── STROKE 4 (2026-09-06): the eight rows that closed the
    # bijection wall. Kind contracts derived from each card's
    # consuming flow (fit-seat, skin-apply) and the cpp engines'
    # DEFAULT_OUTPUT rows. requires_model marks the card whose arm
    # composes against a named model row — today only music-native
    # (the first production card= lane, flows/music-native).
    CardSchemaRow(
        card_id="fit", engine="comfyui",
        kind_inputs={"body": "mesh", "prop": "mesh"},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        card_id="skin", engine="comfyui",
        kind_inputs={"body": "mesh", "kind": "text"},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        # tagger: image in, tags/caption out — the text kind rides
        # the tag string, the estate's prompt-side vocabulary
        card_id="tagger", engine="comfyui",
        kind_inputs={"input_image": "image"},
        kind_outputs={"default": "text"}),
    CardSchemaRow(
        # input-prep: a file-reference transform (crop/scale/trim/
        # volume) — refs ride the text kind, media-agnostic
        card_id="input-prep", engine="comfyui",
        kind_inputs={"source": "text"},
        kind_outputs={"default": "text"}),
    CardSchemaRow(
        # forge (anycreature): the spec dict is a PARAM not a
        # channel — no typed wired inputs; output is a mesh
        card_id="forge", engine="anycreature",
        kind_inputs={},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        card_id="quad-remesh", engine="autoremesher",
        kind_inputs={"input": "mesh"},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        card_id="auto-rig", engine="skintokens",
        kind_inputs={"input": "mesh"},
        kind_outputs={"default": "mesh"}),
    CardSchemaRow(
        # THE first production card= lane (flows/music-native,
        # stroke 4): prompt/lyrics in, audio out; the doc names
        # its model row (params.model) — the {model:} door's
        # flow-stage equivalent, gated at construction
        card_id="music-native", engine="audio_cpp",
        requires_model=True,
        kind_inputs={"prompt": "text", "lyrics": "text"},
        kind_outputs={"default": "audio"}),
))


# ── the gate helpers (called by py/flow.py) ────────────────────────


class StageParamError(ValueError):
    """A card stage that fails the lattice. Subclasses ValueError so
    pydantic validators and the door both surface it LOUDLY."""


def _mount_card_fallback(card_id: str, pkg_name: str) -> bool:
    """Loader-owned import mechanics (shape law rung 5): when the
    flat package name never mounted (the music-native case — its
    dir is NAMED music, colliding with the comfyui music card, so
    no bus mounts it as "music_native"), locate the card via the
    SSOT scan and mount its py/ package under the unique card-id
    name. Returns True when the package is importable after the
    call. A failed mount returns False — the caller surfaces the
    ORIGINAL import error, never a guessed schema."""
    if pkg_name in sys.modules:
        return True
    try:
        from melite_cards.serialize import scan_engine_cards
        repo = str(Path(__file__).resolve().parents[1])  # py/ → repo
        entry = scan_engine_cards(repo).get(card_id)
    except Exception:
        return False
    if not entry:
        return False
    py_dir = Path(entry[0]).parent           # <card>/py/card.py → py/
    if not (py_dir / "__init__.py").is_file():
        return False
    spec = importlib.util.spec_from_file_location(
        pkg_name, py_dir / "__init__.py",
        submodule_search_locations=[str(py_dir)])
    if spec is None or spec.loader is None:
        return False
    pkg = importlib.util.module_from_spec(spec)
    sys.modules[pkg_name] = pkg
    try:
        spec.loader.exec_module(pkg)
    except Exception:
        sys.modules.pop(pkg_name, None)
        return False
    return True


def _mount_cards_for_wall() -> None:
    """Mount EVERY card py/ package under its dir-derived name (the
    test recipe, loader-owned per rung 5): the SSOT scan enumerates
    every plugin's action cards — comfyui AND the cpp natives (the
    hardcoded comfyui-only glob missed the natives until
    2026-09-06). Idempotent per process. Walls call this before
    resolving schemas; the gateway never needs it (the bus mounts
    at load)."""
    global _CARDS_MOUNTED_FOR_WALL
    if _CARDS_MOUNTED_FOR_WALL:
        return
    try:
        from melite_cards.serialize import scan_engine_cards
    except ImportError:
        return
    repo = str(Path(__file__).resolve().parents[1])  # py/ → repo
    try:
        entries = scan_engine_cards(repo).values()
    except Exception:
        return
    for card_py, _cls in entries:
        py_dir = Path(card_py).parent
        if not (py_dir / "__init__.py").is_file():
            continue
        pkg_name = py_dir.parent.name.replace("-", "_")
        if pkg_name in sys.modules:
            continue
        spec = importlib.util.spec_from_file_location(
            pkg_name, py_dir / "__init__.py",
            submodule_search_locations=[str(py_dir)])
        if spec is None or spec.loader is None:
            continue
        pkg = importlib.util.module_from_spec(spec)
        sys.modules[pkg_name] = pkg
        try:
            spec.loader.exec_module(pkg)
        except Exception:
            sys.modules.pop(pkg_name, None)
    _CARDS_MOUNTED_FOR_WALL = True


_CARDS_MOUNTED_FOR_WALL = False


def _resolve_schema(card_id: str) -> Type[BaseModel] | None:
    """Lazy import — only at gate time. The wall test mounts
    the card packages via `_mount_cards_for_wall` before invoking;
    normal process paths (gateway, validate_engines) have the
    packages already mounted by the bus. Returns the schema class,
    or None for cards without a schema.py."""
    if card_id in _CARDS_WITHOUT_SCHEMA:
        return None
    target = _SCHEMA_TARGETS.get(card_id)
    if target is None:
        return None
    try:
        return _import_schema_lazy(*target)()
    except ImportError:
        # the flat name never mounted (cross-engine dir-name
        # collision) — mount under the unique card-id name and
        # build a FRESH lazy loader (the failed one caches its
        # error per-closure)
        if _mount_card_fallback(card_id, target[0].split(".")[0]):
            return _import_schema_lazy(*target)()
        raise


def validate_stage_params(card_id: str, params: JsonValue,
                          where: str = "stage") -> None:
    """Pass 1: the body gate. If `card_id` is in the registry,
    validate `params` against the schema_class. A typo'd knob
    name refuses loud, named after the field, NEVER a silent
    GPU run.

    Engine-only stages (card_id == "") skip this gate — the
    engine's own Phase-1 validation owns the body (the comfyui
    engine reads `params.workflow` / `params.inject` etc.).
    """
    if not card_id:
        return
    row = REGISTRY.get(card_id)
    if row is None:
        raise StageParamError(
            "%s: card %r is not in the ParamSchemaRegistry — either "
            "add a row to py/stage_params.py or omit `card=` "
            "(engine-only stages need no schema gate)"
            % (where, card_id))
    # STROKE 4: the model row a card stage composes against is a
    # STAGE param (the {model:} door's flow equivalent) — the row
    # flags the cards whose arm needs one, the gate refuses the
    # empty spell at construction, compile-time, never a dead run.
    # Runs BEFORE the schema pass so the refusal names the door
    # shape even when the schema has no model field yet.
    if row.requires_model and not (
            isinstance(params, dict)
            and str(params.get("model") or "").strip()):
        raise StageParamError(
            "%s: card %r requires params.model (the model row id the "
            "card composes against — see GET /v1/models) — the "
            "flow-stage equivalent of the {model:} door"
            % (where, card_id))
    schema = _resolve_schema(card_id)
    if schema is None:
        return  # no on-disk schema.py; the row declares no gate
    try:
        schema.model_validate(params or {})
    except ValidationError as e:
        # field-named refusal, the SHAPE every pydantic refusal in
        # the estate already speaks
        msgs = []
        for err in e.errors()[:5]:
            loc = ".".join(str(x) for x in err.get("loc", ())) or "<root>"
            msgs.append("%s: %s" % (loc, err.get("msg", "")))
        raise StageParamError(
            "%s: card %r schema refused body — %s"
            % (where, card_id, "; ".join(msgs))) from e
    return


def card_outputs(card_id: str) -> dict[str, str]:
    """The card's typed outputs (a {name: Kind.value} dict). Empty
    for an unknown card; callers fall through to engine
    DEFAULT_OUTPUT. The kind check downstream consults this when
    Stage.card_io is empty."""
    row = REGISTRY.get(card_id)
    if row is None:
        return {}
    return dict(row.kind_outputs)


def card_inputs(card_id: str) -> dict[str, str]:
    """The card's typed inputs (a {name: Kind.value} dict). Empty
    for an unknown card. The lattice uses this when Stage.expected
    is empty — the card's contract fills the missing keys."""
    row = REGISTRY.get(card_id)
    if row is None:
        return {}
    return dict(row.kind_inputs)


# ── a stamp helper (the diagnostic sidecar) ────────────────────────


def stamp_validated(card_id: str, params: JsonValue) -> JsonValue:
    """For the per-stage params dict: when the card has a schema,
    construct the validated row and store its dump in
    `params["_schema_validated"]`. The engine and the sidecar can
    read the typed contract; the engine's verbatim surface stays
    unchanged. If the params is empty or not a dict, the stamp is
    skipped (engine-only stages with no params: nothing to stamp).

    Returns the (possibly mutated) params dict. The flow does not
    re-validate here — validate_stage_params already ran at
    construction. The stamp is a sidecar, not a gate.
    """
    if not card_id or not isinstance(params, dict):
        return params
    schema = _resolve_schema(card_id)
    if schema is None:
        return params
    try:
        doc = schema.model_validate(params)
    except ValidationError:
        # already-gated at construction; a stamp failure here is a
        # surface mismatch the flow missed — refuse loud, never a
        # silent skip (PYTHON SHAPE LAW: no silent drops)
        raise StageParamError(
            "stage params: card %r schema refused body at stamp time "
            "after passing the construction gate — gate drift"
            % card_id)
    stamped = dict(params)
    stamped["_schema_validated"] = doc.model_dump()
    return stamped
