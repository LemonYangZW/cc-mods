import { plain, type Table } from './markdown'
import { pad, stringWidth, wrap } from './width'

export type Layout = {
  widths: number[]
  header: string[][]
  rows: string[][][]
  width: number
}

export type Corners = readonly [string, string, string]

export const TOP: Corners = ['┌', '┬', '┐']
export const MID: Corners = ['├', '┼', '┤']
export const BOTTOM: Corners = ['└', '┴', '┘']

const MIN_COLUMN = 3

const PADDING = 2

export function border(widths: readonly number[], [left, mid, right]: Corners): string {
  return left + widths.map(width => '─'.repeat(width + PADDING)).join(mid) + right
}

// 每列先取自然宽度，放不下时反复把最宽的一列减 1，直到装进 maxWidth；连最小列宽都放不下时返回 null 交还引擎
export function layout(table: Table, maxWidth: number): Layout | null {
  const count = table.header.length
  const cells = [table.header, ...table.rows].map(row => row.map(plain))
  const chrome = count + 1 + count * PADDING
  const room = maxWidth - chrome
  if (room < count * MIN_COLUMN) return null

  const widths = Array.from({ length: count }, (_, c) =>
    Math.max(1, ...cells.map(row => Math.max(...row[c]!.split('\n').map(stringWidth)))),
  )
  let total = widths.reduce((sum, width) => sum + width, 0)
  while (total > room) {
    let widest = 0
    for (let c = 1; c < count; c++) if (widths[c]! > widths[widest]!) widest = c
    widths[widest] = widths[widest]! - 1
    total--
  }

  const wrapRow = (row: string[]): string[][] => {
    const wrapped = row.map((cell, c) => wrap(cell, widths[c]!))
    const height = Math.max(...wrapped.map(lines => lines.length))
    return wrapped.map((lines, c) =>
      Array.from({ length: height }, (_, i) => pad(lines[i] ?? '', widths[c]!, table.aligns[c] ?? 'left')),
    )
  }
  const [header, ...rows] = cells.map(wrapRow)

  return { widths, header: header!, rows, width: total + chrome }
}
