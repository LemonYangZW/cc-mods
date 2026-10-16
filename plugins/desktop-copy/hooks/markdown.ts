export type Align = 'left' | 'center' | 'right'

export type Table = {
  header: string[]
  aligns: Align[]
  rows: string[][]
  source: string
}

export type Segment = { kind: 'text'; text: string } | { kind: 'table'; table: Table }

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
const DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

export function splitCells(line: string): string[] {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\' && body[i + 1] === '|') {
      cell += '|'
      i++
    } else if (ch === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

function toAlign(delimiter: string): Align {
  const left = delimiter.startsWith(':')
  const right = delimiter.endsWith(':')
  if (left && right) return 'center'
  return right ? 'right' : 'left'
}

function fit(cells: string[], count: number): string[] {
  const out = cells.slice(0, count)
  while (out.length < count) out.push('')
  return out
}

function trimBlankLines(lines: string[]): string {
  let start = 0
  let end = lines.length
  while (start < end && lines[start]!.trim() === '') start++
  while (end > start && lines[end - 1]!.trim() === '') end--
  return lines.slice(start, end).join('\n')
}

// 把一段 markdown 切成「普通文本」与「GFM 表格」交替的片段，代码围栏内的内容不当作表格
export function segment(markdown: string): Segment[] {
  const lines = markdown.split('\n')
  const segments: Segment[] = []
  let text: string[] = []
  let fence: string | null = null

  const flush = () => {
    const joined = trimBlankLines(text)
    if (joined) segments.push({ kind: 'text', text: joined })
    text = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fenceMatch = FENCE.exec(line)
    if (fence !== null) {
      if (fenceMatch && fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length) fence = null
      text.push(line)
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]!
      text.push(line)
      continue
    }

    const delimiter = lines[i + 1]
    if (line.includes('|') && delimiter !== undefined && DELIMITER.test(delimiter)) {
      const header = splitCells(line)
      const aligns = splitCells(delimiter).map(toAlign)
      if (aligns.length === header.length) {
        const rows: string[][] = []
        let j = i + 2
        while (j < lines.length && lines[j]!.includes('|') && lines[j]!.trim() !== '') {
          rows.push(fit(splitCells(lines[j]!), header.length))
          j++
        }
        flush()
        segments.push({
          kind: 'table',
          table: { header, aligns, rows, source: lines.slice(i, j).join('\n') },
        })
        i = j - 1
        continue
      }
    }
    text.push(line)
  }
  flush()
  return segments
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&',
}

function plainProse(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(\S(?:[^*]*\S)?)\*/g, '$1')
    .replace(/&(nbsp|lt|gt|quot|#39|amp);/g, entity => ENTITIES[entity] ?? entity)
}

// 单元格的纯文本：去掉行内 markdown 标记，<br> 还原为换行；代码片段内部原样保留
export function plain(cell: string): string {
  return cell
    .split(/(`[^`]*`)/)
    .map((part, index) => (index % 2 === 1 ? part.slice(1, -1) : plainProse(part)))
    .join('')
}

function tsvField(text: string): string {
  return /[\t\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toTsv(table: Table): string {
  return [table.header, ...table.rows]
    .map(row => row.map(cell => tsvField(plain(cell))).join('\t'))
    .join('\n')
}
