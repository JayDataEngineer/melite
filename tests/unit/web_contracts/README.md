# Web Contract Pydantic Tests

Python-side pydantic mirrors of every TypeScript wire type in `packages/web-kit/contracts/src/`.
These models and tests serve ONLY the test suite — the gateway's own pydantic
models (in `python/`) remain the runtime authority.

## Architecture

```
packages/web-kit/contracts/src/schema.d.ts   ←  auto-generated from /openapi.json
packages/web-kit/contracts/src/card.ts       ←  manual TS types
packages/web-kit/contracts/src/FlowTypes.ts  ←  manual TS types
... (13 TypeScript files)

tests/unit/web_contracts/models.py  ←  1:1 pydantic mirrors
tests/unit/web_contracts/test_wire_contracts.py  ←  181 validation tests
```

The flow:

1. The Python gateway emits JSON responses validated by its own pydantic models.
2. The TypeScript `schema.d.ts` is auto-generated from the gateway's `/openapi.json`.
3. Other `.ts` files (`card.ts`, `FlowTypes.ts`, etc.) are hand-authored contracts.
4. **These Python models** mirror all TypeScript types 1:1.
5. **These tests** validate every constraint: enum membership, frozen models,
   nested structure, gateway response shapes, cross-model invariants.

## When to update

- **TypeScript contract changes**: add a field, tighten a type, or change a
  vocabulary → update `models.py` to match, then verify these tests pass.
- **Gateway response changes**: if the gateway starts emitting a new shape,
  add a gateway response shape test here.
- **New TypeScript files**: add corresponding pydantic models and tests.

## Running

```bash
# Just this suite
pytest tests/unit/web_contracts/ -v

# All unit tests
pytest tests/unit/ -v
```

## Test categories

| Section | Tests | What it validates |
|---------|-------|-------------------|
| §1 Vocabularies | 3 | Closed enum membership, case sensitivity |
| §2 CardStage | 15 | The unified card view-model, CompoundBlock, progress |
| §3 LoRAEntry | 4 | Strength range, frozen |
| §4 Character | 5 | IdentityModel closed set, frozen |
| §5 Wire types | 8 | PluginRow, UiSlotEntry, ThemeEntry |
| §6 Preflight | 5 | PreflightPayload, action vocabulary |
| §7 Media | 6 | MediaCategory, MediaAsset, MediaRun |
| §8 Enhance | 2 | EnhanceModel |
| §9 Regions | 1 | AssetViewerMode |
| §10 FlowTypes | 12 | FlowDoc, FlowStage, FlowStatus, StageResult |
| §11 Schema.d.ts | 50+ | FormField, FormSpec, ModifierKind, VariantDef, contracts, etc. |
| §12 Cross-model | 5 | Shared vocabularies, type distinctness |
| §13 Gateway shapes | 12 | RunStartResult, ErrorEnvelope, CatalogResponse, etc. |
