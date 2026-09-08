"""test_manage_parity.py — the manage-vocabulary parity wall.

The contract under test (docs/design/dsh-comfy-manager-tab.md):

  python/manage.py's Action enum is the SSOT vocabulary. EVERY door that
  speaks management must name the SAME actions:

    panel  (assets-tab.tsx)  ⊆ enum   — a button can only dispatch real
                                         SSOT actions (runtime REFUSED
                                         envelopes are a BUG, not a
                                         fallback)
    panel  ⊆ agent tool      — the 1:1 mirror: whatever the GUI can do,
                                         the agent can do
    tool   ⊆ enum            — the agent names no phantom action
    enum   ⊆ _HANDLERS       — every action has a handler row (a dead
                                         enum row is drift)
    SNAPSHOT_RESTORE is lifecycle-guarded (rewrites extensions + deps
    under a live server — INFERENCE LAW)

Text-scan by design (the layer-audit pattern): no imports, so the wall
runs anywhere and reads the SOURCES the way an auditor would.
"""
import re

from _anchor import REPO

MANAGE = REPO / "infra" / "python" / "manage.py"
PANEL = (REPO / "packages" / "web" / "dsh" / "melite-card-deck" /
         "src" / "client" / "assets-tab.tsx")
TOOL = (REPO / "packages" / "harness" / "dsh" / "melite-tools" /
        "src" / "tools" / "comfy-manage.ts")


def _enum_rows(text: str) -> dict[str, str]:
    """Action enum rows: ATTR = "value" (4-space indent, no type colon —
    ManageRequest fields and handler rows both carry colons and cannot
    false-positive)."""
    return dict(re.findall(r'^    ([A-Z][A-Z_]+) = "([a-z_]+)"',
                           text, re.M))


def _handler_rows(text: str) -> set[str]:
    """_HANDLERS rows: Action.ATTR: _h_…  → the ATTR names."""
    return set(re.findall(r"Action\.([A-Z][A-Z_]+): _h_", text))


def _panel_actions(text: str) -> set[str]:
    """Every action-shaped string the panel dispatches or keys on:
    run('x') / confirmRun('x') / postManage('x') / busy === 'x' and the
    MUTATING auto-refresh set."""
    out = set()
    out |= set(re.findall(r"(?:run|confirmRun|postManage)\(\s*'([a-z_]+)'",
                          text))
    out |= set(re.findall(r"busy === '([a-z_]+)'", text))
    m = re.search(r"const MUTATING[^=]*=\s*new Set\(\[(.*?)\]\)",
                  text, re.S)
    if m:
        out |= set(re.findall(r"'([a-z_]+)'", m.group(1)))
    return out


def _tool_actions(text: str) -> set[str]:
    m = re.search(r"const ACTIONS = \[(.*?)\] as const", text, re.S)
    assert m, "comfy-manage.ts: ACTIONS array not found"
    return set(re.findall(r"'([a-z_]+)'", m.group(1)))


def test_panel_dispatches_only_ssot_actions() -> None:
    enum = set(_enum_rows(MANAGE.read_text(encoding="utf-8")).values())
    panel = _panel_actions(PANEL.read_text(encoding="utf-8"))
    assert panel, "panel scan found no actions (regex drift?)"
    rogue = panel - enum
    assert not rogue, \
        "panel dispatches unknown SSOT action(s): %s" % sorted(rogue)


def test_panel_actions_are_agent_reachable() -> None:
    tool = _tool_actions(TOOL.read_text(encoding="utf-8"))
    panel = _panel_actions(PANEL.read_text(encoding="utf-8"))
    rogue = panel - tool
    assert not rogue, \
        "panel action(s) missing from the comfy_manage tool vocabulary " \
        "(the 1:1 mirror broke): %s" % sorted(rogue)


def test_agent_tool_names_no_phantom_action() -> None:
    enum = set(_enum_rows(MANAGE.read_text(encoding="utf-8")).values())
    tool = _tool_actions(TOOL.read_text(encoding="utf-8"))
    rogue = tool - enum
    assert not rogue, \
        "comfy_manage tool names action(s) the SSOT refuses: %s" \
        % sorted(rogue)


def test_every_enum_action_has_a_handler() -> None:
    text = MANAGE.read_text(encoding="utf-8")
    rows = _enum_rows(text)
    dead = set(rows) - _handler_rows(text)
    assert not dead, "Action row(s) with no _HANDLERS entry: %s" % sorted(dead)


def test_snapshot_restore_is_lifecycle_guarded() -> None:
    text = MANAGE.read_text(encoding="utf-8")
    m = re.search(r"LIFECYCLE_GUARDED = \{(.*?)\}", text, re.S)
    assert m, "LIFECYCLE_GUARDED set not found"
    assert "Action.SNAPSHOT_RESTORE" in m.group(1), \
        "SNAPSHOT_RESTORE rewrites extensions + pip deps — it must " \
        "stay in LIFECYCLE_GUARDED (INFERENCE LAW)"
