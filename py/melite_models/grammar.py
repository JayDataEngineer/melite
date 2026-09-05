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
     sha256 hex, numeric types, lora strengths. The OFFERING state is
     a construction law too (see _boot_validate): a class is OFFERED
     (form = "form_generate", the editor form it boards) or UNOFFERED
     (unoffered = True, no card arm yet) — exactly one, never neither,
     never both, never form = ''.
  2. The SERVED row (model_row(), disk probes included) validates at
     scan time — a broken unit refuses before the wire. `form` is
     REQUIRED on the wire row: the 2026-08-11 catalog contract (the
     Zustand validator + pydantic, "impossible to fail this") makes
     every served model routable and renderable; an unoffered family
     serves no row at all (the scan skips it).

Cross-validation with cards (the feature the yaml cascade cannot
express): validate_against_cards() checks every model default against
the owning card's field domains — names, enums ($samplers), min/max.
"""

from __future__ import annotations

import re

from enum import Enum
from typing import TYPE_CHECKING, TypedDict

from pydantic import (BaseModel, Field, HttpUrl, ValidationError,
                      field_validator, model_validator)

from .presets import CharacterPreset

if TYPE_CHECKING:
    from melite_cards import ActionCard, Mod

# The served-row shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None



_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_SAFE_ID_RE = re.compile(r"[a-z0-9_-]+")


class ModelError(Exception):
    """Loud refusal before the wire (the QUEUE LANE LAW shape)."""


# THE ONE genre vocabulary — one set of values, everywhere:
#   model.py genre=, plugin.py genres=, card.ts CardGenre,
#   sidebarGenres.ts, CARD_GENRES, models/<genre>/ + action_cards/<genre>/
#   directory names. No aliases, no fallbacks.
#   'text' is the returning LLM lane (sidebar renders it today).
#   'creature' was folded into '3d' (2026-09-04) — anycreature boards the
#   3d lane. 'ai_generated' is a TAG, not a genre.
# The closed set IS the Genre enum (above) — rung 6: no restated
# coordinates.

# ── closed-vocabulary enums (PYTHON SHAPE LAW rung 3: a closed set
#    is a TYPE, not a str a wall validates) ─────────────────────────

class Genre(str, Enum):
    """The model's family genre — closed (the 7 lanes the estate
    supports). A typo refuses construction; a string assignment on a
    Model subclass is coerced to the enum in the metaclass so model.py
    files that still state `genre = "image"` keep working, but a wall
    pins the type"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    MOTION = "motion"
    THREED = "3d"
    OTHER = "other"
    TEXT = "text"
    NONE = ""                    # no genre (utilities, future lanes)


class ClipType(str, Enum):
    """The CLIPLoader `type` arg — closed across the comfyui lanes
    (the supported clip-loader families). None for audiocore lanes
    that don't use CLIPLoader. A typo refuses construction."""
    KREA2 = "krea2"
    LUMINA2 = "lumina2"
    QWEN_IMAGE = "qwen_image"
    IDEOGRAM4 = "ideogram4"
    STABLE_DIFFUSION = "stable_diffusion"
    WAN = "wan"
    MINIMAX = "minimax"


class LatentNode(str, Enum):
    """The t2i lane's empty-latent constructors — one per family
    latent shape (closed vocabulary, rung 3: a typo refuses
    construction, never a runtime node mismatch)."""
    SD3 = "EmptySD3LatentImage"       # 16-channel (krea-2, z-image)
    PLAIN = "EmptyLatentImage"        # SD latents (anima)
    FLUX2 = "EmptyFlux2LatentImage"   # flux2 latent (ideogram4)


class LaneInputs(BaseModel, frozen=True):
    '''Weight facts a card renderer reads (MODELS DON'T RENDER — cards
    do; the model supplies data). `unet` states the checkpoint basename
    when no cell artifact owns it; when the artifact DOES (krea-2),
    `unet_variant`/`unet_quant` name the cell and the basename is
    DERIVED — never restated beside the artifact (rung 6).

The AUDIO lanes (A-cluster, 2026-09-04) load through the audiocore
node pack instead of ComfyUI loaders: `family` + `model_path` are
THEIR weight facts (LoadAudiocoreModel's two required rows) — a
third source shape, mutually exclusive with the loader facts.

The IMAGE family variance (2026-09-05 boarding): `sampling_shift`
wraps the unet in ModelSamplingAuraFlow when nonzero (z-image's
flow shift; 0 = no wrapper, krea-2 byte-stable), `latent_node`
picks the empty-latent constructor, and `unet_unconditional`
states the SECOND unet for dual-guided families (ideogram4) —
a stated-once basename like `unet`, no artifact row beside it.'''
    model_config = {"extra": "forbid"}
    unet: str = ""
    unet_variant: str = ""
    unet_quant: str = ""
    text_encoder: str = ""
    # closed vocabulary (rung 3): a typo refuses construction. None
    # for audiocore lanes that don't load through CLIPLoader
    clip_type: ClipType | None = None
    vae: str = ""
    family: str = ""        # audiocore load family (qwen3_tts, ...)
    model_path: str = ""    # audiocore weights (basename or abs)
    checkpoint: str = ""    # a CheckpointLoader row (mask lanes: SAM3
                            # rides a checkpoint beside the RT-DETR unet)
    # the TRELLIS.2 lane (cluster C, 2026-09-04): five loaders, one
    # lane — UNETLoader + TWO VAELoader rows (shape decodes the
    # voxel structure, texture decodes the atlas) + CLIPVisionLoader
    # (dino_v3 conditions) + LoadBackgroundRemovalModel (birefnet).
    # `vae` is the STRUCTURE vae (the stage that owns the mesh);
    # texture_vae the atlas decoder. The mask precedent: new loader
    # shapes get typed rows, never stringly side-channels.
    texture_vae: str = ""
    clip_vision: str = ""
    background_removal: str = ""
    sampling_shift: float = 0.0
    latent_node: LatentNode = LatentNode.SD3
    unet_unconditional: str = ""

    @model_validator(mode="after")
    def _one_unet_source(self: "LaneInputs") -> "LaneInputs":
        if self.family:
            if self.unet or self.unet_variant or self.text_encoder \
                    or self.vae or self.checkpoint or self.texture_vae \
                    or self.clip_vision or self.background_removal \
                    or self.unet_unconditional:
                raise ValueError(
                    "lane_inputs: family= is the audiocore source — "
                    "loader facts do not ride beside it")
            if not self.model_path:
                raise ValueError(
                    "lane_inputs: family= needs model_path= (the "
                    "LoadAudiocoreModel rows)")
            return self
        if bool(self.unet) == bool(self.unet_variant):
            raise ValueError(
                "lane_inputs: set exactly one of unet= (the basename), "
                "unet_variant=/unet_quant= (derive from the cell), or "
                "family=/model_path= (the audiocore load)")
        if self.unet_quant and self.unet_quant not in _QUANT_VALUES:
            raise ValueError("lane_inputs: unknown quant %r"
                             % self.unet_quant)
        if self.unet_unconditional and self.sampling_shift:
            raise ValueError(
                "lane_inputs: unet_unconditional= is the dual-guided "
                "(ideogram4) shape — sampling_shift belongs to the "
                "single-unet KSampler families")
        return self





# ── head-setting rows — typed declarations, not honor-system dicts ──


class VariantGroup(BaseModel, frozen=True):
    """A UI selector group (Variant/Quant/…) — rung 1: this is a row."""
    model_config = {"extra": "forbid"}
    id: str
    label: str = ""
    tooltip: str = ""


class GuideSection(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}
    label: str = ""
    body: str = ""
    list: tuple[str, ...] = ()


class PromptGuide(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}
    title: str = ""
    sections: tuple[GuideSection, ...] = ()


class Provision(BaseModel, frozen=True):
    """A pre-artifact download block (the audio lane's weight packs)."""
    model_config = {"extra": "forbid"}
    name: str
    url: HttpUrl
    folder: str = ""
    sha256: str | None = None
    size_bytes: int | None = Field(default=None, gt=0)

    @field_validator("sha256")
    @classmethod
    def _hex(cls: "type[Provision]", v: str | None) -> str | None:
        if v is not None and not _SHA256_RE.match(v):
            raise ValueError("provision sha256 must be 64 lowercase hex")
        return v


class StudioSize(str, Enum):
    """The body frame's size notch (presentation, web-registry §7)."""
    normal = "normal"
    wide = "wide"
    huge = "huge"


class StudioLayout(str, Enum):
    """How the body mounts: studio = full-bleed authoring surface;
    panel = embedded beside the rail."""
    studio = "studio"
    panel = "panel"


class StudioKind(str, Enum):
    """Which body renders the claim (PYTHON SHAPE LAW rung 3: closed
    vocabulary — a typo refuses at construction, never a mystery
    default card at render).
    CUSTOM = a bespoke tenant TSX (body/motion-studio/h3-timeline…);
    ASSEMBLY = the shared generic AssemblyStudio (part-slot rail +
    Stage viewport, @melite-plugin/3d/ui/studios/assembly) — the tenant
    file is a slot-table declaration, not a second implementation."""
    CUSTOM = "custom"
    ASSEMBLY = "assembly"


class Studio(BaseModel, frozen=True):
    """The families-section claim (catalog meta)."""
    model_config = {"extra": "forbid"}
    tenant: str
    owns_params: bool = False
    writes: tuple[str, ...] = ()
    # Which body renders the claim. ASSEMBLY is a COMPILE-TIME
    # contract, enforced below: the generic authors PARTS (slots),
    # never params — an assembly that owns params, or that writes
    # nothing, cannot be constructed.
    kind: StudioKind = StudioKind.CUSTOM

    @model_validator(mode="after")
    def _assembly_contract(self: "Studio") -> "Studio":
        if self.kind is StudioKind.ASSEMBLY:
            if not self.writes:
                raise ValueError(
                    "Studio(kind=assembly) without writes: the generic "
                    "AssemblyStudio authors part slots — declare the "
                    "slot keys in writes (tenant=%r)" % self.tenant)
            if self.owns_params:
                raise ValueError(
                    "Studio(kind=assembly) with owns_params=True: the "
                    "generic never authors params (knobs ride the "
                    "shell) — tenant=%r" % self.tenant)
        return self
    # Presentation notches (web-registry §7 — they ride the data): the
    # shell reads them off the claim instead of hardcoding the frame.
    size: StudioSize = StudioSize.normal
    layout: StudioLayout = StudioLayout.studio


# ── closed vocabularies (PYTHON SHAPE LAW rung 3) ────────────────────
# Quants/dest-roots are closed sets: a typo is a construction refusal,
# not a runtime route mismatch. Extend ONLY when a real tier lands.


class Quant(str, Enum):
    INT8 = "int8"
    FP8 = "fp8"
    BF16 = "bf16"
    F32 = "f32"
    LIGHTNING4 = "lightning4"
    # NATIVE: the tier of a lane with NO weights matrix (preprocessors,
    # transport tools, studios, utilities) — the cell ships no download
    # place because the lane carries no weights. A real tier landing
    # (rung 3: closed vocabularies extend when a real tier lands): the
    # "no weights, no quant" lane is its own tier, not a quantized tier
    # mis-stated. The dropdown shows it truthfully next to the int8 /
    # fp8 / f32 family heads — one uniform shape, every lane covered
    # (the ONE PATTERN, image-edit rework 2026-09-05).
    NATIVE = "native"


_QUANT_VALUES = frozenset(q.value for q in Quant)


class DestRoot(str, Enum):
    """Where provisioning roots an artifact (env-resolved by the
    engine; COMFYUI_ROOT today — widened only by real engines)."""
    COMFYUI = "COMFYUI_ROOT"
    KIMODO = "KIMODO_ROOT"


# ── pydantic row schemas — the SERVED/emitted shapes ─────────────────


class SourceRow(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    type: str = ""
    repo_id: str | None = None
    filename: str | None = None
    # provenance note (e.g. "our own pack (vendor/…)"): declared
    # 2026-09-04 when the dead-rider wall caught anny/model.py passing
    # it into the silent drop — the data was wanted, the row was short
    note: str = ""


class LoraRow(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """A lora catalog row. `source_url` is REQUIRED — the upstream
    download (resolve/ form, HEAD-verifiable), same honesty as a
    CellArtifact. The `user_provided=True` era (rows with no link,
    "the operator just has the files") was a dirty hack and is dead:
    no link, no row."""
    id: str
    filename: str
    source_url: HttpUrl
    label: str = ""
    category: str = ""
    default_strength: float = Field(default=1.0, ge=0.0, le=2.0)


class CellArtifact(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """A matrix cell's downloadable body."""
    source_url: HttpUrl
    size_bytes: int = Field(gt=0)
    sha256: str
    dest_root: DestRoot = DestRoot.COMFYUI
    dest_sub: str = ""
    size_hint_gb: float | None = None
    vram_peak_gb: float | None = None

    @field_validator("sha256")
    @classmethod
    def _hex64(cls: "type[CellArtifact]", v: str) -> str:
        if not _SHA256_RE.match(v):
            raise ValueError("sha256 must be 64 lowercase hex chars")
        return v


class ModelRow(BaseModel, frozen=True):
    """The catalog's served model row. `form` is REQUIRED and non-empty
    (the 2026-08-11 catalog contract: every served model routes and
    renders — the frontend validator refuses a formless row at load,
    and this schema refuses it at construction, which is the only
    place a refusal belongs)."""
    model_config = {"extra": "forbid"}

    id: str
    family: str
    genre: str
    label: str = ""
    description: str = ""
    source: SourceRow = SourceRow()
    defaults: dict = {}
    engine: str = ""
    form: str = Field(min_length=1)
    has_agent: bool | None = None
    has_inference: bool | None = None
    has_rubric: bool | None = None


# ── the cascade rows — frozen instances, not subclasses ──────────────
# (PYTHON SHAPE LAW rung 1: a quant cell is a record, not a type.
# Validation is construction; invalid rows cannot be built.)


class Cell(BaseModel, frozen=True):
    """One (variant × quant) matrix place. A row in the variant's
    `cells` tuple. Either IS a download place (`artifact` present,
    fully validated) or is NOT (None) — all-or-nothing, rung 4."""
    model_config = {"extra": "forbid"}

    quant: Quant
    label: str = ""
    route: str = ""                    # flow route (falls back up)
    engine: str = ""                   # engine override (declarer-wins)
    vram_peak_gb: float | None = Field(default=None, ge=0)
    resolver_defaults: dict = {}       # cascade merge (deepest layer)
    hide_from_dropdown: bool = False
    artifact: CellArtifact | None = None


class Variant(BaseModel, frozen=True):
    """A variant row (turbo/raw/…). `cells` are its quant places in
    declaration order; the wire's quant dedup rides the consumer."""
    model_config = {"extra": "forbid"}

    id: str
    label: str = ""
    hint: str = ""
    group: str = "Variant"
    route: str = ""
    engine: str = ""
    order: int | None = None
    resolver_defaults: dict = {}       # cascade merge data (family ∪ this)
    defaults: dict | None = None       # WIRE variant-row defaults (stayed {})
    cells: tuple[Cell, ...] = ()

    @field_validator("id")
    @classmethod
    def _id_shape(cls: "type[Variant]", v: str) -> str:
        if not _SAFE_ID_RE.fullmatch(v):
            raise ValueError("variant id must be [a-z0-9_-]+ (got %r)" % v)
        return v

    @model_validator(mode="after")
    def _one_cell_per_quant(self: "Variant") -> "Variant":
        quants = [c.quant for c in self.cells]
        dupes = {q for q in quants if quants.count(q) > 1}
        if dupes:
            raise ValueError(
                "variant %r: duplicate quant %s — one cell per tier"
                % (self.id, ", ".join(sorted(str(q) for q in dupes))))
        return self


# ── MODEL ATTRIBUTE ALLOWLIST (2026-09-05) ──────────────────────────────
# The Model declaration surface is CLOSED. Top-level family attrs are read
# with getattr-with-default (resolver_defaults {}, prompt_upscale (), …),
# so a misspelled attr (reslover_defaults, lane_inputz) otherwise falls
# back SILENTLY — author-time garbage in, runtime default out. Every data
# name a family file may declare lives here (enumerated from all 55 model
# files); anything else refuses at IMPORT with the fix-or-extend
# instruction. New Model-level vocabulary is a deliberate grammar change
# (add the name here), never a drive-by spelling.
_MODEL_ATTRS = frozenset({
    "id", "label", "description", "genre", "form", "engine",
    "variants", "defaults", "resolver_defaults", "lane_inputs",
    "card", "card_knobs", "mods", "source", "studio",
    "prompt_upscale", "prompt_guide", "lyrics_upscale",
    "provisions", "provisioning", "variant_groups", "unoffered",
    "loras",
    "architecture", "canvas_default", "loader", "tile",
    "timeout_floor",
    # stroke 3 (2026-09-06): estate character presets — frozen
    # CharacterPreset rows (the ray archetypes live on the anny
    # family; user rows live in the tenant ledger, never here).
    "character_presets",
    # base-body display (2026-09-06): the provision NAME that is the
    # family's neutral mannequin (the studio shows it when the body
    # slot is empty; the base-body door streams it). Empty = the
    # family declares none.
    "base_body",
})


class _ModelNamespace(TypedDict, total=False):
    """The class-body keys _ModelMeta consumes (variants/id) — methods,
    docstrings and the rest ride through to type.__new__ opaquely."""
    variants: tuple[Variant, ...]
    character_presets: tuple[CharacterPreset, ...]
    base_body: str
    id: str


class _ModelMeta(type):
    """Collects `variants` (a tuple of Variant INSTANCES — rung 1) and
    enforces the family laws at class-creation time. No namespace
    scanning, no key-derivation: the class states its rows once."""

    def __new__(mcls: "type[_ModelMeta]", name: str,
                bases: tuple["type[Model]" | type[object], ...],
                ns: _ModelNamespace) -> "type[Model]":
        cls = super().__new__(mcls, name, bases, ns)
        variants = []
        seen = {}
        for base in bases:
            for v in getattr(base, "variants", ()):
                if v.id not in seen:
                    seen[v.id] = v
                    variants.append(v)
        own = ns.get("variants", ())
        if not isinstance(own, tuple):
            raise ModelError(
                "%s.variants must be a tuple of Variant instances" % name)
        for v in own:
            if not isinstance(v, Variant):
                raise ModelError(
                    "%s.variants entries must be Variant instances "
                    "(got %s — cells are rows now, not subclasses)"
                    % (name, type(v).__name__))
            if v.id in seen:
                raise ModelError(
                    "%s: duplicate variant %r" % (name, v.id))
            seen[v.id] = v
            variants.append(v)
        cls.variants = tuple(variants)
        # estate character presets (stroke 3): frozen CharacterPreset
        # rows, inherited like variants (a sub-family re-states the
        # rows it keeps — same merge, same duplicate refusal).
        presets: list[CharacterPreset] = []
        seen_presets = {}
        for base in bases:
            for p in getattr(base, "character_presets", ()):
                if p.id not in seen_presets:
                    seen_presets[p.id] = p
                    presets.append(p)
        own_presets = ns.get("character_presets", ())
        if not isinstance(own_presets, tuple):
            raise ModelError(
                "%s.character_presets must be a tuple of "
                "CharacterPreset instances" % name)
        for p in own_presets:
            if not isinstance(p, CharacterPreset):
                raise ModelError(
                    "%s.character_presets entries must be "
                    "CharacterPreset instances (got %s)"
                    % (name, type(p).__name__))
            if p.id in seen_presets:
                raise ModelError(
                    "%s: duplicate character preset %r" % (name, p.id))
            seen_presets[p.id] = p
            presets.append(p)
        cls.character_presets = tuple(presets)
        # base-body display: a provision NAME (or "" for none),
        # inherited like other scalars. A non-empty name MUST match
        # a declared provision — a studio pointing at an
        # undeclared download place is a construction refusal, not
        # a 404 at card-open.
        base_body = ns.get("base_body", "")
        if not base_body:
            for b in bases:
                base_body = getattr(b, "base_body", "") or ""
                if base_body:
                    break
        if not isinstance(base_body, str):
            raise ModelError(
                "%s.base_body must be a provision name str (got %s)"
                % (name, type(base_body).__name__))
        if base_body and base_body not in {
                p.name for p in
                (getattr(cls, "provisions", None) or ())}:
            raise ModelError(
                "%s.base_body %r names no declared provision — the "
                "neutral mannequin needs a download place "
                "(provisions)" % (name, base_body))
        cls.base_body = base_body
        # route → (variant, cell): every matrix address, one map (the
        # C served ?model=<route>; the class flip lost it — structural
        # again)
        routes = {}
        for v in cls.variants:
            for c in v.cells:
                for r in (c.route, v.route, cls.id):
                    if r and r != cls.id:
                        routes.setdefault(r, (v, c))
        cls._routes = routes
        cid = ns.get("id", "")
        if variants and not cid:
            raise ModelError("%s declares variants but no id" % name)
        # ATTRIBUTE ALLOWLIST: unknown data names refuse at import —
        # code (helpers), imports and privates ride free; the incident
        # class is misspelled DATA falling back to grammar defaults.
        for key, value in ns.items():
            if key.startswith("_") or key in _MODEL_ATTRS:
                continue
            if callable(value) or isinstance(value, type) \
                    or isinstance(value, (classmethod, staticmethod,
                                          property)) \
                    or type(value).__name__ == "module":
                continue
            raise ModelError(
                "%s: unknown Model attribute %r — a typo here silently "
                "falls back to the grammar default. Known attributes: "
                "%s. If this is NEW Model-level vocabulary, add it to "
                "_MODEL_ATTRS in py/melite_models/grammar.py; otherwise "
                "fix the spelling" % (name, key, ", ".join(sorted(_MODEL_ATTRS))))
        # boot-loud: declared data validates NOW (layer 1). root=True
        # is the Model base itself — the offering gate is for UNITS
        # (every subclass), never the root declaration surface.
        cls._boot_validate(root=not bases)
        return cls


class Model(metaclass=_ModelMeta):
    """The family head — the one subclass per unit (taxonomy lives
    here; variant/cell DATA lives in `variants` as frozen rows). Dir
    name must equal `id` (naming law 1)."""
    id = ""
    variants = ()             # tuple[Variant] — frozen instance rows
    character_presets = ()    # tuple[CharacterPreset] — estate rows
    base_body = ""            # provision NAME — the neutral mannequin
    tile = ""
    # the genre's TYPE is the validation (rung 3: a typo refuses
    # construction). The metaclass coerces legacy str assignments so
    # model.py files that still state `genre = "image"` keep working
    # until the sweep lands — the type is the gate, the wall pins it.
    genre: Genre = Genre.NONE
    label = ""
    description = ""
    engine = ""               # engine_plugin
    # OFFERING (operator orders 2026-08-11 + 2026-09-05, reconciled
    # 2026-09-05): a model is OFFERED (form = "form_generate" — the
    # editor form it boards; the served row carries it, REQUIRED) or
    # UNOFFERED (unoffered = True — no card arm yet; the scan keeps
    # the class off the served catalog entirely). Exactly one of the
    # two, enforced at class creation below. The form='' stringly
    # hack (the 2026-09-05 cohort: ltx-2-3 et al) shipped keyless
    # rows the frontend contract could only catch at RUNTIME — the
    # construction refusal is the compile-time gate.
    form = None
    unoffered = False
    card = ""
    # MODS ARE DECLARED HERE — the family's own mod set (ActionCardPack
    # classes from melite_cards): `mods = (LorasMod,)`. The card that
    # boards this model absorbs exactly these mod blocks, scoped to
    # this family. Different families declare different sets (z-image's
    # mods are not krea-2's); the card surface derives, never hand-lists.
    mods = ()
    canvas_default = False
    defaults = None           # dict — the family-level defaults
    timeout_floor = None
    loras = ()                # tuple[LoraRow]
    prompt_guide = None       # PromptGuide row — content, free shape
    variant_groups = ()       # tuple[VariantGroup] — UI selector groups
    provisioning = None
    source = None             # {"type", "repo_id", "filename"} — the
                              # catalog row source (url never emitted,
                              # catalog.c:738-752)
    studio = None             # Studio row — the families-section claim
    provisions = ()           # tuple[Provision] — pre-artifact download
                              # blocks (name/url/folder[/sha256/size_bytes])
    lane_inputs = None        # LaneInputs row — weight facts the CARD
                              # renderer reads (models are data; cards
                              # render)
    # Enhance recipes (inference.yaml → python, 2026-09-02).
    # Semicolon-joined rule text; same wire shape the yaml reader produces.
    prompt_upscale = ()
    lyrics_upscale = ()
    card_knobs = ()         # model-level knob map (card/inject/kind/required)

    @classmethod
    def _boot_validate(cls: "type[Model]", root: bool = False) -> None:
        # OFFERING ⊕ UNOFFERED — the construction gate (2026-09-05):
        # exactly one door, named, before any row can exist. This is
        # where form='' dies: an empty-string form manufactured a
        # served row with NO form key (the emitter's truthiness guard
        # silently dropped it) and only the frontend contract caught
        # it, at runtime, in the browser. Never again.
        if not root:
            if not isinstance(cls.unoffered, bool):
                raise ModelError(
                    "%s.unoffered must be a bool (got %r) — the "
                    "offering state is declared, not spelled"
                    % (cls.__name__, cls.unoffered))
            if cls.form is not None and not (
                    isinstance(cls.form, str) and cls.form.strip()):
                raise ModelError(
                    "%s.form = %r — the form='' unoffered hack is "
                    "dead. An offered model names its editor form "
                    "(non-empty string); an unboarded one declares "
                    "unoffered = True and serves no row (offered "
                    "means runnable)" % (cls.__name__, cls.form))
            if cls.unoffered and cls.form:
                raise ModelError(
                    "%s declares form=%r AND unoffered=True — an "
                    "ambiguous request; name exactly one door (QUEUE "
                    "LANE LAW)" % (cls.__name__, cls.form))
            if not cls.form and not cls.unoffered:
                raise ModelError(
                    "%s declares neither form nor unoffered — every "
                    "model states its offering: form = '<editor "
                    "form>' when it boards one, unoffered = True "
                    "until it does" % cls.__name__)
            # CASCADE GATE (2026-09-05, image-edit rework): every model
            # declares its family head → variants → quant cells. A model
            # with `variants = ()` (or no variants assignment at all) is
            # the "rides on defaults" fossil — it served the catalog with
            # no variant/quant surface, the card UI rendered an empty
            # model/variant/quant selector, and the user could not tell
            # which lane they were on. ONE PATTERN, OR COMPILE ERROR:
            # an offered model with no variants is a construction refusal
            # (the whole point of mono-python + pydantic — a declaration
            # that cannot be built cannot ship). The same gate fires for
            # an unoffered stub: the lane's INTENDED cascade is declared
            # even when no card arms it yet, so the day the lane boards
            # its card, the row already carries the truth.
            #
            # The root Model class itself is exempt (the declaration
            # surface); every subclass is the rule.
            if not cls.variants:
                raise ModelError(
                    "%s declares no variants — a Model without the "
                    "family head → variants → quant cells cascade is a "
                    "'rides on defaults' fossil and refuses at "
                    "construction (ONE PATTERN, OR COMPILE ERROR). "
                    "Declare `variants = (Variant(id=..., cells=(Cell("
                    "quant=..., route=..., vram_peak_gb=...),)),)` — "
                    "one row for a single-config lane (NATIVE for "
                    "weightless tools, the true tier for weighted lanes), "
                    "the full matrix for multi-config lanes." % cls.__name__)
        for lora in (cls.loras or ()):
            if not isinstance(lora, LoraRow):
                raise ModelError(
                    "%s: loras must be LoraRow instances (got %s)"
                    % (cls.__name__, type(lora).__name__))
        mods = cls.mods or ()
        if not isinstance(mods, tuple):
            raise ModelError("%s.mods must be a tuple (got %s)"
                             % (cls.__name__, type(mods).__name__))
        if mods:
            from melite_cards import Mod, LorasMod   # the interlock
            for mod in mods:
                if not (isinstance(mod, type) and issubclass(mod, Mod)):
                    raise ModelError(
                        "%s.mods entries must be Mod subclasses "
                        "(got %r)" % (cls.__name__, mod))
                for row in (getattr(mod, "rows", None) or ()):
                    if not isinstance(row, LoraRow):
                        raise ModelError(
                            "%s.mods %s: rows must be LoraRow instances "
                            "(got %s)" % (cls.__name__, mod.__name__,
                                          type(row).__name__))
                for f in getattr(mod, "_fields_", ()):
                    if f.name in (cls.defaults or {}):
                        raise ModelError(
                            "%s.defaults re-declares %r — a mod knob "
                            "(%s) is absorbed from the mod's field "
                            "default, never hand-copied into the model "
                            "dict (one system for mods)"
                            % (cls.__name__, f.name, mod.__name__))
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
        if st is not None and not isinstance(st, Studio):
            raise ModelError(
                "%s.studio must be a Studio row (tenant/owns_params/"
                "writes) — typed declarations, not honor-system dicts"
                % cls.__name__)
        for g in (cls.variant_groups or ()):
            if not isinstance(g, VariantGroup):
                raise ModelError(
                    "%s.variant_groups entries must be VariantGroup rows"
                    % cls.__name__)
        pg = cls.prompt_guide
        if pg is not None and not isinstance(pg, PromptGuide):
            raise ModelError(
                "%s.prompt_guide must be a PromptGuide row" % cls.__name__)
        for pr in (cls.provisions or ()):
            if not isinstance(pr, Provision):
                raise ModelError(
                    "%s.provisions entries must be Provision rows"
                    % cls.__name__)
        if cls.source is not None and not isinstance(cls.source, SourceRow):
            raise ModelError(
                "%s.source must be a SourceRow" % cls.__name__)
        li = cls.lane_inputs
        if li is not None and not isinstance(li, LaneInputs):
            raise ModelError(
                "%s.lane_inputs must be a LaneInputs row (weight facts "
                "for the card renderer — models are data, cards render)"
                % cls.__name__)
        if isinstance(li, LaneInputs) and li.unet_variant:
            v = cls._variant_(li.unet_variant)
            if v is None:
                raise ModelError(
                    "%s.lane_inputs names variant %r which it does not "
                    "declare — the row is dead weight (drift wall)"
                    % (cls.__name__, li.unet_variant))
            cell = cls._cell_(v, li.unet_quant or None)
            if cell is None:
                raise ModelError(
                    "%s.lane_inputs names cell (%s, %s) which variant "
                    "%r does not declare" % (cls.__name__,
                                             li.unet_variant,
                                             li.unet_quant,
                                             li.unet_variant))
            if cell.artifact is None:
                raise ModelError(
                    "%s.lane_inputs derives its unet from cell (%s, %s) "
                    "which carries no artifact — state unet= instead"
                    % (cls.__name__, li.unet_variant, li.unet_quant))
        # GENRE: type IS the gate (rung 3: a `genre = "typo"` line in
        # a model.py would be coerced here; a real `Genre.typo` fails
        # at class-body evaluation). The legacy _GENRE_VALUES wall
        # check is dead with the enum — rung 6, no restated
        # coordinates.
        if isinstance(cls.genre, str) and not isinstance(cls.genre, Genre):
            cls.genre = Genre(cls.genre)
        elif cls.genre is None:
            cls.genre = Genre.NONE
        # variant/cell rows validate AT CONSTRUCTION (pydantic frozen)
        # — the opt-in `if source_url:` artifact walk is dead with the
        # classes (shape law rungs 2/4: no guard remembers to check)

    # ── cascade reads ─────────────────────────────────────────────

    @classmethod
    def merged_defaults(cls: "type[Model]", variant: str | None = None,
                        quant: str | None = None) -> dict[str, str | int | float | bool]:
        """Mods → family → variant → cell, later layers win (the MRO
        walk). The mods layer is ABSORBED, never hand-copied: each
        declared mod's field defaults form the cascade's base — the
        one system for mods (a model dict re-declaring a mod knob is
        the drift the flip killed)."""
        out = {}
        for mod in (cls.mods or ()):
            for f in getattr(mod, "_fields_", ()):
                if f.default is not None and f.default != "":
                    out[f.name] = f.default
        out.update(cls.defaults or {})
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
    def loras_of(cls: "type[Model]") -> tuple[LoraRow, ...]:
        """The lora catalog through the ONE mod system: union of rows
        across every declared LorasMod-flavored mod. (The wire row
        stays [] — catalog.c:177 never parsed lora_catalog — but the
        data now lives governed under mods, boot-validated.)"""
        from melite_cards import LorasMod
        rows = []
        for mod in (cls.mods or ()):
            if issubclass(mod, LorasMod):
                rows.extend(mod.rows or ())
        return tuple(rows)

    @classmethod
    def _variant_(cls: "type[Model]", vid: str) -> Variant | None:
        for v in cls.variants:
            if v.id == vid:
                return v
        return None

    @staticmethod
    def _cell_(variant: Variant, quant: str) -> Cell | None:
        q = Quant(quant)
        for c in variant.cells:
            if c.quant == q:
                return c
        return None

    @classmethod
    def lane_unet_basename(cls: "type[Model]") -> str:
        """The unet checkpoint basename for card renderers: derived
        from the named cell's artifact, or the stated lane_inputs.unet.
        LOUD when the row points at a cell with no artifact."""
        li = cls.lane_inputs
        if li is None:
            return ""
        if li.unet:
            return li.unet
        _v, _e, cell = cls.resolve(li.unet_variant,
                                   li.unet_quant or None)
        if cell is None or cell.artifact is None:
            raise ModelError(
                "%s.lane_inputs points at cell (%s, %s) which carries "
                "no artifact — the unet cannot be derived"
                % (cls.__name__, li.unet_variant, li.unet_quant))
        return str(cell.artifact.source_url).rsplit("/", 1)[-1]

    @classmethod
    def resolve(cls: "type[Model]", variant: str | None = None,
                quant: str | None = None) -> tuple[str, str, Cell | None]:
        """(route, engine, cell) for matrix coordinates — the resolver
        the yaml cascade buried in text scans. Unspecified coordinates
        fall to the FIRST declared variant / cell (the family default —
        krea-2's head body IS turbo/int8)."""
        vcls = cls._variant_(variant) if variant else (
            cls.variants[0] if cls.variants else None)
        ccls = None
        if vcls is not None:
            if quant:
                ccls = cls._cell_(vcls, quant)
            elif vcls.cells:
                ccls = vcls.cells[0]
        route = getattr(ccls, "route", "") or getattr(vcls, "route", "") \
            or getattr(cls, "route", "")
        engine = getattr(ccls, "engine", "") or getattr(vcls, "engine", "") \
            or cls.engine
        return route, engine, ccls


# ── the served-row emitter (the catalog row IS the wire contract) ───


def model_row(cls: type[Model], model_dir: str) -> dict[str, JsonValue]:
    """The catalog row, disk probes included (agent/inference/rubric),
    pydantic-validated — layer 2. `form` rides unconditionally: the
    served-row schema requires it (an unoffered class refuses here —
    the scan skips it before this point, and a direct call on one is
    a bug this refusal names)."""
    import os
    if cls.unoffered:
        raise ModelError(
            "%s is unoffered — it serves no catalog row; the scan "
            "keeps it off the wire until its lane boards (offered "
            "means runnable)" % cls.__name__)
    row = {}
    row["id"] = cls.id
    row["family"] = cls.id
    row["genre"] = cls.genre or ""
    row["label"] = cls.label or ""
    row["description"] = cls.description or ""
    src = cls.source            # SourceRow | None (typed at boot)
    row["source"] = {"type": (src.type if src else "") or ""}
    if src is not None and src.repo_id is not None:
        row["source"]["repo_id"] = src.repo_id
    if src is not None and src.filename is not None:
        row["source"]["filename"] = src.filename
    row["defaults"] = dict(cls.defaults or {})
    row["engine"] = cls.engine or ""
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


def _repo_py_root(path: str) -> str | None:
    """The repo's py/ package root for a file under it (walks up until
    a parent has py/melite_models). The LOADER owns import mechanics —
    model.py files declare, they never sys.path-insert (shape law
    rung 5; the 53 six-ups rituals are deleted)."""
    d = _os.path.dirname(_os.path.abspath(path))
    for _ in range(12):
        cand = _os.path.join(d, "py", "melite_models")
        if _os.path.isdir(cand):
            return _os.path.join(d, "py")
        nxt = _os.path.dirname(d)
        if nxt == d:
            break
        d = nxt
    return None


def load_model_py(path: str, engine: str = "engine") -> type[Model]:
    """Import one model.py → its Model subclass (exactly one per file,
    loud otherwise). Asserts dirname == model id (naming law 1).
    Injects the repo py/ root (loader-owned) and converts pydantic
    construction refusals into the ModelError channel."""
    model_dir = _os.path.dirname(path)
    pyroot = _repo_py_root(path)
    if pyroot and pyroot not in _sys.path:
        _sys.path.insert(0, pyroot)
    modname = "plugin_models.%s.%s" % (engine, _os.path.basename(model_dir))
    if modname in _sys.modules:
        mod = _sys.modules[modname]
        # The cache key is engine+id (genre-blind) — a cache hit from a
        # DIFFERENT path means two declarations claim one modname. That
        # is a lie, not a reuse: refuse loudly (the music-card path bug
        # rode this silence for days — the cache answered for a path the
        # caller never loaded).
        cached_file = _os.path.normpath(
            getattr(mod, "__file__", "") or "")
        if cached_file != _os.path.normpath(path):
            raise ModelError(
                "plugin_models modname %r is cached from %r — refusing "
                "to alias it to %r (two paths, one cache key: the genre "
                "segment belongs in one of them)" % (
                    modname, cached_file, path))
    else:
        spec = importlib.util.spec_from_file_location(modname, path)
        mod = importlib.util.module_from_spec(spec)
        _sys.modules[modname] = mod
        try:
            spec.loader.exec_module(mod)
        except ValidationError as e:
            del _sys.modules[modname]
            raise ModelError("%s: invalid declaration: %s" % (path, e))
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


def has_model_yaml(model_dir: str) -> bool:
    return _os.path.isfile(_os.path.join(model_dir, "model.yaml"))


def load_mod(model_py_path: str, stem: str, class_name: str) -> "type[Mod]":
    """Load a per-family mod subclass from models/<family>/mods/<stem>.py
    under a unique canonical name, returning its <class_name>. Called
    from model.py:

        from melite_models import load_mod
        Loras = load_mod(__file__, "loras", "Loras")
        ...
        mods = (Loras,)

    (load_model_py execs model.py under a file-based spec — plain
    relative imports do not resolve there; this helper is the lane's
    canonical loader, mirroring load_model_py's naming.)"""
    import importlib.util
    model_dir = _os.path.dirname(_os.path.abspath(model_py_path))
    mod_dir = _os.path.join(model_dir, "mods")
    path = _os.path.join(mod_dir, stem + ".py")
    if not _os.path.isfile(path):
        raise ModelError("no mod file %s (expected beside %s)"
                         % (path, model_py_path))
    family = _os.path.basename(model_dir)
    modname = "plugin_model_mods.%s.%s" % (family, stem)
    if modname not in _sys.modules:
        spec = importlib.util.spec_from_file_location(modname, path)
        mod = importlib.util.module_from_spec(spec)
        _sys.modules[modname] = mod
        try:
            spec.loader.exec_module(mod)
        except Exception:
            del _sys.modules[modname]
            raise
    mod = _sys.modules[modname]
    cls = getattr(mod, class_name, None)
    if cls is None:
        raise ModelError("%s declares no class %r" % (path, class_name))
    return cls


def scan_engine_models(repo_root: str) -> dict[str, tuple[str, type[Model]]]:
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


def validate_against_cards(models: dict[str, tuple[str, "type[Model]"]],
                           cards: dict[str, tuple[str, "type[ActionCard]"]],
                           engine_truth: tuple[str, ...] = ()
                           ) -> list[tuple[str, str]]:
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
        if card is None and card_id:
            raise ModelError(
                "model %s: card=%r names no known card — the "
                "migration amnesty is over; a dead card ref is drift, "
                "not a skip" % (cls.id, card_id))
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
