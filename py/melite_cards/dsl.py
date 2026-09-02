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

import re

IDENT_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")
_FIELD_NAME_RE = re.compile(r"^[a-z_][a-z0-9_]*$")

TYPE_NAMES = {
    "select": "select", "textarea": "textarea", "text": "text",
    "number": "number", "slider": "slider", "seed": "seed",
    "boolean": "boolean", "image": "image", "audio": "audio",
    "video": "video", "file": "file", "loras": "loras",
    "controlnet": "controlnet",
}

# Binary wire types: dropped from the flat fields list, kept in
# schema_groups (editor_forms._BINARY_FIELD_TYPES — the C's law).
BINARY_FIELD_TYPES = frozenset(("image", "audio", "video", "file"))


class ValidationError(Exception):
    """Loud refusal before the wire — a broken card never serves."""


class VocabRef:
    """$samplers / $schedulers — resolves against the OWNING engine's
    field_options.yaml at serialize time (never a hand-copied list)."""

    __slots__ = ("name",)

    def __init__(self, name):
        if not (isinstance(name, str) and name.startswith("$")):
            raise ValidationError(
                "VocabRef name must start with '$' (got %r)" % (name,))
        self.name = name

    def resolve(self, options_vocab):
        key = self.name[1:]
        if key not in options_vocab:
            raise ValidationError(
                "unresolved vocabulary ref %r — the owning engine's "
                "field_options.yaml has no '%s:' list" % (self.name, key))
        return options_vocab[key]

    def __repr__(self):
        return "VocabRef(%r)" % (self.name,)


class Field:
    """One wire field. Direct use carries a free-form `type`; prefer the
    typed subclasses below (they pin the type string)."""

    TYPE = None  # subclasses pin

    def __init__(self, *, label="", group="", zone="", order=None,
                 width=None, columns=None, min=None, max=None, step=None,
                 default=None, required=False, placeholder="", tooltip="",
                 visible_when="", options=None, families=(), type=None):
        self.name = None          # set by the metaclass
        self.type = TYPE_NAMES.get(type or self.TYPE, type or self.TYPE)
        if not self.type:
            raise ValidationError(
                "Field needs a type — use a typed subclass or type=...")
        self.label = label
        self.group = group
        self.zone = zone
        self.order = order
        self.width = width
        self.columns = columns
        self.min = min
        self.max = max
        self.step = step
        self.default = default
        self.required = required
        self.placeholder = placeholder
        self.tooltip = tooltip
        self.visible_when = visible_when
        self.options = options
        self.families = tuple(families) if isinstance(families, str) \
            else tuple(families or ())
        self._validate()

    def _validate(self):
        if self.min is not None and self.max is not None \
                and self.min > self.max:
            raise ValidationError(
                "field %r: min %s > max %s" % (self.name, self.min, self.max))
        if self.step is not None and self.step <= 0:
            raise ValidationError(
                "field %r: step %s must be > 0" % (self.name, self.step))
        if self.default is not None and self.default != "" \
                and self.min is not None and isinstance(self.default, (int, float)) \
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

    def families_keep(self, nmodel):
        """The yaml families filter: naming families the model is not in
        drops the field. Empty families = serves every model."""
        if not self.families:
            return True
        return any(_norm(f) == nmodel for f in self.families)

    def emit(self, with_group, options_vocab):
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


def _norm(s):
    """The C's normalization: non-alnum → '-', lowercase."""
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def _g(v):
    """C '%g': integral values print without '.0'."""
    return int(v) if float(v).is_integer() else float(v)


def _num_or_str(v):
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


def _parse_options_str(field_name, raw):
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


class _CardMeta(type):
    """Collects Field attributes in DECLARATION order (the wire's field
    order law) and runs card-level validation at class creation — a
    broken card fails at import, before the gateway ever serves it."""

    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        fields = []
        seen = set()
        for base in bases:
            for f in getattr(base, "_fields_", ()):
                if f.name not in seen:
                    seen.add(f.name)
                    fields.append(f)
        for key, val in ns.items():
            if isinstance(val, Field):
                if not _FIELD_NAME_RE.match(key):
                    raise ValidationError(
                        "%s: field name %r must be a lowercase identifier"
                        % (name, key))
                if key in seen:
                    raise ValidationError(
                        "%s: duplicate field %r — one declaration per name"
                        % (name, key))
                val.name = key
                val._validate()  # re-run with the name bound
                seen.add(key)
                fields.append(val)
        cls._fields_ = tuple(fields)
        cid = ns.get("id", "")
        if fields and not cid:
            raise ValidationError(
                "%s declares fields but no card id" % name)
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
    def families_of(cls):
        """Model families this card covers (the yaml `families:` rows).
        Subclasses declare as a tuple; order matters (first-family
        match wins the card outright)."""
        return tuple(getattr(cls, "families", ()))

    @classmethod
    def declares_prompt(cls):
        """The _card_declares_prompt probe's class equivalent: does the
        surface carry a prompt field? (enhance recipe advertisement)."""
        return any(f.name == "prompt" for f in cls._fields_)

    @classmethod
    def mod_entries(cls):
        """The mods-zone tail (loras/controlnet kinds + their trailing
        scalar knobs), in declaration order — the _modifiers port."""
        return list(cls._fields_)
