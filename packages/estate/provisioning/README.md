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

## Provider runtime

`ComfyUiManagerHttpClient` is a structural client for the ComfyUI-Manager HTTP rail. It bounds request duration, request size, and response size, preserves HTTP refusal details in `ManagerClientError`, and turns a queue that reaches its deadline into `queue-timeout`.

`ComfyUiManagerProvider` implements `ManagerPort`. Registry rows are matched by exact registry id and repository, and an explicitly declared version must appear in Manager's version response before the row is queued. A declared git ref is routed only to the pinned provider; it never falls back to `latest`.

`PinnedGitExtensionProvider` fetches URL/ref rows into a confined custom-node root with an injected or default bounded git runner. Existing directories must resolve to the fetched commit and origin or installation refuses. Explicit pip requirements require a supplied post-install adapter.

`InMemoryOperationStore` and `FileOperationStore` implement `OperationStorePort`. The file adapter writes one atomically replaced JSON record per operation and reloads it through a fresh adapter instance.

## Current slice

The package is intentionally independent of current callers. Composition supplies the declaration plus any inspector, lifecycle, Manager, and store instances it chooses. Integration work can mount the provider in an estate profile and adapt existing management, CLI, and model-serving callers to `ctx.provisioning` without adding a second downloader or hash implementation.

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

- Engine inspection, lifecycle, and declaration providers remain composition responsibilities of the caller.
- The pinned git provider installs declared source refs; repository-owned dependency and install scripts still depend on the target ComfyUI/Manager runtime.
- The package has no existing caller wiring in this isolated slice.
