import { plain, type Table } from './markdown'

const BOX_DRAWING = /[─│┼├┤┌┐└┘┬┴]/g

const compact = (text: string): string => text.replace(BOX_DRAWING, '').replace(/\s+/g, '')

// 选区起点（第一个有效片段）决定目标单元格；多个候选时取包含选区片段最多的那个
export function cellAtSelection(selection: string, tables: readonly Table[]): string | undefined {
  const fragments = selection
    .split('\n')
    .flatMap(line => line.split('│'))
    .map(compact)
    .filter(fragment => fragment.length >= 2)
  const [first] = fragments
  if (first === undefined) return undefined

  let best: { text: string; score: number } | undefined
  for (const table of tables) {
    for (const row of [table.header, ...table.rows]) {
      for (const cell of row) {
        const text = plain(cell)
        const key = compact(text)
        if (!key.includes(first)) continue
        const score = fragments.filter(fragment => key.includes(fragment)).length
        if (best === undefined || score > best.score) best = { text, score }
      }
    }
  }
  return best?.text
}
