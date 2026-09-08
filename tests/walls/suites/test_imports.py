"""test_imports — the import-smoke gate.

A wall that imports every py/ module we ship. Catches the class of
"orphan syntax error after a bad edit that only surfaces at process
boot" (2026-09-05: a box-drawing line left orphaned by a python
str.replace produced a SyntaxError that the gateway returned 500
for, and only the live curl surfaced it). Importing IS the
construction (PYTHON SHAPE LAW); an invalid module cannot be built,
and therefore cannot be imported, and therefore cannot be shipped.

Scope: the gateway's py/ surface — the modules the running process
imports. A bare `import x` runs the module top-level, so a typo in a
class body, a missing symbol, a bad str.replace, all fail HERE
before the gateway is ever restarted. Pairs with the runtime walls
(data plane) — this is the build-time/boot-time wall.

Skip the modules that need live state (the queue, the event bus) by
keeping the import list to the data-plane surface.
"""
import importlib
import pytest


# Every gateway py/ module that must import cleanly. Add to this list
# when a new module joins the boot path. Keep it a flat, explicit
# list — implicit discovery is the drift class this gate refuses.
GATEWAY_MODULES = (
    "card_kinds",
    "form_wire",
    "flow",
    "run_wire",
    "lane_wire",
    "editor_forms",
    "editor_runs",
    "lane_disclosure",
    "packages",
)


@pytest.mark.parametrize("modname", GATEWAY_MODULES)
def test_module_imports_cleanly(modname: str) -> None:
    """Importing a module runs its top-level (class construction,
    table build, form_wire frozen rows). An invalid module raises
    HERE — the wall fails before the gateway is ever restarted."""
    mod = importlib.import_module(modname)
    assert mod is not None


def test_form_wire_genre_enum_is_closed() -> None:
    """The closed genre vocabulary (PYTHON SHAPE LAW rung 3). A typo
    at construction refuses; this pin is the lockstep with the
    client schema's `FormSpec.genre` union and the model rows on
    disk. Drift in either direction (a new genre added server-side
    but not client-side, or vice versa) fails the wall."""
    import form_wire
    members = {m.value for m in form_wire.KindGenre}
    # The wire's known genres. Update BOTH sides in lockstep.
    expected = {"image", "video", "audio", "motion", "text", "3d",
                "creature", "other"}
    assert members == expected, (
        "form_wire.KindGenre drifted from the client schema or the "
        "catalog — the closed vocab is the SSOT; update both sides "
        "in lockstep. Got %s, expected %s" % (members, expected)
    )


def test_card_kinds_runner_enum_is_closed() -> None:
    """The closed runner vocabulary mirrors the client
    cardSeam.KindRunner union. Same lockstep pin as genre."""
    import card_kinds
    members = {m.value for m in card_kinds.KindRunner}
    expected = {"", "input"}
    assert members == expected, (
        "card_kinds.KindRunner drifted from cardSeam.KindRunner — "
        "closed vocab must stay lockstep. Got %s" % members
    )
