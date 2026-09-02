#!/usr/bin/env python3
"""py/catalog.py — model catalog builder, C→Python port with output parity.

1:1 transcription of src/catalog.c (scan + parse + serialize) and the
catalog_abilities_splice() post-pass from src/server.cpp:7299 that
handle_catalog() (src/server.cpp:5904) applies to every response.
The verified behavior is the CONTRACT (ORCHESTRATOR_MIGRATION.md): the
Python scan's output is structurally equal to the C server's captured
response (tests/golden_http/model-catalog.json).

    scan_catalog(repo_root) -> dict   full catalog object
                                       (models / families / capabilities / cards)
    to_json(catalog) -> str           compact serialization, catalog.c emit order
    find_model(catalog, model_id)     first scan-order match (catalog.c:629)
                                       or None

SCAN ROOTS (how the C finds its data)
    main.c:108-111 — plugins_path = "<catalog-dir or cwd>/plugins";
    catalog.c:533 walks plugins/<owner>/models/<genre>/<model-id>/model.yaml
    catalog.c:582 walks plugins/<owner>/cards/<card-id>/card.yaml
    Traversal is RAW DIRECTORY ORDER (C readdir) — os.scandir yields the
    same getdents(3) stream, which is what keeps the cards ARRAY order and
    the duplicate-family-id collapse (91 scanned ids -> 70 distinct, last
    scan row wins, exactly like a JSON parser reading the C's duplicate
    map keys) faithful to the golden.

PLUGIN ARCHITECTURE LAW: this module names NO model, engine, or lane. The
one table the C hardcoded in src/server.cpp — the ability/route pairs of
catalog_abilities_splice (server.cpp:7300 ABIL[] + server.cpp:7585
ALLOWED_CARDS) — moved into the data that owns it, next to the cards:
a card.yaml whose card: block carries

    ability:
      default_family: <model family id>

is a capability tile (one per ABILITY card, never one per model — the
operator card law, surface 3). The C parsers ignore the key (unknown keys
in the card: section are skipped by parse_card_yaml catalog.c:383-389 and
cs_card_identity_path server.cpp:7458-7474), so both servers read the
same files.

Documented C-scan artifacts this port does NOT reproduce byte-for-byte
(JSON semantics unaffected; the parity gate is structural equality):
  * catalog.c:726-727 emits the "family" key TWICE per model row — a JSON
    parser keeps one; the dict here carries it once.
  * json_escape (catalog.c:667) escapes only quote, backslash and
    newline; other control characters (tab, CR) ride through raw.
    json.dumps escapes them; both spellings parse to identical strings.
  * json_value (catalog.c:681) re-emits numeric defaults as their SOURCE
    TEXT ("1e3" stays "1e3"); this port types them (1e3 -> 1000.0 ->
    "1000.0"). Same parsed number, different spelling — the allowed
    float-formatting deviation.
  * catalog.c parses variant_groups: (section 5) but no catalog endpoint
    ever emits them; this port parses them for row fidelity and likewise
    never emits them. lora_catalog: (section 6) has NO parser body in C —
    "loras" is always [].
"""

from __future__ import annotations

import json
import os
import re
import sys

# ---------------------------------------------------------------------------
# Minimal YAML helpers — ports of catalog.c ystrdup/ystrip/ykv/yindent
# ---------------------------------------------------------------------------


def _unquote1(s):
    """ystrdup (catalog.c:16): strip ONE layer of wrapping yaml quotes."""
    if s is None:
        return None
    n = len(s)
    if n >= 2 and ((s[0] == '"' and s[n - 1] == '"') or (s[0] == "'" and s[n - 1] == "'")):
        return s[1:-1]
    return s


def _ystrip(s):
    """ystrip (catalog.c:33): trim leading spaces/tabs + trailing blanks."""
    return s.strip(" \t\n\r")


def _ykv(s, key):
    """ykv (catalog.c:44): value after "key:", leading spaces skipped."""
    if not s.startswith(key):
        return None
    p = s[len(key):]
    if not p.startswith(":"):
        return None
    p = p[1:]
    while p.startswith(" "):
        p = p[1:]
    return p


def _yindent(line):
    """yindent (catalog.c:55): leading SPACES only (tabs do not indent)."""
    return len(line) - len(line.lstrip(" "))


# ---------------------------------------------------------------------------
# File reading — read_file (catalog.c:63): missing or EMPTY file -> skip
# ---------------------------------------------------------------------------


def _read_file(path):
    try:
        if os.path.getsize(path) <= 0:
            return None
        with open(path, "rb") as f:
            return f.read().decode("utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def _probe(path):
    """probe_unit_file (catalog.c:457) / the AGENT.md probe (catalog.c:486)."""
    return path if os.path.isfile(path) else None


# ---------------------------------------------------------------------------
# Model parser — parse_model_yaml (catalog.c:143)
# ---------------------------------------------------------------------------

_M_SECTIONS = {
    "family:": 1,
    "source:": 2,
    "defaults:": 3,
    "engine:": 4,
}


def _parse_model_yaml(text):
    m = {
        "id": None,
        "genre": None,
        "label": None,
        "description": None,
        "source": {"type": None, "repo_id": None, "url": None, "filename": None},
        "variant_groups": [],
        "defaults": [],  # ordered (key, raw_value) pairs
        "engine_plugin": None,
        "studio_tenant": None,
        "studio_owns_params": False,
        "form": None,
    }

    section = 0
    cur_opt = None
    cur_group = None

    for line in text.split("\n"):
        indent = _yindent(line)
        s = _ystrip(line)
        if not s or s.startswith("#"):  # whole-line comments only (catalog.c:165)
            continue

        if indent == 0:
            # Top-level section dispatch (catalog.c:171-179)
            if s in _M_SECTIONS:
                section = _M_SECTIONS[s]
            elif s.startswith("variant_groups:"):
                section = 5
            elif s.startswith("lora_catalog:"):
                section = 6  # no parser body in C -> loras stay []
            elif s.startswith("studio:"):
                section = 7
            else:
                section = 0
            # form: is a top-level scalar, not a section (catalog.c:181-185)
            val0 = _ykv(s, "form")
            if val0 is not None:
                m["form"] = _unquote1(val0)

        # Family section (catalog.c:191-196)
        if section == 1 and indent == 2:
            val = _ykv(s, "id")
            if val is not None:
                m["id"] = _unquote1(val)
            val = _ykv(s, "genre")
            if val is not None:
                m["genre"] = _unquote1(val)
            val = _ykv(s, "label")
            if val is not None:
                m["label"] = _unquote1(val)
            val = _ykv(s, "description")
            if val is not None:
                m["description"] = _unquote1(val)

        # Source section (catalog.c:199-204) — url parsed, never emitted
        if section == 2 and indent == 2:
            for key in ("type", "repo_id", "url", "filename"):
                val = _ykv(s, key)
                if val is not None:
                    m["source"][key] = _unquote1(val)

        # Defaults section (catalog.c:207-235): any "k: v" pair, in order,
        # keys verbatim (no quote-strip on the key), ONE quote layer on the
        # value, NO inline-comment cutting anywhere in this parser.
        if section == 3 and indent == 2:
            colon = s.find(":")
            if colon != -1:
                key = s[:colon]
                v = s[colon + 1:]
                while v.startswith(" "):
                    v = v[1:]
                m["defaults"].append((key, _unquote1(v)))

        # Engine section (catalog.c:238-243)
        if section == 4 and indent == 2:
            val = _ykv(s, "plugin")
            if val is not None:
                m["engine_plugin"] = _unquote1(val)

        # Studio body claim (catalog.c:246-254)
        if section == 7 and indent == 2:
            val = _ykv(s, "tenant")
            if val is not None:
                m["studio_tenant"] = _unquote1(val)
            val = _ykv(s, "owns_params")
            if val is not None:
                m["studio_owns_params"] = val in ("true", "1")

        # Variant groups (catalog.c:258-315) — parsed for fidelity; no
        # catalog endpoint ever emits them (catalog_model_to_json has no
        # variant block).
        if section == 5:
            if indent == 2 and s.startswith("-"):
                gname = ""
                idx = s.find("name:")
                if idx != -1:
                    nm = s[idx + 5:]
                    while nm.startswith(" "):
                        nm = nm[1:]
                    nl = len(nm)
                    while nl and nm[nl - 1] == " ":
                        nl -= 1
                    gname = nm[:nl][:63]
                    if len(gname) >= 2 and gname[0] == '"' and gname[len(gname) - 1] == '"':
                        gname = gname[1:-1]
                cur_group = {"name": gname, "options": []}
                m["variant_groups"].append(cur_group)
                cur_opt = None
            elif indent == 6 and s.startswith("-") and cur_group is not None:
                idx = s.find("id:")
                if idx != -1:
                    idp = s[idx + 3:]
                    while idp.startswith(" "):
                        idp = idp[1:]
                    il = len(idp)
                    while il and idp[il - 1] == " ":
                        il -= 1
                    idv = idp[:il][:127]
                    if len(idv) >= 2 and idv[0] == '"' and idv[len(idv) - 1] == '"':
                        idv = idv[1:-1]
                    cur_opt = {"id": idv, "filename": None}
                    cur_group["options"].append(cur_opt)
            elif indent == 8 and cur_group is not None and cur_opt is not None:
                val = _ykv(s, "filename")
                if val is not None:
                    cur_opt["filename"] = _unquote1(val)

    return m


# ---------------------------------------------------------------------------
# Card parser — parse_card_yaml (catalog.c:347) + the ability marker
# ---------------------------------------------------------------------------


def _parse_card_yaml(text):
    c = {
        "id": None,
        "label": None,
        "description": None,
        "genre": None,
        "icon": None,  # parsed, never emitted in the cards array
        "api": False,
        "families": [],
        "principles": [],
        "skills": [],  # ordered (id, label) pairs
        "ability_route": None,  # plugin data: card.ability.default_family
    }

    section = 0
    in_ability = False

    for line in text.split("\n"):
        indent = _yindent(line)
        s = _ystrip(line)
        if not s or s.startswith("#"):
            continue

        if indent == 0:
            # Section dispatch (catalog.c:371-378)
            if s == "card:":
                section = 1
            elif s == "families:":
                section = 2
            elif s == "principles:":
                section = 3
            elif s.startswith("parameters:"):
                section = 4
            elif s.startswith("skills:"):
                section = 5
            else:
                section = 0
            in_ability = False

        # Card section (catalog.c:383-389)
        if section == 1 and indent == 2:
            val = _ykv(s, "id")
            if val is not None:
                c["id"] = _unquote1(val)
            val = _ykv(s, "label")
            if val is not None:
                c["label"] = _unquote1(val)
            val = _ykv(s, "description")
            if val is not None:
                c["description"] = _unquote1(val)
            val = _ykv(s, "genre")
            if val is not None:
                c["genre"] = _unquote1(val)
            val = _ykv(s, "icon")
            if val is not None:
                c["icon"] = _unquote1(val)
            val = _ykv(s, "api")
            if val is not None:
                c["api"] = val[:1] in ("t", "1")
            # plugin-data ability marker (a key the C parsers skip)
            in_ability = _ykv(s, "ability") is not None
        if section == 1 and indent == 4 and in_ability:
            val = _ykv(s, "default_family")
            if val is not None:
                c["ability_route"] = _unquote1(val)

        # Families section (catalog.c:393-400): "- id:" rows, any indent
        if section == 2 and s.startswith("- id:"):
            c["families"].append(_unquote1(_ystrip(s[5:])))

        # Principles section (catalog.c:403-418): `- "…"` first quoted span
        if section == 3 and s.startswith('- "'):
            start = s.find('"', 2)
            if start != -1:
                end = s.find('"', start + 1)
                if end != -1:
                    c["principles"].append(s[start + 1:end])

        # Skills section (catalog.c:421-435)
        if section == 5 and indent == 2:
            val = _ykv(s, "id")
            if val is not None:
                c["skills"].append([_unquote1(val), None])
            val = _ykv(s, "label")
            if val is not None and c["skills"]:
                c["skills"][-1][1] = _unquote1(val)

    return c


# ---------------------------------------------------------------------------
# Ability-tile parsers — ports of the server.cpp cs_* helpers that
# catalog_abilities_splice (server.cpp:7299) uses to brand each tile.
# These differ subtly from parse_card_yaml: they cut trailing " # comment"
# (cs_cut_comment server.cpp:7190), clean with cs_clean (server.cpp:7200),
# and truncate to the C stack-buffer caps.
# ---------------------------------------------------------------------------


def _cs_cut_comment(line):
    """cs_cut_comment (server.cpp:7190): drop trailing ' # …' outside quotes."""
    inq = False
    for i, ch in enumerate(line):
        if ch == '"':
            inq = not inq
        elif ch == "#" and not inq and i > 0 and line[i - 1] in " \t":
            return line[:i]
    return line


def _cs_clean(s):
    """cs_clean (server.cpp:7200): trim spaces both ends, strip one quote pair."""
    s = s.rstrip(" \t\r\n").lstrip(" \t")
    n = len(s)
    if n >= 2 and ((s[0] == '"' and s[n - 1] == '"') or (s[0] == "'" and s[n - 1] == "'")):
        return s[1:-1]
    return s


def _cap(s, n):
    """C snprintf byte-cap: keep at most n bytes (then stay valid UTF-8)."""
    return s.encode("utf-8")[:n].decode("utf-8", "ignore")


def _card_identity_path(text):
    """cs_card_identity_path (server.cpp:7432): id (FIRST wins),
    label/icon/description (LAST non-empty wins), card: block only, rows
    nested no deeper than 3 columns, buffers val[200] id[80] label[160]
    icon[64] desc[512]."""
    cid = label = icon = desc = ""
    in_card = False
    for raw in text.split("\n"):
        line = _cs_cut_comment(raw)
        if not line or line[0] in "\n\r":
            continue
        if line[0] not in " \t":
            in_card = line.startswith("card:")
            continue
        if not in_card:
            continue
        ind = 0
        while ind < len(line) and line[ind] in " \t":
            ind += 1
        if ind >= 4:
            continue
        p = line[ind:]
        if p.startswith("label:"):
            val = _cs_clean(_cap(p[6:], 199))
            if val:
                label = _cap(val, 159)
        elif p.startswith("icon:"):
            val = _cs_clean(_cap(p[5:], 199))
            if val:
                icon = _cap(val, 63)
        elif p.startswith("description:"):
            val = _cs_clean(_cap(p[12:], 199))
            if val:
                desc = _cap(val, 511)
        elif p.startswith("id:") and not cid:
            val = _cs_clean(_cap(p[3:], 199))
            if val:
                cid = _cap(val, 79)
    return cid, label, icon, desc


def _card_families_splice(text):
    """The families: re-reader inside catalog_abilities_splice
    (server.cpp:7348-7387): '- id:' rows indented 1-3 spaces only,
    cs_clean'd, val capped at 95 bytes."""
    fams = []
    in_fam = False
    for raw in text.split("\n"):
        line = _cs_cut_comment(raw)
        if not line or line[0] in "\n\r":
            continue
        if line[0] not in " \t":
            in_fam = line.startswith("families:")
            continue
        if not in_fam:
            continue
        ind = 0
        while ind < len(line) and line[ind] == " ":
            ind += 1
        p = line[ind:]
        if ind >= 4 or p[:1] != "-":
            continue
        p = p[1:]
        while p.startswith(" "):
            p = p[1:]
        if not p.startswith("id:"):
            continue
        val = _cs_clean(_cap(p[3:], 95))
        if val:
            fams.append(val)
    return fams


# ---------------------------------------------------------------------------
# json_value (catalog.c:681): scalar yaml default -> JSON value.
# "true"/"false"/"null" raw; fully-strtod-consumable numbers raw (typed
# here — see module docstring for the formatting note); everything else a
# string; empty/absent -> null.
# ---------------------------------------------------------------------------

_STRTOD_RE = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$")


def _json_value(v):
    if v is None or v == "":
        return None
    if v == "true":
        return True
    if v == "false":
        return False
    if v == "null":
        return None
    if _STRTOD_RE.match(v):
        if any(ch in v for ch in ".eE"):
            return float(v)
        return int(v)
    return v


# ---------------------------------------------------------------------------
# Row assembly — catalog_model_to_json (catalog.c:699) and
# catalog_card_to_json (catalog.c:806) emit orders, as pre-ordered dicts.
# (catalog.c:726's duplicate "family" emission collapses to one key — a
# JSON parser reading the C output keeps a single value anyway.)
# ---------------------------------------------------------------------------


def _model_row(m):
    row = {}
    row["id"] = m["id"] or ""
    row["family"] = m["id"] or ""
    row["genre"] = m["genre"] or ""
    row["label"] = m["label"] or ""
    row["description"] = m["description"] or ""
    src = {"type": m["source"]["type"] or ""}  # url never emitted (catalog.c:738-752)
    if m["source"]["repo_id"] is not None:
        src["repo_id"] = m["source"]["repo_id"]
    if m["source"]["filename"] is not None:
        src["filename"] = m["source"]["filename"]
    row["source"] = src
    row["loras"] = []  # lora_catalog: has no parser body in C (catalog.c:177)
    defaults = {}
    for k, v in m["defaults"]:
        defaults[k] = _json_value(v)
    row["defaults"] = defaults
    row["engine"] = m["engine_plugin"] or ""
    if m["form"]:
        row["form"] = m["form"]
    if m["agent_md_path"] is not None:
        row["has_agent"] = True
    # (2026-09-02) inference.yaml extinct — class carries recipes
    _mcls = m.get("_model_class")
    row["has_inference"] = bool(
        getattr(_mcls, "prompt_upscale", None) or
        getattr(_mcls, "lyrics_upscale", None)) if _mcls else False
    row["has_rubric"] = m["rubric_path"] is not None
    return row


def _card_row(c):
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


def _capability_entry(card_dir, card_text, route):
    """One capabilities tile — catalog_abilities_splice's emit
    (server.cpp:7397-7405): label/description/icon from the card identity
    (cs_card_identity_path semantics), families re-read by the splice's
    own families parser, kind/resolved from the route. Entry key order
    mirrors the C format string: label, description, default_family,
    families, kind, [icon], resolved."""
    cid, clabel, cicon, cdesc = _card_identity_path(card_text)
    cid = cid or card_dir        # fallbacks: the card's directory name
    clabel = clabel or card_dir  # (C falls back to its ABIL.card label)
    fams = _card_families_splice(card_text)
    entry = {
        "label": clabel,
        "description": cdesc,  # always present (C quotes even when empty)
        "default_family": route,
        "families": fams,
        "kind": "generation",
    }
    if cicon:
        entry["icon"] = cicon  # emitted only when non-empty (server.cpp:7393)
    entry["resolved"] = {"family": route, "model": route, "params": {}}
    return cid, entry


# ---------------------------------------------------------------------------
# Directory scanning — scan_models (catalog.c:533) and scan_cards
# (catalog.c:582): raw directory order, models exactly three levels deep,
# cards two, dot-entries and non-dirs skipped.
# ---------------------------------------------------------------------------


def _scan_models(plugins_dir):
    """Returns ordered (row, meta) pairs, one per model.yaml WITH a family
    id — the C's flat n_models array. meta carries the studio claim for
    the families section (catalog.c:908-919)."""
    pairs = []
    # (2026-09-02) Engine layout: plugins/engines/<engine>/models/<genre>/.
    # The depth-1 owner scan found nothing since the engine formalization.
    eng_root = os.path.join(plugins_dir, "engines")
    try:
        engines = os.scandir(eng_root)
    except OSError:
        return pairs
    with engines:
        for owner in engines:
            if owner.name.startswith("."):
                continue
            models_dir = os.path.join(eng_root, owner.name, "models")
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


def _scan_model_dir(model_dir):
    """scan_model_dir (catalog.c:467, superseded): model.py class → row;
    unit assets (agents/inference/rubric) probed next to the class.

    (2026-09-02) The flip is TOTAL: every unit is a model.py class
    (py/melite_models; docs/plans/
    python-action-cards.md); model.yaml is extinct tree-wide. A yaml
    reappearing next to a model.py is a LOUD refusal (two SSOTs is
    zero SSOTs)."""
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
    meta = {"studio_tenant": None, "studio_owns_params": False,
            "studio_writes": []}
    if isinstance(cls.studio, dict) and cls.studio.get("tenant"):
        meta = {"studio_tenant": cls.studio["tenant"],
                "studio_owns_params": bool(cls.studio.get("owns_params")),
                "studio_writes": [str(w) for w in
                                  (cls.studio.get("writes") or ())]}
    return [(model_row(cls, model_dir), meta)]


def _scan_cards(plugins_dir):
    rows = []
    capabilities = {}
    # (2026-09-02) Engine layout: plugins/engines/<engine>/cards/<card>/
    # AND plugins/engines/<engine>/action_cards/<card>/ (comfyui migrated
    # 2026-09-02).  Both subtrees are scanned.
    eng_root = os.path.join(plugins_dir, "engines")
    try:
        with os.scandir(eng_root) as it:
            owners = sorted(it, key=lambda e: e.name)
    except OSError:
        return rows, capabilities
    for owner in owners:
            if owner.name.startswith("."):
                continue
            for subdir in ("cards", "action_cards"):
                cards_dir = os.path.join(eng_root, owner.name, subdir)
                if not os.path.isdir(cards_dir):
                    continue
                with os.scandir(cards_dir) as cids:
                    # SORTED walk (2026-09-02 reorg): the raw-readdir
                    # mirror was a C fossil — machine-dependent order
                    # goldens cannot survive. Sorted = deterministic
                    # across machines; the card order the editor sees
                    # is stable regardless of who cloned when.
                    for cid in sorted(cids, key=lambda e: e.name):
                        if cid.name.startswith("."):
                            continue
                        card_dir = os.path.join(cards_dir, cid.name)
                        if not os.path.isdir(card_dir):
                            continue
                        row, cap_key, cap_entry = _scan_card_dir(
                            card_dir, cid.name)
                        if row is not None:
                            rows.append(row)
                        if cap_key is not None:
                            capabilities[cap_key] = cap_entry
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
                                row, cap_key, cap_entry = _scan_card_dir(
                                    sub_dir, sub.name)
                                if row is not None:
                                    rows.append(row)
                                if cap_key is not None:
                                    capabilities[cap_key] = cap_entry
    return rows, capabilities


def _scan_card_dir(card_dir, card_name):
    """scan_card_dir (catalog.c:506, superseded): card.py class → row;
    only api=True classes serve. The ability marker (plugin data)
    promotes the card to a capabilities tile.

    (2026-09-02, the identity rung) card.yaml is EXTINCT — id/label/
    description/genre/icon/api/ability/requires/principles/skills live
    on the ActionCard class (py/melite_cards). A card.yaml next to
    a card.py is a LOUD refusal (two SSOTs is zero SSOTs)."""
    mpy = os.path.join(card_dir, "card.py")
    if not os.path.isfile(mpy):
        return None, None, None
    if os.path.isfile(os.path.join(card_dir, "card.yaml")):
        raise ValidationError(
            "%s carries BOTH card.py and card.yaml — the identity rung "
            "moved card.yaml onto the class; delete the yaml" % mpy)
    # engine dir: one hop above the cards/action_cards segment for
    # depth-1 card dirs, two for genre-grouped
    # (action_cards/<genre>/<card>/, 2026-09-02 reorg)
    _d = os.path.dirname(card_dir)
    engine_dir = (os.path.dirname(_d)
                  if os.path.basename(_d) in ("cards", "action_cards")
                  else os.path.dirname(os.path.dirname(_d)))
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(
        engine_dir)))
    _py = os.path.join(repo_root, "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    from melite_cards import load_card_py
    engine = os.path.basename(engine_dir)
    cls = load_card_py(mpy, engine)
    if not cls.id:
        return None, None, None
    if not cls.api:  # API gate (catalog.c:517-518)
        return None, None, None
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
    return _card_row(c), cap_key, cap_entry


def _capability_entry_from_class(card_dir_name, cls, route):
    """The class-driven _capability_entry — same emit order (label,
    description, default_family, families, kind, [icon], resolved)."""
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
# Public API
# ---------------------------------------------------------------------------


def scan_catalog(repo_root):
    """Scan <repo_root>/plugins and build the full catalog object.

    Returns a dict with the four wire sections — models / families /
    capabilities / cards — plus private '_' keys used by find_model and
    diagnostics (to_json emits only the four). models/families are maps
    keyed by family id: duplicate ids across plugin folders collapse
    LAST-scan-row-wins, exactly like a JSON parser reading the C's
    duplicate map keys (91 scanned rows -> 70 distinct families in this
    tree).
    """
    plugins_dir = os.path.join(os.fspath(repo_root), "plugins")

    scan_pairs = _scan_models(plugins_dir)
    models = {}
    families = {}
    for row, meta in scan_pairs:
        models[row["id"]] = row
        fam = {"label": row["label"], "genre": row["genre"]}
        if meta["studio_tenant"]:
            # Studio body claim (catalog.c:908-919): only models declaring
            # studio: emit it — the editor's studio-tenant resolver.
            fam["studio"] = {
                "tenant": meta["studio_tenant"],
                "owns_params": bool(meta["studio_owns_params"]),
                "writes": list(meta["studio_writes"]),
            }
        families[row["id"]] = fam

    cards, capabilities = _scan_cards(plugins_dir)

    return {
        "models": models,
        "families": families,
        "capabilities": capabilities,
        "cards": cards,
        "_scan_models": [row for row, _ in scan_pairs],
        "_plugins_dir": plugins_dir,
    }


def to_json(catalog):
    """catalog_to_json + catalog_abilities_splice (the served shape):
    {"models":{…},"families":{…},"capabilities":{…},"cards":[…]} in the
    C emit order, compact separators. Plus input_vocabulary (2026-09-02,
    the gap-3 port): the slot SSOT from py/slot_kinds.py — the editor's
    setInputVocabulary replaces its fallbacks field-by-field with this."""
    import slot_kinds
    obj = {
        "models": catalog["models"],
        "families": catalog["families"],
        "capabilities": catalog["capabilities"],
        "cards": catalog["cards"],
        "input_vocabulary": slot_kinds.input_vocabulary(),
    }
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def find_model(catalog, model_id):
    """catalog_find_model (catalog.c:629): FIRST scan-order row whose
    family id matches, else None. (The models map collapses duplicates
    last-wins; the C's per-model endpoint serves the first — so does this.)"""
    for row in catalog.get("_scan_models", ()):
        if row["id"] == model_id:
            return row
    return None


# ---------------------------------------------------------------------------
# Self-test — golden parity wall.
# Run: python3 py/catalog.py
# Deep-compares scan_catalog(repo) against tests/golden_http/model-catalog.json
# (the C server's captured response), printing the FIRST divergence per
# mismatch class; exits nonzero on any drift.
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

    def walk(a, b, path):
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
