"""MeliteCollectLatents / MeliteListAt — the F62 list door, judged on
the real module (the vendored layer C seat; run under the repo pytest:
python3 -m pytest tests/ -q).

The door's law: ComfyUI's prompt format wires ONE link per input pin,
so an INPUT_IS_LIST consumer (the refine handoff's chunk sequence)
receives N members only when ONE producer emits them as a single
list. The collector is that producer (pin order IS member order, gaps
refuse loud); the member door takes one element back out by film-order
index. Together they are the latent handoff's wire shape.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

PACK = Path(__file__).resolve().parents[1] / "vendor/comfyui_extensions/melite-utility-nodes/nodes.py"
_spec = importlib.util.spec_from_file_location("melite_utility_nodes_list_door", PACK)
assert _spec and _spec.loader
nodes = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = nodes
_spec.loader.exec_module(nodes)


def test_the_door_is_registered_in_both_mappings():
    assert nodes.NODE_CLASS_MAPPINGS["MeliteCollectLatents"] is nodes.MeliteCollectLatents
    assert nodes.NODE_CLASS_MAPPINGS["MeliteListAt"] is nodes.MeliteListAt
    assert "MeliteCollectLatents" in nodes.NODE_DISPLAY_NAME_MAPPINGS
    assert "MeliteListAt" in nodes.NODE_DISPLAY_NAME_MAPPINGS


def test_the_collector_collects_in_pin_order_as_one_list():
    a, b, c = {"samples": "a"}, {"samples": "b"}, {"samples": "c"}
    collector = nodes.MeliteCollectLatents()
    assert collector.RETURN_TYPES == ("LATENT",)
    assert collector.OUTPUT_IS_LIST == (True,)
    (out,) = collector.collect(latent_0=a, latent_1=b, latent_2=c)
    assert out == [a, b, c]


def test_the_collector_refuses_gaps_and_emptiness_loud():
    a = {"samples": "a"}
    collector = nodes.MeliteCollectLatents()
    try:
        collector.collect(latent_0=a, latent_2=a)
    except ValueError as exc:
        assert "latent_1" in str(exc) and "gaps" in str(exc)
    else:
        raise AssertionError("a gap in pin order must refuse loud")
    try:
        collector.collect()
    except ValueError as exc:
        assert "no latents" in str(exc)
    else:
        raise AssertionError("an unwired collector must refuse loud")


def test_the_member_door_takes_one_element_by_film_order_index():
    a, b = {"samples": "a"}, {"samples": "b"}
    door = nodes.MeliteListAt()
    assert door.INPUT_IS_LIST is True
    assert door.at([a, b], 0) == (a,)
    assert door.at([a, b], 1) == (b,)
    assert door.at([a, b], [0, 1]) == (b,)  # a list-spelled widget takes its last
    for items, index, why in (([], 0, "empty"), ([a], -1, "negative"), ([a], 1, "past the end"), ("scalar", 0, "scalar")):
        try:
            door.at(items, index)
        except ValueError:
            pass
        else:
            raise AssertionError(f"the {why} case must refuse loud")


def test_the_round_trip_member_order_survives_the_door():
    a, b, c = {"samples": "a"}, {"samples": "b"}, {"samples": "c"}
    collector = nodes.MeliteCollectLatents()
    door = nodes.MeliteListAt()
    (joined,) = collector.collect(latent_0=a, latent_1=b, latent_2=c)
    assert [door.at(joined, k)[0] for k in range(3)] == [a, b, c]
