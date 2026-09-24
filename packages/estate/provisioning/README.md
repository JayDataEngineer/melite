# @melite/estate-provisioning

`@melite/estate-provisioning` is the Cordis service definition and provider for declared model and extension resources. It owns resource plans, per-resource operation state, shared acquisition locks, verified model artifact landing, and typed lifecycle ports. It does not import an engine, management, queue, or model-serving implementation.

## Service

Mount `provisioningProvider` with a `ProvisioningConfig`:

```ts
import { provisioningProvider } from "@melite/estate-provisioning";

await ctx.plugin({
  name: "estate-provisioning",
  apply: provisioningProvider.apply,
  config: {
    declaration,
    storeRoot: "/configured/model/store",
  },
});
```

The provider registers `ctx.provisioning` under the service name `provisioning`. The declaration port is the only source of declared plan rows. Model plans retain their URL, digest, size, destination, and provider. Extension plans retain their registry, URL, ref, version, requirements, and node types.

## Contracts

The public contracts in `src/contracts.ts` are closed, discriminated TypeScript types. `ResourceRef`, `ProvisionPlan`, `ResourceStatus`, `ProvisionOperation`, and `ProvisionResult` contain only serializable fields. The service methods are:

- `inspect(ref, signal?)`
- `plan(ref)`
- `ensure(ref, options?, signal?)`
- `activate(ref, options?, signal?)`
- `acquireExternal(request, options?, signal?)`
- `reconcile(ref?, signal?)`

`ensure` shares one in-flight operation for each resource key. A result reports `active`, `restart_required`, `partial`, `failed`, `cancelled`, or `blocked`; a multi-item operation is `partial` when at least one item lands and another item does not.

## Ports

`DeclarationPort` resolves full declared plans. `ArtifactWriterPort` and `ArtifactFetcher` isolate model acquisition. `ManagerPort`, `InspectorPort`, and `LifecyclePort` isolate extension installation, fresh engine inspection, and guarded restart. `OperationStorePort` receives serializable operation snapshots when durable storage is mounted.

External URL acquisition is a separate operator-confirmed operation. It is not reachable through declared-resource `ensure` or `activate` calls.

## Artifact writer

`VerifiedArtifactWriter` confines destinations beneath the configured root, writes to `<destination>.part-<operation-id>`, hashes the temporary file in bounded chunks, compares the declared SHA-256 and optional size, and atomically renames only verified bytes. Cancellation and every failed verification remove the temporary file. Existing symlinks and symlinked path components are refused.

## Current slice

The package is intentionally independent of current callers. Composition supplies the declaration, artifact writer, and optional provider ports. Integration work can mount the provider in an estate profile and adapt existing management, CLI, and model-serving callers to `ctx.provisioning` without adding a second downloader or hash implementation.

## Model Experience

None, as this package does not add model-visible context.

### Request context and condition

#### What the model sees

No model-visible fields are added by this package.

#### Token effect

None.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- Manager, engine inspection, lifecycle, declaration, and durable operation-store providers remain composition responsibilities of the caller.
- The provider does not yet perform HTTP or ComfyUI protocol work itself; those concerns belong behind the typed ports.
- The package has no existing caller wiring in this isolated slice.
