import type { BenchReport } from '@melite/contracts'

export type ValidateRigJson = null | boolean | number | string | ValidateRigJson[] | { [key: string]: ValidateRigJson }

export type ValidateRigViolation = readonly [
  severity: 'CRITICAL' | 'WARNING',
  message: string,
]

export interface ValidateRigOutput {
  readonly passed: boolean
  readonly violations: readonly ValidateRigViolation[]
  readonly stats: Readonly<Record<string, ValidateRigJson>>
}

export class ValidateRigOutputError extends Error {
  readonly path: string

  constructor(path: string, detail: string) {
    super(`validate_rig output malformed at ${path}: ${detail}`)
    this.name = 'ValidateRigOutputError'
    this.path = path
  }
}

const OUTPUT_KEYS = ['passed', 'violations', 'stats'] as const
const RESERVED_ROW_KEYS = new Set(['passed', 'critical_count', 'warning_count', 'violations'])

function malformed(path: string, detail: string): never {
  throw new ValidateRigOutputError(path, detail)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function parseJson(value: unknown, path: string, ancestors: Set<object>): ValidateRigJson {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) malformed(path, 'expected a finite number')
    return value
  }
  if (typeof value !== 'object') malformed(path, 'expected a JSON value')
  if (ancestors.has(value)) malformed(path, 'contains a cycle')
  ancestors.add(value)
  let parsed: ValidateRigJson
  if (Array.isArray(value)) {
    parsed = Array.from(value, (entry, index) => parseJson(entry, `${path}[${index}]`, ancestors))
  } else if (isPlainRecord(value)) {
    parsed = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, parseJson(entry, `${path}.${key}`, ancestors)]),
    )
  } else {
    malformed(path, 'expected a plain JSON object')
  }
  ancestors.delete(value)
  return parsed
}

function parsePassed(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') malformed(path, 'expected a boolean')
  return value
}

function parseViolation(value: unknown, path: string): ValidateRigViolation {
  if (!Array.isArray(value) || value.length !== 2) {
    malformed(path, 'expected [severity, message]')
  }
  const severity = value[0]
  const message = value[1]
  if (severity !== 'CRITICAL' && severity !== 'WARNING') {
    malformed(`${path}[0]`, 'expected CRITICAL or WARNING')
  }
  if (typeof message !== 'string' || message.trim() === '') {
    malformed(`${path}[1]`, 'expected a non-empty message')
  }
  return [severity, message]
}

function parseViolations(value: unknown, path: string): readonly ValidateRigViolation[] {
  if (!Array.isArray(value)) malformed(path, 'expected an array')
  return Array.from(value, (entry, index) => parseViolation(entry, `${path}[${index}]`))
}

function parseStats(value: unknown, path: string): Readonly<Record<string, ValidateRigJson>> {
  const parsed = parseJson(value, path, new Set<object>())
  if (!isRecord(parsed)) malformed(path, 'expected an object')
  return parsed
}

function parseTuple(value: readonly unknown[]): ValidateRigOutput {
  if (value.length !== 3) malformed('$', 'expected [passed, violations, stats]')
  return {
    passed: parsePassed(value[0], '$.passed'),
    violations: parseViolations(value[1], '$.violations'),
    stats: parseStats(value[2], '$.stats'),
  }
}

function hasExactOutputKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length === OUTPUT_KEYS.length && OUTPUT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function parseObject(value: Record<string, unknown>): ValidateRigOutput {
  if (!isPlainRecord(value)) {
    malformed('$', 'expected a plain object')
  }
  if (!hasExactOutputKeys(value)) {
    malformed('$', 'expected exactly passed, violations, and stats')
  }
  return {
    passed: parsePassed(value['passed'], '$.passed'),
    violations: parseViolations(value['violations'], '$.violations'),
    stats: parseStats(value['stats'], '$.stats'),
  }
}

export function parseValidateRigOutput(value: unknown): ValidateRigOutput {
  if (Array.isArray(value)) return parseTuple(value)
  if (!isRecord(value)) malformed('$', 'expected [passed, violations, stats] or an object')
  return parseObject(value)
}

function rowValue(value: ValidateRigJson): string | number | boolean {
  if (value === null || typeof value === 'object') return JSON.stringify(value) as string
  return value
}

function rowsFor(output: ValidateRigOutput): Record<string, string | number | boolean> {
  const critical = output.violations.filter(([severity]) => severity === 'CRITICAL')
  const warnings = output.violations.filter(([severity]) => severity === 'WARNING')
  const rows: Record<string, string | number | boolean> = {
    passed: output.passed,
    critical_count: critical.length,
    warning_count: warnings.length,
    violations: JSON.stringify(output.violations),
  }
  for (const [key, value] of Object.entries(output.stats)) {
    const rowKey = RESERVED_ROW_KEYS.has(key) ? `stat_${key}` : key
    rows[rowKey] = rowValue(value)
  }
  return rows
}

function chipsFor(output: ValidateRigOutput): string[] {
  const chips: string[] = []
  const critical = output.violations.filter(([severity]) => severity === 'CRITICAL')
  const warnings = output.violations.filter(([severity]) => severity === 'WARNING')
  if (critical.length > 0) chips.push(`CRITICAL ${critical.length}`)
  if (warnings.length > 0) chips.push(`WARNING ${warnings.length}`)
  return chips
}

export function validateRigReport(value: unknown): BenchReport {
  const output = parseValidateRigOutput(value)
  const critical = output.violations.some(([severity]) => severity === 'CRITICAL')
  const warned = output.violations.some(([severity]) => severity === 'WARNING')
  const status = !output.passed || critical ? 'fail' : warned ? 'warn' : 'pass'
  return {
    kind: 'report',
    status,
    title: 'Rig validation',
    chips: chipsFor(output),
    rows: rowsFor(output),
  }
}
