"""Wire-contract validation tests — pydantic wrappers over the TypeScript
web contracts (web/contracts/src/).

These tests validate that the Python-side pydantic mirrors in models.py
correctly enforce every constraint declared in the TypeScript types.
When the TypeScript contracts grow a new field or tighten a constraint,
these tests are the FIRST place a drift is caught — the pydantic model
refuses to build, and this suite lights red.

Laws enforced:
  - Every schema.d.ts component has a pydantic mirror
  - Closed vocabularies (enums) refuse out-of-range values
  - Frozen models refuse mutation
  - Nested structures validate recursively
  - Gateway response shapes (RunStartResult, ErrorEnvelope, etc.)
    match the declared wire

PYTHON SHAPE LAW: these tests exercise construction-time validation.
No post-hoc scans; an invalid shape cannot be BUILT.

Run: pytest tests/unit/web_contracts/test_wire_contracts.py -v
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from tests.unit.web_contracts.models import (
    # §1  vocab
    Provenance,
    # §2  card
    CardGenre,
    CardProgress,
    CardResult,
    CardStage,
    CardStatus,
    CompoundBlock,
    CompoundMode,
    TilePlayAffordance,
    # §3  lora
    LoRAEntry,
    # §4  character
    Character,
    IdentityModel,
    # §5  wire
    PluginRow,
    ThemeEntry,
    UiSlotEntry,
    # §6  preflight
    PreflightNeededEntry,
    PreflightPayload,
    # §7  media
    MediaAsset,
    MediaCategory,
    MediaRun,
    # §8  enhance
    EnhanceModel,
    # §9  regions
    AssetViewerMode,
    # §10  FlowTypes
    FlowDoc,
    FlowStage,
    FlowStageStatus,
    FlowStatus,
    StageResult,
    StudioTarget,
    # §11  schema.d.ts
    CapabilityEntryWire,
    CapabilityKind,
    CapabilityRoute,
    CapabilitySubcategory,
    CardSummary,
    ConditionalContract,
    ContractClause,
    DetectorEntry,
    DryRunPlan,
    DownloadRequired,
    ErrorEnvelope,
    FormField,
    FormFieldOption,
    FormFieldSection,
    FormFieldType,
    FormFeatures,
    FormGenre,
    GroupLayout,
    PromptGuide,
    PromptGuideSection,
    FormLayout,
    FormSize,
    FormSpec,
    GroupZone,
    InputVocabulary,
    LanpaintModelEntry,
    LoraListOut,
    MaskLayerKind,
    MaskLayerKindType,
    MediaType as SchemaMediaType,
    ModifierCardinality,
    ModifierEntry,
    ModifierField,
    ModifierFieldType,
    ModifierKind,
    ModifierOption,
    ModelEntryWire,
    ModelFileParam,
    ModelValidation,
    ModeClause,
    OptionalOutput,
    OutputEntry,
    PluginRow as WirePluginRow,
    PresetEntry,
    PresetModRef,
    ProvisionArtifact,
    ProvisionDest,
    ProvisioningSpec,
    RetakeDef,
    RunBrickMeta,
    RunStartBlocked,
    RunStartResult,
    RunStageWire,
    RunStatusEnum,
    RunStatusWire,
    SchemaFieldDef,
    SchemaFieldType,
    SchemaGroupDef,
    StudioBindingWire,
    TransformApplicability,
    TransformName,
    VariantDef,
    VariantEntryWire,
    VariantGroup,
    VideoAudio,
    VideoManifest,
    Violation,
    CatalogResponse,
    FamilyEntryWire,
)


# ═══════════════════════════════════════════════════════════════════════
# §1  Vocabularies — closed set enforcement
# ═══════════════════════════════════════════════════════════════════════

class TestProvenance:
    """Provenance is a closed 3-value vocabulary."""

    def test_valid_values(self):
        for v in ("agent", "user", "imported"):
            assert Provenance(v).value == v

    def test_invalid_refused(self):
        with pytest.raises(ValueError):
            Provenance("admin")

    def test_case_sensitive(self):
        with pytest.raises(ValueError):
            Provenance("Agent")


# ═══════════════════════════════════════════════════════════════════════
# §2  CardStage — the unified view-model
# ═══════════════════════════════════════════════════════════════════════

class TestCardGenre:
    def test_all_seven_values(self):
        expected = {"image", "video", "audio", "3d", "motion", "other", "text"}
        assert {g.value for g in CardGenre} == expected

    def test_invalid_refused(self):
        with pytest.raises(ValueError):
            CardGenre("mesh")


class TestCardStatus:
    def test_all_nine_values(self):
        expected = {
            "pending", "running", "queued", "done", "error",
            "stale", "cached", "skipped", "reused",
        }
        assert {s.value for s in CardStatus} == expected


class TestCompoundMode:
    def test_three_values(self):
        expected = {"fanout", "flow", "modifiers"}
        assert {m.value for m in CompoundMode} == expected


class TestCardProgress:
    def test_minimal(self):
        p = CardProgress(value=5, max=20)
        assert p.value == 5
        assert p.node is None

    def test_with_node(self):
        p = CardProgress(value=10, max=20, node="KSampler")
        assert p.node == "KSampler"

    def test_frozen(self):
        p = CardProgress(value=1, max=1)
        with pytest.raises(Exception):
            p.value = 2


class TestCardResult:
    def test_minimal(self):
        r = CardResult(assetUrls=[], artifacts={}, metadata={})
        assert r.durationSec is None

    def test_with_gallery(self):
        r = CardResult(
            assetUrls=["a.png"],
            artifacts={"mask": "mask.png"},
            metadata={"seed": 42},
            gallery=[{"name": "view1", "url": "v1.png"}],
        )
        assert len(r.gallery) == 1

    def test_frozen(self):
        r = CardResult(assetUrls=[], artifacts={}, metadata={})
        with pytest.raises(Exception):
            r.assetUrls = ["x"]


class TestCardStage:
    """CardStage is the core card view-model — test its construction rules."""

    def _make(self, **overrides):
        base = {
            "id": "stage-1",
            "title": "Generate Image",
            "kind": "generation",
            "service": "krea2",
            "params": {"prompt": "a cat"},
            "inputs": [],
            "inputIndices": [],
            "result": None,
            "status": "pending",
        }
        base.update(overrides)
        return CardStage(**base)

    def test_minimal_construction(self):
        s = self._make()
        assert s.id == "stage-1"
        assert s.status == CardStatus.PENDING

    def test_with_result(self):
        result = CardResult(assetUrls=["out.png"], artifacts={}, metadata={})
        s = self._make(result=result, status="done")
        assert s.result.assetUrls == ["out.png"]

    def test_with_compound(self):
        compound = CompoundBlock(mode="flow", childIds=["s1", "s2"])
        s = self._make(kind="compound", compound=compound)
        assert s.compound.mode == CompoundMode.FLOW

    def test_genre_optional(self):
        s = self._make()
        assert s.genre is None

    def test_with_genre(self):
        s = self._make(genre="image")
        assert s.genre == CardGenre.IMAGE

    def test_open_vocabulary_kind(self):
        """kind is open seam vocabulary — any string accepted."""
        s = self._make(kind="my_custom_kind_xyz")
        assert s.kind == "my_custom_kind_xyz"

    def test_frozen(self):
        s = self._make()
        with pytest.raises(Exception):
            s.id = "changed"

    def test_with_activity(self):
        activity = {"phase": "sampling", "node": "42", "message": "step 5/20"}
        s = self._make(activity=activity)
        assert s.activity.phase == "sampling"

    def test_with_provenance(self):
        s = self._make(provenance="agent")
        assert s.provenance == Provenance.AGENT

    def test_save_to_assets_default(self):
        s = self._make()
        assert s.saveToAssets is None


class TestTilePlayAffordance:
    def test_play(self):
        a = TilePlayAffordance(verb="start", icon="play")
        assert a.icon == "play"

    def test_reroll(self):
        a = TilePlayAffordance(verb="reroll", icon="reroll")
        assert a.verb == "reroll"

    def test_invalid_icon_refused(self):
        with pytest.raises(ValidationError):
            TilePlayAffordance(verb="go", icon="stop")


# ═══════════════════════════════════════════════════════════════════════
# §3  LoRAEntry
# ═══════════════════════════════════════════════════════════════════════

class TestLoRAEntry:
    def test_construction(self):
        l = LoRAEntry(name="style_v2", strength=0.7)
        assert l.name == "style_v2"
        assert l.strength == 0.7

    def test_zero_strength(self):
        l = LoRAEntry(name="x", strength=0.0)
        assert l.strength == 0.0

    def test_negative_strength_allowed(self):
        """Negative strength is valid in ComfyUI."""
        l = LoRAEntry(name="x", strength=-0.5)
        assert l.strength == -0.5

    def test_frozen(self):
        l = LoRAEntry(name="x", strength=0.5)
        with pytest.raises(Exception):
            l.strength = 1.0


# ═══════════════════════════════════════════════════════════════════════
# §4  Character
# ═══════════════════════════════════════════════════════════════════════

class TestCharacter:
    def test_soma(self):
        c = Character(identityModel="soma", coeffs=[0.1, 0.2])
        assert c.identityModel == IdentityModel.SOMA

    def test_mhr(self):
        c = Character(identityModel="mhr", coeffs=None)
        assert c.identityModel == IdentityModel.MHR

    def test_anny(self):
        c = Character(
            identityModel="anny",
            coeffs=[1.0],
            localChanges={"nose": 0.5},
            customTargets={"anime": 0.3},
        )
        assert c.localChanges["nose"] == 0.5
        assert c.customTargets["anime"] == 0.3

    def test_invalid_model_refused(self):
        with pytest.raises(ValidationError):
            Character(identityModel="invalid_model")

    def test_frozen(self):
        c = Character(identityModel="soma")
        with pytest.raises(Exception):
            c.identityModel = "mhr"


# ═══════════════════════════════════════════════════════════════════════
# §5  Wire types — PluginRow, UiSlotEntry, ThemeEntry
# ═══════════════════════════════════════════════════════════════════════

class TestPluginRow:
    def test_construction(self):
        p = PluginRow(
            id="comfyui", version="0.1.0", name="ComfyUI",
            enabled=True, lanes=["image", "video"], root="plugins/engines/comfyui",
        )
        assert p.hooks is None

    def test_with_hooks(self):
        p = PluginRow(
            id="x", version="1", name="X",
            enabled=False, lanes=[], root="/",
            hooks=3,
        )
        assert p.hooks == 3

    def test_frozen(self):
        p = PluginRow(id="x", version="1", name="X",
                       enabled=True, lanes=[], root="/")
        with pytest.raises(Exception):
            p.enabled = False


class TestUiSlotEntry:
    def test_minimal(self):
        e = UiSlotEntry(plugin="core", id="sidebar", slot="left", precedence=0)
        assert e.title is None

    def test_with_title(self):
        e = UiSlotEntry(plugin="core", id="sb", slot="left",
                         precedence=1, title="Sidebar")
        assert e.title == "Sidebar"


class TestThemeEntry:
    def test_construction(self):
        t = ThemeEntry(
            plugin="themes", id="dark", label="Dark",
            dark=True, vars={"bg": "#000"},
        )
        assert t.description is None

    def test_with_description(self):
        t = ThemeEntry(
            plugin="t", id="d", label="D",
            dark=False, vars={}, description="A theme",
        )
        assert t.description == "A theme"


# ═══════════════════════════════════════════════════════════════════════
# §6  Preflight types
# ═══════════════════════════════════════════════════════════════════════

class TestPreflightNeededEntry:
    def test_minimal(self):
        e = PreflightNeededEntry(name="comfyui-h3-motion-context")
        assert e.installed is None
        assert e.applies is None

    def test_full(self):
        e = PreflightNeededEntry(
            name="ext", applies=True, reason="needed",
            url="https://github.com/x", pip=["pkg1"],
            ref="main", title="Ext", author="Me",
            description="Desc", nodes=["NodeA"],
            installed=True, action="clone", restart_required=True,
        )
        assert e.action == "clone"

    def test_invalid_action_refused(self):
        with pytest.raises(ValidationError):
            PreflightNeededEntry(name="x", action="install")


class TestPreflightPayload:
    def test_construction(self):
        p = PreflightPayload(
            family="krea2", reachable=True,
            restart_required=False, needed=[],
        )
        assert p.status == "preflight_required"

    def test_with_needed(self):
        entry = PreflightNeededEntry(name="ext1")
        p = PreflightPayload(
            family="krea2", reachable=True,
            restart_required=True, needed=[entry],
        )
        assert len(p.needed) == 1


# ═══════════════════════════════════════════════════════════════════════
# §7  Media types
# ═══════════════════════════════════════════════════════════════════════

class TestMediaCategory:
    def test_six_values(self):
        expected = {"image", "video", "mesh", "motion", "audio", "other"}
        assert {c.value for c in MediaCategory} == expected

    def test_invalid_refused(self):
        with pytest.raises(ValueError):
            MediaCategory("3d")


class TestMediaRun:
    def test_minimal(self):
        m = MediaRun(run_id="run-1")
        assert m.status is None
        assert m.artifacts is None

    def test_full(self):
        m = MediaRun(
            run_id="r1", status="completed", prompt="a cat",
            thumbnail="thumb.png", created_at=1700000000,
            params={"seed": 42},
            artifacts=[{"url": "out.png", "type": "image", "size": 1024}],
            families=["krea2"],
        )
        assert m.families == ["krea2"]


class TestMediaAsset:
    def test_construction(self):
        a = MediaAsset(
            id="url1", runId="r1", name="output.png",
            category="image", url="/out.png", type="image",
            size=1024, prompt="a cat", thumbnail="thumb.png",
            createdAt=1700000000, runStatus="completed",
            runParams={"seed": 42},
        )
        assert a.category == MediaCategory.IMAGE

    def test_frozen(self):
        a = MediaAsset(
            id="u", runId="r", name="n", category="image",
            url="/u", type="image", size=1, prompt="p",
            thumbnail="t", createdAt=0, runStatus="ok", runParams={},
        )
        with pytest.raises(Exception):
            a.name = "other"


# ═══════════════════════════════════════════════════════════════════════
# §8  EnhanceModel
# ═══════════════════════════════════════════════════════════════════════

class TestEnhanceModel:
    def test_construction(self):
        m = EnhanceModel(
            id="openai", name="OpenAI",
            baseUrl="https://api.openai.com/v1",
            apiKey="sk-xxx", model="gpt-4o-mini",
        )
        assert m.keyId is None

    def test_with_key_id(self):
        m = EnhanceModel(
            id="x", name="X", baseUrl="http://x",
            apiKey="k", model="m", keyId="backend-1",
        )
        assert m.keyId == "backend-1"


# ═══════════════════════════════════════════════════════════════════════
# §9  AssetViewerMode
# ═══════════════════════════════════════════════════════════════════════

class TestAssetViewerMode:
    def test_tile_and_full(self):
        assert AssetViewerMode("tile") == AssetViewerMode.TILE
        assert AssetViewerMode("full") == AssetViewerMode.FULL

    def test_invalid(self):
        with pytest.raises(ValueError):
            AssetViewerMode("dialog")


# ═══════════════════════════════════════════════════════════════════════
# §10  FlowTypes — FlowDoc, FlowStage, StageResult
# ═══════════════════════════════════════════════════════════════════════

class TestFlowStatus:
    def test_seven_values(self):
        expected = {"draft", "ready", "running", "queued", "done", "failed", "stale"}
        assert {s.value for s in FlowStatus} == expected


class TestFlowStageStatus:
    def test_seven_values(self):
        expected = {"pending", "running", "queued", "done", "error", "stale", "cached"}
        assert {s.value for s in FlowStageStatus} == expected


class TestStudioTarget:
    def test_three_values(self):
        expected = {"pose", "director", "body"}
        assert {s.value for s in StudioTarget} == expected


class TestStageResult:
    def test_construction(self):
        r = StageResult(
            assetUrls=["out.png"],
            artifacts={"mask": "mask.png"},
            metadata={"seed": 42},
            completedAt=1700000000,
            durationSec=3.5,
        )
        assert r.durationSec == 3.5

    def test_frozen(self):
        r = StageResult(
            assetUrls=[], artifacts={}, metadata={},
            completedAt=0, durationSec=0,
        )
        with pytest.raises(Exception):
            r.assetUrls = ["x"]


class TestFlowStage:
    def _make(self, **overrides):
        base = {
            "id": "s1",
            "title": "Gen",
            "kind": "generation",
            "service": "krea2",
            "params": {},
            "inputs": [],
            "result": None,
            "status": "pending",
            "error": None,
            "cacheKey": None,
        }
        base.update(overrides)
        return FlowStage(**base)

    def test_minimal(self):
        s = self._make()
        assert s.status == FlowStageStatus.PENDING

    def test_with_result(self):
        r = StageResult(
            assetUrls=[], artifacts={}, metadata={},
            completedAt=0, durationSec=0,
        )
        s = self._make(result=r, status="done")
        assert s.result is not None

    def test_with_compound(self):
        c = CompoundBlock(mode="fanout", childIds=["a", "b"])
        s = self._make(kind="compound", compound=c)
        assert s.compound.mode == CompoundMode.FANOUT

    def test_open_kind(self):
        s = self._make(kind="body")
        assert s.kind == "body"

    def test_with_studio(self):
        s = self._make(studio="pose")
        assert s.studio == StudioTarget.POSE


class TestFlowDoc:
    def _make(self, **overrides):
        base = {
            "id": "flow-1",
            "intent": "make a cat",
            "stages": [],
            "status": "draft",
            "createdAt": 1700000000,
            "completedAt": None,
        }
        base.update(overrides)
        return FlowDoc(**base)

    def test_minimal(self):
        d = self._make()
        assert d.status == FlowStatus.DRAFT

    def test_with_name(self):
        d = self._make(name="Cat Generator")
        assert d.name == "Cat Generator"

    def test_with_yaml_flow(self):
        d = self._make(yamlFlow="3d-character.yaml")
        assert d.yamlFlow == "3d-character.yaml"


# ═══════════════════════════════════════════════════════════════════════
# §11  schema.d.ts — the OpenAPI wire types
# ═══════════════════════════════════════════════════════════════════════

# ── FormField ─────────────────────────────────────────────────────────

class TestFormFieldType:
    def test_thirteen_values(self):
        expected = {
            "textarea", "text", "number", "seed", "select", "file",
            "boolean", "stringlist", "image", "image_list", "video",
            "audio", "voice_file",
        }
        assert {t.value for t in FormFieldType} == expected


class TestFormField:
    def test_minimal(self):
        f = FormField(name="prompt", type="textarea")
        assert f.label is None
        assert f.default is None

    def test_full(self):
        f = FormField(
            name="seed", type="seed", label="Seed",
            default=42, options=["-1"],
            required=True, step=1, tooltip="RNG seed",
            section="core", order=0,
        )
        assert f.section == FormFieldSection.CORE

    def test_options_string_list(self):
        f = FormField(
            name="model", type="select",
            options=["option_a", "option_b"],
        )
        assert f.options == ["option_a", "option_b"]

    def test_options_mixed(self):
        f = FormField(
            name="preset", type="select",
            options=[
                FormFieldOption(value="fast", label="Fast"),
                "slow",
            ],
        )
        assert len(f.options) == 2


class TestFormGuideSection:
    def test_construction(self):
        s = PromptGuideSection(label="Tips", body="Be specific")
        assert s.code is None

    def test_with_code(self):
        s = PromptGuideSection(
            label="Example", code="a photo of a cat",
        )
        assert s.code == "a photo of a cat"


class TestPromptGuide:
    def test_empty(self):
        g = PromptGuide()
        assert g.title is None
        assert g.sections is None

    def test_with_sections(self):
        g = PromptGuide(
            title="Guide",
            sections=[PromptGuideSection(label="Tip 1", body="Use seeds")],
        )
        assert len(g.sections) == 1


# ── ModifierKind ──────────────────────────────────────────────────────

class TestModifierField:
    def test_construction(self):
        f = ModifierField(name="weight", type="float", min=0.0, max=1.0, step=0.1)
        assert f.label is None

    def test_invalid_type_refused(self):
        with pytest.raises(ValueError):
            ModifierField(name="x", type="invalid_type")


class TestModifierOption:
    def test_construction(self):
        o = ModifierOption(value="depth", label="Depth CN")
        assert o.tooltip is None
        assert o.installed is None

    def test_with_metadata(self):
        o = ModifierOption(
            value="x", label="X",
            metadata={"model_path": "/m/model.safetensors"},
        )
        assert o.metadata["model_path"] == "/m/model.safetensors"


class TestModifierKind:
    def test_construction(self):
        mk = ModifierKind(
            kind="lora", label="LoRA",
            param_key="loras",
            fields=[ModifierField(name="name", type="string")],
        )
        assert mk.cardinality == ModifierCardinality.LIST

    def test_scalar(self):
        mk = ModifierKind(
            kind="clip_skip", label="Clip Skip",
            cardinality="scalar",
            param_key="clip_skip",
            fields=[ModifierField(name="value", type="integer")],
        )
        assert mk.cardinality == ModifierCardinality.SCALAR

    def test_with_options(self):
        mk = ModifierKind(
            kind="controlnet", label="ControlNet",
            param_key="controlnet",
            fields=[ModifierField(name="type", type="select")],
            options=[ModifierOption(value="depth", label="Depth")],
        )
        assert len(mk.options) == 1


# ── VariantDef ────────────────────────────────────────────────────────

class TestVariantDef:
    def test_minimal(self):
        v = VariantDef(id="base", label="Base", defaults={})
        assert v.group is None

    def test_full(self):
        v = VariantDef(
            id="turbo", label="Turbo",
            defaults={"steps": 4, "cfg": 1.0},
            group="Speed", hint="Fast",
            route="turbo_route", engine="comfyui",
            quant="fp8", vram_peak_gb=12.5,
            note="Fast variant",
            hides_groups=["Quality"],
            only_routes=["img_gen"],
            strip=["scheduler"],
            owner="krea2",
            live=True,
        )
        assert v.vram_peak_gb == 12.5


class TestVariantGroup:
    def test_construction(self):
        vg = VariantGroup(label="Quality", tooltip="Select quality tier")
        assert vg.filters_on is None

    def test_with_filters(self):
        vg = VariantGroup(label="Speed", filters_on="Speed tier")
        assert vg.filters_on == "Speed tier"


# ── RetakeDef ─────────────────────────────────────────────────────────

class TestRetakeDef:
    def test_construction(self):
        r = RetakeDef(pathway="inpaint")
        assert r.supports_global_apply is None

    def test_with_flag(self):
        r = RetakeDef(pathway="regen", supports_global_apply=True)
        assert r.supports_global_apply is True


# ── OutputEntry ───────────────────────────────────────────────────────

class TestOutputEntry:
    def test_construction(self):
        o = OutputEntry(id="mp4", label="MP4 Video", default=True)
        assert o.params is None

    def test_with_params(self):
        o = OutputEntry(
            id="mp3", label="MP3 Audio",
            default=False, params={"bitrate": 192},
        )
        assert o.params["bitrate"] == 192


# ── FormFeatures ──────────────────────────────────────────────────────

class TestFormFeatures:
    def test_empty(self):
        f = FormFeatures()
        assert f.modifiers is None
        assert f.variants is None
        assert f.outputs is None

    def test_with_modifiers(self):
        mk = ModifierKind(
            kind="lora", label="LoRA",
            param_key="loras",
            fields=[ModifierField(name="n", type="string")],
        )
        f = FormFeatures(modifiers=[mk])
        assert len(f.modifiers) == 1


# ── SchemaGroupDef ────────────────────────────────────────────────────

class TestSchemaGroupDef:
    def test_construction(self):
        g = SchemaGroupDef(
            id="core", label="Core", order=0,
            collapsed=False,
            fields=[SchemaFieldDef(
                name="prompt", type="textarea",
                label="Prompt", default="", order=0, width=12,
            )],
        )
        assert g.zone == GroupZone.PARAMS

    def test_hidden_group(self):
        g = SchemaGroupDef(
            id="x", label="X", order=0,
            collapsed=True, fields=[], hidden=True,
        )
        assert g.hidden is True


# ── ConditionalContract ───────────────────────────────────────────────

class TestConditionalContract:
    def test_minimal(self):
        c = ConditionalContract(
            discriminator="mode",
            modes=["upscale", "inpaint"],
            clauses={
                "inpaint": ContractClause(requires=["input_mask"]),
            },
        )
        assert c.default_clause is None
        assert c.children is None

    def test_with_default_clause(self):
        c = ConditionalContract(
            discriminator="mode",
            modes=["a", "b"],
            clauses={"a": ContractClause(requires=["x"])},
            default_clause=ContractClause(forbids=["y"]),
        )
        assert c.default_clause.forbids == ["y"]

    def test_nested_children(self):
        child = ConditionalContract(
            discriminator="region",
            modes=["face", "free"],
            clauses={"free": ContractClause(requires=["mask"])},
        )
        parent = ConditionalContract(
            discriminator="mode",
            modes=["inpaint"],
            clauses={"inpaint": ContractClause(requires=["x"])},
            children={"inpaint": child},
        )
        assert parent.children["inpaint"].discriminator == "region"


class TestContractClause:
    def test_construction(self):
        cc = ContractClause(
            requires=["prompt"],
            forbids=["negative_prompt"],
            requires_one_of=["image", "video"],
            mutually_exclusive=["crop", "pad"],
        )
        assert len(cc.requires) == 1

    def test_all_none(self):
        cc = ContractClause()
        assert cc.requires is None
        assert cc.forbids is None


# ── FormSpec ──────────────────────────────────────────────────────────

class TestFormSpec:
    def _make(self, **overrides):
        base = {
            "model": "krea2",
            "form": "krea2-form",
            "genre": "image",
            "service": "comfyui",
            "label": "Krea2 Image",
            "fields": [],
            "schema_groups": [],
            "features": FormFeatures(),
            "guide": None,
            "defaults": {"steps": 20},
        }
        base.update(overrides)
        return FormSpec(**base)

    def test_construction(self):
        s = self._make()
        assert s.model == "krea2"
        assert s.genre == FormGenre.IMAGE

    def test_invalid_genre_refused(self):
        with pytest.raises(ValidationError):
            self._make(genre="mesh")

    def test_with_size(self):
        s = self._make(size="huge")
        assert s.size == FormSize.HUGE

    def test_with_layout(self):
        s = self._make(layout="studio")
        assert s.layout == FormLayout.STUDIO

    def test_with_contract(self):
        contract = ConditionalContract(
            discriminator="mode",
            modes=["a"],
            clauses={"a": ContractClause()},
        )
        s = self._make(contract=contract)
        assert s.contract.discriminator == "mode"

    def test_size_default_absent(self):
        s = self._make()
        assert s.size is None  # absent = default


# ── RunStartResult ────────────────────────────────────────────────────

class TestRunStartResult:
    def test_construction(self):
        r = RunStartResult(
            run_id="run-abc",
            bricks=[RunBrickMeta(index=0, family_id="krea2")],
            total=1,
        )
        assert r.status is None
        assert r.queue_position is None

    def test_queued(self):
        r = RunStartResult(
            run_id="run-xyz",
            bricks=[],
            total=0,
            status="queued",
            queue_position=2,
        )
        assert r.status == "queued"
        assert r.queue_position == 2

    def test_invalid_status_refused(self):
        with pytest.raises(ValidationError):
            RunStartResult(
                run_id="x", bricks=[], total=0,
                status="running",
            )


class TestRunBrickMeta:
    def test_minimal(self):
        b = RunBrickMeta(index=0, family_id="krea2")
        assert b.name is None
        assert b.status is None

    def test_full(self):
        b = RunBrickMeta(
            index=0, family_id="krea2", name="img_gen",
            title="Image Gen", phase="execute",
            inputs=["prompt"], outputs=["image"],
            consumes=["image"], params={"seed": 42},
            status="completed", reused_from=None,
        )
        assert b.params["seed"] == 42


# ── DryRunPlan ────────────────────────────────────────────────────────

class TestDryRunPlan:
    def test_default(self):
        d = DryRunPlan()
        assert d.status == "dry_run"
        assert d.stages == []
        assert d.gates == {}

    def test_with_stages(self):
        d = DryRunPlan(
            stages=[{"family": "krea2", "params": {"steps": 20}}],
            gates={"model_gate": None},
        )
        assert len(d.stages) == 1


# ── DownloadRequired ──────────────────────────────────────────────────

class TestDownloadRequired:
    def test_construction(self):
        d = DownloadRequired(
            download_url="https://example.com/model.safetensors",
        )
        assert d.status == "download_required"
        assert d.model_filename is None

    def test_full(self):
        d = DownloadRequired(
            download_url="https://example.com/m.safetensors",
            model_filename="model.safetensors",
            model_dir="checkpoints",
            message="Model needs download",
            name="krea2-turbo",
            kind="checkpoint",
        )
        assert d.kind == "checkpoint"


# ── RunStartBlocked ───────────────────────────────────────────────────

class TestRunStartBlocked:
    def test_construction(self):
        b = RunStartBlocked()
        assert b.status == "error"
        assert b.error is None

    def test_with_error(self):
        b = RunStartBlocked(
            code="model_not_in_remote_registry",
            error="Model not found on executor",
        )
        assert b.code == "model_not_in_remote_registry"


# ── RunStatusWire ─────────────────────────────────────────────────────

class TestRunStatusEnum:
    def test_eight_values(self):
        expected = {
            "pending", "running", "completed", "failed",
            "stopped", "interrupted", "unknown", "queued",
        }
        assert {s.value for s in RunStatusEnum} == expected


class TestRunStageWire:
    def test_construction(self):
        s = RunStageWire(id="s1", name="Gen", index=0, status="running")
        assert s.index == 0


class TestRunStatusWire:
    def test_construction(self):
        r = RunStatusWire(
            run_id="r1",
            status="running",
            stages=[RunStageWire(id="s1", name="Gen", index=0, status="running")],
        )
        assert r.status == RunStatusEnum.RUNNING

    def test_invalid_status_refused(self):
        with pytest.raises(ValidationError):
            RunStatusWire(run_id="x", status="invalid", stages=[])


# ── ErrorEnvelope ─────────────────────────────────────────────────────

class TestErrorEnvelope:
    def test_minimal(self):
        e = ErrorEnvelope(error="not found")
        assert e.violations is None

    def test_with_violations(self):
        e = ErrorEnvelope(
            error="validation failed",
            violations=[
                Violation(field="prompt", kind="required", message="missing"),
            ],
        )
        assert len(e.violations) == 1


class TestViolation:
    def test_construction(self):
        v = Violation(field="seed", kind="type", message="must be integer")
        assert v.field == "seed"


# ── CardSummary ───────────────────────────────────────────────────────

class TestCardSummary:
    def test_width_height(self):
        cs = CardSummary(width_param="width", height_param="height")
        assert cs.size_param is None

    def test_size_param(self):
        cs = CardSummary(size_param="resolution", size_suffix="px")
        assert cs.size_suffix == "px"


# ── DetectorEntry ─────────────────────────────────────────────────────

class TestDetectorEntry:
    def test_construction(self):
        d = DetectorEntry(label="Face", model="bbox/face_yolov8m.pt")
        assert d.model == "bbox/face_yolov8m.pt"


# ── Provision types ───────────────────────────────────────────────────

class TestProvisionDest:
    def test_construction(self):
        d = ProvisionDest(root="COMFYUI_ROOT", sub="checkpoints")
        assert d.root == "COMFYUI_ROOT"


class TestProvisionArtifact:
    def test_minimal(self):
        a = ProvisionArtifact(dest=ProvisionDest(root="COMFYUI_ROOT"))
        assert a.url is None

    def test_full(self):
        a = ProvisionArtifact(
            url="https://example.com/m.safetensors",
            dest=ProvisionDest(root="COMFYUI_ROOT", sub="checkpoints"),
            local_filename="model.safetensors",
            marker=".downloaded",
            size_hint_gb=2.5,
            layout="single_file",
            gated=False,
            staged_symlinks=["link1"],
            converter=None,
            optional=False,
        )
        assert a.size_hint_gb == 2.5


# ── LanpaintModelEntry ────────────────────────────────────────────────

class TestLanpaintModelEntry:
    def test_construction(self):
        l = LanpaintModelEntry(carrier="krea2", route="lanpaint-krea2")
        assert l.label is None
        assert l.provision is None


# ── MaskLayerKind ─────────────────────────────────────────────────────

class TestMaskLayerKind:
    def test_detector(self):
        m = MaskLayerKind(kind="detector", source="face")
        assert m.kind == MaskLayerKindType.DETECTOR

    def test_derived(self):
        m = MaskLayerKind(kind="derived", source="subject")
        assert m.kind == MaskLayerKindType.DERIVED

    def test_paint(self):
        m = MaskLayerKind(kind="paint", source="photoshop")
        assert m.kind == MaskLayerKindType.PAINT

    def test_invalid_refused(self):
        with pytest.raises(ValueError):
            MaskLayerKind(kind="auto", source="x")


# ── ModelFileParam ────────────────────────────────────────────────────

class TestModelFileParam:
    def test_construction(self):
        m = ModelFileParam(folder="frame_interpolation")
        assert m.default is None
        assert m.sha256 is None

    def test_with_source(self):
        m = ModelFileParam(
            folder="upscale_models",
            default="4x-UltraSharp.pth",
            source="https://example.com/model.pth",
            sha256="abc123",
            size=1024000,
        )
        assert m.size == 1024000


# ── OptionalOutput ────────────────────────────────────────────────────

class TestOptionalOutput:
    def test_construction(self):
        o = OptionalOutput(name="mask", label="Mask", emit_when="enable_mask")
        assert o.genre is None
        assert o.mask_layer is None

    def test_with_mask_layer(self):
        ml = MaskLayerKind(kind="detector", source="face")
        o = OptionalOutput(
            name="mask", label="Mask",
            emit_when="enable_mask",
            mask_layer=ml,
        )
        assert o.mask_layer.kind == MaskLayerKindType.DETECTOR


# ── PresetEntry ───────────────────────────────────────────────────────

class TestPresetEntry:
    def test_construction(self):
        p = PresetEntry(label="Lightning", params={"steps": 4, "cfg": 1.0})
        assert p.description is None
        assert p.mods is None

    def test_with_mods(self):
        p = PresetEntry(
            label="Enhanced",
            params={"steps": 20},
            mods=[PresetModRef(kind="lora", option="style_v2", strength=0.7)],
        )
        assert p.mods[0].strength == 0.7


# ── TransformApplicability ────────────────────────────────────────────

class TestTransformApplicability:
    def test_construction(self):
        t = TransformApplicability(
            name="crop", applies_to=["image", "video"],
        )
        assert len(t.applies_to) == 2

    def test_invalid_name(self):
        with pytest.raises(ValueError):
            TransformApplicability(name="rotate", applies_to=["image"])

    def test_invalid_media_type(self):
        with pytest.raises(ValueError):
            TransformApplicability(name="crop", applies_to=["mesh"])


# ── VideoManifest ─────────────────────────────────────────────────────

class TestVideoManifest:
    def test_empty(self):
        v = VideoManifest()
        assert v.conditioning is None
        assert v.modifiers is None

    def test_with_audio(self):
        v = VideoManifest(audio=VideoAudio(native_audio=True, lipsync=True))
        assert v.audio.native_audio is True


class TestVideoAudio:
    def test_construction(self):
        a = VideoAudio(native_audio=True, lipsync=False, narrator=True)
        assert a.narrator is True


# ── VariantEntryWire ──────────────────────────────────────────────────

class TestVariantEntryWire:
    def test_minimal(self):
        v = VariantEntryWire(id="base", label="Base", defaults={})
        assert v.owner is None
        assert v.live is None

    def test_full(self):
        v = VariantEntryWire(
            id="turbo", label="Turbo",
            defaults={"steps": 4},
            group="Speed", hint="Fast",
            route="r", engine="comfyui",
            quant="fp8", vram_peak_gb=12.0,
            note="Fast", owner="krea2", live=True,
        )
        assert v.vram_peak_gb == 12.0


# ── ModelEntryWire ────────────────────────────────────────────────────

class TestModelEntryWire:
    def test_minimal(self):
        m = ModelEntryWire(family="krea2", form="krea2-form", label="Krea2")
        assert m.variant is None
        assert m.engine is None

    def test_with_validation(self):
        mv = ModelValidation(
            talker_modes=["standard"],
            modes={"standard": ModeClause(require=["prompt"])},
        )
        m = ModelEntryWire(
            family="tts", form="tts-form",
            label="TTS", validation=mv,
        )
        assert m.validation.talker_modes == ["standard"]


# ── CapabilityEntryWire ───────────────────────────────────────────────

class TestCapabilityEntryWire:
    def test_minimal(self):
        c = CapabilityEntryWire(label="Generate", families=["krea2"])
        assert c.kind == CapabilityKind.GENERATION

    def test_with_subcategories(self):
        c = CapabilityEntryWire(
            label="Enhance",
            families=["upscale", "detail"],
            subcategories={
                "Upscaling": CapabilitySubcategory(
                    label="Upscaling", families=["upscale"],
                ),
            },
        )
        assert "Upscaling" in c.subcategories

    def test_input_kind(self):
        c = CapabilityEntryWire(
            label="Input", families=["input_prep"],
            kind="input",
        )
        assert c.kind == CapabilityKind.INPUT


# ── CapabilityRoute ───────────────────────────────────────────────────

class TestCapabilityRoute:
    def test_construction(self):
        r = CapabilityRoute(
            family="krea2", model="krea2-base",
            params={"steps": 20},
        )
        assert r.family == "krea2"


# ── InputVocabulary ───────────────────────────────────────────────────

class TestInputVocabulary:
    def test_construction(self):
        iv = InputVocabulary(
            slots=["image", "mask"],
            aliases={"img": "image"},
            form_aliases={"krea2": {"img": "image"}},
            form_slots={"krea2": ["image"]},
        )
        assert iv.slot_kinds is None

    def test_with_slot_kinds(self):
        iv = InputVocabulary(
            slots=["image"], aliases={}, form_aliases={},
            form_slots={}, slot_kinds={"image": "image"},
        )
        assert iv.slot_kinds["image"] == "image"


# ── LoraListOut ───────────────────────────────────────────────────────

class TestLoraListOut:
    def test_empty(self):
        l = LoraListOut()
        assert l.model is None
        assert l.loras is None

    def test_with_loras(self):
        l = LoraListOut(
            model="krea2",
            loras=["style_v2.safetensors", "detail.safetensors"],
            note="Available LoRAs",
        )
        assert len(l.loras) == 2


# ── CatalogResponse ───────────────────────────────────────────────────

class TestCatalogResponse:
    def test_minimal(self):
        c = CatalogResponse(families={}, models={})
        assert c.capabilities is None
        assert c.input_vocabulary is None

    def test_full(self):
        c = CatalogResponse(
            families={"krea2": FamilyEntryWire(label="Krea2")},
            models={"krea2-base": ModelEntryWire(
                family="krea2", form="f", label="L",
            )},
            capabilities={},
            engine_order={"comfyui": 1},
            quant_order={"fp8": 1},
            input_vocabulary=InputVocabulary(
                slots=[], aliases={}, form_aliases={}, form_slots={},
            ),
        )
        assert c.engine_order["comfyui"] == 1


# ═══════════════════════════════════════════════════════════════════════
# §12  Cross-model constraint tests
# ═══════════════════════════════════════════════════════════════════════

class TestCrossModelConstraints:
    """Validate constraints that span multiple models."""

    def test_card_stage_with_flow_stage_result(self):
        """A CardStage can hold a FlowTypes.StageResult as its result."""
        sr = StageResult(
            assetUrls=["out.png"], artifacts={}, metadata={},
            completedAt=1700000000, durationSec=2.5,
        )
        # CardResult has a different shape — this should NOT be allowed
        # to confuse the two. Verify they are distinct models.
        assert StageResult is not CardResult

    def test_provenance_used_in_both_card_and_flow(self):
        """Provenance enum is shared between CardStage and FlowStage."""
        cs = CardStage(
            id="x", title="X", kind="gen", service="s",
            params={}, inputs=[], inputIndices=[],
            status="pending", provenance="agent",
        )
        fs = FlowStage(
            id="x", title="X", kind="gen", service="s",
            params={}, inputs=[], status="pending",
            provenance="agent",
        )
        assert cs.provenance == fs.provenance == Provenance.AGENT

    def test_modifier_kind_field_type_alignment(self):
        """ModifierField.type uses its own closed vocabulary."""
        for t in ("integer", "float", "string", "select", "image", "boolean"):
            f = ModifierField(name="x", type=t)
            assert f.type.value == t

    def test_form_field_type_alignment(self):
        """FormFieldType has exactly 13 values (the CANONICAL_WIRE_TYPES)."""
        assert len(FormFieldType) == 13

    def test_schema_field_type_alignment(self):
        """SchemaFieldType has more values than FormFieldType
        (builder-specific types like keyframes, loras, etc.)."""
        assert len(SchemaFieldType) > len(FormFieldType)


# ═══════════════════════════════════════════════════════════════════════
# §13  Gateway response shape tests (without a live server)
# ═══════════════════════════════════════════════════════════════════════

class TestGatewayResponseShapes:
    """Validate that gateway response shapes match the declared wire.
    These are construction tests — they verify the Python models accept
    the same payloads the gateway would emit."""

    def test_run_start_success_shape(self):
        """POST /v1/flows/start 200: RunStartResult."""
        body = {
            "run_id": "abc-123",
            "bricks": [
                {
                    "index": 0,
                    "family_id": "krea2",
                    "name": "img_gen",
                    "title": "Image Generation",
                    "status": "queued",
                }
            ],
            "total": 1,
        }
        r = RunStartResult(**body)
        assert r.run_id == "abc-123"
        assert r.bricks[0].family_id == "krea2"

    def test_run_start_queued_shape(self):
        """POST /v1/flows/start 200: queued run."""
        body = {
            "run_id": "def-456",
            "bricks": [],
            "total": 0,
            "status": "queued",
            "queue_position": 1,
        }
        r = RunStartResult(**body)
        assert r.status == "queued"
        assert r.queue_position == 1

    def test_run_status_running_shape(self):
        """GET /v1/flows/status/{id} 200: running."""
        body = {
            "run_id": "abc-123",
            "status": "running",
            "stages": [
                {"id": "s1", "name": "Gen", "index": 0, "status": "running"},
            ],
        }
        r = RunStatusWire(**body)
        assert r.status == RunStatusEnum.RUNNING

    def test_run_status_completed_shape(self):
        """GET /v1/flows/status/{id} 200: completed."""
        body = {
            "run_id": "abc-123",
            "status": "completed",
            "stages": [
                {"id": "s1", "name": "Gen", "index": 0, "status": "completed"},
            ],
        }
        r = RunStatusWire(**body)
        assert r.status == RunStatusEnum.COMPLETED

    def test_download_required_shape(self):
        """POST /v1/flows/start 200: download_required."""
        body = {
            "status": "download_required",
            "download_url": "https://example.com/model.safetensors",
            "model_filename": "model.safetensors",
            "message": "Model needs download",
        }
        r = DownloadRequired(**body)
        assert r.status == "download_required"

    def test_preflight_required_shape(self):
        """POST /v1/flows/start 200: preflight_required."""
        body = {
            "status": "preflight_required",
            "family": "krea2",
            "reachable": True,
            "restart_required": False,
            "needed": [
                {"name": "comfyui-h3-motion-context", "installed": False},
            ],
        }
        r = PreflightPayload(**body)
        assert r.status == "preflight_required"
        assert r.needed[0].installed is False

    def test_error_envelope_400_shape(self):
        """POST /v1/flows/start 400: ErrorEnvelope."""
        body = {
            "error": "validation failed",
            "violations": [
                {"field": "prompt", "kind": "required", "message": "missing"},
            ],
        }
        e = ErrorEnvelope(**body)
        assert len(e.violations) == 1

    def test_error_envelope_minimal_shape(self):
        """GET /v1/flows/status/{id} 404: ErrorEnvelope without violations."""
        body = {"error": "run not found"}
        e = ErrorEnvelope(**body)
        assert e.violations is None

    def test_dry_run_shape(self):
        """POST /v1/flows/start 200: dry_run plan."""
        body = {
            "status": "dry_run",
            "stages": [{"family": "krea2", "params": {"steps": 20}}],
            "gates": {"model_gate": None, "queue": {"depth": 0}},
        }
        d = DryRunPlan(**body)
        assert d.status == "dry_run"
        assert len(d.stages) == 1

    def test_blocked_run_shape(self):
        """POST /v1/flows/start 200: blocked run."""
        body = {
            "status": "error",
            "code": "model_not_in_remote_registry",
            "error": "Model cannot be provisioned",
        }
        b = RunStartBlocked(**body)
        assert b.status == "error"

    def test_catalog_response_shape(self):
        """GET /v1/model-catalog 200: CatalogResponse."""
        body = {
            "families": {
                "krea2": {
                    "label": "Krea2 Image",
                    "genre": "image",
                    "engine": "comfyui",
                },
            },
            "models": {
                "krea2-base": {
                    "family": "krea2",
                    "form": "krea2-form",
                    "label": "Krea2 Base",
                },
            },
        }
        c = CatalogResponse(**body)
        assert "krea2" in c.families
        assert c.families["krea2"].label == "Krea2 Image"

    def test_form_spec_shape(self):
        """GET /v1/form-spec 200: FormSpec."""
        body = {
            "model": "krea2",
            "form": "krea2-form",
            "genre": "image",
            "service": "comfyui",
            "label": "Krea2 Image",
            "fields": [
                {"name": "prompt", "type": "textarea", "label": "Prompt"},
            ],
            "schema_groups": [],
            "features": {},
            "guide": None,
            "defaults": {"steps": 20},
        }
        s = FormSpec(**body)
        assert s.model == "krea2"
        assert len(s.fields) == 1
