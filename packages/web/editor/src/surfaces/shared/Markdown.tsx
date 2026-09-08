// Markdown — dependency-free markdown renderer for agent chat.
//
// WHY THIS EXISTS (2026-08-19 "no formatting" report): streamdown is a
// STREAMING renderer — its parse runs in effects and never settles for
// finalized text in this app, so every AI bubble and thought block
// rendered as an EMPTY div (live DOM dump showed the final reply missing;
// the unit tests had to vi.mock it because it "never settles under
// jsdom" — that was the tell). This component parses synchronously into
// React elements: no innerHTML, no injection surface, no dependencies,
// and it renders identically in jsdom and the browser.
//
// Supported (the subset the agent actually emits — see agent prompts):
// headings, paragraphs, bold/italic/strike, inline code, fenced code
// blocks, ordered/unordered/task lists, GFM tables, blockquotes, hr,
// http(s) links. Anything unrecognized falls through as plain text.
import { type ReactNode } from "react"

// ── inline tokens ─────────────────────────────────────────────────────
// Order matters: inline code first (so ** inside backticks stays literal),
// then links (before emphasis so ](...)-adjacent asterisks don't split),
// then bold, strike, italic.
const INLINE_RE =
  /(`[^`\n]+`)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(text)) !== null) {
    const tok = m[0]
    // Group 6/7: _italic_ with a leading boundary char captured — the
    // boundary is NOT part of the token; emit it as plain text.
    const lead = m[6] !== undefined ? m[6] : ""
    const start = m.index + lead.length
    const body = m[7] !== undefined ? m[7] : tok.slice(lead.length)
    if (start > last) out.push(text.slice(last, start))
    const key = keyPrefix + "-in" + i++
    if (tok.startsWith("`") && m[1] !== undefined) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (m[2] !== undefined) {
      const label = tok.slice(1, tok.indexOf("]"))
      const href = tok.slice(tok.indexOf("](") + 2, -1)
      out.push(
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline">
          {label}
        </a>,
      )
    } else if (m[3] !== undefined) {
      out.push(
        <strong key={key} className="font-semibold">
          {renderInline(tok.slice(2, -2), key)}
        </strong>,
      )
    } else if (m[4] !== undefined) {
      out.push(
        <s key={key} className="opacity-70">
          {tok.slice(2, -2)}
        </s>,
      )
    } else if (m[5] !== undefined) {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>)
    } else {
      out.push(<em key={key}>{renderInline(body, key)}</em>)
    }
    // _italic_ consumed lead + _ + body + _; every other token is flat.
    last = m[7] !== undefined ? start + body.length + 2 : m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// ── block parsing ─────────────────────────────────────────────────────
interface TableSlice {
  header: string[]
  rows: string[][]
  next: number
}

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|")) s = s.slice(0, -1)
  return s.split("|").map((c) => c.trim())
}

function isSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")
}

function parseTable(lines: string[], start: number): TableSlice | null {
  if (start + 1 >= lines.length) return null
  if (!lines[start].includes("|") || !isSeparator(lines[start + 1])) return null
  const header = splitRow(lines[start])
  const rows: string[][] = []
  let i = start + 2
  while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
    rows.push(splitRow(lines[i]))
    i++
  }
  return { header, rows, next: i }
}

function parseBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r?\n/g, "\n").split("\n")
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  const k = () => "b" + key++

  while (i < lines.length) {
    const line = lines[i]

    // blank
    if (line.trim() === "") {
      i++
      continue
    }

    // fenced code block
    const fence = /^\s*```\s*\S*\s*$/.exec(line)
    if (fence) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence (or EOF)
      out.push(
        <pre key={k()} className="overflow-x-auto rounded-xl bg-muted/70 p-3 font-mono text-xs leading-relaxed">
          <code>{buf.join("\n")}</code>
        </pre>,
      )
      continue
    }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const cls =
        level <= 1
          ? "text-base font-semibold"
          : level === 2
            ? "text-sm font-semibold"
            : "text-sm font-medium"
      out.push(
        <div key={k()} className={cls + " mt-1"}>
          {renderInline(h[2], k())}
        </div>,
      )
      i++
      continue
    }

    // horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push(<hr key={k()} className="border-border" />)
      i++
      continue
    }

    // table
    const table = parseTable(lines, i)
    if (table) {
      out.push(
        <div key={k()} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {table.header.map((cell, ci) => (
                  <th key={ci} className="border-b border-border px-2 py-1 text-left font-semibold">
                    {renderInline(cell, k() + "h" + ci)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {table.header.map((_, ci) => (
                    <td key={ci} className="border-b border-border/50 px-2 py-1 align-top">
                      {renderInline(row[ci] ?? "", k() + "c" + ri + "-" + ci)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = table.next
      continue
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""))
        i++
      }
      out.push(
        <blockquote key={k()} className="border-l-2 border-border pl-3 text-muted-foreground">
          {renderInline(buf.join(" "), k())}
        </blockquote>,
      )
      continue
    }

    // list (unordered / ordered / task)
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (li) {
      const ordered = /\d/.test(li[2])
      const items: { text: string; task: "todo" | "done" | null }[] = []
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])
        if (m) {
          const rest = m[3]
          const task = /^\[ ]\s+/.test(rest) ? "todo" : /^\[x]\s+/i.test(rest) ? "done" : null
          items.push({ text: rest.replace(/^\[[ xX]\]\s+/, ""), task })
          i++
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length > 0) {
          // continuation line — belongs to the previous item
          items[items.length - 1].text += " " + lines[i].trim()
          i++
        } else {
          break
        }
      }
      const Tag = ordered ? "ol" : "ul"
      out.push(
        <Tag key={k()} className={ordered ? "list-decimal space-y-0.5 pl-5" : "list-disc space-y-0.5 pl-5"}>
          {items.map((it, ii) => (
            <li key={ii} className={it.task === "done" ? "opacity-70" : undefined}>
              {it.task === "done" ? "☑ " : it.task === "todo" ? "☐ " : null}
              {renderInline(it.text, k() + "l" + ii)}
            </li>
          ))}
        </Tag>,
      )
      continue
    }

    // paragraph — accumulate until blank line or next block construct
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*```/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^(s*)([-*+]|d+[.)])s+/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isSeparator(lines[i + 1]))
    ) {
      buf.push(lines[i])
      i++
    }
    out.push(
      <p key={k()} className="whitespace-pre-wrap">
        {renderInline(buf.join("\n"), k())}
      </p>,
    )
  }
  return out
}

export function Markdown({ children }: { children?: string }) {
  return <div className="flex flex-col gap-1.5">{parseBlocks(children ?? "")}</div>
}
