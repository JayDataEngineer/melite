/**
 * artifact-address — the estate-artifact address codec, the one home of
 * the format (2026-09-10's cross-plugin contract, in-tree since the
 * mesh tab landed): `dsh-resource://estate-artifact/<b64url of the
 * same-origin artifact URL>`. Run artifacts live outside the DSH
 * workspace, so no document owner can read them; the native seam for
 * addressable non-workspace content is a resource address claimed by
 * this package's own tab type (the mesh seat). Both directions live
 * here because both seats ride this package — minting in MediaPanel,
 * decoding in the tab body.
 */

/** The address kind this package claims (see client index.ts). */
export const ARTIFACT_PREFIX = 'dsh-resource://estate-artifact/'

function b64uEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64uDecode(seg: string): string {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - seg.length % 4) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Mint one estate-artifact address from an artifact URL. */
export function estateArtifactAddress(url: string): string {
  return ARTIFACT_PREFIX + b64uEncode(url)
}

/** The artifact URL behind one estate-artifact address — null when the
 *  address is not ours or its segment is malformed (a foreign or
 *  corrupt address never renders a tab body; the caller voices the
 *  refusal honestly). A valid non-empty segment cannot decode to an
 *  empty string (atob rejects padding-only inputs), so no length
 *  re-check follows the decode. */
export function artifactUrlOfAddress(address: string): string | null {
  if (!address.startsWith(ARTIFACT_PREFIX)) return null
  const seg = address.slice(ARTIFACT_PREFIX.length)
  if (seg.length === 0) return null
  try {
    return b64uDecode(seg)
  } catch {
    return null
  }
}
