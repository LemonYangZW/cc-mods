// 修正原生复制：以原生复制的每一行为准，只修坏掉的地方——
// 借源文本判断相邻两行是折行（源文本里同一行，拼回去）还是真换行（保留），去掉 ▎ ⎿ ● ❯ 这类界面前缀，
// 行首缩进按源文本还原。对不上源文本时返回 undefined，调用方保留原样。

export type Source = { text: string; isMarkdown: boolean }

type Projection = { chars: string; offsets: number[] }

const IGNORED = /[\s*~|`#>\\●⎿❯▎•◦▪‣☐☑✓✔─-╿]/
const FENCE = /^\s{0,3}(`{3,}|~{3,})/
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const BLOCK_PREFIX = /^\s*(?:>\s?)*\s*(?:(?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?)?(?:#{1,6}\s+)?/
const SELECTION_MARKER = /^(?:[-*+•◦▪‣]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?/
const LINE_GUTTER = /^[\s●⎿❯▎│]*/
const GLYPH_PREFIX = /^\s*(?:[●⎿❯▎│]\s?)+/
// 单行选区只在带界面前缀或行首空白（消息左侧的留白）时才处理
const GUTTER_START = /^[\s●⎿❯▎│]/

// 源文本中「显示出来的字符」：去掉空白、markdown 标记、围栏行、链接地址，记下每个字符在源文本里的位置
function project(source: string, isMarkdown: boolean): Projection {
  const chars: string[] = []
  const offsets: number[] = []
  const add = (ch: string, at: number) => {
    if (IGNORED.test(ch)) return
    chars.push(ch)
    offsets.push(at)
  }

  let base = 0
  let fence: string | null = null
  for (const line of source.split('\n')) {
    const lineBase = base
    base += line.length + 1

    if (!isMarkdown) {
      for (let i = 0; i < line.length; i++) add(line[i]!, lineBase + i)
      continue
    }

    const fenceMatch = FENCE.exec(line)
    if (fence !== null) {
      if (fenceMatch && fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length) fence = null
      else for (let i = 0; i < line.length; i++) add(line[i]!, lineBase + i)
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]!
      continue
    }
    if (TABLE_DELIMITER.test(line) && line.includes('-')) continue

    let i = BLOCK_PREFIX.exec(line)![0].length
    while (i < line.length) {
      const rest = line.slice(i)
      const br = /^<br\s*\/?>/i.exec(rest)
      if (br) {
        i += br[0].length
        continue
      }
      if (rest.startsWith('](')) {
        const close = line.indexOf(')', i + 2)
        if (close !== -1) {
          i = close + 1
          continue
        }
      }
      if (rest.startsWith('![') || (line[i] === '[' && line.indexOf('](', i) !== -1)) {
        i++
        continue
      }
      add(line[i]!, lineBase + i)
      i++
    }
  }
  return { chars: chars.join(''), offsets }
}

function compactLine(line: string, isMarkdown: boolean): string {
  const body = line.replace(LINE_GUTTER, '')
  return (isMarkdown ? body.replace(SELECTION_MARKER, '') : body)
    .split('')
    .filter(ch => !IGNORED.test(ch))
    .join('')
}

// 选区这一行若从源文本行首开始（前面只有缩进、列表符号、引用符号或行内标记），沿用源文本的缩进；从行中间开始则不缩进
function indentAt(text: string, first: number, isMarkdown: boolean): string {
  const prefix = text.slice(text.lastIndexOf('\n', first - 1) + 1, first)
  const indent = /^[ \t]*/.exec(prefix)![0]
  const rest = prefix.slice(indent.length).replace(/[*~`]/g, '')
  const isLineStart = rest === '' || (isMarkdown && BLOCK_PREFIX.exec(rest)![0].length === rest.length)
  return isLineStart ? indent : ''
}

export function repair(selected: string, source: Source): string | undefined {
  const lines = selected.replace(/\r\n/g, '\n').split('\n')
  const isMultiline = lines.length > 1
  if (!isMultiline && !GUTTER_START.test(selected)) return undefined

  const compacts = lines.map(line => compactLine(line, source.isMarkdown))
  const needle = compacts.join('')
  if (needle.length < (isMultiline ? 2 : 4)) return undefined
  const { chars, offsets } = project(source.text, source.isMarkdown)
  const at = chars.indexOf(needle)
  if (at === -1) return undefined
  if (!isMultiline && chars.indexOf(needle, at + 1) !== -1) return undefined

  const text = source.text
  const out: string[] = []
  let cursor = at
  let previousEnd = -1
  lines.forEach((line, i) => {
    const body = line.replace(GLYPH_PREFIX, '').trimStart()
    const length = compacts[i]!.length
    if (length === 0) {
      out.push(body.trimEnd())
      previousEnd = -1
      return
    }
    const first = offsets[cursor]!
    const between = previousEnd === -1 ? '\n' : text.slice(previousEnd + 1, first)
    if (out.length > 0 && !between.includes('\n')) {
      out[out.length - 1] = out[out.length - 1]!.trimEnd() + (/\s/.test(between) ? ' ' : '') + body
    } else {
      out.push(indentAt(text, first, source.isMarkdown) + body)
    }
    previousEnd = offsets[cursor + length - 1]!
    cursor += length
  })
  return out.join('\n')
}

// 选区可能来自任一已记录的行：调用方给出候选（选区所在行优先），逐一尝试
export function repairAcross(selected: string, sources: readonly Source[]): string | undefined {
  for (const source of sources) {
    const fixed = repair(selected, source)
    if (fixed !== undefined) return fixed
  }
  return undefined
}
