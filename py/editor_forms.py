#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Editor form/card-data readers — stdlib-only Python port of the C gateway.

Routes ported (C sources in this repo):
  GET /v1/forms                 -> handle_lane_registry "/v1/forms" branch
                                   (src/server.cpp:7080-7113)
  GET /v1/form-spec?model=<id>  -> handle_form_spec (src/server.cpp:7923-8452)
                                   + card_spec_json (src/server.cpp:7729-7921)
                                   + cs_find_card_yaml (src/server.cpp:7533-7611)
                                   + catalog scan/parse (src/catalog.c)
  GET /v1/kinds                 -> handle_kinds (src/server.cpp:4934-4992)
                                   + kinds_parse_file (src/server.cpp:4846-4930)

Where each route's data lives (everything is read from plugins/ at call time;
no model or engine name is hardcoded as logic — see the one documented
exception for /v1/forms below):

  /v1/forms        FIXED OPERATOR SURFACE. In C this is a compiled-in literal
                   (src/server.cpp:7087-7113, "operator card law" 2026-09-01)
                   — it is NOT derived from plugins/ data, and plugins/ data
                   cannot reproduce it (the tts entry deliberately diverges
                   from its card.yaml: forms label "Speech" vs card label
                   "TTS", default_service "qwen3-tts" vs card family
                   "qwen3_tts"). This module ports the literal verbatim as
                   _FORMS_TABLE below; the table's keys are also the C's
                   ALLOWED_CARDS set (src/server.cpp:7585-7588), so the card
                   finder derives its gate from the table, not a second list.
  /v1/form-spec    model row: plugins/<owner>/models/<genre>/<id>/model.yaml
                   (family:/defaults:/engine: sections, catalog.c parse);
                   variants: <model-dir>/variants/<name>/variant.yaml;
                   card surface (form/service/fields/schema_groups/
                   features.modifiers): plugins/<owner>/cards/<card>/card.yaml
                   `parameters:`; option vocabularies $samplers/$schedulers:
                   plugins/melite-core/models/field_options.yaml; enhance
                   recipes: <model-dir>/inference.yaml prompt_upscale:/
                   lyrics_upscale: blocks (with the C's id-named-dir fallback
                   probe across owners/genres); lane fallback:
                   pipelines/<name>/pipeline.yaml or any
                   pipelines/*/pipeline.yaml containing "type: <name>".
  /v1/kinds        plugins/<plugin>/kinds/<stem>.yaml behavior-flag files
                   (file stem IS the kind string).

Faithful-bug ports (behavior the goldens captured; do NOT "fix"):
  * enhance-prompts prompt-nullification probe (server.cpp:8406-8430) does
    NOT skip blank lines, unlike card_spec_json — any blank (or top-level
    comment) line between `parameters:` and the `prompt:` field resets the
    section state, so a card with a blank line before `prompt:` advertises
    NO enhance recipe (prompt:null). This is why the image card serves
    prompt:null for its model.
  * variant.yaml quant parsing (server.cpp:8187-8213) stops reading quant
    attributes once `label` is seen (guard `!qlab[0]`), so route/vram after
    label never register; vram_peak_gb therefore emits the atof default 0.
  * variant rows/quant cells are emitted in raw readdir order of the
    variants/ directory (os.scandir == readdir order on Linux); quant cells
    dedupe on id across variants.

C behaviors intentionally not ported (unreachable here):
  * the 500 {"error":"no catalog loaded"} branch — catalog_scan never
    returns NULL in C (src/catalog.c:613-625); the Python catalog is always
    an (possibly empty) list.
  * the C's second search bases ("plugins" vs "../plugins", "." vs
    "../plugins") all resolve to this repo's plugins/ tree from any CWD the
    golden capture used; the port takes repo_root/plugins once.

Self-test: `python3 py/editor_forms.py` deep-compares every golden in
tests/golden_http/ for these routes, prints the first divergence path per
mismatch, and exits nonzero on drift.
"""

from __future__ import annotations

import json
import os

__all__ = ["forms", "form_spec", "kinds"]

# ─────────────────────────────────────────────────────────────────────────
# /v1/forms — verbatim port of the C literal (src/server.cpp:7087-7113).
# Fixed operator surface ("operator card law" 2026-09-01); not derivable
# from plugins/ data (see module docstring). Order field and sidebar_key
# are editor chrome, not model/engine names.
# ─────────────────────────────────────────────────────────────────────────
_FORMS_TABLE = {
    "image-gen": {"label": "Image", "genre": "image", "order": 1,
                  "plugin": "comfyui", "sidebar_key": "image",
                  "default_service": "krea-2", "hidden": False},
    "image-edit": {"label": "Image Edit", "genre": "image", "order": 2,
                   "plugin": "comfyui", "sidebar_key": "image-edit",
                   "default_service": "img-edit", "hidden": False},
    "tts": {"label": "Speech", "genre": "audio", "order": 3,
            "plugin": "audio-cpp", "sidebar_key": "audio",
            "default_service": "qwen3-tts", "hidden": False},
    "voice-lock": {"label": "Voice Lock", "genre": "audio", "order": 4,
                   "plugin": "audio-cpp", "sidebar_key": "audio",
                   "default_service": "qwen3_tts_voicedesign", "hidden": False},
    "music": {"label": "Music", "genre": "audio", "order": 5,
              "plugin": "audio-cpp", "sidebar_key": "audio",
              "default_service": "music3", "hidden": False},
    "h3-timeline": {"label": "H3 Timeline", "genre": "video", "order": 6,
                    "plugin": "comfyui", "sidebar_key": "video",
                    "default_service": "h3-timeline", "hidden": False},
}

# The C's ALLOWED_CARDS gate (src/server.cpp:7585-7588) is exactly the keys
# of the /v1/forms surface — derive it, keeping one closed surface.
_ALLOWED_CARDS = frozenset(_FORMS_TABLE)

# Binary card field types excluded from the flat `fields` list but kept in
# `schema_groups` (src/server.cpp:7857-7859).
_BINARY_FIELD_TYPES = frozenset(("image", "audio", "video", "file"))

# Mod bag types that become modifier KINDS (src/server.cpp:8343).
_MOD_KIND_TYPES = frozenset(("loras", "controlnet"))

# Enhance-recipe blocks read from a model unit's inference.yaml
# (src/server.cpp:7991-7992).
_RECIPE_KEYS = ("prompt_upscale:", "lyrics_upscale:")


def forms(repo_root):
    """GET /v1/forms -> {"forms": {card_id: {...}, ...}} (fixed surface)."""
    return {"forms": {k: dict(v) for k, v in _FORMS_TABLE.items()}}


# ─────────────────────────────────────────────────────────────────────────
# C line-buffer helpers (src/server.cpp:7190-7234)
# ─────────────────────────────────────────────────────────────────────────

def _cut_comment(line):
    """cs_cut_comment: cut a trailing '  # comment' not inside quotes."""
    inq = False
    for i, ch in enumerate(line):
        if ch == '"':
            inq = not inq
        elif ch == '#' and not inq and i > 0 and line[i - 1] in ' \t':
            return line[:i]
    return line


def _clean(s):
    """cs_clean: trim spaces/tabs/CR/LF both ends, strip ONE quote pair."""
    s = s.strip(' \t\r\n')
    if len(s) >= 2 and ((s[0] == '"' and s[-1] == '"') or
                        (s[0] == "'" and s[-1] == "'")):
        s = s[1:-1]
    return s


def _is_number(s):
    """cs_is_number: optional sign, digits, at most one dot."""
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


def _num(s):
    """Parse a cs_is_number-validated token the way the C emits it raw:
    ints stay ints ('-1' -> -1), decimals stay floats ('12.0' -> 12.0)."""
    return float(s) if '.' in s else int(s)


def _norm(s):
    """cs_norm: '_' -> '-' for family-id matching."""
    return s.replace('_', '-')


def _g(v):
    """C '%g' emission of a double: integral values print without '.0'."""
    return int(v) if float(v).is_integer() else float(v)


def _scandir(path):
    """Names in raw readdir order (C opendir/readdir); missing dir -> []."""
    try:
        with os.scandir(path) as it:
            return [e.name for e in it]
    except OSError:
        return []


def _fgets(path):
    """Yield lines the way C fgets does: each keeps its '\\n' (CR preserved,
    no universal-newline translation). Missing file yields nothing."""
    try:
        with open(path, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            lines = f.readlines()
    except OSError:
        return []
    return lines


def _read_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            return f.read()
    except OSError:
        return None


# ─────────────────────────────────────────────────────────────────────────
# Model catalog — port of src/catalog.c scan + parse
# (only the fields the three routes consume: id/genre/label, defaults,
#  engine.plugin, and the model unit's inference.yaml path)
# ─────────────────────────────────────────────────────────────────────────

def _ykv(s, key):
    """catalog.c ykv: value after 'key:' at the start of a stripped line."""
    if not s.startswith(key):
        return None
    if s[len(key)] != ':':
        return None
    return s[len(key) + 1:].lstrip(' ')


def _strip_quotes(v):
    """ystrdup-style: strip ONE surrounding quote pair."""
    if len(v) >= 2 and ((v[0] == '"' and v[-1] == '"') or
                        (v[0] == "'" and v[-1] == "'")):
        return v[1:-1]
    return v


def _parse_model_yaml(text):
    """parse_model_yaml (src/catalog.c:143-322), restricted to the keys the
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


def _scan_catalog(repo_root):
    """scan_models (src/catalog.c:533-579): owner -> genre -> model dir,
    raw readdir order; catalog_find_model is first-match on family id."""
    plugins = os.path.join(repo_root, "plugins")
    models = []
    for owner in _scandir(plugins):
        if owner.startswith('.'):
            continue
        models_dir = os.path.join(plugins, owner, "models")
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
                yaml = _read_file(os.path.join(model_dir, "model.yaml"))
                if yaml is None:
                    continue
                row = _parse_model_yaml(yaml)
                if row is None:
                    continue
                ipath = os.path.join(model_dir, "inference.yaml")
                row["inference_path"] = ipath if os.path.isfile(ipath) else None
                models.append(row)
    return models


def _find_model(models, family_id):
    for row in models:
        if row["id"] == family_id:
            return row
    return None


# ─────────────────────────────────────────────────────────────────────────
# card.yaml discovery + identity — port of the cs_* helpers
# (src/server.cpp:7237-7611)
# ─────────────────────────────────────────────────────────────────────────

def _card_identity_path(yp):
    """cs_card_identity_path: the card: block's id/label/icon/description.
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


def _families_match(yp, model):
    """cs_families_match: EXACT normalized match of any '- id:' row."""
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


def _first_family_is(yp, model):
    """cs_first_family_is: the FIRST '- id:' row decides."""
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


def _find_card_yaml(repo_root, model):
    """cs_find_card_yaml (src/server.cpp:7533-7611): the sole-owner card.
    Skip cards without a parameters: block; gate on the /v1/forms card ids
    (the C's ALLOWED_CARDS); families must match, first-family match wins
    outright, first any-family match is the fallback candidate."""
    plugins = os.path.join(repo_root, "plugins")
    candidate = None
    for owner in _scandir(plugins):
        if owner.startswith('.'):
            continue
        cdir = os.path.join(plugins, owner, "cards")
        if not os.path.isdir(cdir):
            continue
        for card in _scandir(cdir):
            if card.startswith('.'):
                continue
            yp = os.path.join(cdir, card, "card.yaml")
            if not os.path.isfile(yp):
                continue
            has_params = False
            for pl in _fgets(yp):
                if pl.startswith('parameters:'):  # strncmp(pl, "parameters:", 11)
                    has_params = True
                    break
            if not has_params:
                continue
            cid = _card_identity_path(yp)["id"]
            if cid not in _ALLOWED_CARDS:
                continue
            if not _families_match(yp, model):
                continue
            if _first_family_is(yp, model):
                return yp
            if candidate is None:
                candidate = yp
    return candidate


def _option_list(repo_root, list_name):
    """cs_option_list: samplers/schedulers from the ONE vocabulary file
    plugins/melite-core/models/field_options.yaml (path is the C's own)."""
    yp = os.path.join(repo_root, "plugins", "agent", "dsh", "melite-core", "models",
                      "field_options.yaml")
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
# card.yaml parameters: — port of card_spec_json (src/server.cpp:7729-7921)
# ─────────────────────────────────────────────────────────────────────────

_FIELD_ATTRS = ("type", "label", "group", "zone", "tooltip", "placeholder",
                "visible_when", "families")
_FIELD_NUMS = ("order", "width", "columns", "min", "max", "step")


def _new_field(name):
    f = {"name": name, "defval": "", "options": "", "required": False}
    for a in _FIELD_ATTRS:
        f[a] = ""
    for n in _FIELD_NUMS:
        f[n] = 0.0
        f["has_" + n] = False
    return f


def _parse_card_parameters(yp):
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


def _atof(s):
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


def _emit_field(f, with_group, options_vocab):
    """cs_emit_field: key order follows the C emission."""
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


def _families_keep(field, nmodel):
    """card_spec_json families filter: a field naming families this model
    is not in (normalized exact) drops."""
    raw = field["families"]
    if not raw:
        return True
    toks = raw.replace('[', ' ').replace(']', ' ').replace(',', ' ').split()
    return any(_norm(t) == nmodel for t in toks)


def _card_spec(repo_root, model):
    """card_spec_json: the "form"/"service"/"fields"/"schema_groups" tail,
    or None when no card.yaml covers the model (legacy shape kept)."""
    yp = _find_card_yaml(repo_root, model)
    if yp is None:
        return None
    fields = _parse_card_parameters(yp)
    if not fields:
        return None
    nmodel = _norm(model)
    keep = [f for f in fields if _families_keep(f, nmodel)]

    options_vocab = {
        "samplers": _option_list(repo_root, "samplers"),
        "schedulers": _option_list(repo_root, "schedulers"),
    }

    out = {}
    cid = _card_identity_path(yp)["id"]
    if cid:
        out["form"] = cid
    out["service"] = model

    # flat fields — binary types excluded (schema_groups keeps them)
    out["fields"] = [
        _emit_field(f, True, options_vocab)
        for f in keep if f["type"] not in _BINARY_FIELD_TYPES
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


# ─────────────────────────────────────────────────────────────────────────
# features.modifiers — port of the mods-zone scan (src/server.cpp:8273-8397)
# ─────────────────────────────────────────────────────────────────────────

def _parse_mod_entries(yp):
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


def _modifiers(repo_root, model):
    """ModifierKind objects: bag-typed mods fields become kinds; scalar
    knobs that FOLLOW a kind ride it as ModifierFields (src/server.cpp:
    8341-8391). Scalars before any kind are dropped."""
    yp = _find_card_yaml(repo_root, model)
    if yp is None:
        return []
    mes = _parse_mod_entries(yp)
    out = []
    for e, me in enumerate(mes):
        t = me["type"]
        if t not in _MOD_KIND_TYPES:
            continue
        kind = "lora" if t == "loras" else "controlnet"
        fields = []
        for s in range(e + 1, len(mes)):
            st = mes[s]["type"]
            if st in _MOD_KIND_TYPES:
                break
            f = {"name": mes[s]["name"], "type": "float",
                 "label": mes[s]["label"] or mes[s]["name"]}
            if mes[s]["has_min"]:
                f["min"] = _g(mes[s]["min"])
            if mes[s]["has_max"]:
                f["max"] = _g(mes[s]["max"])
            if mes[s]["has_step"]:
                f["step"] = _g(mes[s]["step"])
            fields.append(f)
        out.append({
            "kind": kind,
            "label": me["label"] or me["name"],
            "cardinality": "list",
            "param_key": me["name"],
            "fields": fields,
            "options": [],
            "options_scanned": True,
            "upload_dir": "models/loras" if kind == "lora"
            else "models/controlnet",
            "declaration_only": True,
        })
    return out


# ─────────────────────────────────────────────────────────────────────────
# enhance recipes — port of the inference.yaml block readers
# (src/server.cpp:7989-8102)
# ─────────────────────────────────────────────────────────────────────────

def _recipe_scan(path, key):
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


def _recipes(path):
    if path is None:
        return "", ""
    return (_recipe_scan(path, _RECIPE_KEYS[0]),
            _recipe_scan(path, _RECIPE_KEYS[1]))


def _recipes_fallback(repo_root, model_id):
    """The id-named-dir probe (src/server.cpp:8041-8102): when the catalog
    row's own inference.yaml gave no recipes, probe every owner for
    models/<genre>/<model-id>/inference.yaml. Per genre the FIRST owner
    holding the file wins; its blocks OVERWRITE the accumulated ones key
    by key (a key absent from the file leaves the prior block intact —
    C snprintf writes blocks[bi] from offset 0 only when the key is found
    with content), and the genre loop stops once a prompt recipe lands.
    This is how a row whose unit lacks inference.yaml (music3) borrows
    recipes from another owner's id-named unit."""
    plugins = os.path.join(repo_root, "plugins")
    recipe, lrecipe = "", ""
    for genre in ("image", "video", "audio", "text"):
        found = None
        for owner in _scandir(plugins):
            if owner.startswith('.'):
                continue
            cand = os.path.join(plugins, owner, "models", genre, model_id,
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


def _card_declares_prompt(yp):
    """The has_prompt probe (src/server.cpp:8406-8430) — FAITHFUL BUG PORT:
    unlike card_spec_json this scan does NOT skip blank lines; any blank or
    top-level line between `parameters:` and the `prompt:` field resets the
    section flag, so the card then 'declares no prompt' and the route
    nullifies the prompt enhance recipe."""
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
# variants — port of the variants/ matrix walk (src/server.cpp:8138-8264)
# ─────────────────────────────────────────────────────────────────────────

def _parse_variant(path):
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


def _variants(repo_root, model):
    """Variant rows + deduped Quant cells from <model-dir>/variants/, in
    readdir order; the model dir is dirname(inference_path) — no
    inference.yaml means no variants (src/server.cpp:8145-8159)."""
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
            # how many variants list it (src/server.cpp:8230-8245)
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
            })
    return rows


# ─────────────────────────────────────────────────────────────────────────
# GET /v1/form-spec — port of handle_form_spec (src/server.cpp:7923-8452)
# ─────────────────────────────────────────────────────────────────────────

# Minimal lane/family display spec (src/server.cpp:7963-7966): display wire
# only — the run door's no-fallback law is untouched.
_MINIMAL_LANE_SPEC = {"defaults": {}, "variants": [], "features": {},
                      "enhance_prompts": ""}

_SAFE_ID = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")


def _lane_probe(repo_root, model):
    """Unknown-catalog-name fallback (src/server.cpp:7946-7977): a
    pipelines/<name>/pipeline.yaml on disk, or any pipelines/*/pipeline.yaml
    containing 'type: <name>', gets the minimal spec."""
    if os.path.exists(os.path.join(repo_root, "pipelines", model,
                                   "pipeline.yaml")):
        return True
    pdir = os.path.join(repo_root, "pipelines")
    needle = "type: " + model
    for name in _scandir(pdir):
        pyp = os.path.join(pdir, name, "pipeline.yaml")
        if os.path.isfile(pyp) and needle in (_read_file(pyp) or ""):
            return True
    return False


def form_spec(repo_root, model_id):
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
        safe = len(model) < 64 and all(c in _SAFE_ID for c in model)
        if safe and _lane_probe(repo_root, model):
            return 200, dict(_MINIMAL_LANE_SPEC)
        return 404, {"error": "model not found"}

    # enhance recipes: the model unit's inference.yaml blocks, verbatim;
    # id-named-dir fallback probe when both came up empty
    recipe, lrecipe = _recipes(row["inference_path"])
    if not recipe and not lrecipe:
        recipe, lrecipe = _recipes_fallback(repo_root, row["id"])

    # the spec is branded by the CARD's ability label; the model stays an
    # internal route (src/server.cpp:8108-8116)
    card_yp = _find_card_yaml(repo_root, row["id"])
    card_label = _card_identity_path(card_yp)["label"] if card_yp else ""
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
        "genre": row["genre"] or "",
        "engine": row["engine_plugin"] or "",
        "defaults": {k: v for k, v in row["defaults"]},
        "variants": _variants(repo_root, row),
        "features": {
            "modifiers": _modifiers(repo_root, row["id"]),
            "variant_groups": {"Variant": {"label": "Variant"},
                               "Quant": {"label": "Quant"}},
        },
        "enhance_prompts": {"prompt": prompt_emit, "lyrics": lrecipe},
    }

    frag = _card_spec(repo_root, row["id"])
    if frag:
        spec.update(frag)
    return 200, spec


# ─────────────────────────────────────────────────────────────────────────
# GET /v1/kinds — port of handle_kinds (src/server.cpp:4934-4992)
# ─────────────────────────────────────────────────────────────────────────

def _parse_kind_file(path, plugin):
    """kinds_parse_file: line-prefixed behavior flags; 'true' anywhere in
    the value counts (C strstr). File stem IS the kind string."""
    runnable = executable = form_spec_ = compound = opens = False
    tone = "default"
    icon = ""
    try:
        with open(path, 'r', encoding='utf-8', errors='surrogateescape',
                  newline='') as f:
            lines = f.readlines()
    except OSError:
        return None
    for raw in lines:
        line = raw.split('\n', 1)[0]  # C: cut at first \n
        if line.startswith("runnable:"):
            runnable = "true" in line
        elif line.startswith("executable:"):
            executable = "true" in line
        elif line.startswith("formSpec:"):
            form_spec_ = "true" in line
        elif line.startswith("compound:"):
            compound = "true" in line
        elif line.startswith("opensStudio:"):
            opens = "true" in line
        elif line.startswith("badgeTone:"):
            toks = line[len("badgeTone:"):].split()
            if toks:
                tone = toks[0][:31]
        elif line.startswith("icon:"):
            toks = line[len("icon:"):].split()
            if toks:
                icon = toks[0][:63]
    stem = os.path.basename(path)
    kind = stem[:95].rsplit('.', 1)[0] if '.' in stem else stem[:95]
    entry = {
        "kind": kind,
        "runnable": runnable,
        "executable": executable,
        "formSpec": form_spec_,
        "compound": compound,
        "opensStudio": opens,
        "badgeTone": tone,
    }
    if icon:
        entry["icon"] = icon
    entry["plugin"] = plugin
    return entry


def kinds(repo_root):
    """GET /v1/kinds -> {"kinds": [...]}. Sources: the kinds dirs under the
    plugins tree and the repo root's own <entry>/kinds (C roots
    {"../plugins", "."}), raw readdir order throughout."""
    out = []
    for root in (os.path.join(repo_root, "plugins"), repo_root):
        for entry in _scandir(root):
            if entry.startswith('.'):
                continue
            kd = os.path.join(root, entry, "kinds")
            if not os.path.isdir(kd):
                continue
            for name in _scandir(kd):
                if len(name) < 6 or not name.endswith(".yaml"):
                    continue
                parsed = _parse_kind_file(os.path.join(kd, name), entry)
                if parsed is not None:
                    out.append(parsed)
    return {"kinds": out}


# ─────────────────────────────────────────────────────────────────────────
# Self-test — structural JSON parity against the C goldens
# ─────────────────────────────────────────────────────────────────────────

def _first_diff(a, b, path="$"):
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
    if isinstance(a, list) and isinstance(b, list):
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


def _main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(here)
    golden_dir = os.path.join(repo_root, "tests", "golden_http")

    def golden(name):
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

    # refusal shapes (C literals, src/server.cpp:7932-7981)
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

    # lane fallback: a pipelines/<name>/pipeline.yaml lane gets the minimal
    # display spec (shape check against live disk, C src/server.cpp:7958-7967)
    lane = None
    pdir = os.path.join(repo_root, "pipelines")
    for name in sorted(_scandir(pdir)):
        if os.path.isfile(os.path.join(pdir, name, "pipeline.yaml")):
            lane = name
            break
    if lane is not None and _find_model(_scan_catalog(repo_root),
                                        lane) is None:
        status, body = form_spec(repo_root, lane)
        if status == 200 and body == _MINIMAL_LANE_SPEC:
            print("form-spec lane fallback (%s) : PARITY OK (minimal spec)"
                  % lane)
        else:
            print("form-spec lane fallback (%s) : DRIFT — %s %s"
                  % (lane, status, body))
            failures.append(("form-spec:lane", "%s %s" % (status, body)))

    if failures:
        print("\n%d FAILURE(S)" % len(failures))
        return 1
    print("\nALL PARITY CHECKS GREEN")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
