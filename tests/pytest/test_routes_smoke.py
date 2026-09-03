"""Route smokes for endpoints with NO other wall.

test_http_parity is golden-compared for the editor-data surface;
test_assets_route walls /v1/assets + run.completed; test_manage_route
walls /v1/manage. This file is the smoke wall for the remaining
list endpoints so a route that silently 404s (or drifts its
envelope) is caught.
"""


class TestLanesSmoke:
    # lane disclosure: every plugin can advertise its lanes; the
    # list route is the deck stable view.

    def test_envelope(self, live):
        code, body = live["get"]("/v1/lanes")
        assert code == 200
        assert set(body.keys()) == {"count", "lanes"}
        assert body["count"] == len(body["lanes"])
        assert body["count"] > 0

    def test_lane_row_keys(self, live):
        # params / skills / steps are engine-specific; only identity
        # keys are pinned.
        required = {"kind", "lane", "genre", "title", "description"}
        code, body = live["get"]("/v1/lanes")
        for lane in body["lanes"]:
            assert required.issubset(set(lane.keys())), \
                f"lane {lane.get('lane', '?')!r} dropped a key: {sorted(lane.keys())}"


class TestCardToolsSmoke:
    # card-tools: the registry the action-card editor consumes.
    # Returns a bare list (not an envelope).

    def test_envelope(self, live):
        code, body = live["get"]("/v1/card-tools")
        assert code == 200
        assert isinstance(body, list)
        assert len(body) > 0

    def test_tool_row_keys(self, live):
        expected = {"name", "version", "kind", "card", "model",
                    "stage_title", "description", "params_schema"}
        code, body = live["get"]("/v1/card-tools")
        for tool in body:
            assert set(tool.keys()) == expected, \
                f"tool {tool.get('name', '?')!r} dropped a key: {sorted(tool.keys())}"


class TestSkillsSmoke:
    # /v1/skills: the DSH skill catalog. Envelope mirrors /v1/assets.

    def test_envelope(self, live):
        code, body = live["get"]("/v1/skills")
        assert code == 200
        assert set(body.keys()) == {"count", "skills"}
        assert body["count"] == len(body["skills"])
        assert body["count"] > 0

    def test_skill_row_keys(self, live):
        # the (card, model) union is scope-dependent (card:/model:/flow:)
        # -- the wall pins the universal identity keys only.
        required = {"id", "name", "description", "scope"}
        code, body = live["get"]("/v1/skills")
        for skill in body["skills"]:
            assert required.issubset(set(skill.keys())), \
                f"skill {skill.get('id', '?')!r} dropped a key: {sorted(skill.keys())}"
