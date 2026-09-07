#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Editor form/card-data readers — THE form surface (stdlib-only.
This module IS the implementation (the C twin was retired 2026-09-02;
the golden_http pins are the estate's own wire contract).

Routes served:
  GET /v1/forms                 -> the derived forms table
                                    (_derive_forms_table below)
  GET /v1/form-spec?model=<id>  -> form_spec: catalog row + variants
                                   + card surface + recipes
  GET /v1/kinds                 -> the first-party kind table declared in
                                   py/card_kinds.py

Where each route's data lives (everything is read from plugins/ at call time;
no model or engine name is hardcoded as logic — see the one documented
exception for /v1/forms below):

  /v1/forms        DERIVED OPERATOR SURFACE (ledger row 3, operator
                   order 2026-09-06: "THE SOURCE DECLARES WHAT THE END
                   USERS CAN DO, NOT THE OTHER WAY AROUND") — every
                   entry is one uniform projection of a card class
                   (id/label/genre + the sidebar trio) + the Model.card
                   scan (covers), zero per-card branches. The table's
                   keys are also the ALLOWED_CARDS set, so the card
                   finder derives its gate from the table, not a second
                   list.
  /v1/form-spec    model row: plugins/<owner>/models/<genre>/<id>/
                    model.py (the Model class — family/defaults/engine/
                    offering); variants: the class's frozen rows;
                    card surface (form/service/fields/schema_groups/
                    features.modifiers): the card's declared surface;
                    option vocabularies $samplers/$schedulers:
                    the OWNING engine's Plugin class attrs (derived from
                    its object_info pin), engine field_options.yaml
                    fallback;
                    enhance recipes: the class's prompt_upscale:/
                    lyrics_upscale: rows (with the id-named-dir fallback
                    probe across owners/genres); lane fallback:
                    flows/<name>/flow.yaml (agent
                    lane docs) or any flows/*/flow.yaml containing "type: <name>".
  /v1/kinds        py/card_kinds.py TABLE (the first-party card-kind
                    behavior flags; gateway infra, not plugin data —
                    the old plugins/*/kinds/*.yaml scan is extinct)

Wire quirks (behavior the goldens pin; changing one is a deliberate
regold, never a "fix"):
  * enhance-prompts prompt-nullification probe does
    NOT skip blank lines — any blank (or top-level
    comment) line between `parameters:` and the `prompt:` field resets the
    section state, so a card with a blank line before `prompt:` advertises
    NO enhance recipe (prompt:null). This is why the image card serves
    prompt:null for its model.
  * variant rows/quant cells follow the class's declaration order;
    quant cells dedupe on id across variants.

Self-test: `python3 py/editor_forms.py` deep-compares every golden in
tests/golden_http/ for these routes, prints the first divergence path per
mismatch, and exits nonzero on drift.
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Iterator
from typing import TYPE_CHECKING, TypedDict

import form_wire

if TYPE_CHECKING:
    from melite_cards import ActionCard, Field
    from melite_models import Cell, LoraRow, Model, Variant

# The wire-fragment shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# One yaml-era field row (the _new_field/_parse_card_parameters shape).
type FieldRow = dict[str, str | float | bool]


class CatalogRow(TypedDict, total=False):
    """One _scan_catalog row: the class adapter's parser-row shape
    (id/genre/label/engine_plugin/defaults/form) plus the catalog's
    own family_id/inference_path and the riding _model_class."""
    id: str
    genre: str | None
    label: str | None
    engine_plugin: str | None
    defaults: list[tuple[str, str]]
    form: str | None
    family_id: str
    inference_path: None
    _model_class: type[Model]


# One _route_owner hit: the catalog row, the owning Model class and
# the (variant, cell) matrix address the route resolves to.
type RouteOwner = tuple[CatalogRow, "type[Model]", "Variant", "Cell"]

try:
    # the same class as the gateway's (plugins.py defines the standalone
    # twin when the gateway import cycle blocks — same trick as plugins.py)
    from gateway import ValidationError  # noqa: F401
except Exception:
    class ValidationError(Exception):
        """Loud 4xx before any run is registered (QUEUE LANE LAW)."""

__all__ = ["forms", "form_spec", "kinds"]

# ─────────────────────────────────────────────────────────────────────────
# /v1/forms — DERIVED from the cards, uniformly (ledger row 3,
# operator order 2026-09-06: "THE SOURCE DECLARES WHAT THE END USERS
# CAN DO, NOT THE OTHER WAY AROUND"). Every entry is ONE projection
# of a card class + the Model.card scan — no card id appears below,
# ever. Served order follows sidebar_order (deterministic). The
# unoffered cohorts (ltx pair, pixel pair) stay absent BY CONSTRUCTION:
# _scan_catalog excludes unoffered classes, so covers never offers
# what cannot run — no per-card row needed to say so.
# ─────────────────────────────────────────────────────────────────────────
_FORMS_CACHE: dict[str, dict] = {}


def _iter_card_paths(repo_root: str) -> "Iterator[tuple[str, Path]]":
    """(plugin dir, card.py path) for every card — the same two-level
    walk _find_card_yaml uses (cards/ + action_cards/<genre>/<card>/),
    every engine. THE CARD PATTERN: py/card.py wins; a root card.py
    beside it is compat debris (two SSOTs refuse, like card.yaml).
    The caller resolves the plugin dir to its mounted engine type
    through the plugin bus (Plugin.engines) — dir spellings
    (audio-cpp) never leak onto the wire (audio_cpp)."""
    for _plugin_id, edir in _iter_plugin_engines(repo_root):
        for subdir in ("cards", "action_cards"):
            cdir = os.path.join(edir, subdir)
            if not os.path.isdir(cdir):
                continue
            for card in _scandir(cdir):
                if card.startswith("."):
                    continue
                card_path = os.path.join(cdir, card)
                if not os.path.isdir(card_path):
                    continue
                inner = ([os.path.join(card_path, sub)
                          for sub in _scandir(card_path)
                          if not sub.startswith(".")]
                         if os.path.isdir(card_path) else [])
                for carddir in [card_path] + inner:
                    pyc = os.path.join(carddir, "py", "card.py")
                    rootc = os.path.join(carddir, "card.py")
                    if os.path.isfile(pyc):
                        if os.path.isfile(rootc):
                            raise ValidationError(
                                "%s carries BOTH py/card.py and card.py "
                                "— one card, one class file" % carddir)
                        yield edir, pyc
                    elif os.path.isfile(rootc):
                        yield edir, rootc


def _derive_forms_table(repo_root: str) -> "dict[str, dict[str, object]]":
    """The uniform projection (row 3): card class + Model.card scan.
    Every refusal below fires identically for every card — a card that
    cannot derive is broken source, never a table special case."""
    from melite_cards import ActionCard as _AC
    import plugins as _plugins_bus
    by_dir = {os.path.abspath(str(ref.engine_dir)): etype
              for etype, ref in _plugins_bus.scan_engines().items()}
    cards: list[tuple[str, object]] = []
    for plugin_dir, cpy in _iter_card_paths(repo_root):
        engine_type = by_dir.get(os.path.abspath(plugin_dir))
        if engine_type is None:
            raise ValidationError(
                "%s lives in a plugin dir that mounts no engine type "
                "— a card without a lane cannot serve" % cpy)
        cls = _load_card_class(cpy)
        if cls is None or not getattr(cls, "id", ""):
            raise ValidationError(
                "%s yields no ActionCard subclass — a card.py with no "
                "card is debris" % cpy)
        if any(cls.id == _c.id for _, _c in cards):
            raise ValidationError(
                "duplicate card id %r (%s) — one card, one surface"
                % (cls.id, cpy))
        if (not isinstance(cls.sidebar_order, int)
                or not cls.sidebar or not cls.default_service):
            raise ValidationError(
                "%s (%s) is missing the universal sidebar trio "
                "(sidebar_order/sidebar/default_service) — ALL MUST"
                % (cpy, cls.id))
        if cls.sidebar not in _AC.SIDEBAR_SECTIONS:
            raise ValidationError(
                "%s (%s) sidebar %r is outside the universal sections "
                "%s" % (cpy, cls.id, cls.sidebar,
                        sorted(_AC.SIDEBAR_SECTIONS)))
        cards.append((engine_type, cls))
    boarded: dict[str, set] = {}
    for row in _scan_catalog(repo_root):
        mcls = row.get("_model_class")
        card = getattr(mcls, "card", "") or ""
        if card:
            boarded.setdefault(card, set()).add(row["id"])
    table = {}
    for engine_type, cls in sorted(cards, key=lambda pc: pc[1].sidebar_order):
        covers = tuple(sorted(boarded.get(cls.id, ())))
        if cls.default_service not in covers:
            raise ValidationError(
                "%s default_service %r is unoffered (covers %r) — "
                "the entry must open on a model it offers"
                % (cls.id, cls.default_service, covers))
        table[cls.id] = {"label": cls.label, "genre": cls.genre,
                         "order": cls.sidebar_order, "plugin": engine_type,
                         "sidebar_key": cls.sidebar,
                         "default_service": cls.default_service,
                         "hidden": bool(cls.sidebar_hidden),
                         "covers": covers}
    return table


def _forms_table(repo_root: str) -> "dict[str, dict[str, object]]":
    """The derived table, cached per repo root (the gateway imports
    card/model modules per call already — same staleness class)."""
    key = os.path.abspath(repo_root)
    if key not in _FORMS_CACHE:
        _FORMS_CACHE[key] = _derive_forms_table(repo_root)
    return _FORMS_CACHE[key]


def _allowed_cards(repo_root: str) -> frozenset[str]:
    """The ALLOWED_CARDS gate is exactly the derived surface's keys —
    one closed surface, never a second list."""
    return frozenset(_forms_table(repo_root))


# (the restatement died 2026-09-06 — the table is derived above.)

# Mod bag types that become modifier KINDS.
_MOD_KIND_TYPES = frozenset(("loras", "controlnet", "mask"))

# Enhance-recipe blocks read from a model unit's inference.yaml
#.
_RECIPE_KEYS = ("prompt_upscale:", "lyrics_upscale:")


def forms(repo_root: str) -> dict[str, dict[str, dict[str, JsonValue]]]:
    """GET /v1/forms -> {"forms": {card_id: {...}, ...}} (derived surface —
    the card classes + the Model.card scan, uniformly)."""
    return {"forms": {k: dict(v) for k, v in _forms_table(repo_root).items()}}


# ─────────────────────────────────────────────────────────────────────────
# line-buffer helpers
# ─────────────────────────────────────────────────────────────────────────

def _cut_comment(line: str) -> str:
    """cut_comment: cut a trailing '  # comment' not inside quotes."""
    inq = False
    for i, ch in enumerate(line):
        if ch == '"':
            inq = not inq
        elif ch == '#' and not inq and i > 0 and line[i - 1] in ' \t':
            return line[:i]
    return line


def _clean(s: str) -> str:
    """clean: trim spaces/tabs/CR/LF both ends, strip ONE quote pair."""
    s = s.strip(' \t\r\n')
    if len(s) >= 2 and ((s[0] == '"' and s[-1] == '"') or
                        (s[0] == "'" and s[-1] == "'")):
        s = s[1:-1]
    return s


def _is_number(s: str) -> bool:
    """is_number: optional sign, digits, at most one dot."""
    if not s:
        return False
    p = s[1:] if s[0] in '-+' else s
    digits = 0
    dots = 0
    for ch in p:
        if ch.isdigit():
            digits += 1
        elif ch == '.':
            dots += 1
            if dots > 1:
                return False
        else:
            return False
    return digits > 0


def _num(s: str) -> int | float:
    """Parse an is_number-validated token, emitting it raw:
    ints stay ints ('-1' -> -1), decimals stay floats ('12.0' -> 12.0)."""
    return float(s) if '.' in s else int(s)


def _norm(s: str) -> str:
    """norm: '_' -> '-' for family-id matching."""
    return s.replace('_', '-')


def _g(v: int | float) -> int | float:
    """C '%g' emission of a double: integral values print without '.0'."""
    return int(v) if float(v).is_integer() else float(v)


def _scandir(path: str) -> list[str]:
    """Names in raw readdir order (C opendir/readdir); missing dir -> []."""
    try:
        with os.scandir(path) as it:
            return [e.name for e in it]
    except OSError:
        return []


def _fgets(path: str) -> list[str]:
    """Yield lines the way C fgets does: each keeps its '\\n' (CR preserved,
    no universal-newline translation). Missing file yields nothing."""
    try:
        with open(path, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            lines = f.readlines()
    except OSError:
        return []
    return lines


def _read_file(path: str) -> str | None:
    try:
        with open(path, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            return f.read()
    except OSError:
        return None


# ─────────────────────────────────────────────────────────────────────────
# Model catalog — the engine/models scan + class adapter
# (only the fields the three routes consume: id/genre/label, defaults,
#  engine.plugin, and the model unit's inference.yaml path)
# ─────────────────────────────────────────────────────────────────────────

def _ykv(s: str, key: str) -> str | None:
    """ykv: value after 'key:' at the start of a stripped line."""
    if not s.startswith(key):
        return None
    if s[len(key)] != ':':
        return None
    return s[len(key) + 1:].lstrip(' ')


def _strip_quotes(v: str) -> str:
    """ystrdup-style: strip ONE surrounding quote pair."""
    if len(v) >= 2 and ((v[0] == '"' and v[-1] == '"') or
                        (v[0] == "'" and v[-1] == "'")):
        return v[1:-1]
    return v


def _parse_model_yaml(text: str) -> dict[str, str | list[tuple[str, str]] | None] | None:
    """parse_model_yaml, restricted to the keys the
    form-spec route reads. Returns a row dict or None when no family id."""
    m = {"id": None, "genre": None, "label": None,
         "engine_plugin": None, "defaults": []}
    section = 0  # 1 family, 3 defaults, 4 engine
    # strtok_r(buf, "\n") semantics: empty lines are skipped tokens.
    for raw in text.split('\n'):
        indent = len(raw) - len(raw.lstrip(' '))
        s = raw.strip(' \t\r\n')
        if not s or s.startswith('#'):
            continue
        if indent == 0:
            if s == "family:":
                section = 1
            elif s == "defaults:":
                section = 3
            elif s == "engine:":
                section = 4
            elif (s.startswith("variant_groups:") or
                  s.startswith("lora_catalog:") or s.startswith("studio:") or
                  s == "source:"):
                section = 0
            else:
                section = 0
            # form: is a top-level scalar, not a section (unused by these
            # routes but parsed for completeness of the row).
            val0 = _ykv(s, "form")
            if val0 is not None:
                m["form"] = _strip_quotes(val0)
            continue
        if section == 1 and indent == 2:
            val = _ykv(s, "id")
            if val is not None:
                m["id"] = _strip_quotes(val)
            val = _ykv(s, "genre")
            if val is not None:
                m["genre"] = _strip_quotes(val)
            val = _ykv(s, "label")
            if val is not None:
                m["label"] = _strip_quotes(val)
        elif section == 3 and indent == 2:
            colon = s.find(':')
            if colon >= 0:
                key = s[:colon]
                v = _strip_quotes(s[colon + 1:].lstrip(' '))
                m["defaults"].append((key, v))
        elif section == 4 and indent == 2:
            val = _ykv(s, "plugin")
            if val is not None:
                m["engine_plugin"] = _strip_quotes(val)
    return m if m["id"] else None


def _iter_plugin_engines(repo_root: str) -> Iterator[tuple[str, str]]:
    """The 2026-09 engine formalization layout (supersedes the old
    plugins/<owner>/ depth-1 scan): cards and models are ENGINE-owned at
    plugins/engines/<engine>/ — AND (2026-10-02) under category subdirs
    (plugins/engines/<cat>/<plugin>/ — the cpp native-engine category).
    THE WALK LIVES IN plugins.py (iter_plugin_dirs_under — one law,
    every consumer). Bridge copies (a model dir under an engine whose
    model.yaml declares a DIFFERENT engine — e.g. comfyui's audio bridge
    packs) stay owned by their DECLARING engine, mirroring resolve_model's
    declarer rule in py/plugins.py."""
    from pathlib import Path
    import plugins as _plugins
    eng_root = os.path.join(repo_root, "plugins", "engines")
    for pdir in _plugins.iter_plugin_dirs_under(Path(eng_root)):
        yield pdir.name, str(pdir)


def _scan_catalog(repo_root: str) -> list[CatalogRow]:
    """scan_models: engine -> genre ->
    model dir, raw readdir order per engine; catalog_find_model is
    first-match on family id among DECLARING rows."""
    models = []
    for _engine, edir in _iter_plugin_engines(repo_root):
        models_dir = os.path.join(edir, "models")
        if not os.path.isdir(models_dir):
            continue
        for genre in _scandir(models_dir):
            if genre.startswith('.'):
                continue
            genre_dir = os.path.join(models_dir, genre)
            if not os.path.isdir(genre_dir):
                continue
            for mid in _scandir(genre_dir):
                if mid.startswith('.'):
                    continue
                model_dir = os.path.join(genre_dir, mid)
                if not os.path.isdir(model_dir):
                    continue
                # (2026-09-02) The flip is TOTAL: every unit is a
                # model.py class; model.yaml is extinct tree-wide.
                mpy = os.path.join(model_dir, "model.py")
                if not os.path.isfile(mpy):
                    continue
                row = _model_row_from_py(repo_root, mpy, mid)
                if row is None:
                    continue
                row["family_id"] = row["id"]
                row["id"] = mid
                row["inference_path"] = None  # inference.yaml extinct (class-driven)
                models.append(row)
                continue
                # The wire model id is the DIRECTORY name (canonical
                # everywhere: py/plugins.py resolve_model globs
                # models/<genre>/<mid>/model.yaml by mid; flows
                # reference dir ids). The yaml family.id is a display
                # alias (music3's yaml says minimax_music3) — kept in
                # row["family_id"], never the lookup key.
                row["family_id"] = row["id"]
                row["id"] = mid
                row["inference_path"] = None  # extinct
                # NO declarer skip: every copy enters the catalog (the
                # C scanned every owner too). Duplicate ids resolve
                # declarer-wins in _find_model — the resolve_model law
                # (music3 sits in audio-cpp's tree but DECLARES comfyui:
                # the music node is a ComfyUI bridge).
                models.append(row)
    return models


def _plugin_engine_types(edir: str) -> set[str]:
    """The engine types a plugin dir DECLARES: engine.py ENGINE_TYPE
    (2026-09-02 flip), with engine.yaml fallback."""
    out = set()
    eng_root = os.path.join(edir, "engines")
    if os.path.isdir(eng_root):
        for sub in _scandir(eng_root):
            edir_sub = os.path.join(eng_root, sub)
            epy = os.path.join(edir_sub, "engine.py")
            if os.path.isfile(epy):
                try:
                    ns = {}
                    exec(open(epy, 'r', encoding='utf-8',
                              errors='surrogateescape').read(), ns)
                    if ns.get("ENGINE_TYPE"):
                        out.add(ns["ENGINE_TYPE"])
                        continue
                except Exception:
                    pass
            ey = os.path.join(edir_sub, "engine.yaml")
            if os.path.isfile(ey):
                for line in open(ey, 'r', encoding='utf-8',
                                 errors='surrogateescape').read().splitlines():
                    s = line.strip()
                    if s.startswith("type:"):
                        t = s.partition(":")[2].strip()
                        if t:
                            out.add(t)
                        break
    return out


def _model_row_from_py(repo_root: str, mpy: str, mid: str) -> CatalogRow | None:
    """The python flip's adapter: a Model class → the parser-row shape
    _scan_catalog/_find_model/form_spec consume (id/genre/label/
    engine_plugin/defaults pairs/form). Defaults values keep the wire's
    raw-STRING form — the typed-defaults wire cleanup is its own later
    rung, not a silent change. UNOFFERED classes return None — they
    serve no form-spec either (offered means runnable)."""
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_models import load_model_py
    engine = os.path.basename(os.path.dirname(os.path.dirname(
        os.path.dirname(mpy))))
    cls = load_model_py(mpy, engine)
    if getattr(cls, "unoffered", False):
        return None
    m = {"id": cls.id, "genre": cls.genre or None,
         "label": cls.label or None,
         "engine_plugin": cls.engine or None,
         "defaults": [(k, _wire_str(v)) for k, v in (cls.defaults or {}).items()],
         "form": cls.form}
    m["_model_class"] = cls          # the class rides for _variants
    return m


def _wire_str(v: str | int | float | bool) -> str:
    """Native default → the C wire's raw string form."""
    if isinstance(v, bool):
        return "true" if v else "false"
    return str(v)


def _variants_from_class(row: CatalogRow,
                         prefer_variant: str | None = None) -> list[dict[str, JsonValue]] | None:
    """Variant rows + Quant cells from the CLASS tree — the collapse of
    the yaml's triplicated variants/ data (row + nested rows + quants)
    into one walk. Same wire shape as _variants, including the quant-id
    DEDUP (a quant id serves once across variants)."""
    cls = row.get("_model_class")
    if cls is None:
        return None
    rows = []
    seen_quant = set()
    for v in cls.variants:                 # frozen rows, not classes
        vlab = v.label or v.id
        if 'a' <= vlab[0] <= 'z':           # display rule: labels render Capitalized
            vlab = chr(ord(vlab[0]) - 32) + vlab[1:]
        # PATCH-ONLY ROWS (Recipe group, 2026-09-05): a routeless
        # variant is a stamp applier — its declared defaults SERVE (the
        # editor writes them onto the draft on click; applyVariantOverrides
        # sets list values absolutely) and its route serves None (a
        # falsy route keeps handleVariantPick on the patch path — the
        # old `or cls.id` fallback would misread a recipe as a route
        # switch to the family head). Routed rows keep {} by contract:
        # their defaults are RESOLVER data (merged_defaults / the
        # gateway stamp overlay), never wire-stamped.
        r = {"id": v.id, "label": vlab,
             "defaults": dict(v.defaults) if (v.defaults and not v.route) else {},
             "group": v.group or "Variant",
             # "" (the wire row's declared default) = patch-only; a
             # falsy route keeps the frontend on the patch path.
             "route": v.route or "",
             "hint": v.hint or None, "engine": v.engine or cls.engine or ""}
        rows.append(r)
        for c in v.cells:
            # route lens: only the SELECTED variant's cells wire (the
            # fixture's int8 row is RAW's — its hint, its route)
            if prefer_variant and v.id != prefer_variant:
                continue
            if c.quant in seen_quant:
                continue
            seen_quant.add(c.quant)
            rows.append({"id": c.quant.value,
                         "label": c.label or c.quant.value,
                         "defaults": {}, "group": "Quant",
                         "quant": c.quant.value,
                         # TRUE cell attrs — the wire_route/wire_vram
                         # faithful-bug overrides are retired
                         # (2026-09-05): a quant row that lied about
                         # its own route was a routing fossil, not a
                         # format rule.
                         "route": c.route or v.route or cls.id,
                         "vram_peak_gb": c.vram_peak_gb or 0,
                        # The axis hierarchy link: the editor scopes the
                        # Quant select to the active variant's owner-
                        # linked cells. Without owner, every quant is
                        # orphaned and the row hides (the 'quants not
                        # showing up' class).
                        "owner": v.id})
    # DEFAULT-FIRST (2026-09-06): each group's declared default row
    # serves FIRST within its group run (the grammar appends the
    # canonical default recipe LAST in the variants tuple — resolve()
    # owns variants[0] — so the wire bubbles it to the head of its
    # group for display; the tuple order stays resolution truth).
    # Minimal move: only the default row relocates (to its group's
    # first slot); every other row keeps declaration order AND
    # position (Variant/Quant interleaving untouched).
    group_default = {g.id: g.default for g in (cls.variant_groups or ())
                     if getattr(g, "default", "")}
    if group_default:
        for gid, did in group_default.items():
            members = [i for i, r in enumerate(rows)
                       if isinstance(r, dict) and r.get("group") == gid]
            if not members:
                continue
            cur = next((i for i in members
                        if rows[i].get("id") == did), None)
            if cur is None or cur == members[0]:
                continue
            rows.insert(members[0], rows.pop(cur))
    return rows


def _find_model(models: list[CatalogRow], family_id: str) -> CatalogRow | None:
    """catalog_find_model, declarer-wins: among rows with this id, a row
    that DECLARES an engine beats a stanza-less bridge copy (resolve_model
    law — py/plugins.py). First declaring row in scan order wins."""
    fallback = None
    for row in models:
        if row["id"] == family_id:
            if row["engine_plugin"]:
                return row
            if fallback is None:
                fallback = row
    return fallback


# ─────────────────────────────────────────────────────────────────────────
# card.yaml discovery + identity
#
# ─────────────────────────────────────────────────────────────────────────

def _card_identity_path(yp: str) -> dict[str, str]:
    """card_identity_path: the card: block's id/label/icon/description.
    id: first non-empty wins; label/icon/description: last non-empty wins."""
    out = {"id": "", "label": "", "icon": "", "description": ""}
    in_card = False
    for raw in _fgets(yp):
        line = _cut_comment(raw)
        if line[0] in '\n\r' or line == '':
            continue
        if line[0] not in ' \t':
            in_card = line.startswith('card:')
            continue
        if not in_card:
            continue
        ind = 0
        while ind < len(line) and line[ind] in ' \t':
            ind += 1
        if ind >= 4:  # nested deeper than card:
            continue
        p = line[ind:]
        for key in ("label", "icon", "description", "id"):
            prefix = key + ":"
            if p.startswith(prefix):
                val = _clean(p[len(prefix):])
                if val:
                    if key == "id":
                        if not out["id"]:
                            out["id"] = val
                    else:
                        out[key] = val
                break
    return out


def _families_match(yp: str, model: str) -> bool:
    """families_match: EXACT normalized match of any '- id:' row."""
    nmodel = _norm(model)
    in_fam = False
    for raw in _fgets(yp):
        line = _cut_comment(raw)
        if not line or line[0] in '\n\r':
            continue
        if line.startswith('families:'):
            in_fam = True
            continue
        if in_fam:
            if not line.startswith(' '):  # next section
                break
            p = line.lstrip(' ')
            if p.startswith('- id:'):
                fam = _clean(p[5:])
                if _norm(fam) == nmodel:
                    return True
                continue
            if not p.startswith('-'):
                break
    return False


def _first_family_is(yp: str, model: str) -> bool:
    """first_family_is: the FIRST '- id:' row decides."""
    nmodel = _norm(model)
    in_fam = False
    first = True
    hit = False
    for raw in _fgets(yp):
        line = _cut_comment(raw)
        if not line or line[0] in '\n\r':
            continue
        if line[0] not in ' \t':
            if hit:
                break  # first entry decided it
            in_fam = line.startswith('families:')
            continue
        if not in_fam:
            continue
        ind = 0
        while ind < len(line) and line[ind] in ' \t':
            ind += 1
        p = line[ind:]
        if ind >= 4 or not p.startswith('-'):
            continue
        p = p[1:].lstrip(' ')
        if not p.startswith('id:'):
            continue
        val = _clean(p[3:])
        if first:
            hit = (_norm(val) == nmodel)
            first = False
    return hit


def _card_has_surface(yp: str) -> bool:
    """A card dir declares a FIELD SURFACE via a card.yaml `parameters:`
    block OR a sibling card.py (the python flip, 2026-09-02). The
    discovery gate; _load_card_surface enforces ONE of the two."""
    if _has_parameters_block(yp):
        return True
    return os.path.isfile(os.path.join(os.path.dirname(yp), "card.py"))


def _has_parameters_block(yp: str) -> bool:
    try:
        with open(yp, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            for pl in f:
                if pl.startswith('parameters:'):
                    return True
                if pl[0] not in ' \t#\n':
                    # top-level sections after card:/families: without a
                    # parameters: header — the file has no block
                    pass
    except OSError:
        return False
    return False


def _find_card_yaml(repo_root: str, model: str) -> str | None:
    """find_card_yaml, class-driven since
    the identity rung (2026-09-02): the sole-owner card.py. Gate on the
    /v1/forms card ids (the ALLOWED_CARDS gate — read from the CLASS id);
    families must match (any row normalized), first-family match wins
    outright, first any-family match is the fallback candidate.

    Candidacy needs a FIELD SURFACE (declared fields on the class) —
    identity-only cards (sfx) stay non-candidates exactly as the yaml
    era served them (no parameters block → skip). Scan depth is the
    engine layout: plugins/engines/<engine>/cards/ AND
    plugins/engines/<engine>/action_cards/<genre>/<card>/ (comfyui
    regrouped 2026-09-02 — same two-level walk the catalog and the
    editor's cardStudios glob do)."""
    candidate = None
    nmodel = _norm(model)
    for _engine, edir in _iter_plugin_engines(repo_root):
        for subdir in ("cards", "action_cards"):
            cdir = os.path.join(edir, subdir)
            if not os.path.isdir(cdir):
                continue
            paths = []
            for card in _scandir(cdir):
                if card.startswith('.'):
                    continue
                # THE CARD PATTERN (2026-09-03): python code lives in
                # the card's py/ subfolder; root card.py is compat.
                paths.append(os.path.join(cdir, card, "py", "card.py"))
                paths.append(os.path.join(cdir, card, "card.py"))
                card_path = os.path.join(cdir, card)
                if os.path.isdir(card_path):
                    for sub in _scandir(card_path):
                        if not sub.startswith('.'):
                            paths.append(os.path.join(card_path, sub,
                                                      "py", "card.py"))
                            paths.append(os.path.join(card_path, sub,
                                                      "card.py"))
            for mpy in paths:
                if not os.path.isfile(mpy):
                    continue
                cls = _load_card_class(mpy)
                if cls is None or not cls._fields_:
                    continue
                if cls.id not in _allowed_cards(repo_root):
                    continue
                fams = [_norm(f) for f in cls.families_of()]
                if nmodel not in fams:
                    continue
                if fams and fams[0] == nmodel:
                    return mpy
                if candidate is None:
                    candidate = mpy
    return candidate


def _option_list(repo_root: str, list_name: str, engine_dir: str) -> list[str]:
    """option_list: samplers/schedulers from the ONE vocabulary —
    engine.py Plugin class attrs (2026-09-02 flip), yaml fallback."""
    # plugin.py Plugin class — primary source (2026-09-02 field_options flip)
    # engine_dir is the plugin root (e.g. plugins/engines/comfyui).
    # The file location rides the exec namespace: Plugin class bodies
    # may derive their vocab from files beside the plugin (the comfyui
    # object_info pin), and a bare exec has no __file__.
    for name in ("plugin.py", "engine.py"):
        pyp = os.path.join(engine_dir, name)
        if os.path.isfile(pyp):
            try:
                ns = {"__file__": os.path.abspath(pyp)}
                exec(open(pyp, 'r', encoding='utf-8',
                           errors='surrogateescape').read(), ns)
                pcls = ns.get("Plugin")
                if pcls is not None and hasattr(pcls, list_name):
                    return list(getattr(pcls, list_name))
            except Exception:
                pass
    # yaml fallback
    yp = os.path.join(engine_dir, "models", "field_options.yaml")
    head = list_name + ":"
    out = []
    in_list = False
    for raw in _fgets(yp):
        line = _cut_comment(raw)
        if not line or line[0] in '\n\r':
            continue
        if not in_list:
            if line == head or (line.startswith(head) and
                                len(line) > len(head) and
                                line[len(head)] in '\n '):
                in_list = True
            continue
        if not line.startswith(' '):  # next top-level key
            break
        p = line.lstrip(' ')
        if not p.startswith('-'):
            break
        p = p[1:].lstrip(' ')
        out.append(_clean(p))
    return out


# ─────────────────────────────────────────────────────────────────────────
# card.yaml parameters: — the card surface reader
# ─────────────────────────────────────────────────────────────────────────

_FIELD_ATTRS = ("type", "label", "group", "zone", "tooltip", "placeholder",
                "visible_when", "families")
_FIELD_NUMS = ("order", "width", "columns", "min", "max", "step")


def _new_field(name: str) -> FieldRow:
    f = {"name": name, "defval": "", "options": "", "required": False}
    for a in _FIELD_ATTRS:
        f[a] = ""
    for n in _FIELD_NUMS:
        f[n] = 0.0
        f["has_" + n] = False
    return f


def _parse_card_parameters(yp: str) -> list[FieldRow]:
    """The card_spec_json parameters: parser. Returns the field list (in
    declaration order) or [] when the file has no parameters: fields."""
    fields = []
    cur = None
    pending_key = ""
    in_params = False
    for raw in _fgets(yp):
        line = _cut_comment(raw)
        if not line or line[0] in '\n\r':
            continue
        if not in_params:
            if line.rstrip('\n') == 'parameters:':
                in_params = True
            continue
        if line[0] not in ' \t':  # next section
            break
        ind = 0
        while ind < len(line) and line[ind] == ' ':
            ind += 1
        p = line[ind:]
        if p.startswith('-'):
            item = _clean(p[1:])
            if cur is not None and pending_key == 'options':
                if cur["options"]:
                    cur["options"] += ',"%s"' % item
                else:
                    cur["options"] = '"%s"' % item
            continue
        colon = p.find(':')
        if colon < 0:
            continue
        key = _clean(p[:colon])
        val = _clean(p[colon + 1:])
        pending_key = ""
        if ind <= 2:  # field name line (inline default allowed)
            cur = _new_field(key)
            if val:
                cur["defval"] = val
            fields.append(cur)
            continue
        if cur is None:
            continue
        if key in _FIELD_ATTRS:
            cur[key] = val
        elif key == "default":
            cur["defval"] = val
        elif key == "required":
            cur["required"] = (val == "true")
        elif key == "options":
            if not val:
                pending_key = "options"
            else:
                cur["options"] = val
        elif key in _FIELD_NUMS:
            cur[key] = _atof(val)
            cur["has_" + key] = True
    return fields


def _atof(s: str) -> float:
    """C atof: leading numeric prefix, 0.0 on none (values here are clean)."""
    try:
        return float(s)
    except ValueError:
        num = ''
        for i, ch in enumerate(s):
            if ch in '+-' and i == 0:
                num += ch
            elif ch.isdigit() or ch == '.':
                num += ch
            else:
                break
        try:
            return float(num)
        except ValueError:
            return 0.0


def _emit_field(f: FieldRow, with_group: bool,
                 options_vocab: dict[str, list[str]]) -> dict[str, JsonValue]:
    """emit_field: the wire emission key order (goldens pin it)."""
    o = {"name": f["name"]}
    if f["type"]:
        o["type"] = f["type"]
    if f["label"]:
        o["label"] = f["label"]
    if with_group and f["group"]:
        o["group"] = f["group"]
    for n in _FIELD_NUMS:
        if f["has_" + n]:
            key = {"min": "min", "max": "max", "step": "step",
                   "order": "order", "width": "width",
                   "columns": "columns"}[n]
            o[key] = _g(f[n])
    if f["required"]:
        o["required"] = True
    if f["defval"]:
        o["default"] = _num(f["defval"]) if _is_number(f["defval"]) \
            else f["defval"]
    if f["placeholder"]:
        o["placeholder"] = f["placeholder"]
    if f["tooltip"]:
        o["tooltip"] = f["tooltip"]
    if f["visible_when"]:
        o["visible_when"] = f["visible_when"]
    if f["options"]:
        raw = f["options"]
        if raw == "$samplers":
            o["options"] = options_vocab["samplers"]
        elif raw == "$schedulers":
            o["options"] = options_vocab["schedulers"]
        elif raw.startswith('['):
            o["options"] = json.loads(raw)
        else:
            # block-style list accumulated as "a","b" — bracket it
            o["options"] = json.loads('[' + raw + ']')
    return o


def _families_keep(field: FieldRow, nmodel: str) -> bool:
    """card_spec_json families filter: a field naming families this model
    is not in (normalized exact) drops."""
    raw = field["families"]
    if not raw:
        return True
    toks = raw.replace('[', ' ').replace(']', ' ').replace(',', ' ').split()
    return any(_norm(t) == nmodel for t in toks)


def _engine_dir_of_card(card_path: str) -> str:
    """.../<engine>/{cards,action_cards}/<card>/[py/]card.py ->
    .../<engine> (the engine that owns the card — vocabulary and lanes
    resolve relative to it). Genre-grouped cards (action_cards/<genre>/
    <card>/, 2026-09-02 reorg) sit one deeper; THE CARD PATTERN
    (2026-09-03) adds a py/ hop — stripped first."""
    d = os.path.dirname(os.path.abspath(card_path))
    if os.path.basename(d) == "py":
        d = os.path.dirname(d)
    d2 = os.path.dirname(d)
    if os.path.basename(d2) in ("cards", "action_cards"):
        return os.path.dirname(d2)               # flat: d2 IS the cards root
    return os.path.dirname(os.path.dirname(d2))  # genre: d2 is the group


_MELITE_CARDS_PATH = os.path.join("py")


def _load_card_class(yp: str) -> type[ActionCard] | None:
    """The card.py ActionCard subclass for a card.yaml's dir, or None.
    The gateway imports the generic DSL from py/melite_cards (the
    py twin of ui_components — PLUGIN ARCHITECTURE LAW: grammar is
    generic, the class is engine-owned)."""
    cppath = os.path.join(os.path.dirname(yp), "card.py")
    if not os.path.isfile(cppath):
        return None
    engine_dir = _engine_dir_of_card(yp)
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(engine_dir)))
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_cards import load_card_py as _load
    engine = os.path.basename(engine_dir)
    return _load(cppath, engine)


def _card_spec(repo_root: str, model: str) -> dict[str, JsonValue] | None:
    """card_spec_json: the "form"/"service"/"fields"/"schema_groups" tail,
    or None when no card.yaml covers the model (legacy shape kept).

    (2026-09-02) card.py WINS when present — and a card.yaml
    `parameters:` block alongside it is a LOUD refusal (two SSOTs is
    zero SSOTs; QUEUE LANE LAW: no silent preference).

    (2026-09-02, the identity rung) card.yaml is EXTINCT — the card.py
    class carries identity too. A card.yaml alongside card.py refuses
    LOUD regardless of content."""
    yp = _find_card_yaml(repo_root, model)
    if yp is None:
        return None
    cls = _load_card_class(yp)
    if cls is not None:
        if os.path.isfile(os.path.join(os.path.dirname(yp), "card.yaml")):
            raise ValidationError(
                "%s carries BOTH card.py and card.yaml — the identity "
                "rung moved card.yaml onto the class; delete the yaml"
                % yp)
        engine_dir = _engine_dir_of_card(yp)
        options_vocab = {
            "samplers": _option_list(repo_root, "samplers", engine_dir),
            "schedulers": _option_list(repo_root, "schedulers", engine_dir),
        }
        from melite_cards import field_spec as _fs
        return _fs(cls, model, options_vocab, service=model)
    fields = _parse_card_parameters(yp)
    if not fields:
        return None
    nmodel = _norm(model)
    keep = [f for f in fields if _families_keep(f, nmodel)]

    options_vocab = {
        "samplers": _option_list(repo_root, "samplers",
                                 _engine_dir_of_card(yp)),
        "schedulers": _option_list(repo_root, "schedulers",
                                   _engine_dir_of_card(yp)),
    }

    out = {}
    cid = cls.id if cls is not None else _card_identity_path(yp)["id"]
    if cid:
        out["form"] = cid
    out["service"] = model

    # flat fields — NO DROPS (2026-09-05). The old _BINARY_FIELD_TYPES
    # filter omitted File/Image/Audio/Video rows from the flat list and
    # relied on schema_groups alone — any consumer reading only flat
    # fields rendered a card with no inputs (the silent default-card
    # class). Binary fields ride the flat list too; schema_groups keeps
    # the grouping on top. _BINARY_FIELD_TYPES is deleted.
    out["fields"] = [
        _emit_field(f, True, options_vocab)
        for f in keep
    ]

    # schema_groups — group by `group` attr, first-seen order
    groups = []
    for f in keep:
        g = f["group"] or ""
        if g not in groups:
            groups.append(g)
    schema = []
    for k, g in enumerate(groups):
        members = [f for f in keep if (f["group"] or "") == g]
        zone = ""
        for f in members:
            if f["zone"]:
                zone = f["zone"]
                break
        if not zone:
            zone = "params"
        if g:
            label = (g[0].upper() + g[1:]) if 'a' <= g[0] <= 'z' else g
            grp = {"id": g, "label": label, "order": k, "zone": zone}
        else:
            grp = {"id": "", "label": "Parameters", "order": k, "zone": zone}
        grp["fields"] = [_emit_field(f, False, options_vocab)
                         for f in members]
        schema.append(grp)
    out["schema_groups"] = schema
    return out


def _form_card_frag_for_model(repo_root: str, row: CatalogRow) -> dict[str, JsonValue] | None:
    """The no-own-card.py model → form-anchor fallback (2026-09-05).

    A model with no card.py of its own still belongs to a form
    (the derived table's `covers` membership is the SSOT — every member
    BOARDS a compose arm; owning a card.py is a different thing from
    boarding). Its form-spec inherits the form's ANCHOR card's
    fields/schema_groups so the Parameters zone renders the
    universal surface — without this, models without their own
    card.py served 0 fields and the Parameters zone vanished on
    model swap. Declarative: the model→form membership lives in
    the derived table, the anchor card is the form's `default_service`.
    No model name is hardcoded in the body of this helper."""
    model_id = row.get("id", "")
    for fid, fdef in _forms_table(repo_root).items():
        covers = fdef.get("covers") or ()
        if model_id not in covers:
            continue
        anchor = fdef.get("default_service")
        if not anchor or anchor == model_id:
            continue
        return _card_spec(repo_root, anchor)
    return None


# features.modifiers — the mods-zone scan
# ─────────────────────────────────────────────────────────────────────────

def _parse_mod_entries(yp: str) -> list[FieldRow]:
    """mods-zone parameter entries: {name,type,label,zone,min,max,step}."""
    entries = []
    P = None
    have_p = False
    in_params = False
    for raw in _fgets(yp):
        ml = _cut_comment(raw)
        if not ml or ml[0] in '\n\r':
            continue
        if not in_params:
            if ml.rstrip('\n') == 'parameters:':
                in_params = True
            continue
        if ml[0] not in ' \t':
            break
        ind = 0
        while ind < len(ml) and ml[ind] == ' ':
            ind += 1
        mp = ml[ind:]
        if ind <= 2:  # field boundary: commit previous
            if have_p and P["zone"] == "mods":
                entries.append(P)
            P = None
            have_p = False
            c2 = mp.find(':')
            if c2 >= 0:
                P = {"name": _clean(mp[:c2]), "type": "", "label": "",
                     "zone": "", "min": 0.0, "max": 0.0, "step": 0.0,
                     "has_min": False, "has_max": False, "has_step": False}
                have_p = True
            continue
        c3 = mp.find(':')
        if c3 < 0 or not have_p:
            continue
        mk = _clean(mp[:c3])
        mv = _clean(mp[c3 + 1:])
        if mk == "type":
            P["type"] = mv
        elif mk == "label":
            P["label"] = mv
        elif mk == "zone":
            P["zone"] = mv
        elif mk == "min":
            P["min"] = _atof(mv)
            P["has_min"] = True
        elif mk == "max":
            P["max"] = _atof(mv)
            P["has_max"] = True
        elif mk == "step":
            P["step"] = _atof(mv)
            P["has_step"] = True
    if have_p and P["zone"] == "mods":
        entries.append(P)
    return entries[:32]  # C me[32] cap


def _variant_groups(mcls: type[Model] | None) -> dict[str, dict[str, str | None]]:
    """The family's declared VariantGroup rows as the wire's group map
    (label + tooltip per id); the standard Variant/Quant pair when the
    family declares none."""
    declared = getattr(mcls, "variant_groups", ()) if mcls is not None else ()
    if not declared:
        return {"Variant": {"label": "Variant"},
                "Quant": {"label": "Quant"}}
    return {g.id: {"label": g.label or g.id}
            | ({"tooltip": g.tooltip} if g.tooltip else {})
            | ({"default": g.default} if g.default else {})
            for g in declared}


def _runtime_lora_rows(repo_root: str) -> list[LoraRow]:
    """The RUNTIME LORA CATALOG: every LoraRow every family declares,
    scanned live at serve time (operator order, 2026-09-05, verbatim:
    "I DON'T SEE MY KREA2 LORAS... RUNTIME VALIDATION" — a family that
    boards the loras channel without rows of its own offers the whole
    estate catalog; picks validate at the compose door against the
    SAME union, refusing unknown ids LOUD). Frozen order: scan order,
    family rows stable within a model."""
    rows: list = []
    seen: set[str] = set()
    import glob as _glob
    from melite_models import load_model_py
    pat = os.path.join(repo_root, "plugins", "engines", "*",
                       "models", "*", "*", "model.py")
    for mp in sorted(_glob.glob(pat)):
        try:
            mcls = load_model_py(mp, "comfyui")
        except Exception:
            continue          # a foreign/broken model dir is not ours
        for r in getattr(mcls, "loras_of", lambda: ())() or ():
            if r.id in seen:
                continue
            seen.add(r.id)
            rows.append(r)
    return rows


def _modifiers(repo_root: str, model: str, mcls: type[Model] | None = None) -> list[dict[str, str | bool | list[dict[str, str | float]] | list[str]]]:
    """ModifierKind objects: bag-typed mods fields become kinds; scalar
    knobs that FOLLOW a kind ride it as ModifierFields. Scalars before any kind are dropped.
    card.py cards walk the class fields (same attrs, same order)."""
    yp = _find_card_yaml(repo_root, model)
    if yp is None:
        return []
    cls = _load_card_class(yp)
    if cls is not None:
        # FAMILY-SCOPED walk: absorbed mod fields ride only the
        # families that declared them (the fields array always was;
        # the modifier walk leaking other families' knobs was the
        # unscoped hand-list era's camouflage)
        nmodel = _norm(model)

        def _in_family(fld: Field) -> bool:
            fams = getattr(fld, "families", ()) or ()
            return not fams or any(_norm(t) == nmodel for t in fams)

        mes = [{"name": f.name, "type": f.type, "label": f.label or "",
                "min": f.min, "max": f.max, "step": f.step,
                # the field's declared default rides the kind (2026-09-05
                # button order: the drawer's bare-field create + the
                # GenericFieldControl fallback seed from field.default —
                # a kind without defaults authors empty dicts).
                "default": f.default,
                "options": (list(f.options)
                            if isinstance(getattr(f, "options", None),
                                          (list, tuple)) else []),
                "has_min": f.min is not None,
                "has_max": f.max is not None,
                "has_step": f.step is not None}
               for f in cls._fields_ if _in_family(f)]
    else:
        mes = _parse_mod_entries(yp)
    out = []
    for e, me in enumerate(mes):
        t = me["type"]
        if t not in _MOD_KIND_TYPES:
            continue
        kind = {"loras": "lora", "controlnet": "controlnet",
                "mask": "mask"}[t]
        fields = []
        for s in range(e + 1, len(mes)):
            st = mes[s]["type"]
            if st in _MOD_KIND_TYPES:
                break
            # THE FIELD'S REAL TYPE rides the kind (2026-09-05 button
            # order: the mask mod's select/boolean/image fields render
            # in the add-mod drawer — the old float-forcing walk drew
            # number boxes for a file slot). Options ride selects.
            # file folds to image (the drawer well picks any file;
            # the contract's ModifierFieldSpec has no "file" member —
            # ModifierFieldSpec.type ∈ integer|float|string|select|
            # image|boolean, web/contracts/src/schema.d.ts).
            f: dict[str, JsonValue] = {
                "name": mes[s]["name"],
                "type": "image" if st in ("image", "file")
                else st if st in ("select", "boolean", "string")
                else "float",
                "label": mes[s]["label"] or mes[s]["name"]}
            if mes[s].get("options"):
                f["options"] = list(mes[s]["options"])
            if mes[s]["has_min"]:
                f["min"] = _g(mes[s]["min"])
            if mes[s]["has_max"]:
                f["max"] = _g(mes[s]["max"])
            if mes[s]["has_step"]:
                f["step"] = _g(mes[s]["step"])
            if mes[s].get("default") is not None:
                f["default"] = mes[s]["default"]
            fields.append(f)
        # LORA CATALOG OPTIONS (2026-09-05, "write it up cleanly"):
        # the family's LoraRow rows ARE the picker's options — value=id,
        # label, tooltip (category + provenance filename), and
        # defaults.strength seeded from the row's default_strength (the
        # ONE strength source — the recipe rows and the compose door
        # read the same row, rung 6). A family whose loras flavor
        # declares NO rows of its own (the edit lane's door) serves the
        # RUNTIME CATALOG — the union of every family's declared rows
        # (operator order, verbatim: "THE LORAS DON'T MAP, I DON'T SEE
        # MY KREA2 LORAS... RUNTIME VALIDATION" — picks validate at the
        # compose door, the same union, refusing unknown ids LOUD).
        # ControlNet keeps the declared-only shape (no catalog rows
        # exist for it yet).
        options: list[dict[str, str | float | dict[str, float]]] = []
        if kind == "lora":
            rows = list(getattr(mcls, "loras_of", lambda: ())()) \
                if mcls is not None else []
            union = False
            if not rows:
                rows = _runtime_lora_rows(repo_root)
                union = True
            for r in rows:
                tip = " — ".join(x for x in (r.category, r.filename) if x)
                if union:
                    tip = ((tip + " — ") if tip else "") + \
                        "runtime catalog"
                options.append({
                    "value": r.id, "label": r.label or r.id,
                    "tooltip": tip or None,
                    "defaults": {"strength": r.default_strength},
                })
        entry: dict[str, JsonValue] = {
            "kind": kind,
            "label": me["label"] or me["name"],
            "cardinality": "list",
            "param_key": me["name"],
            "fields": fields,
            "options": options,
            "options_scanned": True,
            "declaration_only": not options,
        }
        if kind == "mask":
            # ONE mask tile — the second add is refused in the drawer
            entry["max_stack"] = 1
        if kind == "lora":
            entry["upload_dir"] = "models/loras"
        elif kind == "controlnet":
            entry["upload_dir"] = "models/controlnet"
        out.append(entry)
    return out


# ─────────────────────────────────────────────────────────────────────────
# enhance recipes — the recipe block readers
#
# ─────────────────────────────────────────────────────────────────────────

def _recipe_scan(path: str, key: str) -> str:
    """One prompt_upscale:/lyrics_upscale: block: indented lines joined
    with '; '; ends at the next top-level non-comment key. 4096 clamp."""
    out = ""
    in_block = False
    for raw in _fgets(path):
        if len(out) + 600 >= 4096:
            break
        if raw.startswith(key):
            in_block = True
            continue
        if not in_block:
            continue
        if raw[0] not in (' ', '#', '\t', '\n', '\x00'):
            break
        p = raw
        while p[:1] in (' ', '\t'):
            p = p[1:]
        p = p.rstrip('\r\n')
        if p:
            add = ("; " if out else "") + p
            room = 4095 - len(out)
            out += add[:room] if len(add) > room else add
    return out


def _recipes(path: str) -> tuple[str, str]:
    if path is None:
        return "", ""
    return (_recipe_scan(path, _RECIPE_KEYS[0]),
            _recipe_scan(path, _RECIPE_KEYS[1]))


def _recipes_fallback(repo_root: str, model_id: str) -> tuple[str, str]:
    """The id-named-dir probe: when the catalog
    row's own inference.yaml gave no recipes, probe every owner for
    models/<genre>/<model-id>/inference.yaml. Per genre the FIRST owner
    holding the file wins; its blocks OVERWRITE the accumulated ones key
    by key (a key absent from the file leaves the prior block intact —
    C snprintf writes blocks[bi] from offset 0 only when the key is found
    with content), and the genre loop stops once a prompt recipe lands.
    This is how a row whose unit lacks inference.yaml (music3) borrows
    recipes from another owner's id-named unit."""
    plugins = os.path.join(repo_root, "plugins", "engines")
    recipe, lrecipe = "", ""
    for genre in ("image", "video", "audio", "text"):
        found = None
        for _engine, edir in _iter_plugin_engines(repo_root):
            cand = os.path.join(edir, "models", genre, model_id,
                                "inference.yaml")
            if os.path.isfile(cand):
                found = cand
                break
        if found is not None:
            p, l = _recipes(found)
            if p:
                recipe = p
            if l:
                lrecipe = l
            if recipe:
                break
    return recipe, lrecipe


def _card_declares_prompt(yp: str) -> bool:
    """The has_prompt probe. card.py cards consult the class (an honest
    declaration list — the blank-line-reset quirk below only applies
    to the yaml surface)."""
    cls = _load_card_class(yp)
    if cls is not None:
        return cls.declares_prompt()
    in_p = False
    for raw in _fgets(yp):
        pl = _cut_comment(raw)
        if not pl:
            continue
        if pl[0] not in ' \t':
            in_p = pl.startswith('parameters:')  # strncmp(...,11)
            continue
        if not in_p:
            continue
        pi = 0
        while pi < len(pl) and pl[pi] == ' ':
            pi += 1
        if pi == 2 and pl[2:9] == 'prompt:':
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────
# variants — the variants/ matrix walk
# ─────────────────────────────────────────────────────────────────────────

def _parse_variant(path: str) -> dict[str, str | float]:
    """variant.yaml: top-level label/hint/route for the Variant row; the
    FIRST quants: tier for the Quant cell. FAITHFUL BUG PORT: quant attrs
    stop being read once `label` is seen (guard !qlab[0]), so route and
    vram_peak_gb after label never register."""
    label = hint = route = ""
    qlab = qroute = qid = ""
    vram = 0.0
    in_quants = False
    got_quant = False
    for raw in _fgets(path):
        vline = _cut_comment(raw)
        if not vline or vline[0] in '\n\r':
            continue
        if vline[0] not in ' \t':
            in_quants = vline.startswith('quants:')
            if in_quants:
                continue
            c = vline.find(':')
            if c < 0:
                continue
            vk = _clean(vline[:c])
            vv = _clean(vline[c + 1:])
            if vk == "label":
                label = vv
            elif vk == "hint":
                hint = vv
            elif vk == "route":
                route = vv
        elif in_quants and not got_quant:
            qi = 0
            while qi < len(vline) and vline[qi] == ' ':
                qi += 1
            if qi != 2:
                continue
            c = vline.find(':')
            if c < 0 or vline[qi] == '-':
                continue
            qid = _clean(vline[qi:c])
            if not qid:
                continue
            got_quant = True  # attrs follow in-block
        elif in_quants and got_quant and not qlab:
            c = vline.find(':')
            if c < 0:
                continue
            qk = _clean(vline[:c])
            qv = _clean(vline[c + 1:])
            if qk == "label":
                qlab = qv
            elif qk == "route":
                qroute = qv
            elif qk == "vram_peak_gb":
                vram = _atof(qv)
    return {"label": label, "hint": hint, "route": route,
            "qid": qid, "qlab": qlab, "qroute": qroute, "vram": vram}


def _variants(repo_root: str, model: str,
              prefer_variant: str | None = None) -> list[dict[str, JsonValue]]:
    """Variant rows + deduped Quant cells — the CLASS tree when the model
    is flipped (the cascade is structural), else <model-dir>/variants/
    yaml in readdir order; the model dir is dirname(inference_path) — no
    inference.yaml means no variants."""
    from_class = _variants_from_class(model, prefer_variant)
    if from_class is not None:
        return from_class
    if not model["inference_path"]:
        return []
    mdir = os.path.dirname(model["inference_path"])
    vdir = os.path.join(mdir, "variants")
    engine = model["engine_plugin"] or ""
    rows = []
    seen_quant_ids = set()
    for name in _scandir(vdir):
        if name.startswith('.'):
            continue
        vyp = os.path.join(vdir, name, "variant.yaml")
        if not os.path.isfile(vyp):
            continue
        v = _parse_variant(vyp)
        vlab = v["label"] or name
        if 'a' <= vlab[0] <= 'z':
            vlab = chr(ord(vlab[0]) - 32) + vlab[1:]
        rows.append({
            "id": name,
            "label": vlab,
            "defaults": {},
            "group": "Variant",
            "route": v["route"] or model["id"],
            "hint": v["hint"] if v["hint"] else None,
            "engine": engine,
        })
        if v["qid"]:
            # dedupe (group,id): one cell per quant tier id regardless of
            # how many variants list it
            if v["qid"] in seen_quant_ids:
                continue
            seen_quant_ids.add(v["qid"])
            rows.append({
                "id": v["qid"],
                "label": v["qlab"] or v["qid"],
                "defaults": {},
                "group": "Quant",
                "quant": v["qid"],
                "route": v["qroute"] or model["id"],
                "vram_peak_gb": _g(v["vram"]),
                # The parent variant dir (this loop's `name`) owns the
                # quant cell — see _variants_from_class for the class-
                # path twin. Without owner the editor's owner-scoping
                # hides every quant.
                "owner": name,
            })
    return rows


# ─────────────────────────────────────────────────────────────────────────
# GET /v1/form-spec — the spec door
# ─────────────────────────────────────────────────────────────────────────

# Minimal lane/family display spec: display wire
# only — the run door's no-fallback law is untouched. FORM WIRE GATE
# (2026-09-05): served through the SAME frozen FormSpecRow with honest
# empties — the old bare {defaults,variants,features,enhance_prompts}
# 200 was the hollow-spec bug (a form the client contract cannot hold);
# a lane spec now carries the full required core like every other 200.
_MINIMAL_LANE_SPEC = {"defaults": {}, "variants": [], "features": {},
                      "enhance_prompts": ""}


def _minimal_lane_spec(model: str) -> form_wire.FormSpecRow:
    """The lane display spec, CONSTRUCTED through form_wire.FormSpecRow
    — required keys present, empties honest."""
    return form_wire.FormSpecRow(
        model=model, form=model, service=model, label=model,
        genre="", fields=[], schema_groups=[],
        features=_MINIMAL_LANE_SPEC["features"],
        defaults=_MINIMAL_LANE_SPEC["defaults"],
        variants=_MINIMAL_LANE_SPEC["variants"],
        enhance_prompts=_MINIMAL_LANE_SPEC["enhance_prompts"],
    ).model_dump()

_SAFE_ID = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")


def _lane_probe(repo_root: str, model: str) -> bool:
    """Unknown-catalog-name fallback: a
    flows/<name>/flow.yaml on disk, or any flows/*/flow.yaml
    containing 'type: <name>', gets the minimal spec."""
    if os.path.exists(os.path.join(repo_root, "flows", model,
                                   "flow.yaml")):
        return True
    pdir = os.path.join(repo_root, "flows")
    needle = "type: " + model
    for name in _scandir(pdir):
        pyp = os.path.join(pdir, name, "flow.yaml")
        if os.path.isfile(pyp) and needle in (_read_file(pyp) or ""):
            return True
    return False


def _route_owner(repo_root: str, route_id: str) -> RouteOwner | None:
    """(row, cls, variant, cell) for a variant route, or None — the
    model class whose _routes carries the route owns the spec."""
    from melite_models import scan_engine_models
    for _path, cls in scan_engine_models(repo_root).values():
        hit = cls._routes.get(route_id)
        if hit is not None:
            row = _find_model(_scan_catalog(repo_root), cls.id)
            if row is not None:
                variant, cell = hit
                return row, cls, variant, cell
    return None


def _form_spec_routed(repo_root: str, owner: RouteOwner,
                       route_id: str) -> tuple[int, dict[str, JsonValue]]:
    """The route lens: the OWNING family's spec, stamped by the routed
    variant — model id, defaults, field defaults, and the quant rows
    anchored on the selected variant. The stamp is the variant's
    resolver_defaults (family defaults + the variant layer — the same
    merge merged_defaults performs, minus the mods base the plain spec
    does not carry either)."""
    row, cls, variant, _cell = owner
    status, spec = form_spec(repo_root, cls.id)
    if status != 200:
        return status, spec
    # COPY-BASED STAMP (mod-audit follow-up, 2026-09-05): every row
    # the lens touches is REPLACED with a fresh dict — the route
    # stamp never writes into a served structure in place. Today
    # form_spec rebuilds everything per call so in-place was
    # harmless; the copy makes that freshness a non-requirement (a
    # future cache layer cannot leak the route's stamps into the
    # family spec). Anti-leak wall: test_compose_gates.py
    # test_route_lens_never_stamps_the_family_spec.
    stamped = dict(row["defaults"])
    stamped.update(variant.resolver_defaults or {})
    spec["model"] = route_id
    spec["defaults"] = stamped
    # NATIVE field stamps (2026-09-06 C-retirement fossil kill): the
    # top-level `defaults` above stay the pinned stringified wire
    # contract, but FIELDS ride native — the old code stamped the
    # stringified base under native resolver values, serving one form
    # in two types for one kind ('1024' next to 52). A new fossil in
    # the wire is a bug, not heritage.
    native = dict(getattr(cls, "defaults", None) or {})
    native.update(variant.resolver_defaults or {})
    spec["fields"] = [
        dict(f, default=native[f["name"]])
        if f.get("name") in native else f
        for f in spec.get("fields", [])
    ]
    spec["variants"] = _variants(repo_root, row,
                                 prefer_variant=variant.id)
    return 200, spec


def form_spec(repo_root: str, model_id: str | None) -> tuple[int, dict[str, JsonValue]]:
    """GET /v1/form-spec?model=<id> -> (status_code, body_dict).

    200 + the spec envelope, or the C refusal shapes:
      400 {"error": "missing model param"}      — empty model param
      404 {"error": "model not found"}          — unknown/unsafe name
    """
    model = model_id or ""
    if not model:
        return 400, {"error": "missing model param"}

    row = _find_model(_scan_catalog(repo_root), model)
    if row is None:
        # route lens: model=<variant route> (krea-2-raw, z-image-base)
        # serves the OWNING family's spec through the variant — the
        # C-era editor fixtures (spec_krea-2-raw / spec_z-image-base)
        # are the proof this surface served. _routes (route ->
        # (variant, cell)) is structural on the class since the
        # frozen-rows rework.
        owner = _route_owner(repo_root, model)
        if owner is not None:
            return _form_spec_routed(repo_root, owner, model)
        # FORM-NAME RESOLUTION (2026-09-05, form_wire gate): a fresh
        # baseline card carries its FORM name as the service
        # (stage.service = "image-gen"); the spec door resolves it
        # through the /v1/forms registry to its default_service model.
        # Before this, "image-gen" fell to the lane probe below (ANY
        # flow.yaml carrying "type: image-gen" — every estate flow
        # doc's image step matches) and served the hollow
        # _MINIMAL_LANE_SPEC: a 200 with no fields — the card modal
        # rendered the Model zone and nothing else ("it just allows me
        # to pick model"). The registry wins BEFORE the probe; a form
        # name can never read as a lane.
        fdef = _forms_table(repo_root).get(model)
        if (fdef is not None and fdef["default_service"] != model
                and _find_model(_scan_catalog(repo_root),
                                fdef["default_service"]) is not None):
            return form_spec(repo_root, fdef["default_service"])
        safe = len(model) < 64 and all(c in _SAFE_ID for c in model)
        if safe and _lane_probe(repo_root, model):
            return 200, _minimal_lane_spec(model)
        return 404, {"error": "model not found"}

    # enhance recipes: (2026-09-02) class-driven — the model class carries
    # prompt_upscale / lyrics_upscale as tuples of rules (inference.yaml
    # extinct). Join to the wire's semicolon-separated string.
    _mcls = row.get("_model_class")
    _praw = getattr(_mcls, "prompt_upscale", ()) if _mcls else ()
    _lraw = getattr(_mcls, "lyrics_upscale", ()) if _mcls else ()
    recipe = "; ".join(_praw) if isinstance(_praw, tuple) else (_praw or "")
    lrecipe = "; ".join(_lraw) if isinstance(_lraw, tuple) else (_lraw or "")

    # the spec is branded by the CARD's ability label; the model stays an
    # internal route
    card_yp = _find_card_yaml(repo_root, row["id"])
    _card_cls = _load_card_class(card_yp) if card_yp else None
    card_label = _card_cls.label if _card_cls else ""
    label = card_label or row["label"] or row["id"]

    # (2026-09-02 tts 400 fix) advertise the prompt recipe ONLY when the
    # card's parameter surface declares a prompt field — via the C's probe
    # with its blank-line reset quirk (see _card_declares_prompt).
    if card_yp is not None and not _card_declares_prompt(card_yp):
        prompt_emit = None
    else:
        prompt_emit = recipe

    spec = {
        "model": row["id"],
        "label": label,
        # genre rides the KindGenre enum (form_wire); a model
        # without a declared genre refuses the gate — a model MUST
        # be classified to serve a form-spec (no untyped lane).
        "genre": row["genre"],
        "engine": row["engine_plugin"] or "",
        "defaults": {k: v for k, v in row["defaults"]},
        "variants": _variants(repo_root, row),
        "features": {
            "modifiers": _modifiers(repo_root, row["id"],
                                    row.get("_model_class")),
            # DECLARED groups (2026-09-05): the family's VariantGroup
            # rows serve — label + tooltip (the hardcoded pair starved
            # the wire of every declared tooltip and made a new group
            # like Recipe unservable). Standard pair = the fallback.
            "variant_groups": _variant_groups(row.get("_model_class")),
        },
        "enhance_prompts": {"prompt": prompt_emit, "lyrics": lrecipe},
    }

    frag = _card_spec(repo_root, row["id"])
    frag_from_fallback = False
    if frag is None:
        # Form-card fallback for cardless "data" models in a form
        # (2026-09-05): the model is listed in a form's `covers` and
        # inherits that form's anchor card's fields. Declarative — the
        # membership is the derived table's `covers`, no model name here.
        frag = _form_card_frag_for_model(repo_root, row)
        frag_from_fallback = frag is not None
    if frag:
        spec.update(frag)
    if frag_from_fallback:
        # The card carries the ANCHOR's identity (form/service) but
        # this spec is for the REQUESTED model — brand the spec with
        # the model's own id so the editor and the form_wire gate
        # see the right model, not the anchor. Fields stay (the
        # universal form).
        spec["form"] = row["id"]
        spec["service"] = row["id"]
    # CARDLESS MODELS — the contract (revised 2026-09-05):
    # A catalog row with NO card.py of its own still belongs to a
    # form (the membership is the derived table's `covers`); its form-spec
    # inherits the form's ANCHOR card's fields/schema_groups so the
    # Parameters zone renders the universal form. form/service default
    # to the model id (the spec is branded for THIS model), fields and
    # schema_groups carry the anchor card's. The setdefault guards
    # below remain the LAST-RESORT honest empties for models outside
    # any form's covers (a true orphan: no card, no form membership —
    # e.g. a half-deployed plugin lane). The earlier comment
    # ("that tolerance is the contract") framed the empty shape as
    # the desired behaviour; the cardless-model fix reversed that —
    # the universal form is the contract now, honest empties are the
    # orphan fallback. The hollow-spec class (missing required keys)
    # is still refused by the form_wire gate above.
    spec.setdefault("form", row["id"])
    spec.setdefault("service", row["id"])
    spec.setdefault("fields", [])
    spec.setdefault("schema_groups", [])
    # INTERSECT defaults with the card's declared fields (the
    # form-surface shouldn't advertise a model default the card has
    # no input for — a phantom slot the editor would render as a
    # value with no backing control). The card stays the source of
    # truth for what the form surface ships. Caught by the
    # test_form_defaults wall (h3-timeline's fps=24 model default
    # was leaking through; fps is a fixed grid constant the h3 card
    # deliberately does not expose).
    if frag and (frag.get("fields") or []):
        declared = {f.get("name") for f in frag["fields"] if f.get("name")}
        spec["defaults"] = {k: v for k, v in spec["defaults"].items()
                            if k in declared}
    # FORM WIRE GATE (2026-09-05): the 200 body is CONSTRUCTED as a
    # frozen FormSpecRow — model/form/service/label/genre/fields/
    # schema_groups/features/defaults/variants are REQUIRED. A spec
    # that cannot carry the universal action form cannot be built and
    # cannot be served. A refusal is a LOUD 500 with the field-named
    # reason (our own card data is malformed — document, then continue:
    # RESILIENCE LAW), never a hollow 200 and never a crashed gateway.
    try:
        gated = form_wire.FormSpecRow.model_validate(spec).model_dump()
    except form_wire.ValidationError as e:
        return 500, {"error": "form spec contract refusal (%s): %s"
                     % (row["id"], form_wire.refusal_reason(e))}
    # max_stack rides ONLY when a family declares a cap (2026-09-05
    # button order: the mask kind's one-tile cap). model_dump emits
    # the row's None default on every cap-less kind — a null the wire
    # contract never carried (goldens pin ABSENT; the drawer falls
    # back per kind: lora 5, controlnet 3). Strip the Nones.
    for _m in (gated.get("features") or {}).get("modifiers") or []:
        if isinstance(_m, dict) and _m.get("max_stack") is None:
            _m.pop("max_stack", None)
    return 200, gated


# ─────────────────────────────────────────────────────────────────────────
# GET /v1/kinds — the first-party kind table (py/card_kinds.py).
# ─────────────────────────────────────────────────────────────────────────
# The C-era file scan (plugins/*/kinds/*.yaml, kinds_parse_file) is
# EXTINCT: the files rode out with the dead plugins/core plugin (6a86082)
# and the lane went dark — the editor's fail-safe kindDef gated every
# form-spec fetch OFF and cards rendered without form fields. The table
# is gateway infra now, declared as frozen pydantic rows (the
# slot_kinds.py precedent); this projection is the only route body.

def kinds(repo_root: str) -> dict[str, list[dict[str, str | bool]]]:
    """GET /v1/kinds -> {"kinds": [...]}. The first-party card-kind
    behavior flags, projected from py/card_kinds.py's TABLE (the SSOT —
    one declaration, validated at construction; no file scans)."""
    import card_kinds as _ck
    return _ck.kinds_wire()


# ─────────────────────────────────────────────────────────────────────────
# Self-test — structural JSON parity against the C goldens
# ─────────────────────────────────────────────────────────────────────────

def _first_diff(a: JsonValue, b: JsonValue, path: str = "$") -> str | None:
    """Deep compare; return the first divergence path or None."""
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a.keys() | b.keys():
            if k not in a:
                return "%s.%s: missing in Python output" % (path, k)
            if k not in b:
                return "%s.%s: missing in golden" % (path, k)
            d = _first_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        # tuple vs list is the same wire shape (JSON has one array
        # kind — in-code rows are tuples, goldens parse as lists)
        if len(a) != len(b):
            return "%s: length %d != golden %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = _first_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if isinstance(a, bool) or isinstance(b, bool):
        return None if a is b else "%s: %r != golden %r" % (path, a, b)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return None if a == b else "%s: %r != golden %r" % (path, a, b)
    return None if a == b else "%s: %r != golden %r" % (path, a, b)


def _main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(here)
    golden_dir = os.path.join(repo_root, "tests", "golden_http")

    def golden(name: str) -> JsonValue:
        with open(os.path.join(golden_dir, name), encoding='utf-8') as f:
            return json.load(f)

    failures = []

    # GET /v1/forms
    got, want = forms(repo_root), golden("forms.json")
    d = _first_diff(got, want)
    print("GET /v1/forms                 :",
          "PARITY OK" if d is None else "DRIFT — %s" % d)
    if d:
        failures.append(("forms", d))

    # GET /v1/kinds
    got, want = kinds(repo_root), golden("kinds.json")
    d = _first_diff(got, want)
    print("GET /v1/kinds                 :",
          "PARITY OK" if d is None else "DRIFT — %s" % d)
    if d:
        failures.append(("kinds", d))

    # GET /v1/form-spec — the three golden models
    for model in ("krea-2", "h3-timeline", "music3"):
        status, body = form_spec(repo_root, model)
        want = golden("form-spec_model_%s.json" % model)
        d = None
        if status != 200:
            d = "$: status %d != 200" % status
        else:
            d = _first_diff(body, want)
        print("GET /v1/form-spec?model=%-12s:" % model,
              "PARITY OK" if d is None else "DRIFT — %s" % d)
        if d:
            failures.append(("form-spec:" + model, d))

    # refusal shapes (the wire contract's fixed error bodies)
    status, body = form_spec(repo_root, "")
    if (status, body) == (400, {"error": "missing model param"}):
        print("form-spec missing model param  : PARITY OK (400)")
    else:
        print("form-spec missing model param  : DRIFT —", status, body)
        failures.append(("form-spec:400", "%s %s" % (status, body)))

    status, body = form_spec(repo_root, "no-such-model-xyz")
    if (status, body) == (404, {"error": "model not found"}):
        print("form-spec unknown model        : PARITY OK (404)")
    else:
        print("form-spec unknown model        : DRIFT —", status, body)
        failures.append(("form-spec:404", "%s %s" % (status, body)))

    if failures:
        print("\n%d FAILURE(S)" % len(failures))
        return 1
    print("\nALL PARITY CHECKS GREEN")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
