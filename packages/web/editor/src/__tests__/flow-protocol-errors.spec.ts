/**
 * Full-error surfacing (2026-08-10): the run protocol must never truncate
 * the backend's error report.
 *
 * REGRESSION: the error path used to `slice(0, 200)` the HTTP body, which
 * cut "Flow doc parse error: ... Validation failed: N violation(s)"
 * reports mid-sentence — the modal showed half an error with no way to see
 * the rest (user: "can I the full errors in the modals?"). The contract
 * now:
 *   - `describeErrorBody` extracts the backend's `{"error": "..."}` string
 *     UNESCAPED (real newlines) — a multi-line validation report renders
 *     as lines, not `\n` escapes.
 *   - Non-JSON bodies (proxy error pages) keep a generous 2000-char cap —
 *     they're not our error reports, and the useful part is up front.
 *   - Non-JSON-parseable / error-less JSON bodies fall through unchanged.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { describeErrorBody, runCompiledGeneration } from "@melite/catalog"

function mkResponse(opts: {
  ok?: boolean
  status?: number
  text?: string
}): Response {
  const status = opts.status ?? 200
  const ok = opts.ok ?? (status >= 200 && status < 300)
  return {
    ok,
    status,
    statusText: "",
    headers: new Map(),
    url: "",
    redirected: false,
    type: "basic",
    body: null,
    bodyUsed: false,
    clone: () => mkResponse(opts),
    // Parse the text when it's JSON — apiJson consumes res.json() and some
    // mocked responses (the catalog self-boot fetch) must hand back a real
    // object, not the empty default.
    json: () => {
      try {
        return Promise.resolve(JSON.parse(opts.text ?? ""))
      } catch {
        return Promise.resolve({})
      }
    },
    text: () => Promise.resolve(opts.text ?? ""),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── describeErrorBody — the extraction contract ─────────────────────────

describe("describeErrorBody", () => {
  it("extracts the backend error string UNESCAPED (real newlines)", () => {
    const wire = JSON.stringify({
      error: "Flow doc parse error: \n────\nValidation failed: 1 violation(s) found.\n────\nstage 1: no image",
    })
    const out = describeErrorBody(wire)
    expect(out).toContain("\n────\n")
    expect(out).toContain("Validation failed: 1 violation(s) found.")
    expect(out).toContain("stage 1: no image")
    // The escaped form must NOT leak through (backslash-n instead of \n):
    expect(out).not.toContain("\\n")
  })

  it("returns non-JSON text unchanged", () => {
    expect(describeErrorBody("<html>502 Bad Gateway</html>")).toBe(
      "<html>502 Bad Gateway</html>",
    )
  })

  it("returns JSON without a string error field unchanged", () => {
    const body = JSON.stringify({ status: "broken" })
    expect(describeErrorBody(body)).toBe(body)
  })

  it("returns empty text unchanged", () => {
    expect(describeErrorBody("")).toBe("")
  })
})

// ── runCompiledGeneration — full body through the throw ─────────────────

describe("runCompiledGeneration error surfacing", () => {
  // The pre-submit family-param gate (2026-08-14) dynamically imports
  // modelCatalog on the first call. The module-level self-boot is
  // Vitest-gated (2026-08-15), but any explicit catalog load would consume
  // a single-shot mock; route it to a benign empty catalog. Every other
  // fetch (the COMPILE-FIRST validate POST and the run POST — both carry
  // the same body) gets the controlled response: these tests pin refusal
  // surfacing, and refusals now arrive at COMPILE time.
  function routeFetch(runResponse: Response) {
    fetchMock.mockImplementation((input: unknown) => {
      if (String(input).startsWith("/v1/model-catalog")) {
        return Promise.resolve(
          mkResponse({
            status: 200,
            text: JSON.stringify({ families: {}, models: {} }),
          }),
        )
      }
      // CARD BIRTH LAW (2026-09-06): the run composes its card FIRST
      // (POST /v1/flows/drafts → {draftId}) — serve the mint so these
      // tests exercise their subject (the COMPILE/START refusal), not
      // the compose. A refused compose is pinned separately.
      if (String(input).endsWith("/v1/flows/drafts")) {
        return Promise.resolve(
          mkResponse({
            status: 200,
            text: JSON.stringify({ draftId: "draft-test-protocol-errors" }),
          }),
        )
      }
      return Promise.resolve(runResponse)
    })
  }

  it("throws the FULL backend error report, untruncated", async () => {
    // A report long enough that the old 200-char slice would cut it:
    const violation = "stage 'mask': input slot image1 expects IMAGE, got MASK"
    const longError = `Flow doc parse error: \n${"─".repeat(80)}\nValidation failed: 1 violation(s) found.\n${"─".repeat(80)}\n${violation}`
    const body = JSON.stringify({ error: longError })
    routeFetch(mkResponse({ status: 400, text: body }))

    let msg = ""
    try {
      await runCompiledGeneration({ model: "x" })
      expect.unreachable("must throw on a 400")
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toBe(`card failed to compile: HTTP 400: ${longError}`)
    // The tail past 200 chars — where the old slice cut — is present:
    expect(msg).toContain(violation)
  })

  it("keeps the status code and prefix in the message", async () => {
    routeFetch(
      mkResponse({ status: 400, text: JSON.stringify({ error: "bad model" }) }),
    )
    await expect(runCompiledGeneration({ model: "x" })).rejects.toThrow(
      /card failed to compile: HTTP 400: bad model/,
    )
  })

  it("appends every 400 violation as its own line (the dotted paths survive)", async () => {
    // The door's param-validation 400s carry {violations: [{field, kind,
    // message}]} — a bare headline would silently DROP them (the user must
    // see WHICH param failed). Migrated from the dry-run suite (2026-08-16):
    // the envelope contract is a REAL-run property, not a dry-run one.
    routeFetch(
      mkResponse({
        status: 400,
        text: JSON.stringify({
          error:
            "Parameter validation failed — one or more stages sent params their family signature does not accept.",
          violations: [
            {
              field: "flow stage#0 (qwen-img-edit-2511).params.loras[0].strength",
              kind: "invalid",
              message: "9 is above the declared maximum 5.0",
            },
          ],
        }),
      }),
    )
    let msg = ""
    try {
      await runCompiledGeneration({ model: "qwen-img-edit-2511-int8", prompt: "x" })
      expect.unreachable("must throw on a 400")
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain("card failed to compile: HTTP 400")
    expect(msg).toContain("loras[0].strength")
    expect(msg).toContain("above the declared maximum")
  })
})

// ── the SEND-boundary fossil migration (2026-09-06) ───────────────────
// A pre-id-flip card may still carry loras rows keyed `name` (client
// state that predates the flip). The compile door refuses the fossil
// key LOUDLY — so the send path migrates them BEFORE the validate
// POST: the operator's next click compiles, no manual surgery. This
// pins the POSTed body, not just the absence of a throw.

describe("runCompiledGeneration lora send-boundary migration", () => {
  it("POSTs fossil {name} rows as {id} rows — the validate body is already migrated", async () => {
    let posted: Record<string, unknown> | null = null
    fetchMock.mockImplementation((input: unknown, init?: RequestInit) => {
      if (String(input).startsWith("/v1/model-catalog")) {
        return Promise.resolve(
          mkResponse({ status: 200, text: JSON.stringify({ families: {}, models: {} }) }),
        )
      }
      // CARD BIRTH LAW (2026-09-06): compose-first — the compose mints
      // so the refusal under test arrives on the VALIDATE post.
      if (String(input).endsWith("/v1/flows/drafts")) {
        return Promise.resolve(
          mkResponse({ status: 200, text: JSON.stringify({ draftId: "draft-test-fossil" }) }),
        )
      }
      if (String(input).includes("/v1/flows/validate")) {
        posted = JSON.parse(String(init?.body)) as Record<string, unknown>
        // refuse — we only care about the body that LEFT the client
        return Promise.resolve(
          mkResponse({ status: 400, text: JSON.stringify({ error: "stop" }) }),
        )
      }
      return Promise.resolve(mkResponse({ status: 400, text: JSON.stringify({ error: "stop" }) }))
    })

    await expect(
      runCompiledGeneration({
        model: "krea-2",
        prompt: "x",
        loras: [
          { name: "krea2_realism_lora", strength: 0.7 }, // fossil
          { id: "krea2_darkbrush", strength: 1 },        // already id-keyed
        ],
      }),
    ).rejects.toThrow(/card failed to compile/)

    expect(posted).not.toBeNull()
    const loras = (posted as { loras: Array<Record<string, unknown>> }).loras
    expect(loras).toEqual([
      { id: "krea2_realism_lora", strength: 0.7 },
      { id: "krea2_darkbrush", strength: 1 },
    ])
    // the fossil key NEVER re-leaves the client
    expect(JSON.stringify(posted)).not.toContain('"name"')
  })

  it("a fossil row missing strength leaves with the 1.0 house default", async () => {
    let posted: Record<string, unknown> | null = null
    fetchMock.mockImplementation((input: unknown, init?: RequestInit) => {
      if (String(input).startsWith("/v1/model-catalog")) {
        return Promise.resolve(
          mkResponse({ status: 200, text: JSON.stringify({ families: {}, models: {} }) }),
        )
      }
      // CARD BIRTH LAW (2026-09-06): compose-first — the compose mints
      // (its body carries the same migrated loras); the VALIDATE post
      // is the `posted` under assertion.
      if (String(input).endsWith("/v1/flows/drafts")) {
        return Promise.resolve(
          mkResponse({ status: 200, text: JSON.stringify({ draftId: "draft-test-fossil-default" }) }),
        )
      }
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Promise.resolve(mkResponse({ status: 400, text: JSON.stringify({ error: "stop" }) }))
    })
    await expect(
      runCompiledGeneration({ model: "krea-2", prompt: "x", loras: [{ name: "a_lora" }] }),
    ).rejects.toThrow()
    expect((posted as { loras: Array<Record<string, unknown>> }).loras).toEqual([
      { id: "a_lora", strength: 1 },
    ])
  })
})
