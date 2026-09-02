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


def _absorb_models(name, cid, models, fields, seen):
    """The interlock's engine: board Model classes → derive the mods
    surface. MODS ARE MODEL-LEVEL DECLARATIONS (Model.mods tuples of
    ActionCardPack classes); the card never hand-lists mod fields —
    it boards models and their mods ride through, each scoped to
    exactly the families that declared them. Loud refusals: a boarded
    model not claiming this card back, a non-pack mod, a field name
    two mods fight over."""
    import copy
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
    mod_scope = {}       # mod class -> [family ids declaring it]
    for m in models:
        for mod in getattr(m, "mods", ()) or ():
            if not (isinstance(mod, type)
                    and issubclass(mod, ActionCardPack)):
                raise ValidationError(
                    "model %r declares mod %r — mods must be "
                    "ActionCardPack classes" % (m.id, mod))
            mod_scope.setdefault(mod, []).append(m.id)
    out = list(fields)
    for mod, fams in mod_scope.items():
        for f in mod._fields_:
            if f.name in seen:
                raise ValidationError(
                    "%s: mod %s re-declares field %r — one declaration "
                    "per name across card and mods"
                    % (name, mod.__name__, f.name))
            fc = copy.copy(f)
            fc.families = tuple(fams)
            seen.add(f.name)
            out.append(fc)
    return out, seen


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

    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        cid = ns.get("id", "")
        fields = []
        seen = set()
        own = {key: val for key, val in ns.items()
               if isinstance(val, Field)}
        for key, val in own.items():
            if not _FIELD_NAME_RE.match(key):
                raise ValidationError(
                    "%s: field name %r must be a lowercase identifier"
                    % (name, key))
            val.name = key
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
        if models is not None:
            fields, seen = _absorb_models(name, cid, models, fields, seen)
            if "families" in ns:
                raise ValidationError(
                    "%s declares BOTH models= and families= — models is "
                    "the truth; families derive from them" % name)
            cls.families = tuple(m.id for m in models)
        cls._fields_ = tuple(fields)
        pack = ns.get("pack", "")
        if pack and cid:
            raise ValidationError(
                "%s: a pack (%r) never carries a card id — packs are "
                "mod blocks a MODEL declares in its mods" % (name, pack))
        if pack and not fields:
            raise ValidationError(
                "%s: pack %r declares no fields — a pack is a field "
                "block, an empty one is dead machinery" % (name, pack))
        if fields and not cid and not pack:
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


# ── MOD BLOCKS — the menu a MODEL declares in its `mods` tuple ─────────
#
# MODS ARE DECLARED AT THE MODEL LEVEL: a family's Model class carries
# `mods = (LanPaintMod,)` — its OWN set, different families different
# sets (z-image ≠ krea-2). A card boarding that model absorbs the
# declared mods, each scoped to exactly the declaring families. A
# block here that no model declares simply never surfaces — the menu
# is capability grammar, not served surface.


class ActionCardPack(metaclass=_CardMeta):
    """Base mod block. Never a card: no id, never served alone; the
    fields ride a card THROUGH its boarded models. `pack` names the
    capability (the Model-side mods declaration matches on class
    identity — subclass to shape a family's flavor of a mod)."""
    pack = ""


class LorasMod(ActionCardPack):
    """The LoRA stack mod — boarded by families whose model provisions
    loras (krea-2: the Raw-variant training loras, applied on Turbo)."""
    pack = "loras"
    loras = Loras(label='LoRAs', group='loras_controlnet', zone='mods',
                  order=0)


class ControlNetMod(ActionCardPack):
    """The ControlNet stack mod — boarded by families provisioning
    controlnet models. No model declares it yet; the entry waits in
    the menu until one truthfully does."""
    pack = "controlnet"
    controlnet = ControlNet(label='ControlNet', group='loras_controlnet',
                            zone='mods', order=1)
    controlnet_strength_floor = Slider(
        label='ControlNet Strength Floor',
        group='loras_controlnet', zone='mods', order=2, width=1,
        min=0, max=1, step=0.05,
        tooltip='Minimum strength any ControlNet in the stack may apply '
                'at. Entries below this are clamped UP (with a log '
                'line). 0.0 = no floor. Raise this when stacking many '
                'weak ControlNets that cost VRAM without visual '
                'benefit.')


class LanPaintMod(ActionCardPack):
    """The LanPaint inpaint mod — input_image + lanpaint_mask switch
    the builder to LanPaintKSampler; mask prep (grow/feather/
    threshold/invert) and outpaint pads apply host-side pre-run."""
    pack = "lanpaint"
    input_image = Image(label='Image', group='lanpaint', order=-1)
    lanpaint_mask = Image(label='Inpaint Mask', group='lanpaint', order=0,
        tooltip='RGBA PNG whose alpha channel marks the region to '
                'regenerate. When present alongside input_image, '
                'build_txt2img switches to LanPaintKSampler.',
        visible_when='input_image != null')
    lanpaint_enabled = Boolean(label='Force LanPaint', group='lanpaint',
                               order=1,
                               visible_when='input_image != null')
    lanpaint_num_steps = Number(label='Num Steps', group='lanpaint',
                                order=2, width=1, min=1, max=100, step=1,
                                visible_when='lanpaint_enabled == true')
    lanpaint_step_size = Slider(label='Step Size', group='lanpaint',
                                order=3, width=1, min=0.1, max=2, step=0.1,
                                visible_when='lanpaint_enabled == true')
    lanpaint_lambda = Slider(label='Lambda', group='lanpaint', order=4,
                             width=1, min=0, max=2, step=0.05,
                             visible_when='lanpaint_enabled == true')
    lanpaint_beta = Slider(label='Beta', group='lanpaint', order=5,
                           width=1, min=0, max=2, step=0.05,
                           visible_when='lanpaint_enabled == true')
    lanpaint_friction = Slider(label='Friction', group='lanpaint', order=6,
                               width=1, min=0, max=2, step=0.05,
                               visible_when='lanpaint_enabled == true')
    lanpaint_prompt_mode = Select(label='Prompt Mode', group='lanpaint',
                                  order=7, width=1,
                                  visible_when='lanpaint_enabled == true',
                                  options=["negative", "positive"])
    mask_grow = Slider(label='Grow / Shrink', group='lanpaint', order=8,
                       width=1, min=-32, max=32, step=1,
                       visible_when='input_image != null')
    mask_feather = Slider(label='Feather', group='lanpaint', order=9,
                          width=1, min=0, max=32, step=1,
                          visible_when='input_image != null')
    mask_threshold = Slider(label='Re-threshold', group='lanpaint',
                            order=10, width=1, min=0, max=1, step=0.05,
                            visible_when='input_image != null')
    mask_invert = Boolean(label='Invert', group='lanpaint', order=11,
                          visible_when='input_image != null')
    outpaint_top = Slider(label='Expand Top', group='lanpaint', order=12,
                          width=1, min=0, max=512, step=8,
                          visible_when='input_image != null')
    outpaint_right = Slider(label='Expand Right', group='lanpaint',
                            order=13, width=1, min=0, max=512, step=8,
                            visible_when='input_image != null')
    outpaint_bottom = Slider(label='Expand Bottom', group='lanpaint',
                             order=14, width=1, min=0, max=512, step=8,
                             visible_when='input_image != null')
    outpaint_left = Slider(label='Expand Left', group='lanpaint', order=15,
                           width=1, min=0, max=512, step=8,
                           visible_when='input_image != null')
    outpaint_overlap = Slider(label='Overlap', group='lanpaint', order=16,
                              width=1, min=0, max=64, step=1,
                              visible_when='input_image != null')
