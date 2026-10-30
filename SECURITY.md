# Security Policy

## Supported surfaces

Melite ships as npm packages (the `@melite/*` and `@melite-plugin/*`
scopes, `next` channel) installed into a DSH profile, and as a public
source repository. The estate runs locally: it talks to the engines you
configure (ComfyUI and friends) and keeps its state under the per-user
data home or a root you name.

## Reporting a vulnerability

Open a private security advisory at
<https://github.com/JayDataEngineer/melite/security/advisories/new>.
Please do not open a public issue for anything exploitable. Reports are
triaged in the advisory thread; fix releases ride the normal release
pipeline and credit reporters in the release notes unless you ask
otherwise.

## Local secrets posture

- Engine and provider keys a consumer seats live in their own DSH
  profile configuration — never in this repository, never in a
  published tarball.
- A lock or state root you name is treated as trusted local state; the
  estate refuses relative roots at boot (one writer per root).
- The release pipeline mints every tarball in CI with Sigstore
  build-provenance attestations verifiable via
  `gh attestation verify <tarball> --repo JayDataEngineer/melite`.
