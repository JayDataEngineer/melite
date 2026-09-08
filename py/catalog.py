#!/usr/bin/env python3
"""py/catalog.py — the estate's model catalog builder.

THE catalog module (there is no other): scans packages/engines/** for
model.py classes and card.py classes, assembles the served catalog,
and pins its own output against tests/golden_http/model-catalog.json
— the estate's wire contract regression pin.

    scan_catalog(repo_root) -> dict   full catalog object
                                        (models / families / capabilities / cards)
    to_json(catalog) -> str           compact serialization, emit order below
    find_model(catalog, model_id)     first scan-order match or None

PLUGIN ARCHITECTURE LAW: this module names NO model, engine, or lane.
A card.py class whose card block carries

    ability:
      default_family: <model family id>

is a capability tile (one per ability card, never one per model — the
operator card law, surface 3).

OFFERING LAW (2026-09-05, "offered means runnable" × the 2026-08-11
catalog contract): the served catalog carries ONLY offered models.
A Model class is offered (form = "<editor form>") or unoffered
(unoffered = True — no card arm yet); the scan skips unoffered
classes entirely, so every wire row routes and renders. The form=''
era shipped keyless rows and let the frontend validator catch them
at runtime — that channel is closed at class construction
(melite_models grammar: the offering gate) and again here (the skip).

Wire shape (OUR contract — the goldens pin it, and changing it is a
deliberate regold with a causes.md entry, never drift):
  * families/models/capabilities are RECORDS keyed by id — never
    arrays. Duplicate family ids across plugin folders collapse
    last-scan-row-wins (a JSON parser reading duplicate map keys
    keeps the last).
  * models walk is raw scandir order; the cards walk is SORTED
    (deterministic across machines).
  * model rows carry a REQUIRED non-empty form (ModelRow schema).
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    import slot_kinds
    from melite_cards import ActionCard
    from melite_models import Model

# The wire-row shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


class _CardFacts(TypedDict):
    id: str
    label: str
    description: str
    genre: str
    icon: str
    families: list[str]
    principles: list[str]
    skills: list[tuple[str, str]]
    ability_route: str | None
    inference_path: str | None
    rubric_path: str | None


class _Catalog(TypedDict):
    models: dict[str, dict[str, JsonValue]]
    families: dict[str, dict[str, JsonValue]]
    capabilities: dict[str, dict[str, JsonValue]]
    cards: list[dict[str, JsonValue]]
    _scan_models: list[dict[str, JsonValue]]
    _plugins_dir: str
    _form_slot_vocab: slot_kinds.FormSlotVocabulary

# ---------------------------------------------------------------------------
# File probes
# ---------------------------------------------------------------------------


def _probe(path: str) -> str | None:
    """Unit-asset existence probe (agents/AGENT.md etc.)."""
    return path if os.path.isfile(path) else None


# ---------------------------------------------------------------------------
# Row assembly — the emit orders are the wire contract (goldens pin them)
# ---------------------------------------------------------------------------


def _card_row(c: _CardFacts) -> dict[str, JsonValue]:
    row = {}
    row["id"] = c["id"] or ""
    row["label"] = c["label"] or ""
    row["description"] = c["description"] or ""
    row["genre"] = c["genre"] or ""
    row["families"] = list(c["families"])
    row["principles"] = list(c["principles"])
    row["skills"] = [{"id": sid, "label": slabel or ""} for sid, slabel in c["skills"]]
    row["has_inference"] = c["inference_path"] is not None
    row["has_rubric"] = c["rubric_path"] is not None
    return row


def _capability_entry_from_class(card_dir_name: str, cls: type[ActionCard], route: str
                                 ) -> tuple[str, dict[str, JsonValue]]:
    """A capabilities tile from the card class — emit order: label,
    description, default_family, families, kind, [icon], resolved."""
    cid = cls.id or card_dir_name
    clabel = cls.label or card_dir_name
    entry = {
        "label": clabel,
        "description": cls.description,
        "default_family": route,
        "families": list(cls.families_of()),
        "kind": "generation",
    }
    if cls.icon:
        entry["icon"] = cls.icon
    entry["resolved"] = {"family": route, "model": route, "params": {}}
    return cid, entry


# ---------------------------------------------------------------------------
# Directory scanning — models exactly three levels deep under
# engines/<owner>/models/<genre>/<mid>/, cards under cards/ and
# action_cards/ (genre-grouped one deeper). Dot-entries and non-dirs
# skipped.
# ---------------------------------------------------------------------------


def _engine_owner_dirs(eng_root: str | Path) -> Iterator[Path]:
    """Owner dirs under packages/engines/: depth-2 plugins AND depth-3
    category subdirs (packages/engines/<cat>/<plugin>/ — the cpp
    native-engine category, 2026-10-02). THE WALK LIVES IN plugins.py
    (iter_plugin_dirs_under — one law, every consumer: scan_engines,
    this scan, editor_forms). Yields Path objects."""
    from pathlib import Path
    import plugins as _plugins
    yield from _plugins.iter_plugin_dirs_under(Path(eng_root))


def _dirs_under(parent: str) -> list[str]:
    """Sorted non-hidden subdirectories of parent (the genre/mid two
    steps of every model walk)."""
    try:
        entries = sorted(os.listdir(parent))
    except OSError:
        return []
    return [os.path.join(parent, n) for n in entries
            if not n.startswith(".") and os.path.isdir(os.path.join(parent, n))]


def _load_class(mpy: str, owner: Path, repo_root: str) -> type[Model] | None:
    """model.py -> class (same loader law as _scan_model_dir; the
    repo_root is PASSED, never re-derived by counting dirnames)."""
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_models import load_model_py
    return load_model_py(mpy, owner.name if hasattr(owner, "name")
                         else str(owner))


def _scan_models(plugins_dir: str) -> list[tuple[dict[str, JsonValue], dict[str, str | bool | list[str] | None]]]:
    """Returns ordered (row, meta) pairs, one per OFFERED model.py
    class — unoffered classes serve no row (the offering law). meta
    carries the studio claim for the families section."""
    pairs = []
    eng_root = os.path.join(plugins_dir, "engines")
    try:
        owner_dirs = list(_engine_owner_dirs(eng_root))
    except OSError:
        return pairs
    for owner in owner_dirs:
            models_dir = os.path.join(owner, "models")
            if not os.path.isdir(models_dir):
                continue
            with os.scandir(models_dir) as genres:
                for genre in genres:
                    if genre.name.startswith("."):
                        continue
                    genre_dir = os.path.join(models_dir, genre.name)
                    if not os.path.isdir(genre_dir):
                        continue
                    with os.scandir(genre_dir) as mids:
                        for mid in mids:
                            if mid.name.startswith("."):
                                continue
                            model_dir = os.path.join(genre_dir, mid.name)
                            if not os.path.isdir(model_dir):
                                continue
                            pairs.extend(_scan_model_dir(model_dir))
    return pairs


try:
    # the same class as the gateway's (plugins.py defines the standalone
    # twin when the gateway import cycle blocks — same trick as editor_forms)
    from gateway import ValidationError  # noqa: F401
except Exception:
    class ValidationError(Exception):
        """Loud 4xx before any run is registered (QUEUE LANE LAW)."""


def _scan_model_dir(model_dir: str) -> list[tuple[dict[str, JsonValue], dict[str, str | bool | list[str] | None]]]:
    """model.py class → row; unit assets (agents/inference/rubric)
    probed next to the class. The flip is TOTAL: every unit is a
    model.py class; a model.yaml reappearing next to a model.py is a
    LOUD refusal (two SSOTs is zero SSOTs).

    UNOFFERED classes (unoffered = True) return no row — the class
    stays loadable (lane data awaits boarding), the wire stays
    offered-only."""
    mpy = os.path.join(model_dir, "model.py")
    if not os.path.isfile(mpy):
        return []
    if os.path.isfile(os.path.join(model_dir, "model.yaml")):
        raise ValidationError(
            "%s carries BOTH model.py and model.yaml — one source of "
            "truth per unit; delete the yaml (the flip) or the .py"
            % mpy)
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(model_dir))))))
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_models import load_model_py, model_row
    engine = os.path.basename(os.path.dirname(os.path.dirname(
        os.path.dirname(model_dir))))
    cls = load_model_py(mpy, engine)
    if getattr(cls, "unoffered", False):
        # OFFERING LAW: no card arm, no catalog row. The offering
        # gate at class construction keeps form='' out; this skip
        # keeps the class itself off the served wire.
        return []
    meta = {"studio_tenant": None, "studio_owns_params": False,
            "studio_writes": [], "studio_size": "normal",
            "studio_layout": "studio",
            "accepts": [str(a) for a in
                        (getattr(cls, "accepts", ()) or ())]}
    if cls.studio is not None:
        meta = {"studio_tenant": cls.studio.tenant,
                "studio_owns_params": bool(cls.studio.owns_params),
                "studio_writes": [str(w) for w in
                                  (cls.studio.writes or ())],
                # Presentation notches ride the claim (web-registry §7):
                # the enum VALUES serve verbatim on the wire.
                "studio_size": cls.studio.size.value,
                "studio_layout": cls.studio.layout.value,
                "accepts": [str(a) for a in
                            (getattr(cls, "accepts", ()) or ())]}
    return [(model_row(cls, model_dir), meta)]


def _scan_cards(plugins_dir: str, models: dict[str, dict[str, JsonValue]]
                ) -> tuple[list[dict[str, JsonValue]], dict[str, dict[str, JsonValue]],
                           list[slot_kinds.FormSlotBinding]]:
    rows = []
    capabilities = {}
    slot_bindings: list[slot_kinds.FormSlotBinding] = []
    eng_root = os.path.join(plugins_dir, "engines")
    try:
        owners = list(_engine_owner_dirs(eng_root))
    except OSError:
        return rows, capabilities, slot_bindings
    for owner in owners:
            for subdir in ("cards", "action_cards"):
                cards_dir = os.path.join(owner, subdir)
                if not os.path.isdir(cards_dir):
                    continue
                with os.scandir(cards_dir) as cids:
                    # SORTED walk: deterministic across machines; the
                    # card order the editor sees is stable regardless
                    # of who cloned when.
                    for cid in sorted(cids, key=lambda e: e.name):
                        if cid.name.startswith("."):
                            continue
                        card_dir = os.path.join(cards_dir, cid.name)
                        if not os.path.isdir(card_dir):
                            continue
                        row, cap_key, cap_entry, card_slots = _scan_card_dir(
                            card_dir, cid.name, models)
                        if row is not None:
                            rows.append(row)
                        if cap_key is not None:
                            capabilities[cap_key] = cap_entry
                        slot_bindings.extend(card_slots)
                        # genre group layer (image/ video/ 3d/ motion/
                        # mask/): nested card dirs the editor's
                        # cardStudios glob also walks.
                        with os.scandir(card_dir) as subs:
                            for sub in sorted(subs, key=lambda e: e.name):
                                if sub.name.startswith("."):
                                    continue
                                sub_dir = os.path.join(card_dir, sub.name)
                                if not os.path.isdir(sub_dir):
                                    continue
                                row, cap_key, cap_entry, card_slots = _scan_card_dir(
                                    sub_dir, sub.name, models)
                                if row is not None:
                                    rows.append(row)
                                if cap_key is not None:
                                    capabilities[cap_key] = cap_entry
                                slot_bindings.extend(card_slots)
    return rows, capabilities, slot_bindings


def _scan_card_dir(card_dir: str, card_name: str, models: dict[str, dict[str, JsonValue]] | None
                   ) -> tuple[dict[str, JsonValue] | None, str | None,
                              dict[str, JsonValue] | None, list[slot_kinds.FormSlotBinding]]:
    """card.py class → row; only api=True classes serve. The ability
    marker (plugin data) promotes the card to a capabilities tile.
    The identity rung: id/label/description/genre/icon/api/ability/
    requires/principles/skills live on the ActionCard class
    (py/melite_cards). A card.yaml next to a card.py is a LOUD
    refusal (two SSOTs is zero SSOTs).

    THE CARD PATTERN (2026-09-03): python code lives in the card's
    py/ subfolder — <card>/py/card.py; a root card.py is the compat
    fallback (pre-pattern cards)."""
    mpy = next((p for p in (os.path.join(card_dir, "py", "card.py"),
                            os.path.join(card_dir, "card.py"))
                if os.path.isfile(p)), None)
    if mpy is None:
        return None, None, None, []
    if os.path.isfile(os.path.join(card_dir, "card.yaml")):
        raise ValidationError(
            "%s carries BOTH card.py and card.yaml — the identity rung "
            "moved card.yaml onto the class; delete the yaml" % mpy)
    # engine dir: one hop above the cards/action_cards segment for
    # depth-1 card dirs, two for genre-grouped
    # (action_cards/<genre>/<card>/); THE CARD PATTERN adds a py/ hop
    # — stripped first. Depth-3 category plugins (cpp/): climb to the
    # dir whose PARENT is packages/ — the repo root — instead of a
    # fixed three-hop dirname.
    _d = os.path.dirname(card_dir)
    if os.path.basename(_d) == "py":
        _d = os.path.dirname(_d)
    engine_dir = (os.path.dirname(_d)
                  if os.path.basename(_d) in ("cards", "action_cards")
                  else os.path.dirname(os.path.dirname(_d)))
    _root = engine_dir
    while _root and os.path.basename(os.path.dirname(_root)) != "plugins" \
            and os.path.basename(_root) != "plugins":
        _root = os.path.dirname(_root)
        if _root == os.path.sep or not _root:
            _root = engine_dir
            break
    repo_root = os.path.dirname(_root) if os.path.basename(
        os.path.dirname(_root)) == "plugins" else _root
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_cards import load_card_py
    engine = os.path.basename(engine_dir)
    cls = load_card_py(mpy, engine)
    if not cls.id:
        return None, None, None, []
    if not cls.api:  # API gate
        return None, None, None, []
    c = {
        "id": cls.id, "label": cls.label, "description": cls.description,
        "genre": cls.genre, "icon": cls.icon,
        "families": list(cls.families_of()),
        "principles": list(cls.principles),
        "skills": [(sid, slab) for sid, slab in cls.skills],
        "ability_route": (cls.ability or {}).get("default_family")
        if isinstance(cls.ability, dict) else None,
        "inference_path": None,  # inference.yaml extinct (class-driven)
        "rubric_path": _probe(os.path.join(card_dir,
                                           "grading_rubric.yaml")),
    }
    cap_key = cap_entry = None
    if c["ability_route"]:
        cap_key, cap_entry = _capability_entry_from_class(
            card_name, cls, c["ability_route"])

    # Per-form / per-model slot bindings (2026-09-05, no-drop fix):
    # every File/Image/Audio/Video field the card class declares is a
    # slot the SlotGrid must render. Emit one FormSlotBinding per
    # (card's form, boarded-model-route, field) — the frontend reads
    # form_slots[form] / model_slots[model_route] to draw the squares.
    # Kind: prefer the global slot_kinds vocab (the canonical kind for
    # known names like source_image → image); else derive from the
    # field's DSL type (image→image, audio→audio, video→video,
    # file→any — File is generic, the card author didn't specify a
    # kind, so "any" is honest and the wire remains permissive).
    slot_bindings = []
    import slot_kinds as _sk
    _vocab_kinds = {r.slot: r.kind for r in _sk.VOCAB.slots}
    _DSL_TO_KIND = {
        "image": _sk.FileKind.IMAGE,
        "audio": _sk.FileKind.AUDIO,
        "video": _sk.FileKind.VIDEO,
        "file": _sk.FileKind.ANY,
    }

    def _emit(_form: str, _route: str) -> None:
        for _fld in getattr(cls, "_fields_", ()):
            _ft = getattr(_fld, "type", None)
            if _ft not in _DSL_TO_KIND:
                continue
            # MODS-ZONE BINARY FIELDS ARE NOT MAIN INPUTS (operator
            # order, 2026-09-05: "INPUT MASK... is A MOD it's not
            # cluttering the main inputs"). A mod-owned slot (MaskMod's
            # input_mask, zone='mods') renders in the Mods zone's own
            # section, never in the main SlotGrid vocabulary.
            if getattr(_fld, "zone", None) == "mods":
                continue
            _kind = _vocab_kinds.get(_fld.name) or _DSL_TO_KIND[_ft]
            slot_bindings.append(
                _sk.FormSlotBinding(
                    form=_form, model_route=_route,
                    field=_fld.name, kind=_kind))

    if getattr(cls, "models", None):
        for _model in cls.models:
            _form = getattr(_model, "form", None)
            _route = getattr(_model, "id", None)
            if not _form or not _route:
                raise ValidationError(
                    "%s boards a model with no form/route "
                    "(form=%r route=%r) — a card that cannot name its "
                    "surface refuses, it never renders a default" % (
                        cls.id, _form, _route))
            _emit(_form, _route)
    else:
        # Legacy card shape (2026-09-05: exactly one in the tree,
        # h3-timeline): no `models` tuple, the card names its family
        # via ability.default_family. Resolve the form from the
        # scanned models — LOUDLY (an unresolvable family is a
        # misroute, never a silent skip).
        _route = (cls.ability or {}).get("default_family") \
            if isinstance(cls.ability, dict) else None
        if not _route:
            raise ValidationError(
                "%s declares neither models nor "
                "ability.default_family — the card names no lane and "
                "refuses (QUEUE LANE LAW)" % cls.id)
        _mrow = (models or {}).get(_route)
        if _mrow is None:
            raise ValidationError(
                "%s names default_family %r with no boarded model — "
                "the family is not in the catalog; misroute, not a "
                "fallback" % (cls.id, _route))
        if not _mrow.get("form"):
            raise ValidationError(
                "%s boards unoffered model %r (no form) — a card with "
                "no surface refuses" % (cls.id, _route))
        _emit(_mrow["form"], _route)

    return _card_row(c), cap_key, cap_entry, slot_bindings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def scan_catalog(repo_root: str) -> _Catalog:
    """Scan <repo_root>/plugins and build the full catalog object.

    Returns a dict with the four wire sections — models / families /
    capabilities / cards — plus private '_' keys used by find_model
    and diagnostics (to_json emits only the four). models/families
    are maps keyed by family id: duplicate ids across plugin folders
    collapse last-scan-row-wins.
    """
    plugins_dir = os.path.join(os.fspath(repo_root), "packages")

    scan_pairs = _scan_models(plugins_dir)
    models = {}
    families = {}
    for row, meta in scan_pairs:
        models[row["id"]] = row
        fam = {"label": row["label"], "genre": row["genre"]}
        if meta.get("accepts"):
            # Ingestion vocabulary (2026-09-06): the canvas drop
            # gate reads families.<id>.accepts — a family that
            # declares none serves no key (not a drop target).
            fam["accepts"] = list(meta["accepts"])
        if meta["studio_tenant"]:
            # Studio body claim: only models declaring studio: emit
            # it — the editor's studio-tenant resolver.
            fam["studio"] = {
                "tenant": meta["studio_tenant"],
                "owns_params": bool(meta["studio_owns_params"]),
                "writes": list(meta["studio_writes"]),
                "size": meta["studio_size"],
                "layout": meta["studio_layout"],
            }
        families[row["id"]] = fam

    cards, capabilities, slot_bindings = _scan_cards(plugins_dir, models)

    # Per-form / per-model slot vocabulary (2026-09-05, no-drop): every
    # binary field the card classes declare is a slot the SlotGrid must
    # render. Construction validates uniqueness (a form declares a
    # field at most once) — the pydantic row refuses illegal vocabularies
    # at BUILD time, not at first wire read. Pydantic failures surface
    # LOUDLY here as a catalog-load refusal; that's the desired behavior
    # (a duplicate declaration is a bug, not a silent default-card class).
    import slot_kinds as _sk2
    try:
        form_slot_vocab = _sk2.FormSlotVocabulary(bindings=tuple(slot_bindings))
    except Exception as _e:
        raise RuntimeError(
            "form slot vocabulary construction failed (the catalog "
            "REFUSES to serve a card whose declared slots are inconsistent "
            "— fix the card class; this is the no-drop law, 2026-09-05): %s"
            % _e) from _e

    return {
        "models": models,
        "families": families,
        "capabilities": capabilities,
        "cards": cards,
        "_scan_models": [row for row, _ in scan_pairs],
        "_plugins_dir": plugins_dir,
        "_form_slot_vocab": form_slot_vocab,
    }


def to_json(catalog: _Catalog) -> str:
    """The served shape:
    {"models":{…},"families":{…},"capabilities":{…},"cards":[…]},
    compact separators. Plus input_vocabulary — the slot SSOT from
    py/slot_kinds.py merged with the per-form/per-model bindings derived
    from the card classes' File/Image/Audio/Video field declarations
    (the no-drop law, 2026-09-05: a card that declares an input slot
    MUST have it in the served vocabulary, or the SlotGrid renders empty
    — the silent default-card class). The editor's setInputVocabulary
    replaces its fallbacks field-by-field with this."""
    import slot_kinds
    vocab = slot_kinds.input_vocabulary()
    form_vocab = catalog.get("_form_slot_vocab")
    if form_vocab is not None:
        vocab["form_slots"] = form_vocab.form_slots()
        vocab["model_slots"] = form_vocab.model_slots()
    else:
        # Legacy / unbuilt — emit empty dicts (NEVER omit the keys:
        # the editor's setInputVocabulary tests `form_slots in v` and
        # the absent key would force the form-aware fallback. Empty
        # dict = "no per-form declarations" — the global vocab still
        # applies, the per-form path is a no-op.
        vocab["form_slots"] = {}
        vocab["model_slots"] = {}
    obj = {
        "models": catalog["models"],
        "families": catalog["families"],
        "capabilities": catalog["capabilities"],
        "cards": catalog["cards"],
        "input_vocabulary": vocab,
    }
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def find_model(catalog: _Catalog, model_id: str) -> dict[str, JsonValue] | None:
    """First scan-order row whose family id matches, else None. (The
    models map collapses duplicates last-wins; the per-model door
    serves the first — so does this.)"""
    for row in catalog.get("_scan_models", ()):
        if row["id"] == model_id:
            return row
    return None


def model_loras(repo_root: str, model_id: str) -> dict[str, JsonValue] | None:
    """The /v1/loras door body: a model's DECLARED LoRA pack — the
    LorasMod rows on the class (the mods flip: 'lora detection' is
    class-declared python rows, never a disk scrape; the picker's
    filenames are the row filenames, verbatim, in declaration order).
    Unknown or unoffered model -> None (the door 404s; an unoffered
    class serves nothing, same law as the catalog)."""
    from melite_cards import LorasMod
    repo_root = os.path.abspath(repo_root)
    eng_root = os.path.join(repo_root, "packages", "engines")
    for owner in _engine_owner_dirs(eng_root):
        models_dir = os.path.join(owner, "models")
        if not os.path.isdir(models_dir):
            continue
        for genre_dir in _dirs_under(models_dir):
            for model_dir in _dirs_under(genre_dir):
                mpy = os.path.join(model_dir, "model.py")
                if not os.path.isfile(mpy):
                    continue
                cls = _load_class(mpy, owner, repo_root)
                if cls is None or cls.id != model_id or cls.unoffered:
                    if cls is not None and cls.id == model_id:
                        return None      # first match is the law; 404
                    continue
                rows = []
                meta = {}
                for mod in getattr(cls, "mods", ()):
                    if not (isinstance(mod, type)
                            and issubclass(mod, LorasMod)):
                        continue
                    for r in mod.rows:
                        rows.append(r.filename)
                        stem = r.filename.rsplit("/", 1)[-1]
                        stem = re.sub(r"\.(safetensors|pt|bin)$", "", stem)
                        m = {"label": r.label, "category": r.category,
                             "default_strength": r.default_strength}
                        meta[stem] = {k: v for k, v in m.items() if v != ""}
                note = ("%d declared adapter%s — the family's LorasMod "
                        "rows (mods/loras.py)" % (len(rows),
                        "" if len(rows) == 1 else "s")) if rows else None
                return {"model": model_id, "loras": rows,
                        "note": note, "meta": meta}
    return None


# ---------------------------------------------------------------------------
# Self-test — the golden contract wall.
# Run: python3 py/catalog.py
# Deep-compares scan_catalog(repo) against tests/golden_http/
# model-catalog.json (the estate's own wire-contract regression pin),
# printing the FIRST divergence per mismatch class; exits nonzero on
# any drift. Changing the golden is a deliberate regold — document
# the cause in tests/golden_http/model-catalog.json.d/causes.md.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    golden_path = os.path.join(repo, "tests", "golden_http", "model-catalog.json")

    with open(golden_path, "r", encoding="utf-8") as f:
        golden = json.load(f)

    catalog = scan_catalog(repo)
    mine = json.loads(to_json(catalog))

    divergences = []

    def walk(a: JsonValue, b: JsonValue, path: str) -> None:
        """Collect leaf divergences: class, path, golden value, py value."""
        if len(divergences) > 200:  # cap runaway drift reports
            return
        if isinstance(a, dict) and isinstance(b, dict):
            for k in sorted(set(a) | set(b)):
                if k not in b:
                    divergences.append(("missing-in-py", "%s.%s" % (path, k), a[k], None))
                elif k not in a:
                    divergences.append(("missing-in-golden", "%s.%s" % (path, k), None, b[k]))
                else:
                    walk(a[k], b[k], "%s.%s" % (path, k))
            return
        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                divergences.append(("list-length", path,
                                    "len=%d" % len(a), "len=%d" % len(b)))
                return
            for i, (x, y) in enumerate(zip(a, b)):
                walk(x, y, "%s[%d]" % (path, i))
            return
        # bool is bool (never int); int/float may cross (JSON has one
        # number type — the repo parity wall's rule)
        same_type = type(a) is type(b) or (
            isinstance(a, (int, float)) and not isinstance(a, bool)
            and isinstance(b, (int, float)) and not isinstance(b, bool))
        if not same_type:
            divergences.append(("type", path,
                                "%s=%r" % (type(a).__name__, a),
                                "%s=%r" % (type(b).__name__, b)))
        elif a != b:
            divergences.append(("value", path, repr(a), repr(b)))

    walk(golden, mine, "$")

    print("scan: %d model rows (%d distinct families), %d cards, %d capabilities"
          % (len(catalog["_scan_models"]), len(catalog["models"]),
             len(catalog["cards"]), len(catalog["capabilities"])))

    if not divergences:
        print("PARITY: exact structural match against %s" % golden_path)
        gk, mk = list(golden.keys()), list(mine.keys())
        if gk != mk:  # closeness note only — key order is semantics-free
            print("note: top-level key order differs:")
            print("      golden %s" % gk)
            print("      py     %s" % mk)
        # find_model smoke check against golden-derived ids (no lane names
        # in this module): every golden family id resolves, unknown doesn't
        some_id = next(iter(golden["models"]))
        assert find_model(catalog, some_id) is not None
        assert find_model(catalog, some_id)["id"] == some_id
        assert find_model(catalog, "no-such-family-id") is None
        print("find_model: ok (first-match for %r, None for unknown)" % some_id)
        sys.exit(0)

    print("PARITY: %d divergence(s)" % len(divergences))
    first_by_class = {}
    for cls, path, gv, pv in divergences:
        first_by_class.setdefault(cls, (path, gv, pv))
    for cls in sorted(first_by_class):
        path, gv, pv = first_by_class[cls]
        fmt = lambda v: v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)[:400]
        print("  [%s] first at %s" % (cls, path))
        print("        golden: %s" % fmt(gv))
        print("        py:     %s" % fmt(pv))
    counts = {}
    for cls, _, _, _ in divergences:
        counts[cls] = counts.get(cls, 0) + 1
    print("  counts by class: %s" % counts)
    sys.exit(1)
