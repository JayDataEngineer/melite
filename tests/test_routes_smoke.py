"""Route smokes for endpoints with NO other wall.

test_http_parity is golden-compared for the editor-data surface;
test_assets_route walls /v1/assets + run.completed; test_manage_route
walls /v1/manage. This file is the smoke wall for the remaining list
endpoints so a route that silently 404s (or drifts its envelope) is
caught. Each smoke pins: 200 status + the documented envelope shape.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import _http as hh  # noqa: E402


class LanesSmokeTests(unittest.TestCase):
    # lane disclosure: every plugin can advertise its lanes; the list
    # route is the deck's only stable view of what the estate supports.

    def test_envelope(self):
        code, body = hh.get("/v1/lanes")
        self.assertEqual(code, 200, f"lanes: {body!r}")
        self.assertEqual(set(body.keys()), {"count", "lanes"})
        self.assertEqual(body["count"], len(body["lanes"]))
        self.assertGreater(body["count"], 0,
                           "no lanes advertised — lane disclosure is empty")

    def test_lane_row_keys(self):
        # the lane row is genuinely loose: params / skills / steps
        # are each emitted by the engine that owns the lane. The
        # universal shape is the five identity fields; everything
        # else is engine-specific.
        code, body = hh.get("/v1/lanes")
        required = {"kind", "lane", "genre", "title", "description"}
        for lane in body["lanes"]:
            self.assertTrue(
                required.issubset(set(lane.keys())),
                f"lane {lane.get('lane', '?')!r} dropped a key: "
                f"have {sorted(lane.keys())}, required {sorted(required)}"
            )


class CardToolsSmokeTests(unittest.TestCase):
    # card-tools: the registry the action-card editor consumes. Returns
    # a bare list (not an envelope); each tool declares its model +
    # card + params schema.

    def test_envelope(self):
        code, body = hh.get("/v1/card-tools")
        self.assertEqual(code, 200, f"card-tools: {body!r}")
        self.assertIsInstance(body, list)
        self.assertGreater(len(body), 0, "no card tools — the editor is empty")

    def test_tool_row_keys(self):
        code, body = hh.get("/v1/card-tools")
        expected = {"name", "version", "kind", "card", "model",
                    "stage_title", "description", "params_schema"}
        for tool in body:
            self.assertEqual(
                set(tool.keys()), expected,
                f"tool {tool.get('name', '?')!r} dropped a key: {sorted(tool.keys())}"
            )


class SkillsSmokeTests(unittest.TestCase):
    # /v1/skills: the DSH skill catalog the harness exposes. Envelope
    # mirrors the assets route's {count, items[...]} shape; items here
    # are skills, each carrying scope + model metadata.

    def test_envelope(self):
        code, body = hh.get("/v1/skills")
        self.assertEqual(code, 200, f"skills: {body!r}")
        self.assertEqual(set(body.keys()), {"count", "skills"})
        self.assertEqual(body["count"], len(body["skills"]))
        self.assertGreater(body["count"], 0,
                           "no skills advertised — the DSH catalog is empty")

    def test_skill_row_keys(self):
        # the skill row has four universal identity fields; the
        # (card, model) union is scope-dependent — card: -> card,
        # model: -> model, flow: -> neither (e.g. audio-native-tts is
        # a flow that dispatches to a tts card). The wall pins the
        # universal keys; the scope-specific shape is owned by the
        # cataloging code, not the route.
        code, body = hh.get("/v1/skills")
        required = {"id", "name", "description", "scope"}
        for skill in body["skills"]:
            self.assertTrue(
                required.issubset(set(skill.keys())),
                f"skill {skill.get('id', '?')!r} dropped a key: "
                f"have {sorted(skill.keys())}, required {sorted(required)}"
            )


if __name__ == "__main__":
    unittest.main()
