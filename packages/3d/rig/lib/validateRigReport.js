export class ValidateRigOutputError extends Error {
    path;
    constructor(path, detail) {
        super(`validate_rig output malformed at ${path}: ${detail}`);
        this.name = 'ValidateRigOutputError';
        this.path = path;
    }
}
const OUTPUT_KEYS = ['passed', 'violations', 'stats'];
const RESERVED_ROW_KEYS = new Set(['passed', 'critical_count', 'warning_count', 'violations']);
function malformed(path, detail) {
    throw new ValidateRigOutputError(path, detail);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isPlainRecord(value) {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function parseJson(value, path, ancestors) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value))
            malformed(path, 'expected a finite number');
        return value;
    }
    if (typeof value !== 'object')
        malformed(path, 'expected a JSON value');
    if (ancestors.has(value))
        malformed(path, 'contains a cycle');
    ancestors.add(value);
    let parsed;
    if (Array.isArray(value)) {
        parsed = Array.from(value, (entry, index) => parseJson(entry, `${path}[${index}]`, ancestors));
    }
    else if (isPlainRecord(value)) {
        parsed = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, parseJson(entry, `${path}.${key}`, ancestors)]));
    }
    else {
        malformed(path, 'expected a plain JSON object');
    }
    ancestors.delete(value);
    return parsed;
}
function parsePassed(value, path) {
    if (typeof value !== 'boolean')
        malformed(path, 'expected a boolean');
    return value;
}
function parseViolation(value, path) {
    if (!Array.isArray(value) || value.length !== 2) {
        malformed(path, 'expected [severity, message]');
    }
    const severity = value[0];
    const message = value[1];
    if (severity !== 'CRITICAL' && severity !== 'WARNING') {
        malformed(`${path}[0]`, 'expected CRITICAL or WARNING');
    }
    if (typeof message !== 'string' || message.trim() === '') {
        malformed(`${path}[1]`, 'expected a non-empty message');
    }
    return [severity, message];
}
function parseViolations(value, path) {
    if (!Array.isArray(value))
        malformed(path, 'expected an array');
    return Array.from(value, (entry, index) => parseViolation(entry, `${path}[${index}]`));
}
function parseStats(value, path) {
    const parsed = parseJson(value, path, new Set());
    if (!isRecord(parsed))
        malformed(path, 'expected an object');
    return parsed;
}
function parseTuple(value) {
    if (value.length !== 3)
        malformed('$', 'expected [passed, violations, stats]');
    return {
        passed: parsePassed(value[0], '$.passed'),
        violations: parseViolations(value[1], '$.violations'),
        stats: parseStats(value[2], '$.stats'),
    };
}
function hasExactOutputKeys(value) {
    return Object.keys(value).length === OUTPUT_KEYS.length && OUTPUT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
function parseObject(value) {
    if (!isPlainRecord(value)) {
        malformed('$', 'expected a plain object');
    }
    if (!hasExactOutputKeys(value)) {
        malformed('$', 'expected exactly passed, violations, and stats');
    }
    return {
        passed: parsePassed(value['passed'], '$.passed'),
        violations: parseViolations(value['violations'], '$.violations'),
        stats: parseStats(value['stats'], '$.stats'),
    };
}
export function parseValidateRigOutput(value) {
    if (Array.isArray(value))
        return parseTuple(value);
    if (!isRecord(value))
        malformed('$', 'expected [passed, violations, stats] or an object');
    return parseObject(value);
}
function rowValue(value) {
    if (value === null || typeof value === 'object')
        return JSON.stringify(value);
    return value;
}
function rowsFor(output) {
    const critical = output.violations.filter(([severity]) => severity === 'CRITICAL');
    const warnings = output.violations.filter(([severity]) => severity === 'WARNING');
    const rows = {
        passed: output.passed,
        critical_count: critical.length,
        warning_count: warnings.length,
        violations: JSON.stringify(output.violations),
    };
    for (const [key, value] of Object.entries(output.stats)) {
        const rowKey = RESERVED_ROW_KEYS.has(key) ? `stat_${key}` : key;
        rows[rowKey] = rowValue(value);
    }
    return rows;
}
function chipsFor(output) {
    const chips = [];
    const critical = output.violations.filter(([severity]) => severity === 'CRITICAL');
    const warnings = output.violations.filter(([severity]) => severity === 'WARNING');
    if (critical.length > 0)
        chips.push(`CRITICAL ${critical.length}`);
    if (warnings.length > 0)
        chips.push(`WARNING ${warnings.length}`);
    return chips;
}
export function validateRigReport(value) {
    const output = parseValidateRigOutput(value);
    const critical = output.violations.some(([severity]) => severity === 'CRITICAL');
    const warned = output.violations.some(([severity]) => severity === 'WARNING');
    const status = !output.passed || critical ? 'fail' : warned ? 'warn' : 'pass';
    return {
        kind: 'report',
        status,
        title: 'Rig validation',
        chips: chipsFor(output),
        rows: rowsFor(output),
    };
}
//# sourceMappingURL=validateRigReport.js.map
