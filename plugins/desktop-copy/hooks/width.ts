// 终端显示宽度，口径与 Ink 使用的 string-width 一致：宽字符/全角 2 格，组合符与零宽 0 格，其余（含歧义字符）1 格
const WIDE: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f], [0x231a, 0x231b], [0x2329, 0x232a], [0x23e9, 0x23ec], [0x23f0, 0x23f0],
  [0x23f3, 0x23f3], [0x25fd, 0x25fe], [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f],
  [0x2693, 0x2693], [0x26a1, 0x26a1], [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5],
  [0x26ce, 0x26ce], [0x26d4, 0x26d4], [0x26ea, 0x26ea], [0x26f2, 0x26f3], [0x26f5, 0x26f5],
  [0x26fa, 0x26fa], [0x26fd, 0x26fd], [0x2705, 0x2705], [0x270a, 0x270b], [0x2728, 0x2728],
  [0x274c, 0x274c], [0x274e, 0x274e], [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797],
  [0x27b0, 0x27b0], [0x27bf, 0x27bf], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55],
  [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf],
  [0xa960, 0xa97f], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f],
  [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f004, 0x1f004], [0x1f0cf, 0x1f0cf], [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a], [0x1f200, 0x1f251], [0x1f300, 0x1f64f], [0x1f680, 0x1f6ff], [0x1f7e0, 0x1f7eb],
  [0x1f90c, 0x1f9ff], [0x1fa70, 0x1faff], [0x20000, 0x3fffd],
]

const ZERO: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x001f], [0x007f, 0x009f], [0x0300, 0x036f], [0x200b, 0x200f], [0x2028, 0x202e],
  [0x2060, 0x2064], [0x20d0, 0x20ff], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xe0100, 0xe01ef],
]

const inRanges = (code: number, ranges: ReadonlyArray<readonly [number, number]>): boolean =>
  ranges.some(([lo, hi]) => code >= lo && code <= hi)

export function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0
  if (inRanges(code, ZERO)) return 0
  return inRanges(code, WIDE) ? 2 : 1
}

export function stringWidth(text: string): number {
  let width = 0
  for (const ch of text) width += charWidth(ch)
  return width
}

// 拉丁单词整体成一个 token，宽字符与空格各自成 token，便于按词折行、中文逐字折行
function tokens(text: string): string[] {
  const out: string[] = []
  let word = ''
  for (const ch of text) {
    if (ch === ' ' || charWidth(ch) === 2) {
      if (word) out.push(word)
      word = ''
      out.push(ch)
    } else {
      word += ch
    }
  }
  if (word) out.push(word)
  return out
}

export function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    let lineWidth = 0
    const push = () => {
      lines.push(line.trimEnd())
      line = ''
      lineWidth = 0
    }
    for (const token of tokens(paragraph)) {
      const tokenWidth = stringWidth(token)
      if (token === ' ' && lineWidth === 0) continue
      if (lineWidth + tokenWidth <= width) {
        line += token
        lineWidth += tokenWidth
        continue
      }
      if (token === ' ') {
        push()
        continue
      }
      if (lineWidth > 0 && tokenWidth <= width) {
        push()
        line = token
        lineWidth = tokenWidth
        continue
      }
      for (const ch of token) {
        const w = charWidth(ch)
        if (lineWidth + w > width && lineWidth > 0) push()
        line += ch
        lineWidth += w
      }
    }
    push()
  }
  return lines
}

export function pad(text: string, width: number, align: 'left' | 'center' | 'right'): string {
  const gap = Math.max(0, width - stringWidth(text))
  if (align === 'right') return ' '.repeat(gap) + text
  if (align === 'center') {
    const left = Math.floor(gap / 2)
    return ' '.repeat(left) + text + ' '.repeat(gap - left)
  }
  return text + ' '.repeat(gap)
}
