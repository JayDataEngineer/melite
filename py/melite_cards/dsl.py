"""Field descriptors + ActionCard metaclass.

A card is a class: flat typed attributes, one per wire field. The wire
grammar (recovered from the yaml surface + _emit_field port):

  type      select | textarea | text | number | slider | seed | boolean
            | image | audio | video | file | loras | controlnet | <free>
  label, group, zone          strings
  order, width, columns       ints (emitted ONLY when set)
  min, max, step              numbers (emitted ONLY when set)
  default                     inline default — "" suppresses emission,
                              numeric strings emit as numbers
  required                    True emits, False omits
  placeholder, tooltip        strings
  visible_when                the wire's expression string, verbatim
  options                     VocabRef("$samplers"/"$schedulers") |
                              inline list | JSON string
  families                    tuple — the field serves only these models

Declaration order IS field order (the yaml parser's law). schema_groups
emit in first-seen group order; the group label is the capitalized id;
zone defaults to "params".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, ClassVar, TypedDict

if TYPE_CHECKING:
    from melite_models import Model

# The wire-fragment shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


class _CardNamespace(TypedDict, total=False):
    """The class-body keys _CardMeta consumes (id/models/families/pack) —
    Field members, methods and docstrings ride through to
    type.__new__ opaquely."""
    id: str
    models: tuple[type[Model], ...]
    families: tuple[str, ...]
    pack: str

IDENT_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")
_FIELD_NAME_RE = re.compile(r"^[a-z_][a-z0-9_]*$")

TYPE_NAMES = {
    "select": "select", "textarea": "textarea", "text": "text",
    "number": "number", "slider": "slider", "seed": "seed",
    "boolean": "boolean", "image": "image", "audio": "audio",
    "video": "video", "file": "file", "loras": "loras",
    "controlnet": "controlnet",
}


class ValidationError(Exception):
    """Loud refusal before the wire — a broken card never serves."""


@dataclass(frozen=True)
class VocabRef:
    """$samplers / $schedulers — resolves against the OWNING engine's
    field_options.yaml at serialize time (never a hand-copied list).
    Frozen row (shape law rung 2): invalid names refuse at construction."""

    name: str

    def __post_init__(self) -> None:
        if not (isinstance(self.name, str) and self.name.startswith("$")):
            raise ValidationError(
                "VocabRef name must start with '$' (got %r)" % (self.name,))

    def resolve(self, options_vocab: dict[str, list[str]]) -> list[str]:
        key = self.name[1:]
        if key not in options_vocab:
            raise ValidationError(
                "unresolved vocabulary ref %r — the owning engine's "
                "field_options.yaml has no '%s:' list" % (self.name, key))
        return options_vocab[key]


@dataclass(frozen=True, kw_only=True)
class Field:
    """One wire field — a frozen row (shape law rungs 1-2). Direct use
    carries a free-form `type`; prefer the typed subclasses below (they
    pin the type string). `name` is derived ONCE by _CardMeta from the
    declaring attribute (never restated in the declaration)."""

    TYPE: ClassVar[str] = None       # subclasses pin

    label: str = ""
    group: str = ""
    zone: str = ""
    order: int | None = None
    width: int | None = None
    columns: int | None = None
    min: float | int | None = None
    max: float | int | None = None
    step: float | None = None
    default: str | int | float | bool | None = None
    required: bool = False
    placeholder: str = ""
    tooltip: str = ""
    visible_when: str = ""
    options: VocabRef | list[str] | tuple[str, ...] | str | None = None
    families: tuple[str, ...] = ()
    type: str | None = None
    name: str | None = None          # set once by _CardMeta

    def __post_init__(self) -> None:
        if isinstance(self.families, str):
            object.__setattr__(self, "families", (self.families,))
        object.__setattr__(self, "type",
                           TYPE_NAMES.get(self.type or self.TYPE,
                                          self.type or self.TYPE))
        if not self.type:
            raise ValidationError(
                "Field needs a type — use a typed subclass or type=...")
        self._validate()

    def _validate(self) -> None:
        if self.min is not None and self.max is not None \
                and self.min > self.max:
            raise ValidationError(
                "field %r: min %s > max %s" % (self.name, self.min, self.max))
        if self.step is not None and self.step <= 0:
            raise ValidationError(
                "field %r: step %s must be > 0" % (self.name, self.step))
        if self.default is not None and self.default != "" \
                and self.min is not None and self.max is not None \
                and isinstance(self.default, (int, float)) \
                and not (self.min <= self.default <= self.max):
            raise ValidationError(
                "field %r: default %s outside [%s, %s]"
                % (self.name, self.default, self.min, self.max))
        if self.options is not None and not (
                isinstance(self.options, (VocabRef, list, tuple, str))):
            raise ValidationError(
                "field %r: options must be VocabRef | list | JSON str, got %r"
                % (self.name, type(self.options).__name__))

    # -- wire emission (the _emit_field key order, verbatim) -------------

    def families_keep(self, nmodel: str) -> bool:
        """The yaml families filter: naming families the model is not in
        drops the field. Empty families = serves every model."""
        if not self.families:
            return True
        return any(_norm(f) == nmodel for f in self.families)

    def emit(self, with_group: bool,
           options_vocab: dict[str, list[str]]) -> dict[str, JsonValue]:
        o = {"name": self.name}
        if self.type:
            o["type"] = self.type
        if self.label:
            o["label"] = self.label
        if with_group and self.group:
            o["group"] = self.group
        for attr in ("order", "width", "columns", "min", "max", "step"):
            v = getattr(self, attr)
            if v is not None:
                o[attr] = _g(v)
        if self.required:
            o["required"] = True
        if self.default is not None and self.default != "":
            o["default"] = _num_or_str(self.default)
        if self.placeholder:
            o["placeholder"] = self.placeholder
        if self.tooltip:
            o["tooltip"] = self.tooltip
        if self.visible_when:
            o["visible_when"] = self.visible_when
        if self.options is not None and self.options != "":
            if isinstance(self.options, VocabRef):
                o["options"] = self.options.resolve(options_vocab)
            elif isinstance(self.options, str):
                o["options"] = _parse_options_str(self.name, self.options)
            else:
                o["options"] = list(self.options)
        return o


class Select(Field):
    TYPE = "select"


class Textarea(Field):
    TYPE = "textarea"


class Text(Field):
    TYPE = "text"


class Number(Field):
    TYPE = "number"


class Slider(Field):
    TYPE = "slider"


class Seed(Field):
    TYPE = "seed"


class Boolean(Field):
    TYPE = "boolean"


class Image(Field):
    TYPE = "image"


class Audio(Field):
    TYPE = "audio"


class Video(Field):
    TYPE = "video"


class File(Field):
    TYPE = "file"


class Loras(Field):
    TYPE = "loras"


class ControlNet(Field):
    TYPE = "controlnet"


def _norm(s: str | None) -> str:
    """The C's normalization: non-alnum → '-', lowercase."""
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def _g(v: int | float) -> int | float:
    """C '%g': integral values print without '.0'."""
    return int(v) if float(v).is_integer() else float(v)


def _num_or_str(v: str | int | float | bool) -> str | int | float | bool:
    """Inline defaults — the yaml defval path verbatim (editor_forms
    _num): '42' → 42, '1.0' → 1.0. NO %g collapse on defaults (a
    declared 1.0 serves 1.0, like the yaml wire; min/max/step DO %g)."""
    if isinstance(v, bool):
        return v
    if isinstance(v, float):
        return v
    if isinstance(v, int):
        return v
    s = str(v)
    if re.fullmatch(r"[+-]?\d+", s):
        return int(s)
    if re.fullmatch(r"[+-]?\d*\.\d+", s):
        return float(s)
    return s


def _parse_options_str(field_name: str, raw: str) -> list[str]:
    """Inline JSON ('["negative", "positive"]') or a bare comma list."""
    import json
    if raw.startswith("["):
        try:
            return json.loads(raw)
        except ValueError as e:
            raise ValidationError(
                "field %r: options %r is not valid JSON: %s"
                % (field_name, raw, e))
    raise ValidationError(
        "field %r: options string %r must be inline JSON (block-style "
        "lists are a yaml artifact — use a python list)"
        % (field_name, raw))


def _validate_verb(name: str, ns: _CardNamespace) -> None:
    """The SubAction contract, refused at import (a broken verb never
    serves): id + label name it; engines carry ≥1 runnable flow;
    writes names the card fields a run may hydrate (non-empty — the
    wall pins ⊆ card fields); requires is extension ids. A verb is
    never a card (no id=cid) and never a pack."""
    vid = ns.get("id", "")
    if not (isinstance(vid, str) and vid and IDENT_RE.match(vid)):
        raise ValidationError(
            "%s: a verb needs a legal id (got %r)" % (name, vid))
    if not ns.get("label", ""):
        raise ValidationError(
            "%s: a verb needs a label (the chip text)" % name)
    engines = ns.get("engines", ())
    if not isinstance(engines, tuple) or not engines:
        raise ValidationError(
            "%s: a verb needs engines=(VerbEngine, ...) — at least one "
            "engine choice" % name)
    seen_e = set()
    runnable = False
    for e in engines:
        if not isinstance(e, VerbEngine):
            raise ValidationError(
                "%s: engines entries must be VerbEngine rows (got %r)"
                % (name, e))
        if e.id in seen_e:
            raise ValidationError(
                "%s: duplicate engine id %r" % (name, e.id))
        seen_e.add(e.id)
        runnable = runnable or e.flow is not None
    if not runnable:
        raise ValidationError(
            "%s: a verb needs ≥1 runnable engine (a flow template) — "
            "all-refusal verbs advertise a dead button" % name)
    writes = ns.get("writes", ())
    if not isinstance(writes, tuple) or not writes or not all(
            isinstance(w, str) and w and IDENT_RE.match(w)
            for w in writes):
        raise ValidationError(
            "%s: writes must be a non-empty tuple of card field names "
            "(got %r)" % (name, writes))
    requires = ns.get("requires", ())
    if not isinstance(requires, tuple) or not all(
            isinstance(r, str) and r for r in requires):
        raise ValidationError(
            "%s: requires must be a tuple of extension ids (got %r)"
            % (name, requires))
    if ns.get("pack", ""):
        raise ValidationError(
            "%s: a verb never carries a pack (verbs mount by id, packs "
            "merge field flavors)" % name)


def _absorb_models(name: str, cid: str, models: tuple[type[Model], ...],
                   fields: list[Field], seen: set[str]
                   ) -> tuple[list[Field], set[str],
                              tuple[tuple[type[SubActionMod],
                                          tuple[str, ...]], ...]]:
    """The interlock's engine: board Model classes → derive the mods
    surface. MODS ARE MODEL-LEVEL DECLARATIONS (Model.mods tuples of
    ActionCardPack classes); the card never hand-lists mod fields —
    it boards models and their mods ride through, each scoped to
    exactly the families that declared them. Loud refusals: a boarded
    model not claiming this card back, a non-pack mod, a field name
    two mods fight over."""
    from melite_models import Model
    if not models:
        raise ValidationError(
            "%s: models= must board at least one Model class" % name)
    for m in models:
        if not (isinstance(m, type) and issubclass(m, Model)):
            raise ValidationError(
                "%s: models= entries must be Model classes (got %r)"
                % (name, m))
        if m.card != cid:
            raise ValidationError(
                "%s boards model %r whose card=%r does not claim this "
                "card back (%r) — the cross-validation hook is the "
                "model's to declare" % (name, m.id, m.card, cid))
    # Mods key by CAPABILITY (pack), not by exact class: several
    # families may board their own flavor of the same mod (img-edit's
    # four families each declare a mods/lanpaint.py flavor — the
    # krea-2 loras pattern). Same-pack flavors MERGE: one surface,
    # scoped to every family that declared it. Flavors that diverge
    # on a field's shape are a LOUD refusal — one declaration per
    # name means one SHAPE per name too (pick a shape, share it).
    mod_scope = {}       # pack -> (mod class, [family ids declaring it])
    verb_scope = {}      # verb id -> (verb class, [family ids])
    for m in models:
        for mod in getattr(m, "mods", ()) or ():
            if not (isinstance(mod, type)
                    and issubclass(mod, ActionCardPack)):
                raise ValidationError(
                    "model %r declares mod %r — mods must be "
                    "ActionCardPack classes" % (m.id, mod))
            if getattr(mod, "_is_verb_", False):
                # SUB-ACTION: mounts by verb id, fields NEVER union
                # (zone-law rule 2 — verbs own their knobs).
                if mod.id in verb_scope:
                    first, fams = verb_scope[mod.id]
                    if first is not mod:
                        raise ValidationError(
                            "%s: two verbs claim id %r (%s vs %s) — "
                            "one verb id means one verb class"
                            % (name, mod.id, first.__name__,
                               mod.__name__))
                    fams.append(m.id)
                else:
                    verb_scope[mod.id] = (mod, [m.id])
                continue
            pack = getattr(mod, "pack", "") or mod.__name__
            if pack in mod_scope:
                first, fams = mod_scope[pack]
                _assert_flavors_agree(name, first, mod)
                fams.append(m.id)
            else:
                mod_scope[pack] = (mod, [m.id])
    out = list(fields)
    for _pack, (mod, fams) in mod_scope.items():
        for f in mod._fields_:
            if f.name in seen:
                raise ValidationError(
                    "%s: mod %s re-declares field %r — one declaration "
                    "per name across card and mods"
                    % (name, mod.__name__, f.name))
            fc = replace(f, families=tuple(fams))
            seen.add(f.name)
            out.append(fc)
    verbs = tuple((mod, tuple(fams))
                  for _vid, (mod, fams) in verb_scope.items())
    return out, seen, verbs


def _field_sig(f: Field) -> tuple[tuple[str, str], ...]:
    """A field's declaration shape, name/families aside (the merge
    key for same-pack flavors)."""
    return tuple(sorted((k, repr(v)) for k, v in vars(f).items()
                        if k not in ("name", "families")))


def _assert_flavors_agree(name: str, first: type[ActionCardPack],
                          other: type[ActionCardPack]) -> None:
    fi = {f.name: _field_sig(f) for f in first._fields_}
    oi = {f.name: _field_sig(f) for f in other._fields_}
    for nm in sorted(set(fi) & set(oi)):
        if fi[nm] != oi[nm]:
            raise ValidationError(
                "%s: mod flavors %s and %s diverge on field %r — "
                "same-pack flavors must share one field shape"
                % (name, first.__name__, other.__name__, nm))
    if set(fi) != set(oi):
        raise ValidationError(
            "%s: mod flavors %s and %s declare different fields "
            "(%s vs %s) — same-pack flavors must share one surface"
            % (name, first.__name__, other.__name__,
               sorted(fi), sorted(oi)))


class _CardMeta(type):
    """Collects Field attributes in DECLARATION order (the wire's field
    order law) and runs card-level validation at class creation — a
    broken card fails at import, before the gateway ever serves it.

    Field order: OWN declarations first, then inherited bases left to
    right — mod fields tail the card's core surface, matching the
    served order law. Absorption: a card declaring
    `models = (ModelClass, ...)` boards those model classes. MODS ARE
    DECLARED AT THE MODEL LEVEL — each Model carries
    `mods = (SomeMod, ...)` (a mod = an ActionCardPack field block),
    and the metaclass UNIONS the boarded models' mods into the card
    surface, each mod's fields scoped to exactly the families whose
    Model declared them (z-image boards different mods than krea-2 —
    that is the point). Card classes absorb model classes; model
    classes are designed to be absorbed — the interlock."""

    def __new__(mcls: type[_CardMeta], name: str,
                bases: tuple[type[ActionCard] | type[object], ...],
                ns: _CardNamespace) -> type[ActionCard] | type[Mod]:
        cls = super().__new__(mcls, name, bases, ns)
        cid = ns.get("id", "")
        is_verb = any(getattr(b, "_is_verb_", False) for b in bases)
        fields = []
        seen = set()
        own = {key: val for key, val in ns.items()
               if isinstance(val, Field)}
        for key, val in own.items():
            if not _FIELD_NAME_RE.match(key):
                raise ValidationError(
                    "%s: field name %r must be a lowercase identifier"
                    % (name, key))
            object.__setattr__(val, "name", key)
            val._validate()  # re-run with the name bound
            seen.add(key)
            fields.append(val)
        for base in bases:
            for f in getattr(base, "_fields_", ()):
                if f.name not in seen:
                    seen.add(f.name)
                    fields.append(f)
        # -- absorption: the mods arrive THROUGH the boarded models ------
        models = ns.get("models", None)
        own_verbs: tuple[tuple[type[SubActionMod], tuple[str, ...]], ...] = ()
        if models is not None:
            fields, seen, own_verbs = _absorb_models(name, cid, models,
                                                     fields, seen)
            if "families" in ns:
                raise ValidationError(
                    "%s declares BOTH models= and families= — models is "
                    "the truth; families derive from them" % name)
            cls.families = tuple(m.id for m in models)
        cls._fields_ = tuple(fields)
        # mounted verbs: own mounts win; inherited mounts ride along
        # (a layout subclass keeps its parent's verbs); two different
        # classes claiming one verb id is a refusal, not a shadow.
        verbs: dict[str, tuple[type[SubActionMod], tuple[str, ...]]] = {
            vcls.id: (vcls, vfams) for vcls, vfams in own_verbs}
        for base in bases:
            for vcls, vfams in getattr(base, "_verbs_", ()):
                if vcls.id in verbs:
                    if verbs[vcls.id][0] is not vcls:
                        raise ValidationError(
                            "%s: two verbs claim id %r (%s vs %s) — "
                            "one verb id means one verb class"
                            % (name, vcls.id,
                               verbs[vcls.id][0].__name__, vcls.__name__))
                else:
                    verbs[vcls.id] = (vcls, vfams)
        cls._verbs_ = tuple(verbs.values())
        pack = ns.get("pack", "")
        if pack and cid:
            raise ValidationError(
                "%s: a pack (%r) never carries a card id — packs are "
                "mod blocks a MODEL declares in its mods" % (name, pack))
        if pack and not fields:
            raise ValidationError(
                "%s: pack %r declares no fields — a pack is a field "
                "block, an empty one is dead machinery" % (name, pack))
        # PHANTOM PACK: a LorasMod flavor with zero rows advertises the
        # LoRA control (the field rides the card) while /v1/loras would
        # serve an empty list — the picker renders "nothing installed"
        # over a declared capability (the ltx-2-3 lesson, mod-shaped:
        # advertised surface must be servable surface). The base
        # LorasMod itself (rows=()) is the schema parent and passes —
        # only DECLARING flavors (direct subclasses) must carry rows.
        if pack and not cid and bases and \
                getattr(bases[0], "__name__", "") == "LorasMod" and \
                not ns.get("rows", ()):
            raise ValidationError(
                "%s: a LorasMod flavor with zero rows is a phantom "
                "capability — the LoRA control would render over an "
                "empty /v1/loras pack; declare LoraRow rows or drop "
                "the mod" % name)
        if fields and not cid and not pack and not is_verb:
            raise ValidationError(
                "%s declares fields but no card id" % name)
        if is_verb:
            _validate_verb(name, ns)
        if cid and not IDENT_RE.match(cid):
            raise ValidationError(
                "%s: card id %r is not a legal identifier" % (name, cid))
        groups = []
        for f in fields:
            if f.group and f.group not in groups:
                groups.append(f.group)
        cls._groups_ = tuple(groups)
        # PRESENTATION NOTCH vocabulary — loud at import, not a mystery
        # at render. A typo'd notch is a card that silently renders the
        # default chrome while its author believes they declared huge.
        size = ns.get("size", getattr(cls, "size", "default"))
        if size not in ("default", "huge"):
            raise ValidationError(
                "%s.size must be 'default' | 'huge' (got %r)"
                % (name, size))
        layout = ns.get("layout", getattr(cls, "layout", "form"))
        if layout not in ("form", "studio"):
            raise ValidationError(
                "%s.layout must be 'form' | 'studio' (got %r)"
                % (name, layout))
        return cls


class ActionCard(metaclass=_CardMeta):
    """Base class. Author it flat:

        class ImageGenCard(ActionCard):
            id = "image-gen"
            label = "Image"
            description = "Text-to-image generation"
            genre = "image"
            icon = "image"
            ability = {"default_family": "krea-2"}
            prompt = Textarea(label="Prompt", group="prompt",
                              default="", required=True)
            steps  = Number(label="Steps", group="sampling",
                            min=1, max=100, step=1)

    Class attrs (identity — card.yaml's living half, ported 2026-09-02;
    card.yaml is EXTINCT: id/label/description/genre/icon/api/ability/
    requires/principles/skills live HERE and only here):
      id           the card id (wire "form" value; /v1/forms gate)
      label        the card's ability label (spec branding)
      description  the cards[] description
      genre        image | audio | video | 3d | ...
      icon         capabilities-tile icon (served when non-empty)
      api          the API gate — False cards never serve (catalog.c:517)
      ability      {"default_family": str} — the capability-tile marker;
                   absent = no tile
      requires     tuple of engine extension ids (compose-time gate)
      principles   tuple of served principle strings
      skills       tuple of (id, label) pairs — card-local skills
      size         PRESENTATION NOTCH — "default" | "huge". huge = the
                   fullscreen card (the h3 timeline). The BASE owns the
                   default; a card declares ONLY the deviation.
      layout       PRESENTATION NOTCH — "form" | "studio". form = the
                   standard fill-in, image preview on top; studio = an
                   interactive body tenant (mask, timeline). The BASE
                   owns the default; declare only the deviation.
    """

    id = ""
    label = ""
    description = ""
    genre = ""
    icon = ""
    api = False
    ability = None
    requires = ()
    principles = ()
    skills = ()
    # Notch defaults — the system provides; cards state exceptions only.
    size = "default"
    layout = "form"

    @classmethod
    def families_of(cls: type[ActionCard]) -> tuple[str, ...]:
        """Model families this card covers (the yaml `families:` rows).
        Subclasses declare as a tuple; order matters (first-family
        match wins the card outright)."""
        return tuple(getattr(cls, "families", ()))

    @classmethod
    def declares_prompt(cls: type[ActionCard]) -> bool:
        """The _card_declares_prompt probe's class equivalent: does the
        surface carry a prompt field? (enhance recipe advertisement)."""
        return any(f.name == "prompt" for f in cls._fields_)

    @classmethod
    def mod_entries(cls: type[ActionCard]) -> list[Field]:
        """The mods-zone tail (loras/controlnet kinds + their trailing
        scalar knobs), in declaration order — the _modifiers port."""
        return list(cls._fields_)


# ── MOD BLOCKS — the menu a MODEL declares in its `mods` tuple ─────────
#
# MODS ARE DECLARED AT THE MODEL LEVEL: a family's Model class carries
# `mods = (LanPaintMod,)` — its OWN set, different families different
# sets (z-image ≠ krea-2). A card boarding that model absorbs the
# declared mods, each scoped to exactly the declaring families. A
# block here that no model declares simply never surfaces — the menu
# is capability grammar, not served surface. BEHAVIOR rides
# SubActionMod: same mounting, but its fields never join the card
# surface — the verb mounts, its knobs stay its own.


class Mod(metaclass=_CardMeta):
    """THE single parent of every mod — LorasMod, LanPaintMod,
    ControlNetMod and every per-family flavor (models/<family>/mods/)
    subclass THIS one class: one system for mods. Never a card: no
    id, never served alone; the fields ride a card THROUGH its
    boarded models. `pack` names the capability; field `default`s
    are the mod's baseline tuning (merged_defaults absorbs them as
    the cascade's base layer — no model hand-copies mod knobs);
    `rows` carries the mod's catalog data (LoraRow for loras).
    Subclass to shape a family's flavor of a mod."""
    pack = ""
    rows = ()


# backcompat alias — the pre-Mod name
ActionCardPack = Mod


# ── SUB-ACTION VERBS — family-scoped BEHAVIOR (design
# docs/design/anny-evolution.md §3: "family-scoped, mountable,
# behavior-carrying card units" — the headline pattern of the anny
# evolution; anny is consumer #1, never the specification).
#
# A SubActionMod is a behavior-bearing Mod: field block + verb + lane
# fragment + result writes. It mounts EXACTLY like any mod (a family
# declares it in Model.mods; per-family visibility rides the same
# machinery) with ONE carve-out: its FIELDS NEVER JOIN the card
# surface (zone-law rule 2 — verbs own their knobs; they ride the
# verb's own invocation doc, the card's schema gate stays closed).
# Absorption records the verb in cls._verbs_ instead of unioning its
# fields; a verb id claimed by two different classes on one card is
# a loud refusal.
#
# The engine vocabulary is ROWS, not strings (shape law rung 3): each
# VerbEngine names an engine choice with EITHER a flow template
# (runnable today) OR a refusal (unavailable — the remediation the UI
# speaks INSTEAD of the button, never a silent downgrade). Exactly
# one of the two (rung 4); ≥1 runnable engine per verb.

@dataclass(frozen=True, kw_only=True)
class VerbEngine:
    """One engine choice of a verb (e.g. regress | commercial | refine)."""
    id: str
    flow: str | None = None
    refusal: str = ""

    def __post_init__(self) -> None:
        if not (isinstance(self.id, str) and IDENT_RE.match(self.id)):
            raise ValidationError(
                "VerbEngine id %r is not a legal identifier" % (self.id,))
        if (self.flow is None) == (not self.refusal):
            raise ValidationError(
                "VerbEngine %r: exactly one of flow | refusal — a "
                "runnable engine names its flow template, an unavailable "
                "one carries the remediation" % (self.id,))
        if self.flow is not None and not IDENT_RE.match(self.flow):
            raise ValidationError(
                "VerbEngine %r: flow %r is not a legal flow id"
                % (self.id, self.flow))


class SubActionMod(Mod):
    """THE SubAction contract. Declare per family in models/<family>/
    mods/; the family boards it in Model.mods. `id` is the verb id
    (the renderer keys on it); `label` the chip text; `writes` the
    card fields a run may hydrate; `requires` the extension ids (the
    SAME gate as card requires). Field attributes are the verb's OWN
    knob block — never card fields, never emitted on the card form."""
    _is_verb_ = True
    id = ""
    label = ""
    engines: tuple[VerbEngine, ...] = ()
    writes: tuple[str, ...] = ()
    requires: tuple[str, ...] = ()


class LorasMod(Mod):
    """The LoRA stack mod. `rows` (LoraRow tuple, from melite_models)
    is the mod's catalog data — a family with loras subclasses this in
    its own models/<family>/mods/ and declares the subclass (krea-2:
    the Raw-variant training loras, applied on Turbo)."""
    pack = "loras"
    rows = ()
    loras = Loras(label='LoRAs', group='loras_controlnet', zone='mods',
                  order=0)


class ControlNetMod(Mod):
    """The ControlNet stack mod — boarded by families provisioning
    controlnet models. No model declares it yet; the entry waits in
    the menu until one truthfully does."""
    pack = "controlnet"
    controlnet = ControlNet(label='ControlNet', group='loras_controlnet',
                            zone='mods', order=1)
    controlnet_strength_floor = Slider(
        label='ControlNet Strength Floor', default=0.0,
        group='loras_controlnet', zone='mods', order=2, width=1,
        min=0, max=1, step=0.05,
        tooltip='Minimum strength any ControlNet in the stack may apply '
                'at. Entries below this are clamped UP (with a log '
                'line). 0.0 = no floor. Raise this when stacking many '
                'weak ControlNets that cost VRAM without visual '
                'benefit.')


class MaskMod(Mod):
    """The generic masking component — standalone AND attached
    (operator order, 2026-09-04). Owns the mask slot, how a region
    mask is honored, and the host-side prep chain (grow/feather/
    threshold/invert — one mask system; the knobs used to live
    inside LanPaintMod). STANDALONE: a family boards it alone for
    its own region semantics. ATTACHED: lanpaint families board it
    beside LanPaintMod — the mask feeds the inpaint flow (the old
    lanpaint_mask slot WAS this mask). Mods bring up their own form
    section, so the UI composes the same way the backend does — no
    special casing on either side. Most runs never mask: every
    field defaults to off/absent."""
    pack = "mask"
    input_mask = Image(label='Region Mask', group='mask', zone='mods',
        order=0,
        tooltip='RGBA PNG whose alpha channel marks the region. Standalone: '
                'region semantics for this lane. Alongside lanpaint: the '
                'inpaint region — present with input_image, the builder '
                'switches to the lanpaint sampler.')
    mask_mode = Select(label='Region Mode', group='mask', zone='mods',
        order=1, width=1, default='auto',
        options=['auto', 'crop_stitch', 'full_frame'],
        tooltip='How the mask is honored: auto (the lane\'s own region '
                'ControlNet if its weights are present, else crop+stitch), '
                'crop_stitch (crop to the mask + context, work the crop, '
                'composite back — pixels outside the mask never change), '
                'full_frame (legacy whole-image pass; unmasked regions '
                'may drift).')
    mask_context_pad = Slider(label='Context Padding', group='mask',
        zone='mods', order=2, width=1, min=0, max=256, step=8, default=64,
        tooltip='Pixels of surrounding context kept in the crop '
                '(crop_stitch mode). More context = more coherence; '
                '64 is the sweet spot.')
    mask_grow = Slider(label='Grow / Shrink', group='mask', zone='mods',
        order=3, width=1, min=-32, max=32, step=1, default=8,
        tooltip='Expand (+) or shrink (−) the region by an exact pixel '
                'disk before the run. Applied host-side.')
    mask_feather = Slider(label='Feather', group='mask', zone='mods',
        order=4, width=1, min=0, max=32, step=1, default=8,
        tooltip='Gaussian falloff the composite blends through — kills '
                'the pasted-on rectangle edge.')
    mask_threshold = Slider(label='Re-threshold', group='mask',
        zone='mods', order=5, width=1, min=0, max=1, step=0.05, default=0,
        tooltip='Re-binarize the feathered mask at this level. '
                '0 = keep the soft falloff.')
    mask_invert = Boolean(label='Invert', group='mask', zone='mods',
        order=6, width=1, default=False,
        tooltip='Work OUTSIDE the painted region instead.')



class QvoiceMod(Mod):
    """The qvoice input mod — surfaces exactly when a QwenTTS family
    is selected (operator order, 2026-09-04: 'a mod for qvoice
    input, that triggers in qwenTTS model showing up'). A .qvoice /
    .voice file is a pre-computed speaker embedding — the
    voice-lock card exports them; the TTS card consumes them for
    consistent character voices. Fields default off: most runs use
    the stock preset voice."""
    pack = "qvoice"
    qvoice = File(label='Voice (.qvoice)', group='qvoice', zone='mods',
        order=0,
        tooltip='Pre-computed speaker embedding (.qvoice/.voice — the '
        'voice-lock card exports these). Present = synthesize with '
        'THIS voice instead of the preset one.')
    voice_pca_strengths = Textarea(label='PCA Steering', group='qvoice',
        zone='mods', order=1,
        tooltip='JSON knobs over the embedding\'s principal components, '
        'e.g. {"pca_pc1.dir": 0.5} — subtle voice direction without '
        're-designing the persona.')


class LanPaintMod(Mod):
    """The LanPaint inpaint mod — input_image + a mask (the generic
    MaskMod, boarded beside this one) switch the builder to the
    lanpaint sampler. The mask slot and its host-side prep chain
    live in MaskMod now: attached composition, not lanpaint
    internals. Outpaint pads ride here (canvas expansion is part of
    the inpaint flow)."""
    pack = "lanpaint"
    input_image = Image(label='Image', group='lanpaint', order=-1)
    lanpaint_enabled = Boolean(label='Force LanPaint', group='lanpaint',
                               order=1, default=False,
                               visible_when='input_image != null')
    lanpaint_num_steps = Number(label='Num Steps', group='lanpaint',
                                order=2, width=1, min=1, max=100, step=1, default=20,
                                visible_when='lanpaint_enabled == true')
    lanpaint_step_size = Slider(label='Step Size', group='lanpaint',
                                order=3, width=1, min=0.1, max=2, step=0.1, default=1.0,
                                visible_when='lanpaint_enabled == true')
    lanpaint_lambda = Slider(label='Lambda', group='lanpaint', order=4,
                             width=1, min=0, max=2, step=0.05, default=0.5,
                             visible_when='lanpaint_enabled == true')
    lanpaint_beta = Slider(label='Beta', group='lanpaint', order=5,
                           width=1, min=0, max=2, step=0.05, default=0.5,
                           visible_when='lanpaint_enabled == true')
    lanpaint_friction = Slider(label='Friction', group='lanpaint', order=6,
                               width=1, min=0, max=2, step=0.05,
                               default=0.5,
                               visible_when='lanpaint_enabled == true')
    lanpaint_prompt_mode = Select(label='Prompt Mode', group='lanpaint',
                                  order=7, width=1, default='negative',
                                  visible_when='lanpaint_enabled == true',
                                  options=["negative", "positive"])
    outpaint_top = Slider(label='Expand Top', group='lanpaint', order=8,
                          width=1, min=0, max=512, step=8, default=0,
                          visible_when='input_image != null')
    outpaint_right = Slider(label='Expand Right', group='lanpaint',
                            order=9, width=1, min=0, max=512, step=8, default=0,
                            visible_when='input_image != null')
    outpaint_bottom = Slider(label='Expand Bottom', group='lanpaint',
                             order=10, width=1, min=0, max=512, step=8, default=0,
                             visible_when='input_image != null')
    outpaint_left = Slider(label='Expand Left', group='lanpaint', order=11,
                           width=1, min=0, max=512, step=8, default=0,
                           visible_when='input_image != null')
    outpaint_overlap = Slider(label='Overlap', group='lanpaint', order=8,
                              width=1, min=0, max=64, step=1, default=16,
                              visible_when='input_image != null')
