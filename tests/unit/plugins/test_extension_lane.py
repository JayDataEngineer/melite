"""EXTENSION LANE — the nodes.yaml manifest gate (PYTHON SHAPE LAW).

The 2026-09-05 duck-typing audit found infra/extension_lane.py read
the manifests with bare isinstance/get walks: a typo'd top-level key
(``extentions:``) silently merged NOTHING (the extension never
installs, invisibly), garbage rows rode into provision's install
step, and the divergent-pin guard compared url/ref ONLY — the
registry/version rail could diverge silently and merge as
"identical".

The loader now validates every document at construction (frozen
pydantic rows, closed at top level AND row level) and the pin
identity is the FULL tuple (registry, version, url, ref, pip).
This wall pins: the live tree merges, every garbage class refuses
LOUDLY (field-named), identical restatements merge as one truth,
and divergent pins on ANY rail refuse."""

import importlib.util
import sys
import textwrap
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
LANE = REPO / "infra" / "extension_lane.py"


def _lane():
    spec = importlib.util.spec_from_file_location(
        "extension_lane_test", LANE)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def lane():
    return _lane()


def _write_manifest(root: Path, name: str, text: str) -> Path:
    p = root / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(textwrap.dedent(text), encoding="utf-8")
    return p


# ── the live tree ──────────────────────────────────────────────────

def test_live_tree_merges_clean(lane):
    """Every nodes.yaml in the estate validates + merges — the whole
    tree rides the typed row contract today."""
    rows = lane.merge_all(str(REPO))
    assert rows, "manifest merged empty"
    for r in rows:
        assert r["name"]
        assert isinstance(r["required"], bool)


def test_live_tree_rows_are_closed(lane):
    """The merged rows carry ONLY the modeled keys (+_source): no
    rider keys leak from yaml into the install step."""
    allowed = {"name", "registry", "version", "url", "ref",
               "required", "desc", "pip", "_source"}
    for r in lane.merge_all(str(REPO)):
        assert set(r) <= allowed, r


# ── garbage classes refuse LOUDLY, field-named ─────────────────────

BAD_DOCS = {
    "typo_top_key": "extentions:\n- name: x\n",
    "empty_name": "extensions:\n- name: ''\n",
    "name_not_str": "extensions:\n- name: [pack]\n",
    "typo_row_key": "extensions:\n- name: ok\n  regisry: c\n",
    "garbage_required": "extensions:\n- name: ok\n  required: sorta\n",
    "garbage_pip": "extensions:\n- name: ok\n  pip: 'numpy'\n",
    "extensions_not_list": "extensions: 'everything'\n",
}


@pytest.mark.parametrize("label", sorted(BAD_DOCS))
def test_bad_manifests_refuse_loudly(lane, tmp_path, label):
    p = _write_manifest(tmp_path, "nodes.yaml", BAD_DOCS[label])
    with pytest.raises(SystemExit):
        lane.load_extensions(str(p))


def test_null_extensions_is_declared_nothing(lane, tmp_path):
    """`extensions:` followed only by comments parses as explicit
    null — a legal genre head (the family carries rows elsewhere)."""
    p = _write_manifest(
        tmp_path, "nodes.yaml",
        "# genre head — declared elsewhere\nextensions:\n")
    assert lane.load_extensions(str(p)) == []


def test_missing_extensions_key_is_empty(lane, tmp_path):
    p = _write_manifest(tmp_path, "nodes.yaml", "# nothing yet\n")
    assert lane.load_extensions(str(p)) == []


# ── the pin law: identical merges, divergent refuses ───────────────

def _mkw(lane, tmp_path, files: dict) -> list:
    for rel, text in files.items():
        _write_manifest(tmp_path / "plg" / rel[0], rel[1], text)
    return lane._merge_from([
        (str((tmp_path / "plg" / a) / b), a)
        for a, b in files])


def test_identical_restatement_merges_as_one(lane, tmp_path):
    row = "extensions:\n- name: pack-x\n  registry: reg\n  version: '2'\n"
    merged = _mkw(lane, tmp_path, {
        ("alpha", "nodes.yaml"): row,
        ("beta", "nodes.yaml"): row,
    })
    names = [r["name"] for r in merged]
    assert names == ["pack-x"]


def test_divergent_registry_pin_refuses(lane, tmp_path, capsys):
    """THE url/ref-only-era hole: registry/version pins could
    diverge silently and merge as 'identical'. Now the pin identity
    is the FULL tuple — this refuses."""
    with pytest.raises(SystemExit):
        _mkw(lane, tmp_path, {
            ("alpha", "nodes.yaml"):
                "extensions:\n- name: pack-x\n  registry: regA\n",
            ("beta", "nodes.yaml"):
                "extensions:\n- name: pack-x\n  registry: regB\n",
        })
    assert "Divergent" in capsys.readouterr().err


def test_divergent_version_pin_refuses(lane, tmp_path):
    with pytest.raises(SystemExit):
        _mkw(lane, tmp_path, {
            ("alpha", "nodes.yaml"):
                "extensions:\n- name: pack-x\n"
                "  registry: reg\n  version: '1'\n",
            ("beta", "nodes.yaml"):
                "extensions:\n- name: pack-x\n"
                "  registry: reg\n  version: '2'\n",
        })


def test_divergent_url_ref_still_refuses(lane, tmp_path):
    with pytest.raises(SystemExit):
        _mkw(lane, tmp_path, {
            ("alpha", "nodes.yaml"):
                "extensions:\n- name: pack-x\n"
                "  url: https://a/x\n  ref: r1\n",
            ("beta", "nodes.yaml"):
                "extensions:\n- name: pack-x\n"
                "  url: https://b/x\n  ref: r1\n",
        })


def test_row_is_frozen_and_closed(lane):
    row = lane.ExtensionRow(name="x")
    assert row.model_config.get("frozen") is True
    assert row.model_config.get("extra") == "forbid"
    doc = lane.NodesDoc.model_validate({})
    assert doc.model_config.get("frozen") is True
    assert doc.model_config.get("extra") == "forbid"
