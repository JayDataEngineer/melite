"""Model grammar — the pydantic twin of the cards DSL.

A model unit is a python class; the cascade is INHERITANCE:

    class Krea2(Model):                     # the family head
        id = "krea-2"; genre = "image"
        defaults = dict(steps=8, cfg=1.0)

        class Turbo(Variant):               # variant row
            route = "krea-2"
            class Int8(Cell):               # (turbo, int8) matrix cell
                source_url = "https://..."
                size_bytes = 13492686496

The MRO is the merge order. merged_defaults() walks family → variant
→ cell; no anchors, no duplicated rows, no implicit resolver knowledge.

Two validation layers, both boot-loud:
  1. DECLARED data validates at class creation (pydantic): source URLs,
     sha256 hex, numeric types, lora strengths.
  2. The SERVED row (model_row(), disk probes included) validates at
     scan time — a broken unit refuses before the wire.

Cross-validation with cards (the feature the yaml cascade cannot
express): validate_against_cards() checks every model default against
the owning card's field domains — names, enums ($samplers), min/max.
"""

import re

from pydantic import BaseModel, Field, HttpUrl, ValidationError, field_validator

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class ModelError(Exception):
    """Loud refusal before the wire (the QUEUE LANE LAW shape)."""


# ── pydantic row schemas — the SERVED/emitted shapes ─────────────────


class SourceRow(BaseModel):
    type: str = ""
    repo_id: str | None = None
    filename: str | None = None


class LoraRow(BaseModel):
    id: str
    filename: str
    label: str = ""
    category: str = ""
    default_strength: float = Field(default=1.0, ge=0.0, le=2.0)
    user_provided: bool = False


class CellArtifact(BaseModel):
    """A matrix cell's downloadable body."""
    source_url: HttpUrl
    size_bytes: int = Field(gt=0)
    sha256: str
    dest_root: str = "COMFYUI_ROOT"          # enum widened by engines
    dest_sub: str = ""
    size_hint_gb: float | None = None
    vram_peak_gb: float | None = None

    @field_validator("sha256")
    @classmethod
    def _hex64(cls, v):
        if not _SHA256_RE.match(v):
            raise ValueError("sha256 must be 64 lowercase hex chars")
        return v


class ModelRow(BaseModel):
    """The catalog's served model row (catalog._model_row shape)."""
    model_config = {"extra": "forbid"}

    id: str
    family: str
    genre: str
    label: str = ""
    description: str = ""
    source: SourceRow = SourceRow()
    loras: list = []
    defaults: dict = {}
    engine: str = ""
    form: str | None = None
    has_agent: bool | None = None
    has_inference: bool | None = None
    has_rubric: bool | None = None


# ── authoring bases — nested classes ARE the cascade ────────────────


class Cell:
    """One (variant × quant) matrix place. Declared as a nested class
    inside a Variant; carries the artifact body this place downloads."""
    quant = ""
    label = ""
    route = ""                    # pipeline route this cell resolves to
    engine = ""                   # engine override (declarer-wins shape)
    source_url = ""
    size_bytes = 0
    sha256 = ""
    dest_root = "COMFYUI_ROOT"
    dest_sub = ""
    size_hint_gb = None
    vram_peak_gb = None
    hide_from_dropdown = False
    resolver_defaults = None  # dict — cascade merge data (deepest layer)
    # WIRE overrides — the faithful-bug port: the C's variant parser
    # stops reading quant attrs once `label` is seen, so some served
    # quant rows carry the MODEL route and vram 0 even when the file
    # declares richer data. The class keeps the truth; the wire keeps
    # the bug. Unset → falls back to the true attrs.
    wire_route = ""
    wire_vram = None

    def artifact(self):
        """Validated CellArtifact — refuses at class-creation time via
        the variant's boot check when a source_url is declared."""
        return CellArtifact(
            source_url=self.source_url, size_bytes=self.size_bytes,
            sha256=self.sha256, dest_root=self.dest_root,
            dest_sub=self.dest_sub, size_hint_gb=self.size_hint_gb,
            vram_peak_gb=self.vram_peak_gb)


class _VariantMeta(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        cells = []
        seen = set()
        for base in bases:
            for c in getattr(base, "_cells_", ()):
                if c[0] not in seen:
                    seen.add(c[0])
                    cells.append(c)
        for key, val in ns.items():
            if isinstance(val, type) and issubclass(val, Cell) and val is not Cell:
                if key in seen:
                    raise ModelError(
                        "%s: duplicate cell %r — one declaration per quant"
                        % (name, key))
                val.quant = val.quant or key.lower()
                cells.append((key, val))
                seen.add(key)
        cls._cells_ = tuple(cells)
        return cls


class Variant(metaclass=_VariantMeta):
    """A variant row (turbo/raw/…). Nested Cell classes are its quant
    places, in declaration order."""
    id = ""
    group = "Variant"
    label = ""
    hint = ""
    route = ""
    engine = ""
    order = None
    defaults = None          # dict — the WIRE variant row defaults
                             # (form-spec; stayed {} in the C for every
                             # unit — kept separate so the wire never
                             # leaks resolver data silently)
    resolver_defaults = None # dict — cascade merge data (family ∪ this)

    def merged_defaults(self):
        return dict(self.resolver_defaults or {})


class _ModelMeta(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        variants = []
        seen = set()
        for base in bases:
            for v in getattr(base, "_variants_", ()):
                if v[0] not in seen:
                    seen.add(v[0])
                    variants.append(v)
        for key, val in ns.items():
            if isinstance(val, type) and issubclass(val, Variant) \
                    and val is not Variant:
                if key in seen:
                    raise ModelError(
                        "%s: duplicate variant %r" % (name, key))
                val.id = val.id or key.lower()
                variants.append((key, val))
                seen.add(key)
        cls._variants_ = tuple(variants)
        cid = ns.get("id", "")
        if variants and not cid:
            raise ModelError("%s declares variants but no id" % name)
        # boot-loud: declared data validates NOW (layer 1)
        cls._boot_validate()
        return cls


class Model(metaclass=_ModelMeta):
    """The family head. Dir name must equal `id` (naming law 1)."""
    id = ""
    tile = ""
    genre = ""
    label = ""
    description = ""
    engine = ""               # engine_plugin
    form = None
    card = ""
    canvas_default = False
    defaults = None           # dict — the family-level defaults
    timeout_floor = None
    loras = ()                # tuple[LoraRow]
    prompt_guide = None       # dict — content, free shape
    variant_groups = ()       # tuple of dicts — UI selector groups
    provisioning = None
    source = None             # {"type", "repo_id", "filename"} — the
                              # catalog row source (url never emitted,
                              # catalog.c:738-752)
    studio = None             # {"tenant": str, "owns_params": bool} — the
                              # families-section claim (catalog meta)
    provisions = ()           # tuple of dicts — pre-artifact download
                              # blocks (name/url/folder[/sha256/size_bytes])
    # Enhance recipes (inference.yaml → python, 2026-09-02).
    # Semicolon-joined rule text; same wire shape the yaml reader produces.
    prompt_upscale = ()
    lyrics_upscale = ()
    card_knobs = ()         # model-level knob map (card/inject/kind/required)

    @classmethod
    def _boot_validate(cls):
        for lora in (cls.loras or ()):
            if not isinstance(lora, LoraRow):
                raise ModelError(
                    "%s: loras must be LoraRow instances (got %s)"
                    % (cls.__name__, type(lora).__name__))
        for attr in ("defaults", "provisions"):
            d = getattr(cls, attr, None)
            if attr == "provisions":
                if d is not None and not isinstance(d, (tuple, list)):
                    raise ModelError("%s.provisions must be a sequence"
                                     % cls.__name__)
                continue
            if d is not None and not isinstance(d, dict):
                raise ModelError(
                    "%s.defaults must be a dict (got %s)"
                    % (cls.__name__, type(d).__name__))
        st = cls.studio
        if st is not None and not (isinstance(st, dict)
                                   and "tenant" in st):
            raise ModelError(
                "%s.studio must be {'tenant': str, 'owns_params': bool}"
                % cls.__name__)
        for _key, vcls in getattr(cls, "_variants_", ()):
            for _ckey, ccls in getattr(vcls, "_cells_", ()):
                if getattr(ccls, "source_url", ""):
                    try:
                        ccls().artifact()      # validates url/sha/size
                    except Exception as e:
                        raise ModelError(
                            "%s.%s.%s: invalid artifact: %s"
                            % (cls.__name__, _key, _ckey, e))

    # ── cascade reads ─────────────────────────────────────────────

    @classmethod
    def merged_defaults(cls, variant=None, quant=None):
        """Family → variant → cell, later layers win (the MRO walk)."""
        out = dict(cls.defaults or {})
        if variant:
            vcls = cls._variant_(variant)
            if vcls is None:
                raise ModelError(
                    "%s has no variant %r" % (cls.id, variant))
            out.update(vcls.resolver_defaults or {})
            if quant:
                ccls = cls._cell_(vcls, quant)
                if ccls is not None and getattr(ccls, "resolver_defaults",
                                                None):
                    out.update(ccls.resolver_defaults or {})
        return out

    @classmethod
    def _variant_(cls, vid):
        for _k, v in cls._variants_:
            if v.id == vid:
                return v
        return None

    @staticmethod
    def _cell_(vcls, quant):
        for _k, c in vcls._cells_:
            if c.quant == quant:
                return c
        return None

    @classmethod
    def resolve(cls, variant=None, quant=None):
        """(route, engine, cell) for matrix coordinates — the resolver
        the yaml cascade buried in text scans. Unspecified coordinates
        fall to the FIRST declared variant / cell (the family default —
        krea-2's head body IS turbo/int8)."""
        vcls = cls._variant_(variant) if variant else (
            cls._variants_[0][1] if cls._variants_ else None)
        ccls = None
        if vcls is not None:
            if quant:
                ccls = cls._cell_(vcls, quant)
            elif vcls._cells_:
                ccls = vcls._cells_[0][1]
        route = getattr(ccls, "route", "") or getattr(vcls, "route", "") \
            or getattr(cls, "route", "")
        engine = getattr(ccls, "engine", "") or getattr(vcls, "engine", "") \
            or cls.engine
        return route, engine, ccls


# ── the served-row emitter (parity with catalog._model_row) ─────────


def model_row(cls, model_dir):
    """The catalog row, disk probes included (agent/inference/rubric),
    pydantic-validated — layer 2. Mirrors catalog._model_row key-for-key."""
    import os
    row = {}
    row["id"] = cls.id
    row["family"] = cls.id
    row["genre"] = cls.genre or ""
    row["label"] = cls.label or ""
    row["description"] = cls.description or ""
    src = dict(cls.source or {}) if isinstance(cls.source, dict) else {}
    row["source"] = {"type": src.get("type") or ""}
    if src.get("repo_id") is not None:
        row["source"]["repo_id"] = src["repo_id"]
    if src.get("filename") is not None:
        row["source"]["filename"] = src["filename"]
    row["loras"] = []          # the C never parsed lora_catalog (catalog.c:177)
    row["defaults"] = dict(cls.defaults or {})
    row["engine"] = cls.engine or ""
    if cls.form:
        row["form"] = cls.form
    if os.path.isfile(os.path.join(model_dir, "agents", "AGENT.md")):
        row["has_agent"] = True
    # (2026-09-02) inference.yaml extinct — class carries recipes
    row["has_inference"] = bool(
        getattr(cls, "prompt_upscale", None) or
        getattr(cls, "lyrics_upscale", None))
    row["has_rubric"] = os.path.isfile(
        os.path.join(model_dir, "grading_rubric.yaml"))
    try:
        ModelRow.model_validate(row)
    except ValidationError as e:
        raise ModelError("%s: served row invalid: %s" % (cls.id, e))
    return row


# ── discovery ────────────────────────────────────────────────────────

import importlib.util  # noqa: E402
import os as _os       # noqa: E402
import sys as _sys     # noqa: E402


def load_model_py(path, engine="engine"):
    """Import one model.py → its Model subclass (exactly one per file,
    loud otherwise). Asserts dirname == model id (naming law 1)."""
    model_dir = _os.path.dirname(path)
    modname = "plugin_models.%s.%s" % (engine, _os.path.basename(model_dir))
    if modname in _sys.modules:
        mod = _sys.modules[modname]
    else:
        spec = importlib.util.spec_from_file_location(modname, path)
        mod = importlib.util.module_from_spec(spec)
        _sys.modules[modname] = mod
        try:
            spec.loader.exec_module(mod)
        except Exception:
            del _sys.modules[modname]
            raise
    classes = [v for v in vars(mod).values()
               if isinstance(v, type) and issubclass(v, Model)
               and v is not Model]
    if not classes:
        raise ModelError("%s declares no Model subclass" % path)
    if len(classes) > 1:
        raise ModelError(
            "%s declares %d Model subclasses — exactly one per unit (%s)"
            % (path, len(classes),
               ", ".join(sorted(c.__name__ for c in classes))))
    cls = classes[0]
    dirname = _os.path.basename(model_dir)
    if cls.id != dirname:
        raise ModelError(
            "%s: dir %r != model id %r (naming law: dir name IS the id)"
            % (path, dirname, cls.id))
    return cls


def has_model_yaml(model_dir):
    return _os.path.isfile(_os.path.join(model_dir, "model.yaml"))


def scan_engine_models(repo_root):
    """Every models/<genre>/<id>/model.py under engines/*/, scan order:
    {model_id: (path, class)}. Duplicate ids LOUD."""
    out = {}
    eng_root = _os.path.join(repo_root, "plugins", "engines")
    if not _os.path.isdir(eng_root):
        return out
    for engine in sorted(_os.listdir(eng_root)):
        models_dir = _os.path.join(eng_root, engine, "models")
        if not _os.path.isdir(models_dir):
            continue
        for genre in sorted(_os.listdir(models_dir)):
            gdir = _os.path.join(models_dir, genre)
            if not _os.path.isdir(gdir):
                continue
            for mid in sorted(_os.listdir(gdir)):
                mdir = _os.path.join(gdir, mid)
                p = _os.path.join(mdir, "model.py")
                if not _os.path.isfile(p):
                    continue
                cls = load_model_py(p, engine)
                if cls.id in out:
                    raise ModelError(
                        "model id %r declared by BOTH %s and %s"
                        % (cls.id, out[cls.id][0], p))
                out[cls.id] = (p, cls)
    return out


# ── cross-validation — the killer feature ───────────────────────────


def validate_against_cards(models, cards, engine_truth=()):
    """Model defaults must live inside the owning card's field domains.

    models: {id: Model class}; cards: {card_id: ActionCard class};
    engine_truth: defaults keys the owning ENGINE's compose consumes as
    run truth (e.g. audio-cpp's task/family/cli/model_path/backend) —
    the card never shows them, the engine reads them; each engine
    declares its own (ENGINE_TRUTH_KEYS in its compose, PLUGIN
    ARCHITECTURE LAW: engine knowledge stays engine-owned).
    A model whose `card` names no known card skips (the card surface is
    still migrating); a default naming neither a card field nor engine
    truth, an enum miss, or an out-of-range number REFUSES (boot-loud,
    never a silent 400). Returns the checked pairs for the caller's log."""
    truth = tuple(engine_truth)
    checked = []
    for mid, cls in sorted(models.items()):
        card_id = getattr(cls, "card", "")
        card = cards.get(card_id)
        if card is None:
            continue
        domains = {f.name: f for f in card._fields_}
        for key, val in (cls.defaults or {}).items():
            if key in truth:
                continue
            f = domains.get(key)
            if f is None:
                raise ModelError(
                    "model %s: default %r names no field on card %s"
                    % (mid, key, card_id))
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                lo = getattr(f, "min", None)
                hi = getattr(f, "max", None)
                if (lo is not None and val < lo) or (hi is not None and val > hi):
                    raise ModelError(
                        "model %s: default %s=%s outside card %s field "
                        "bounds [%s, %s]"
                        % (mid, key, val, card_id, lo, hi))
            opts = getattr(f, "options", None)
            if isinstance(opts, list) and opts and isinstance(val, str) \
                    and val not in [str(o) for o in opts]:
                raise ModelError(
                    "model %s: default %s=%r not in card %s options"
                    % (mid, key, val, card_id))
        checked.append((mid, card_id))
    return checked
