"""The LoRA wire shape — ONE key, `id`, end to end (2026-09-06).

Provenance: the editor's subcard lane emitted loras entries as
``{name, strength}`` while every compose door resolved
``ent.get("id")`` — every editor-authored LoRA compiled-refused as
``lora '' is not in the catalog`` (operator order, verbatim: "Loras...
mods... broken... AND NOT CAUGHT AT COMPILE TIME... the [REDACTED 2026-11-05]" — the
compile door DID refuse loudly, pre-registration, no GPU; the
authoring shape was the drift).

THE CONTRACT (no stringly handshakes): a loras entry is
``{id, strength?}`` — ``id`` is the adapter's catalog id (the same
key the form-spec's modifiers.lora options carry as ``value`` and the
model's LoraRow rows carry as ``id``). The fossil ``name`` key and
the ``lora`` alias are both deleted; an entry without ``id`` refuses
naming the expected shape.

Driven through the exact gateway hop (plugins.compose — the bus that
sets up the lane's imports; phase 1, run_id="" — no queue slot, no
GPU) against the image-gen card that serves krea-2.
"""

import pathlib
import sys
import unittest

REPO = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402
from flow_graph import FlowGraph  # noqa: E402
from pydantic import BaseModel  # noqa: E402

# LoRA entries ride JSON params (no future-import here — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

BODY = {
    "prompt": "a cat in neon rain",
    "width": 1024, "height": 1024, "steps": 8,
    "cfg": 1.0, "seed": 1,
    "sampler": "euler", "scheduler": "normal",
}


def _compose(loras: list[JsonValue]) -> tuple[FlowGraph, dict[str, JsonValue]]:
    return plugins.compose({"params": {**BODY, "loras": loras}},
                           "krea-2", "", None, ["comfyui"])


class TestLoraWireShape(unittest.TestCase):
    """Phase-1 compose: {id, strength} passes; the drift shapes refuse
    LOUD with the expected shape named (never a silent '' resolve)."""

    def test_id_shape_compiles(self) -> None:
        # rc==0 = no ValidationError raised — the validation door
        # passed the entry (phase-1 emits the graph at phase 2 only)
        _compose([{"id": "krea2_realism_lora", "strength": 0.7}])

    def test_missing_strength_seeds_the_row_default(self) -> None:
        # no strength stated → the LoraRow's own default_strength rides
        # (the same row the picker's option defaults came from, rung 6)
        _compose([{"id": "krea2_realism_lora"}])

    def test_fossil_name_key_refuses_naming_the_shape(self) -> None:
        with self.assertRaises(plugins.ValidationError) as cm:
            _compose([{"name": "krea2_realism_lora"}])
        self.assertIn("loras entries are {id, strength}", str(cm.exception))
        self.assertIn("'name'", str(cm.exception))

    def test_fossil_lora_alias_is_deleted_not_honored(self) -> None:
        with self.assertRaises(plugins.ValidationError) as cm:
            _compose([{"lora": "krea2_realism_lora"}])
        # the alias died with the flip: the refusal names the shape,
        # never resolves the alias (no stringly handshake)
        self.assertIn("loras entries are {id, strength}", str(cm.exception))

    def test_unknown_id_lists_the_known_catalog(self) -> None:
        with self.assertRaises(plugins.ValidationError) as cm:
            _compose([{"id": "no_such_lora"}])
        self.assertIn("no_such_lora", str(cm.exception))
        self.assertIn("krea2_realism_lora", str(cm.exception))


EDIT_BODY = {
    "prompt": "a cat with a hat",
    "input_image": "_lora_wall_anchor.png",
    "width": 1024, "height": 1024,
}

# 1×1 transparent PNG — the edit door's phase-1 artifact sweep requires
# the anchor to EXIST on the mounts (QUEUE LANE LAW); the wall drops
# its own fixture beside the run outputs the door resolves against.
_ANCHOR_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6300010000050001"
    "0d0a2db40000000049454e44ae426082")


def _compose_edit(loras: list[JsonValue]) -> tuple[FlowGraph, dict[str, JsonValue]]:
    # plain filenames resolve against the ComfyUI input dir. This
    # suite points the arm's input_dir at the STABLE estate dir
    # (data/input) rather than a pytest tmp_path: another suite
    # (`test_compose_gates._image_edit_arm`) points the SAME cached
    # arm module's input_dir at ITS tmp dir, which pytest removes —
    # a full-collection run would then route this hop's artifact
    # sweep at a deleted directory. Re-arming here restores the
    # estate dir for every later in-process compose too.
    anchor_dir = REPO / "data" / "input"
    anchor_dir.mkdir(parents=True, exist_ok=True)
    anchor = anchor_dir / "_lora_wall_anchor.png"
    if not anchor.exists():
        anchor.write_bytes(_ANCHOR_PNG)
    for p in (REPO / "py", REPO / "plugins" / "engines" / "comfyui",
              REPO / "plugins" / "engines" / "comfyui" / "compose"):
        sp = str(p)
        # Move-to-front, never insert-if-absent: another suite (e.g. the
        # batch-validate wall's anycreature load) may have parked a
        # DIFFERENT compose package (plugins/engines/node/anycreature/
        # compose/) at sys.path[0] while these entries sit further back —
        # a bare `import compose` would then bind the wrong package (no
        # _load_arm_package) depending on suite order. Same for a stale
        # sys.modules binding from an earlier wrong-order import.
        if sp in sys.path:
            sys.path.remove(sp)
        sys.path.insert(0, sp)
    sys.modules.pop("compose", None)
    import compose as compose_pkg  # noqa: E402
    arm = compose_pkg._load_arm_package("image/image-edit")
    arm.input_dir = lambda: str(anchor_dir)
    return plugins.compose({"params": {**EDIT_BODY, "loras": loras}},
                           "qwen-img-edit-2511", "", None, ["comfyui"])


class TestLoraWireImageEdit(unittest.TestCase):
    """The edit lane boards the SAME wire shape (runtime catalog
    resolution — the estate union) — same teachings, same door."""

    def test_id_shape_compiles(self) -> None:
        _compose_edit([{"id": "krea2_realism_lora", "strength": 0.7}])

    def test_missing_strength_seeds_the_row_default(self) -> None:
        _compose_edit([{"id": "krea2_realism_lora"}])

    def test_fossil_name_key_refuses_naming_the_shape(self) -> None:
        with self.assertRaises(plugins.ValidationError) as cm:
            _compose_edit([{"name": "krea2_realism_lora"}])
        self.assertIn("loras entries are {id, strength}", str(cm.exception))
        self.assertIn("'name'", str(cm.exception))

    def test_unknown_id_lists_the_known_catalog(self) -> None:
        with self.assertRaises(plugins.ValidationError) as cm:
            _compose_edit([{"id": "no_such_lora"}])
        self.assertIn("no_such_lora", str(cm.exception))


class TestLoraWireConstruction(unittest.TestCase):
    """PYTHON SHAPE LAW (2026-09-06 hardening): the loras bag is a
    tuple of frozen LoraWire rows validated AT CONSTRUCTION — the
    compose-era per-entry hand-parse is deleted. Every malformed shape
    refuses when the params row is BUILT, with the shape teaching."""

    def _cls(self) -> type[BaseModel]:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "ig_schema",
            REPO / "plugins/engines/comfyui/action_cards/image/"
                   "image-gen/py/schema.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.ImageGenParams

    def test_bag_validates_into_frozen_rows(self) -> None:
        P = self._cls()
        doc = P(loras=[{"id": "a", "strength": 0.7}, {"id": "b"}])
        self.assertEqual(len(doc.loras), 2)
        self.assertIsNone(doc.loras[1].strength)  # seeds at compose
        with self.assertRaises(Exception):
            doc.loras[0].id = "mutated"  # frozen — no runtime rewire

    def test_null_bag_is_no_tiles_and_default_is_empty(self) -> None:
        P = self._cls()
        self.assertEqual(P().loras, ())
        self.assertEqual(P(loras=None).loras, ())

    def test_lone_dict_wraps_to_one_tile(self) -> None:
        P = self._cls()
        doc = P(loras={"id": "a", "strength": 1.0})
        self.assertEqual(len(doc.loras), 1)

    def test_string_bag_refuses(self) -> None:
        P = self._cls()
        with self.assertRaises(Exception) as cm:
            P(loras="krea2_realism_lora")
        self.assertIn("must be a list", str(cm.exception))

    def test_non_dict_entry_refuses(self) -> None:
        P = self._cls()
        with self.assertRaises(Exception) as cm:
            P(loras=["krea2_realism_lora"])
        self.assertIn("must be objects {id, strength?}", str(cm.exception))

    def test_empty_id_refuses_naming_the_keys(self) -> None:
        P = self._cls()
        with self.assertRaises(Exception) as cm:
            P(loras=[{"id": "  ", "strength": 1}])
        self.assertIn("loras entries are {id, strength}", str(cm.exception))
        self.assertIn("strength", str(cm.exception))  # the got-keys list

    def test_unknown_entry_key_refuses(self) -> None:
        P = self._cls()
        with self.assertRaises(Exception) as cm:
            P(loras=[{"id": "a", "strength": 1, "lora": "a"}])
        self.assertIn("loras entries are {id, strength}", str(cm.exception))


if __name__ == "__main__":
    unittest.main()


class TestEstateUploadRef(unittest.TestCase):
    """The upload door's RETURN VALUE is a valid wire value (2026-09-06
    operator order: click/drag-to-upload then run — the data: URL class
    refused at compose). POST /v1/uploads returns 'data/input/<name>';
    the edit compose accepts it as form 5 and stages by basename."""

    def test_estate_upload_ref_compiles(self) -> None:
        name = "_lora_wall_anchor.png"
        # the anchor fixture (TestLoraWireImageEdit setup) lives in
        # data/input; address it the way the upload door spells it
        ref = "data/input/%s" % name
        assert (REPO / "data" / "input" / name).is_file(), (
            "anchor fixture missing — run the edit tests above first")
        from plugins import ValidationError
        try:
            plugins.compose({"params": {**EDIT_BODY, "input_image": ref,
                                        "loras": []}},
                            "qwen-img-edit-2511", "", None, ["comfyui"])
        except ValidationError as e:
            self.fail("estate upload ref refused: %s" % e)

    def test_estate_upload_ref_missing_file_refuses_loudly(self) -> None:
        from plugins import ValidationError
        with self.assertRaises(ValidationError) as cm:
            plugins.compose({"params": {**EDIT_BODY,
                                        "input_image": "data/input/nope.png",
                                        "loras": []}},
                            "qwen-img-edit-2511", "", None, ["comfyui"])
        self.assertIn("upload missing", str(cm.exception))
        self.assertIn("data/input/nope.png", str(cm.exception))

    def test_data_url_still_refuses(self) -> None:
        from plugins import ValidationError
        with self.assertRaises(ValidationError) as cm:
            plugins.compose({"params": {**EDIT_BODY,
                                        "input_image": "data:image/png;base64,xxx",
                                        "loras": []}},
                            "qwen-img-edit-2511", "", None, ["comfyui"])
        self.assertIn("data:", str(cm.exception))
