# melite_cards — the python action-card DSL (2026-09-02)
"""Engine-agnostic card form grammar: python/melite_cards is the py twin
of web/ (the web registry root) — generic infrastructure, no lane knowledge
(PLUGIN ARCHITECTURE LAW). The CLASSES live engine-owned at
packages/engines/<engine>/cards/<card>/card.py and carry the surface.

Why python beats the yaml it replaces (docs/plans/python-action-cards.md):
  * one SSOT — tool.json / card_knobs generation later ride the class
  * boot-LOUD validation — a bad range, a dupe field, an unresolved
    $vocab ref refuses to register (QUEUE LANE LAW ethos: fail before
    the wire, never serve a broken form)
  * conditionals/derived values are code (visible_when today stays the
    wire's expression string; python-native predicates come with the
    ui_overrides rung)

The serializer emits the wire fragment (form/fields/schema_groups) in
the editor's exact key order — parity with the yaml parser is pinned by
tests/walls/suites/test_python_cards.py per served card.

NO SILENT COEXISTENCE: a card dir with BOTH card.py and a card.yaml
`parameters:` block is a loud refusal (two SSOTs is zero SSOTs).
"""

__version__ = "0.1.0"

from .dsl import (          # noqa: F401
    ActionCard,
    OutputRow,
    Mod,
    ActionCardPack,
    SubActionMod,
    VerbEngine,
    LorasMod,
    ControlNetMod,
    LanPaintMod,
    MaskMod,
    QvoiceMod,
    Field,
    Select,
    Textarea,
    Text,
    Number,
    Slider,
    Seed,
    Boolean,
    Image,
    Audio,
    Video,
    File,
    Loras,
    ControlNet,
    VocabRef,
    ValidationError,
)
from . import validators  # noqa: F401
from .serialize import (  # noqa: F401
    field_spec, load_card_py, scan_engine_cards, tool_manifests)

__all__ = [
    "ActionCard", "OutputRow", "Mod", "ActionCardPack", "SubActionMod", "VerbEngine", "LorasMod", "ControlNetMod", "MaskMod", "QvoiceMod",
    "LanPaintMod", "Field", "Select", "Textarea", "Text", "Number",
    "Slider", "Seed", "Boolean", "Image", "Audio", "Video", "File",
    "Loras", "ControlNet", "VocabRef", "ValidationError",
    "field_spec", "load_card_py", "scan_engine_cards", "tool_manifests",
    "validators",
]
