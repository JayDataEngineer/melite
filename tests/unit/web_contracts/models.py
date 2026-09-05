"""Pydantic mirrors of every TypeScript wire type in web/contracts/src/.

These models are the Python-side SSOT for the web contract validation
tests.  They are derived 1:1 from the TypeScript definitions — every
field, every enum, every nested structure.  They live in tests/ because
they serve ONLY the test suite; the gateway's own pydantic models (in
py/) remain the runtime authority.

PYTHON SHAPE LAW compliance:
  - Frozen models (data-is-instances rule)
  - Closed vocabularies are enums
  - Construction validation at build time (no post-hoc scans)
  - No stringly handshakes — typed rows and Literal unions

Design record: tests/unit/web_contracts/README.md
"""

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════
# §1  vocab.ts  — frozen vocabularies
# ═══════════════════════════════════════════════════════════════════════

class Provenance(str, Enum):
    AGENT = "agent"
    USER = "user"
    IMPORTED = "imported"


# ═══════════════════════════════════════════════════════════════════════
# §2  card.ts  — CardStage unified view-model
# ═══════════════════════════════════════════════════════════════════════

class CardGenre(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    THREE_D = "3d"
    MOTION = "motion"
    OTHER = "other"
    TEXT = "text"


class CardTag(str, Enum):
    """Orthogonal to genre — provenance/descriptor badges. 'ai_generated'
    is the demoted former-genre (a tag describes HOW, never WHAT kind)."""
    AI_GENERATED = "ai_generated"


class CompoundMode(str, Enum):
    FANOUT = "fanout"
    FLOW = "flow"
    MODIFIERS = "modifiers"


class CardStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    QUEUED = "queued"
    DONE = "done"
    ERROR = "error"
    STALE = "stale"
    CACHED = "cached"
    SKIPPED = "skipped"
    REUSED = "reused"


class CardProgress(BaseModel, frozen=True):
    value: int
    max: int
    node: str | None = None


class CardResult(BaseModel, frozen=True):
    assetUrls: list[str]
    artifacts: dict[str, str]
    metadata: dict[str, Any]
    durationSec: float | None = None
    gallery: list[dict[str, str]] | None = None
    motionPreviews: list[dict[str, Any]] | None = None


class ActivityLine(BaseModel, frozen=True):
    phase: str
    node: str | None = None
    node_class: str | None = None
    message: str | None = None


class CompoundBlock(BaseModel, frozen=True):
    mode: CompoundMode
    childIds: list[str]
    yamlFlow: str | None = None
    paramKey: str | None = None


class CardStage(BaseModel, frozen=True):
    id: str
    title: str
    subtitle: str | None = None
    kind: str  # open seam vocabulary (cardSeam)
    service: str
    genre: CardGenre | None = None
    params: dict[str, Any]
    inputs: list[str]
    inputOutputs: list[str | None] | None = None
    inputIndices: list[int]
    result: CardResult | None = None
    status: CardStatus
    error: str | None = None
    console: str | None = None
    comfyGraph: Any | None = None
    progress: CardProgress | None = None
    activity: ActivityLine | None = None
    runId: str | None = None
    provenance: Provenance | None = None
    saveToAssets: bool | None = None
    meta: dict[str, Any] | None = None
    compound: CompoundBlock | None = None


class TilePlayAffordance(BaseModel, frozen=True):
    verb: str
    icon: Literal["play", "reroll"]


# ═══════════════════════════════════════════════════════════════════════
# §3  loraTypes.ts
# ═══════════════════════════════════════════════════════════════════════

class LoRAEntry(BaseModel, frozen=True):
    name: str
    strength: float


# ═══════════════════════════════════════════════════════════════════════
# §4  character.ts
# ═══════════════════════════════════════════════════════════════════════

class IdentityModel(str, Enum):
    SOMA = "soma"
    MHR = "mhr"
    ANNY = "anny"


class Character(BaseModel, frozen=True):
    identityModel: IdentityModel
    coeffs: list[float] | None = None
    localChanges: dict[str, float] | None = None
    customTargets: dict[str, float] | None = None


# ═══════════════════════════════════════════════════════════════════════
# §5  wire.ts  — plugin-facing wire row types
# ═══════════════════════════════════════════════════════════════════════

class PluginRow(BaseModel, frozen=True):
    id: str
    version: str
    name: str
    enabled: bool
    lanes: list[str]
    root: str
    hooks: int | None = None


class UiSlotEntry(BaseModel, frozen=True):
    plugin: str
    id: str
    slot: str
    precedence: int
    title: str | None = None


class ThemeEntry(BaseModel, frozen=True):
    plugin: str
    id: str
    label: str
    description: str | None = None
    dark: bool
    vars: dict[str, str]


# ═══════════════════════════════════════════════════════════════════════
# §6  preflightTypes.ts
# ═══════════════════════════════════════════════════════════════════════

class PreflightNeededEntry(BaseModel, frozen=True):
    name: str
    applies: bool | None = None
    reason: str | None = None
    url: str | None = None
    pip: list[str] | None = None
    ref: str | None = None
    title: str | None = None
    author: str | None = None
    description: str | None = None
    nodes: list[str] | None = None
    installed: bool | None = None
    action: Literal["clone", "clone+pip"] | None = None
    restart_required: bool | None = None


class PreflightPayload(BaseModel, frozen=True):
    status: Literal["preflight_required"] = "preflight_required"
    family: str
    reachable: bool
    restart_required: bool
    needed: list[PreflightNeededEntry]


# ═══════════════════════════════════════════════════════════════════════
# §7  mediaTypes.ts
# ═══════════════════════════════════════════════════════════════════════

class MediaCategory(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    MESH = "mesh"
    MOTION = "motion"
    AUDIO = "audio"
    OTHER = "other"


class MediaRun(BaseModel, frozen=True):
    run_id: str
    status: str | None = None
    prompt: str | None = None
    thumbnail: str | None = None
    created_at: int | None = None
    params: dict[str, Any] | None = None
    artifacts: list[dict[str, Any]] | None = None
    families: list[str] | None = None


class MediaAsset(BaseModel, frozen=True):
    id: str
    runId: str
    name: str
    category: MediaCategory
    url: str
    type: str
    size: int
    prompt: str
    thumbnail: str
    createdAt: int
    runStatus: str
    runParams: dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════
# §8  enhanceTypes.ts
# ═══════════════════════════════════════════════════════════════════════

class EnhanceModel(BaseModel, frozen=True):
    id: str
    name: str
    baseUrl: str
    apiKey: str
    model: str
    keyId: str | None = None


# ═══════════════════════════════════════════════════════════════════════
# §9  regions.ts
# ═══════════════════════════════════════════════════════════════════════

class AssetViewerMode(str, Enum):
    TILE = "tile"
    FULL = "full"


# ═══════════════════════════════════════════════════════════════════════
# §10  FlowTypes.ts
# ═══════════════════════════════════════════════════════════════════════

class FlowStatus(str, Enum):
    DRAFT = "draft"
    READY = "ready"
    RUNNING = "running"
    QUEUED = "queued"
    DONE = "done"
    FAILED = "failed"
    STALE = "stale"


class FlowStageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    QUEUED = "queued"
    DONE = "done"
    ERROR = "error"
    STALE = "stale"
    CACHED = "cached"


class StageResult(BaseModel, frozen=True):
    assetUrls: list[str]
    artifacts: dict[str, str]
    metadata: dict[str, Any]
    completedAt: int
    durationSec: float


class StudioTarget(str, Enum):
    POSE = "pose"
    DIRECTOR = "director"
    BODY = "body"


class FlowStage(BaseModel, frozen=True):
    id: str
    title: str
    subtitle: str | None = None
    kind: str
    service: str
    params: dict[str, Any]
    inputs: list[str]
    inputOutputs: list[str | None] | None = None
    result: StageResult | None = None
    status: FlowStageStatus
    error: str | None = None
    cacheKey: str | None = None
    progress: dict[str, Any] | None = None
    activity: ActivityLine | None = None
    provenance: Provenance | None = None
    saveToAssets: bool | None = None
    runId: str | None = None
    yamlFlow: str | None = None
    yamlRunId: str | None = None
    studio: StudioTarget | None = None
    studioContext: dict[str, Any] | None = None
    compound: CompoundBlock | None = None


class FlowDoc(BaseModel, frozen=True):
    id: str
    intent: str
    name: str | None = None
    stages: list[FlowStage]
    status: FlowStatus
    createdAt: int
    completedAt: int | None = None
    yamlFlow: str | None = None
    yamlRunId: str | None = None
    specBaseline: dict[int, dict[str, Any]] | None = None


# ═══════════════════════════════════════════════════════════════════════
# §11  schema.d.ts  — the OpenAPI-generated wire types
# ═══════════════════════════════════════════════════════════════════════

# ── Form field types ──────────────────────────────────────────────────

class FormFieldType(str, Enum):
    TEXTAREA = "textarea"
    TEXT = "text"
    NUMBER = "number"
    SEED = "seed"
    SELECT = "select"
    FILE = "file"
    BOOLEAN = "boolean"
    STRINGLIST = "stringlist"
    IMAGE = "image"
    IMAGE_LIST = "image_list"
    VIDEO = "video"
    AUDIO = "audio"
    VOICE_FILE = "voice_file"


class FormFieldSection(str, Enum):
    INPUT = "input"
    CORE = "core"
    ADVANCED = "advanced"


class FormFieldOption(BaseModel, frozen=True):
    value: str
    label: str


class FormField(BaseModel, frozen=True):
    name: str
    type: FormFieldType
    label: str | None = None
    default: Any = None
    options: list[str | FormFieldOption] | None = None
    required: bool | None = None
    step: int | None = None
    tooltip: str | None = None
    section: FormFieldSection | None = None
    order: int | None = None


# ── Modifier types ────────────────────────────────────────────────────

class ModifierFieldType(str, Enum):
    INTEGER = "integer"
    FLOAT = "float"
    STRING = "string"
    SELECT = "select"
    IMAGE = "image"
    BOOLEAN = "boolean"


class ModifierField(BaseModel, frozen=True):
    name: str
    type: ModifierFieldType
    label: str | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    options: list[str] | None = None
    default: Any | None = None
    tooltip: str | None = None


class ModifierOption(BaseModel, frozen=True):
    value: str
    label: str
    tooltip: str | None = None
    model: str | None = None
    source: str | None = None
    defaults: dict[str, Any] | None = None
    installed: bool | None = None
    metadata: dict[str, Any] | None = None


class ModifierCardinality(str, Enum):
    LIST = "list"
    SCALAR = "scalar"


class ModifierKind(BaseModel, frozen=True):
    kind: str
    label: str
    cardinality: ModifierCardinality = ModifierCardinality.LIST
    max_stack: int | None = None
    param_key: str
    fields: list[ModifierField]
    options: list[ModifierOption] | None = None
    upload_dir: str | None = None
    options_scanned: bool | None = None
    tooltip: str | None = None
    declaration_only: bool | None = None
    order: int | None = None


# ── Variant types ─────────────────────────────────────────────────────

class VariantDef(BaseModel, frozen=True):
    id: str
    label: str
    defaults: dict[str, Any]
    group: str | None = None
    hint: str | None = None
    route: str | None = None
    engine: str | None = None
    quant: str | None = None
    vram_peak_gb: float | None = None
    note: str | None = None
    hides_groups: list[str] | None = None
    only_routes: list[str] | None = None
    strip: list[str] | None = None
    owner: str | None = None
    live: bool | None = None


class VariantGroup(BaseModel, frozen=True):
    label: str
    tooltip: str | None = None
    filters_on: str | None = None


# ── Retake ────────────────────────────────────────────────────────────

class RetakeDef(BaseModel, frozen=True):
    pathway: str
    supports_global_apply: bool | None = None


# ── Output entry ──────────────────────────────────────────────────────

class OutputEntry(BaseModel, frozen=True):
    id: str
    label: str
    default: bool = False
    params: dict[str, Any] | None = None


# ── Form features ─────────────────────────────────────────────────────

class FormFeatures(BaseModel, frozen=True):
    modifiers: list[ModifierKind] | None = None
    variants: list[VariantDef] | None = None
    variant_groups: dict[str, VariantGroup] | None = None
    retake: RetakeDef | None = None
    outputs: list[OutputEntry] | None = None


# ── Prompt guide ──────────────────────────────────────────────────────

class PromptGuideSection(BaseModel, frozen=True):
    label: str
    body: str | None = None
    code: str | None = None
    items: list[Any] | None = Field(default=None, alias="list")


class PromptGuide(BaseModel, frozen=True):
    title: str | None = None
    sections: list[PromptGuideSection] | None = None


# ── Schema groups ─────────────────────────────────────────────────────

class SchemaFieldType(str, Enum):
    NUMBER = "number"
    SLIDER = "slider"
    SELECT = "select"
    BOOLEAN = "boolean"
    TEXT = "text"
    TEXTAREA = "textarea"
    SEED = "seed"
    FILE = "file"
    IMAGE = "image"
    IMAGE_LIST = "image_list"
    VIDEO = "video"
    AUDIO = "audio"
    VOICE_FILE = "voice_file"
    KEYFRAMES = "keyframes"
    PROMPT_BEATS = "prompt_beats"
    CAMERA = "camera"
    LORAS = "loras"
    CONTROLNET = "controlnet"
    MOTION_VIDEO = "motion_video"
    RETAKE = "retake"
    IDEOGRAM_CANVAS = "ideogram_canvas"
    AUDIO_SEGMENTS = "audio_segments"
    VIDEO_SEGMENTS = "video_segments"
    IC_LORA_MOTION_VIDEOS = "ic_lora_motion_videos"
    TIMELINE_EDITOR = "timeline_editor"


class WidgetType(str, Enum):
    POSE_STUDIO = "pose_studio"
    VOICE_PICKER = "voice_picker"
    VOICE_PICKER_LIST = "voice_picker_list"


class SchemaFieldDef(BaseModel, frozen=True):
    name: str
    type: SchemaFieldType
    label: str
    default: Any
    min: float | None = None
    max: float | None = None
    step: float | None = None
    options: list[str | FormFieldOption] | None = None
    tooltip: str | None = None
    visible_when: str | None = None
    order: int
    width: int
    extension: str | None = None
    widget: WidgetType | None = None


class GroupZone(str, Enum):
    OUTPUTS = "outputs"
    INPUTS = "inputs"
    MODEL = "model"
    PARAMS = "params"
    MODS = "mods"


class GroupLayout(str, Enum):
    GRID = "grid"
    ROW = "row"
    STACKED = "stacked"


class SchemaGroupDef(BaseModel, frozen=True):
    id: str
    label: str
    tooltip: str | None = None
    order: int
    collapsed: bool
    visible_when: str | None = None
    fields: list[SchemaFieldDef]
    columns: int | None = None
    layout: GroupLayout | None = None
    hidden: bool | None = None
    zone: GroupZone = GroupZone.PARAMS


# ── Conditional contract ──────────────────────────────────────────────

class ContractClause(BaseModel, frozen=True):
    requires: list[str] | None = None
    forbids: list[str] | None = None
    requires_one_of: list[str] | None = None
    mutually_exclusive: list[str] | None = None


class ConditionalContract(BaseModel, frozen=True):
    discriminator: str
    modes: list[str]
    clauses: dict[str, ContractClause]
    default_clause: ContractClause | None = None
    children: dict[str, "ConditionalContract"] | None = None


# ── FormSpec ──────────────────────────────────────────────────────────

class FormGenre(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    THREE_D = "3d"
    MOTION = "motion"
    TEXT = "text"


class FormSize(str, Enum):
    DEFAULT = "default"
    HUGE = "huge"


class FormLayout(str, Enum):
    FORM = "form"
    STUDIO = "studio"


class FormSpec(BaseModel, frozen=True):
    model: str
    form: str
    genre: FormGenre
    service: str
    label: str
    sidebar_key: str | None = None
    fields: list[FormField]
    schema_groups: list[SchemaGroupDef]
    features: FormFeatures
    guide: PromptGuide | None = None
    enhance_prompt: str | None = None
    enhance_prompts: dict[str, str] | None = None
    defaults: dict[str, Any]
    size: FormSize | None = None
    layout: FormLayout | None = None
    loader_info: Any | None = None
    contract: ConditionalContract | None = None


# ── Run start / stop ──────────────────────────────────────────────────

class RunStartRequest(BaseModel, frozen=False):  # extra="allow" in the wire
    route: bool | None = None
    flow: dict[str, Any] | None = None
    yaml: str | None = None
    model: str | None = None
    pipe: dict[str, Any] | None = None
    stage_id: str | None = None
    start_from: int | None = None
    stop_after: int | None = None
    reuse_run_id: str | int | None = None
    overrides: dict[str, Any] | None = None
    name: str | None = None
    prompt: str | None = None
    seed: str | int | None = None
    negative_prompt: str | None = None
    extra_params: dict[str, Any] | None = None
    params: dict[str, Any] | None = None
    dry_run: bool | None = None


class RunBrickMeta(BaseModel, frozen=True):
    index: int
    family_id: str
    name: str | None = None
    title: str | None = None
    phase: str | None = None
    inputs: list[str] | None = None
    outputs: list[str] | None = None
    consumes: list[str] | None = None
    params: dict[str, Any] | None = None
    status: str | None = None
    reused_from: str | None = None


class RunStartResult(BaseModel, frozen=True):
    run_id: str
    bricks: list[RunBrickMeta]
    total: int
    status: Literal["queued"] | None = None
    queue_position: int | None = None
    yaml_filename: str | None = None


class DryRunPlan(BaseModel, frozen=True):
    status: Literal["dry_run"] = "dry_run"
    stages: list[dict[str, Any]] = Field(default_factory=list)
    gates: dict[str, Any] = Field(default_factory=dict)
    filename: str | None = None


class DownloadRequired(BaseModel, frozen=True):
    status: Literal["download_required"] = "download_required"
    download_url: str
    model_filename: str | None = None
    model_dir: str | None = None
    message: str | None = None
    name: str | None = None
    kind: str | None = None


class RunStartBlocked(BaseModel, frozen=True):
    status: Literal["error"] = "error"
    code: str | None = None
    error: str | None = None


# ── Run status wire ───────────────────────────────────────────────────

class RunStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"
    INTERRUPTED = "interrupted"
    UNKNOWN = "unknown"
    QUEUED = "queued"


class RunStageWire(BaseModel, frozen=True):
    id: str
    name: str
    index: int
    status: str


class RunStatusWire(BaseModel, frozen=True):
    run_id: str
    status: RunStatusEnum
    stages: list[RunStageWire]


# ── Error envelope ────────────────────────────────────────────────────

class Violation(BaseModel, frozen=True):
    field: str
    kind: str
    message: str


class ErrorEnvelope(BaseModel, frozen=True):
    error: str
    violations: list[Violation] | None = None


# ── Card summary ──────────────────────────────────────────────────────

class CardSummary(BaseModel, frozen=True):
    width_param: str | None = None
    height_param: str | None = None
    size_param: str | None = None
    size_suffix: str | None = None


# ── Detector ──────────────────────────────────────────────────────────

class DetectorEntry(BaseModel, frozen=True):
    label: str
    model: str


# ── Lanpaint ──────────────────────────────────────────────────────────

class ProvisionDest(BaseModel, frozen=True):
    root: str
    sub: str | None = None


class ProvisionArtifact(BaseModel, frozen=True):
    url: str | None = None
    dest: ProvisionDest
    local_filename: str | None = None
    marker: str | None = None
    size_hint_gb: float | None = None
    layout: str | None = None
    gated: bool | None = None
    staged_symlinks: list[str] | None = None
    converter: str | None = None
    optional: bool | None = None


class LanpaintModelEntry(BaseModel, frozen=True):
    carrier: str
    route: str
    label: str | None = None
    source: str | None = None
    provision: ProvisionArtifact | None = None
    defaults: dict[str, Any] | None = None


# ── Mask layer kind ───────────────────────────────────────────────────

class MaskLayerKindType(str, Enum):
    DETECTOR = "detector"
    DERIVED = "derived"
    PAINT = "paint"


class MaskLayerKind(BaseModel, frozen=True):
    kind: MaskLayerKindType
    source: str


# ── Model file param ──────────────────────────────────────────────────

class ModelFileParam(BaseModel, frozen=True):
    folder: str
    default: str | None = None
    required_when: str | None = None
    source: str | None = None
    sources: dict[str, str] | None = None
    sha256: str | None = None
    size: int | None = None


# ── Modifier entry ────────────────────────────────────────────────────

class ModifierEntry(BaseModel, frozen=True):
    pathway: str


# ── Optional output ───────────────────────────────────────────────────

class OptionalOutput(BaseModel, frozen=True):
    name: str
    label: str
    emit_when: str
    genre: str | None = None
    tooltip: str | None = None
    icon: str | None = None
    mask_layer: MaskLayerKind | None = None


# ── Preset ────────────────────────────────────────────────────────────

class PresetModRef(BaseModel, frozen=True):
    kind: str
    option: str
    strength: float | None = None


class PresetEntry(BaseModel, frozen=True):
    label: str
    description: str | None = None
    params: dict[str, Any]
    mods: list[PresetModRef] | None = None
    only_routes: list[str] | None = None


# ── Provisioning ──────────────────────────────────────────────────────

class ProvisioningSpec(BaseModel, frozen=True):
    artifacts: list[ProvisionArtifact] | None = None
    serves: list[str] | None = None
    converter_out_dir: ProvisionDest | None = None
    converter_outputs: list[str] | None = None
    optional: bool | None = None
    notes: str | None = None


# ── Studio binding ────────────────────────────────────────────────────

class StudioBindingWire(BaseModel, frozen=True):
    tenant: str
    owns_params: bool = False
    writes: list[str]
    size: str = "normal"
    layout: str = "studio"


# ── Transform applicability ───────────────────────────────────────────

class TransformName(str, Enum):
    CROP = "crop"
    SCALE = "scale"
    TRIM = "trim"
    VOLUME = "volume"


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class TransformApplicability(BaseModel, frozen=True):
    name: TransformName
    applies_to: list[MediaType]


# ── Video manifest ────────────────────────────────────────────────────

class VideoAudio(BaseModel, frozen=True):
    native_audio: bool | None = None
    lipsync: bool | None = None
    narrator: bool | None = None


class VideoManifest(BaseModel, frozen=True):
    conditioning: list[str] | None = None
    modifiers: dict[str, ModifierEntry] | None = None
    audio: VideoAudio | None = None
    retake: RetakeDef | None = None
    latent_upscale: bool | None = None
    extra_params: list[str] | None = None


# ── Family entry wire ─────────────────────────────────────────────────

class FamilyEntryWire(BaseModel, frozen=True):
    label: str
    id: str | None = None
    description: str | None = None
    text_encoder: str | None = None
    vae: str | None = None
    clip_type: str | None = None
    prompt_guide: PromptGuide | None = None
    variant_groups: dict[str, VariantGroup] | None = None
    default_model: str | None = None
    text_projection: str | None = None
    file_sizes_gb: dict[str, float] | None = None
    download_note: str | None = None
    loader: str | None = None
    engine: str | None = None
    genre: str | None = None
    tile: str | None = None
    tile_order: int | None = None
    accepts: list[MediaType] | None = None
    provisioning: ProvisioningSpec | None = None
    transforms: list[TransformApplicability] | None = None
    card_summary: CardSummary | None = None
    video: VideoManifest | None = None
    audio_vae: str | None = None
    defaults: dict[str, Any] | None = None
    lora_dir: str | None = None
    modifiers: list[ModifierKind] | None = None
    detectors: dict[str, DetectorEntry] | None = None
    detail_checkpoint: str | None = None
    sam_model: str | None = None
    model_file_params: dict[str, ModelFileParam] | None = None
    primary_output: str | None = None
    optional_outputs: list[OptionalOutput] | None = None
    outputs: list[OutputEntry] | None = None
    presets: dict[str, PresetEntry] | None = None
    lanpaint_models: list[LanpaintModelEntry] | None = None
    studio: StudioBindingWire | None = None


# ── Variant entry wire ────────────────────────────────────────────────

class VariantEntryWire(BaseModel, frozen=True):
    id: str
    label: str
    defaults: dict[str, Any]
    group: str | None = None
    hint: str | None = None
    route: str | None = None
    engine: str | None = None
    quant: str | None = None
    vram_peak_gb: float | None = None
    note: str | None = None
    hides_groups: list[str] | None = None
    only_routes: list[str] | None = None
    strip: list[str] | None = None
    owner: str | None = None
    live: bool | None = None


# ── Model entry wire ──────────────────────────────────────────────────

class ModelEntryWire(BaseModel, frozen=True):
    family: str
    form: str
    label: str
    variant_label: str | None = None
    variant: str | None = None
    quant: str | None = None
    source: str | None = None
    text_encoder: str | None = None
    vae: str | None = None
    clip_type: str | None = None
    loader: str | None = None
    variants: list[VariantEntryWire] | None = None
    defaults: dict[str, Any] | None = None
    presets: dict[str, PresetEntry] | None = None
    routing: dict[str, Any] | None = None
    artifact_families: list[str] | None = None
    lora_catalog: dict[str, Any] | None = None
    provision: ProvisionArtifact | None = None
    controlnet_only: bool | None = None
    hide_from_dropdown: bool | None = None
    edit_only: bool | None = None
    modifiers: list[ModifierKind] | None = None
    canvas_editor: bool | None = None
    canvas_default: bool | None = None
    template: str | None = None
    engine: str | None = None
    checkpoint: str | None = None
    shape: str | None = None
    required_files: list[str] | None = None
    validation: "ModelValidation | None" = None
    timeout_floor: float | None = None
    aura_shift: float | None = None
    dit_model: str | None = None
    vae_model: str | None = None
    download_note: str | None = None
    sha256: str | None = None
    size: int | None = None
    upscale_model: str | None = None
    provisioned: bool | None = None
    input: str | None = None
    input_slots: list[str] | None = None
    prompt_in_form: bool | None = None


# ── Model validation ──────────────────────────────────────────────────

class ModeClause(BaseModel, frozen=True):
    require: list[str] | None = None
    require_one_of: list[str] | None = None
    ignore: list[str] | None = None


class ModelValidation(BaseModel, frozen=True):
    talker_modes: list[str]
    modes: dict[str, ModeClause]


# ── Capability ────────────────────────────────────────────────────────

class CapabilityKind(str, Enum):
    GENERATION = "generation"
    INPUT = "input"


class CapabilityRoute(BaseModel, frozen=True):
    family: str
    model: str
    params: dict[str, Any]


class CapabilitySubcategory(BaseModel, frozen=True):
    label: str
    families: list[str]


class CapabilityEntryWire(BaseModel, frozen=True):
    label: str
    description: str | None = None
    default_family: str | None = None
    families: list[str]
    default_params: dict[str, Any] | None = None
    icon: str | None = None
    kind: CapabilityKind = CapabilityKind.GENERATION
    subcategories: dict[str, CapabilitySubcategory] | None = None
    resolved: CapabilityRoute | None = None
    routes: list[CapabilityRoute] | None = None


# ── Input vocabulary ──────────────────────────────────────────────────

class InputVocabulary(BaseModel, frozen=True):
    slots: list[str]
    aliases: dict[str, str]
    form_aliases: dict[str, dict[str, str]]
    form_slots: dict[str, list[str]]
    slot_kinds: dict[str, str] | None = None


# ── Lora list out ─────────────────────────────────────────────────────

class LoraListOut(BaseModel, frozen=True):
    model: str | None = None
    loras: list[str] | None = None
    note: str | None = None
    meta: dict[str, Any] | None = None


# ── Catalog response ──────────────────────────────────────────────────

class CatalogResponse(BaseModel, frozen=True):
    families: dict[str, FamilyEntryWire]
    models: dict[str, ModelEntryWire]
    capabilities: dict[str, CapabilityEntryWire] | None = None
    engine_order: dict[str, int] | None = None
    quant_order: dict[str, int] | None = None
    input_vocabulary: InputVocabulary | None = None
