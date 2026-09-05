"""melite_models — models as python classes; cascade = inheritance."""

from .grammar import (  # noqa: F401
    Cell, Variant, Model, ModelRow, SourceRow, LoraRow, CellArtifact,
    VariantGroup, GuideSection, PromptGuide, Provision, Studio,
    StudioKind,
    LaneInputs,
    Quant, DestRoot, _repo_py_root,
    # closed-vocabulary enums (PYTHON SHAPE LAW rung 3: a closed
    # set is a TYPE — a typo refuses construction, not a runtime
    # node mismatch or a wall that only fires when the lane trips)
    Genre, ClipType, LatentNode,
    ModelError, model_row, load_model_py, load_mod, scan_engine_models,
    has_model_yaml, validate_against_cards,
)

__all__ = [
    "Cell", "Variant", "Model", "ModelRow", "SourceRow", "LoraRow",
    "CellArtifact", "VariantGroup", "GuideSection", "PromptGuide",
    "Provision", "Studio", "StudioKind", "LaneInputs", "Quant", "DestRoot", "_repo_py_root", "ModelError",
    "Genre", "ClipType", "LatentNode",
    "model_row", "load_model_py",
    "load_mod", "scan_engine_models", "has_model_yaml",
    "validate_against_cards",
]
