"""Walls: the card component baseline — shadcn-style, @melite/ui only.

Operator orders (verbatim, 2026-09-06 recipe audit + shadcn stroke):
"a clean baseline of componetns for cards, modeled after shadcn" and
"do it all" — every card-path element rides the kit.

The baseline:

1. `@melite/ui` (packages/web-kit/ui/src) is the ONLY atom source: the shadcn kit
   (cva + cn + data-slot primitives, subpath imports). Card surfaces
   never hand-roll field widgets.
2. `SchemaField.tsx` is the ONE field primitive: its widget vocabulary
   is CLOSED (Input/Textarea/Switch/Slider/Button/Select/Tip from the
   kit + slots for complex types). Zero raw elements.
3. The axis rail (`flowAxisRows` Model select + `flowCardAxes`
   VariantSelect) rides kit Select (Base UI) with explicit label
   render fns (the popup unmounts closed, so unmounted items can't
   feed the trigger text).
4. Every button in the card path — PresetGroup/ModelVariantPicker
   toggles, SchemaGroup/SchemaForm accordions, autocomplete
   suggestions, enhance wands, boolean pills, preset chips, error
   Retry buttons, tile play + slot wire icon buttons — is kit Button.
   GrowTextarea/JsonParamField/autocomplete textareas ride kit
   Textarea; the free-text row rides kit Input.

ZERO raw `<button>/<input>/<select>/<textarea>` in the card render
path (comments stripped before counting). Any new raw element here
fails — route through the kit or amend this wall deliberately.
Non-card chrome (modals, canvas, tiles, sidebars) is out of scope.

5. Studio tenants + genre viewer packs (every tsx under
   packages/engines/*/action_cards/) ride the kit too — no card goes
   around the shared atoms (the 2026-09-06 audit answer: the default
   path never did; 60+ raw sites across anny/body/mask/h3/motion/
   ideogram/viewers did and were migrated). The walk discovers new
   tenant files automatically — a new studio with a raw element
   fails here at birth.
"""
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
GEN = REPO / "packages/web/editor/src/surfaces/generate"
FLOW = REPO / "packages/web/editor/src/surfaces/flow"

# the card render path — every file that renders card params/axes
CARD_PATH = [
    GEN / "SchemaField.tsx",
    GEN / "SchemaForm.tsx",
    GEN / "SchemaGroup.tsx",
    GEN / "PresetGroup.tsx",
    GEN / "ModelVariantPicker.tsx",
    GEN / "PromptAutocomplete.tsx",
    GEN / "assets-form-helpers.tsx",
    FLOW / "flowAxisRows.tsx",
    FLOW / "flowCardAxes.tsx",
    FLOW / "flowParamFields.tsx",
    FLOW / "flowParamEditor.tsx",
    FLOW / "flowCardJsonField.tsx",
    FLOW / "cardElements.tsx",
    FLOW / "SlotGrid.tsx",
]

_RAW = re.compile(r"<(button|input|select|textarea)\b")
_UI_IMPORT = re.compile(r'from\s+"@melite/ui/([^"]+)"')


def _code(path: Path) -> str:
    text = path.read_text()
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)  # block comments
    text = re.sub(r"^.*//.*$", "", text, flags=re.M)   # line comments
    return text


def test_card_path_has_zero_raw_elements() -> None:
    """No raw form elements anywhere on the card render path."""
    bad = {}
    for path in CARD_PATH:
        found = _RAW.findall(_code(path))
        if found:
            bad[path.name] = found
    assert not bad, (
        "raw elements on the card path — route through @melite/ui: %r"
        % bad)


def test_generate_has_zero_raw_elements() -> None:
    """Nothing else in generate/ may carry raw elements, ever."""
    pinned = {p.name for p in CARD_PATH}
    for tsx in sorted(GEN.glob("*.tsx")):
        if tsx.name in pinned:
            continue
        assert not _RAW.findall(_code(tsx)), (
            "%s: new raw elements in generate/ — route through "
            "@melite/ui" % tsx.name)


def test_schemafield_is_pure_kit() -> None:
    """The ONE field primitive renders ZERO raw elements and imports
    field atoms ONLY from @melite/ui (closed vocabulary)."""
    src = GEN / "SchemaField.tsx"
    assert not _RAW.findall(_code(src))
    mods = set(_UI_IMPORT.findall(src.read_text()))
    assert mods == {"input", "textarea", "switch", "slider", "button",
                    "select", "tip"}, (
        "SchemaField's kit vocabulary changed — deliberate wall edit "
        "or a leak: %r" % sorted(mods))


def test_card_path_atoms_come_from_the_kit() -> None:
    """Every card-path file rendering controls imports them from
    @melite/ui (Button/Input/Textarea/Select/NumberField/field/Tip)
    — no hand-rolled widget element can hide behind a zero raw count
    without its kit import."""
    want = {
        "PresetGroup.tsx": {"button"},
        "ModelVariantPicker.tsx": {"button"},
        "SchemaGroup.tsx": {"button"},
        "SchemaForm.tsx": {"button"},
        "PromptAutocomplete.tsx": {"button", "textarea"},
        "flowCardAxes.tsx": {"select"},
        "flowAxisRows.tsx": {"select"},
        "flowParamFields.tsx": {"button", "input", "textarea", "select"},
        "flowCardJsonField.tsx": {"textarea"},
        "cardElements.tsx": {"button"},
        "SlotGrid.tsx": {"button"},
        "flowParamEditor.tsx": {"button"},
    }
    for name, mods in want.items():
        path = (GEN / name) if (GEN / name).is_file() else (FLOW / name)
        got = set(_UI_IMPORT.findall(path.read_text()))
        assert mods <= got, (
            "%s: missing kit imports %r (has %r)"
            % (name, sorted(mods - got), sorted(got)))


def test_tenant_tree_has_zero_raw_elements() -> None:
    """No card goes around the kit: every tsx under every
    packages/engines/*/action_cards/ (studio tenants, timeline, genre
    viewer packs, shared lane rails) renders zero raw form elements.
    The glob discovers new tenant files — no list to forget."""
    tsx = sorted((REPO / "packages/engines").glob("*/action_cards/**/*.tsx"))
    assert len(tsx) > 40, (
        "tenant walk found %d tsx — the glob broke" % len(tsx))
    bad = {}
    for path in tsx:
        found = _RAW.findall(_code(path))
        if found:
            bad[str(path.relative_to(REPO))] = found
    assert not bad, (
        "raw elements in studio tenants — route through @melite/ui: %r"
        % bad)
