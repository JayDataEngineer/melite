"""card_kinds.py — the card-kind behavior-flag SSOT (gap repair, 2026-09-03).

The kinds lane (GET /v1/kinds -> pluginKinds.ts -> cardSeam.ts) ran on
packages/<plugin>/kinds/*.yaml files until packages/core was removed as a
dead C plugin (6a86082) — the seven FIRST-PARTY kind files rode out with
it and the lane went dark: the editor's kindDef() fell to the fail-safe
UNKNOWN def (formSpec: false), so the spec contract store never fetched
a form-spec and every card rendered chrome with NO form fields. The
Playwright card-render gate caught it.

This module is the yaml-extinction port (the slot_kinds.py precedent):
the first-party table is gateway infra and lives in py/ — frozen pydantic
rows validated AT CONSTRUCTION, one instance, everything else a
projection. A new kind joins THIS file and the editor's kind consumers
follow the wire (pluginKinds.ts syncs; nothing is registered in code).

PYTHON SHAPE LAW: badgeTone is a closed vocabulary -> enum; each kind is
a frozen row; the cross-row invariant (unique kind strings — the wire's
duplicate guard) lives in CardKindTable's model validator. No file
scans, no remember-to-check boot passes: an invalid table cannot be
BUILT.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, model_validator

__all__ = ["BadgeTone", "KindRunner", "CardKindRow", "CardKindTable", "TABLE", "kinds_wire"]


class BadgeTone(str, Enum):
    """The closed badge-tone vocabulary (mirrors cardSeam.ts BadgeTone)."""

    DEFAULT = "default"
    BRAND = "brand"


class KindRunner(str, Enum):
    """The closed runner-family vocabulary (the dispatcher's SSOT,
    2026-09-05). Mirrors the client `CardKindDef.runner` union.
    DEFAULT = the default rule (flowName → chain, executable card →
    generation). INPUT = the input family runner (a 1-step inline doc).
    A kind may only declare one of these; a typo at construction
    refuses (PYTHON SHAPE LAW rung 3 — closed vocabularies are
    enums)."""

    DEFAULT = ""
    INPUT = "input"


class CardKindRow(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """One card-kind behavior flag row. Every flag explicit — no implicit
    truths (the original kinds-lane law); the flags are the editor's
    render/run contract for the kind string:

      runnable     — the card may join a run (Run affordance renders)
      executable   — the card executes as its own flow step
      formSpec     — the card fetches a form-spec (ParamGrid renders)
      compound     — the card is a container (holds other cards)
      opensStudio  — the card authors params in a studio body, not a grid
    """

    kind: str
    runnable: bool
    executable: bool
    formSpec: bool
    compound: bool
    opensStudio: bool
    badgeTone: BadgeTone = BadgeTone.DEFAULT
    icon: str | None = None
    # The runner family this kind belongs to — the DECLARATIVE answer
    # to "which executor runs a stage of this kind". The dispatcher
    # (flowExecuteSlice.ts resolveStageRunner) reads this instead of
    # branching on kind names: "" (default) → the stage's own
    # declarations decide (flowName → chain, executable card with a
    # model → generation); "input" → the input family runner
    # (media/preprocess, a 1-step inline doc). The closed vocabulary
    # is the resolver's contract — a kind may only declare one of
    # {"", "input"} here. (2026-09-05 "make sure we are declarative
    # and not hardcoding here".)
    runner: KindRunner = KindRunner.DEFAULT


class CardKindTable(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """The declared vocabulary. Cross-row invariants are enforced AT
    CONSTRUCTION — a duplicate kind string (the wire's within-wire
    duplicate guard) cannot be built, loud here, not on the editor's
    console at 4am."""

    kinds: tuple[CardKindRow, ...]

    @model_validator(mode="after")
    def _unique_kinds(self) -> "CardKindTable":
        names = [r.kind for r in self.kinds]
        if len(names) != len(set(names)):
            dupes = sorted({n for n in names if names.count(n) > 1})
            raise ValueError("duplicate kinds %s" % dupes)
        return self


# THE declaration — the single instance everything else derives from.
# Rows mirror the original packages/core/kinds/*.yaml table 1:1 (recovered
# from 8adcb19; the jsdom fixture meliteCoreKinds.ts pins the same set).
TABLE = CardKindTable(
    kinds=(
        CardKindRow(kind="generation", runnable=True, executable=True,
                    formSpec=True, compound=False, opensStudio=False),
        CardKindRow(kind="chain", runnable=True, executable=True,
                    formSpec=True, compound=False, opensStudio=False),
        # card-compose: the compose-first action cards (every
        # action_cards/*/*/tool.json declares kind "card-compose").
        # Missing from this table 2026-09-04..05 — the manifests stamped
        # a kind the registry never had, the editor's kindDef() fail-
        # safed to UNKNOWN (formSpec: false), and the modal's spec load
        # never fired: every baseline card rendered the Model zone and
        # nothing else ("it just allows me to pick model"). The
        # cross-door wall (test_form_wire.py section G) now refuses a
        # manifest kind the registry lacks.
        CardKindRow(kind="card-compose", runnable=True, executable=True,
                    formSpec=True, compound=False, opensStudio=False),
        CardKindRow(kind="studio-link", runnable=True, executable=False,
                    formSpec=False, compound=False, opensStudio=True,
                    badgeTone=BadgeTone.BRAND),
        CardKindRow(kind="preview", runnable=True, executable=True,
                    formSpec=False, compound=False, opensStudio=False),
        CardKindRow(kind="input", runnable=True, executable=True,
                    formSpec=False, compound=False, opensStudio=False,
                    # The input family runs through the input runner
                    # (a 1-step inline doc, not the card model path).
                    runner=KindRunner.INPUT),
        CardKindRow(kind="body", runnable=False, executable=False,
                    formSpec=False, compound=False, opensStudio=False,
                    icon="Box"),
        CardKindRow(kind="compound", runnable=True, executable=True,
                    formSpec=False, compound=True, opensStudio=False),
    ),
)


def kinds_wire() -> dict[str, list[dict[str, str | bool]]]:
    """The wire shape consumed by the editor's syncPluginKinds — the
    projection of TABLE, never a second declaration. The icon rides only
    when declared (the C-era shape; absent means the default tile icon)."""
    out = []
    for r in TABLE.kinds:
        entry = {
            "kind": r.kind,
            "runnable": r.runnable,
            "executable": r.executable,
            "formSpec": r.formSpec,
            "compound": r.compound,
            "opensStudio": r.opensStudio,
            "badgeTone": r.badgeTone.value,
            # The runner family declaration (the dispatcher's SSOT).
            # Omit when "" (the default rule applies) to keep the wire
            # minimal for kinds that don't override the default.
        }
        if r.runner:
            entry["runner"] = r.runner
        if r.icon is not None:
            entry["icon"] = r.icon
        out.append(entry)
    return {"kinds": out}
