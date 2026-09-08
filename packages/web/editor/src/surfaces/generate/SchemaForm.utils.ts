/** Extracted from SchemaForm.tsx for React Fast Refresh. */
export function buildPayload(
  model: string,
  values: Record<string, unknown>,
  extra?: Record<string, unknown>,
  allowedFields?: ReadonlySet<string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model,
    ...extra,
  }

  // Track what was INTENTIONALLY dropped vs. silently dropped. The
  // distinction matters: null/undefined/empty-array are legitimate
  // "user didn't set this" signals, but allowedFields filtering a
  // non-default value is a SILENT DROP if the field is still in the
  // live schema. We log the allowedFields drops so they're traceable.
  const droppedByFilter: string[] = []

  for (const [key, val] of Object.entries(values)) {
    if (val === null || val === undefined) continue
    if (Array.isArray(val) && val.length === 0) continue
    if (allowedFields && !allowedFields.has(key)) {
      droppedByFilter.push(key)
      continue
    }
    payload[key] = val
  }

  // SILENT PARAMETER DROPS ARE UNACCEPTABLE: if allowedFields filtering
  // dropped any field, log a console warning so it's traceable in dev.
  // This is NOT a hard error — allowedFields filtering is intentional
  // (stale values after model swap) — but it MUST be visible, never silent.
  if (droppedByFilter.length > 0) {
    console.warn(
      `[buildPayload] ${droppedByFilter.length} field(s) dropped by allowedFields filter: ` +
        `[${droppedByFilter.join(", ")}]. These values were in form state but not in ` +
        `the current model's schema field set. If this is unexpected, it's a silent drop.`,
    )
  }

  return payload
}
