// @contract gates-runs-error-fold
// runs-error-fold.spec.ts — THE TERMINAL ERROR TEXT NEVER SAYS
// "[object Object]" (qa8 F38).
//
// THE BURN: run_status returned `Error: [object Object]` for a real
// OOM before serving the real traceback on re-poll — a plain-object
// throw met String() in errText and the run's error column went
// vacuous. The operator called it "cosmetic but worth a guard"; the
// guard is a law: a thrown value renders by its own words.
//
// THE LAW: errText's message half rides foldThrownValue — an Error's
// message, a bare string verbatim, an object's message/error string
// fields first, then its JSON, then its key roster (circular /
// unserializable). No input in the thrown zoo can produce
// "[object Object]" at this door. managePreflight's miss rows ride
// the same fold through errDetail (the 200-char row budget).
import { describe, expect, test } from 'vitest'
import { errText, foldThrownValue } from '../src/runsTypes.ts'

describe('the thrown-value fold (F38)', () => {
  test('an Error renders its name and message unchanged', () => {
    expect(errText(new TypeError('CUDA out of memory'))).toBe(
      'TypeError: CUDA out of memory',
    )
  })

  test('a bare string is verbatim, a number renders', () => {
    expect(errText('the handoff refused')).toBe('Error: the handoff refused')
    expect(foldThrownValue(42)).toBe('42')
  })

  test('the burn face: a plain object speaks its message field, not [object Object]', () => {
    // the exact old shape: errText read String(err) → "Error: [object Object]"
    expect(errText({ message: 'CUDA out of memory' })).toBe(
      'Error: CUDA out of memory',
    )
  })

  test('an object folds to its JSON when no known field carries words', () => {
    expect(foldThrownValue({ node: '12', type: 'cuda error' })).toBe(
      '{"node":"12","type":"cuda error"}',
    )
  })

  test('message wins over error wins over detail/reason; empty words fall through', () => {
    expect(foldThrownValue({ error: 'boom', detail: 'x' })).toBe('boom')
    expect(foldThrownValue({ message: '', error: 'boom' })).toBe('boom')
    expect(foldThrownValue({ detail: 'the seat died', reason: 'r' })).toBe(
      'the seat died',
    )
  })

  test('a circular object folds to its key roster', () => {
    const a: Record<string, unknown> = { code: 7 }
    a['self'] = a
    expect(foldThrownValue(a)).toBe('{ code, self }')
  })

  test('an unserializable value (BigInt) folds to its key roster', () => {
    expect(foldThrownValue({ n: 1n })).toBe('{ n }')
  })

  test('an empty object renders {} — honest, never vacuous-by-accident', () => {
    expect(foldThrownValue({})).toBe('{}')
    expect(foldThrownValue(Object.create(null))).toBe('{}')
  })

  test('the thrown zoo never emits "[object Object]" at this door', () => {
    const fn = (): number => 1
    const zoo: unknown[] = [
      {},
      Object.create(null),
      [],
      [1, [2]],
      { message: { deep: true } },
      null,
      undefined,
      42,
      Symbol('s'),
      fn,
      new Date(0),
      /re/,
      { reason: 'the handoff refused', code: 7 },
    ]
    for (const v of zoo) {
      expect(errText(v)).not.toContain('[object Object]')
    }
  })

  test('the EXACT-string law (W-11, friction3): a long terminal error rides WHOLE — never a ledger-style cut', () => {
    // friction3 line 88: the ledger truncates ("create_causal_…"),
    // run_status carries the full one — "on failures, go to
    // run_status first". errText is where the run's error column
    // is born; a slice anywhere here would quietly demote the
    // run_status row to the ledger's 400-char echo. A message
    // past every known cap (ledger 400, managePreflight 200) must
    // survive byte-for-byte.
    const long = 'ComfyError: ComfyUI run failed: TypeError: create_causal_mask() got an unexpected keyword argument ' + "'input_embeds'".padEnd(520, ' ')
    const out = errText(new Error(long))
    expect(out).toBe('Error: ' + long)
    expect(out.endsWith(long)).toBe(true)
    expect(out.length).toBe(long.length + 'Error: '.length)
  })
})
