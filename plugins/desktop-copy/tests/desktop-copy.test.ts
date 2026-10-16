import { describe, expect, test } from 'claude-code/testing'

import { createSources } from '../hooks/copyfix'
import { layout } from '../hooks/layout'
import { plain, segment, splitCells, toTsv, type Table } from '../hooks/markdown'
import { repair, type Source } from '../hooks/repair'
import { cellAtSelection } from '../hooks/selection'
import { stringWidth, wrap } from '../hooks/width'

const REPLY = [
  '三台机器对比如下：',
  '',
  '| 主机 | 角色 | 流量 |',
  '| --- | --- | ---: |',
  '| web-01 | 前端网关，负责 **HTTPS** 入站与静态资源分发<br>兼任日志收集 | 1.2 TB |',
  '| db-01 | 数据库，主从复制到备机 | 300 GB |',
  '',
  '以上。',
].join('\n')

const ROLE = '前端网关，负责 HTTPS 入站与静态资源分发\n兼任日志收集'

const tableOf = (markdown: string): Table => {
  const found = segment(markdown).find(part => part.kind === 'table')
  if (found?.kind !== 'table') throw new Error('no table')
  return found.table
}

describe('markdown', () => {
  test('splits prose and tables, keeping fenced code as prose', async () => {
    const kinds = segment(REPLY).map(part => part.kind)
    expect(kinds).toEqual(['text', 'table', 'text'])

    const fenced = segment(['```', '| a | b |', '| - | - |', '```'].join('\n'))
    expect(fenced.map(part => part.kind)).toEqual(['text'])
  })

  test('reads cells, escaped pipes and alignment', async () => {
    expect(splitCells('| a \\| b | c |')).toEqual(['a | b', 'c'])
    const table = tableOf(REPLY)
    expect(table.aligns).toEqual(['left', 'left', 'right'])
    expect(table.rows).toHaveLength(2)
  })

  test('plain text drops inline markup and restores <br>', async () => {
    expect(plain(tableOf(REPLY).rows[0]![1]!)).toBe(ROLE)
    expect(plain('`a**b**` and **c**')).toBe('a**b** and c')
  })

  test('TSV quotes fields holding newlines', async () => {
    const tsv = toTsv(tableOf(REPLY))
    expect(tsv.split('\n')[0]).toBe('主机\t角色\t流量')
    expect(tsv).toContain(`"${ROLE}"`)
  })
})

describe('layout', () => {
  test('wraps CJK by cell width', async () => {
    expect(stringWidth('主控ab')).toBe(6)
    expect(wrap('负责 GATEWAY 入站', 8)).toEqual(['负责', 'GATEWAY', '入站'])
  })

  test('fits the table into the width it is given', async () => {
    const shape = layout(tableOf(REPLY), 40)
    expect(shape).not.toBeNull()
    expect(shape!.width).toBeLessThanOrEqual(40)
    for (const row of [shape!.header, ...shape!.rows]) {
      row.forEach((lines, c) => lines.forEach(line => expect(stringWidth(line)).toBe(shape!.widths[c]!)))
    }
  })

  test('gives up when even the narrowest columns do not fit', async () => {
    expect(layout(tableOf(REPLY), 12)).toBeNull()
  })
})

describe('selection', () => {
  test('a messy selection across columns resolves to the cell it starts in', async () => {
    const messy = '│ 前端网关，负责 HTT │ 1.2 TB │\n│       │ PS 入站与静态资源分发 │'
    expect(cellAtSelection(messy, [tableOf(REPLY)])).toBe(ROLE)
  })
})

describe('repair', () => {
  const md = (text: string): Source => ({ text, isMarkdown: true })
  const LIST = [
    '**说明**',
    '',
    '- 原因：按钮在鼠标指针下会被引擎反色高亮，高亮范围是 1 格；但 Maple Mono NF 里这个复制图标实际画出来约 2 格宽，于是图标露到了蓝色块外面。',
    '- 改法：按钮改成「图标 + 空格」共 2 格。',
  ].join('\n')

  test('a wrapped list item loses its hard break and hanging indent', async () => {
    const selected =
      '- 原因：按钮在鼠标指针下会被引擎反色高亮，高亮范围是 1 格；但 Maple Mono NF 里这个复制图标实际画出来约 2\n  格宽，于是图标露到了蓝色块外面。'
    expect(repair(selected, md(LIST))).toBe(
      '- 原因：按钮在鼠标指针下会被引擎反色高亮，高亮范围是 1 格；但 Maple Mono NF 里这个复制图标实际画出来约 2 格宽，于是图标露到了蓝色块外面。',
    )
  })

  test('a selection across items keeps the real line breaks and markers', async () => {
    const selected = '图标露到了蓝色块外面。\n- 改法：按钮改成「图标 +\n  空格」共 2 格。'
    expect(repair(selected, md(LIST))).toBe('图标露到了蓝色块外面。\n- 改法：按钮改成「图标 + 空格」共 2 格。')
  })

  test('inline code and bold come out as their plain text', async () => {
    const source = md('- 用 `$.ui.copy` 写入**剪贴板**，再提示用户确认')
    expect(repair('- 用 $.ui.copy 写入剪贴板，再\n  提示用户确认', source)).toBe('- 用 $.ui.copy 写入剪贴板，再提示用户确认')
  })

  test('nested ordered lists keep their relative indent', async () => {
    const source = md('1. 第一步：读取源文本\n   - 子项：对齐选区与源文本的每一个可见字符\n2. 第二步')
    const selected = '1. 第一步：读取源文本\n   - 子项：对齐选区与源文本的每\n     一个可见字符'
    expect(repair(selected, source)).toBe('1. 第一步：读取源文本\n   - 子项：对齐选区与源文本的每一个可见字符')
  })

  test('code keeps its own indentation and loses the gutter and wraps', async () => {
    const source = md(
      '示例：\n\n```ts\nconst veryLongName = computeSomething(argumentOne, argumentTwo)\n  return x\n```',
    )
    const selected = '  const veryLongName = computeSomething(argumentOne,\n  argumentTwo)\n    return x'
    expect(repair(selected, source)).toBe('const veryLongName = computeSomething(argumentOne, argumentTwo)\n  return x')
  })

  test('blockquotes and links unwrap to their visible text', async () => {
    expect(repair('▎ 引用的内容很长很\n▎ 长，需要折行显示才行', md('> 引用的内容很长很长，需要折行显示才行'))).toBe(
      '引用的内容很长很长，需要折行显示才行',
    )
    const link = md('参见 [文档](https://example.com) 的说明，内容很长需要折行')
    expect(repair('参见 文档 的说明，内容很长\n需要折行', link)).toBe('参见 文档 的说明，内容很长需要折行')
  })

  test('blank lines between blocks stay as the terminal shows them', async () => {
    const source = md('### 引用块\n> 这是一段很长的引用，需要折行显示')
    expect(repair('引用块\n\n▎ 这是一段很长的引用，需要\n▎ 折行显示', source)).toBe('引用块\n\n这是一段很长的引用，需要折行显示')
  })

  test('plain sources such as Bash output lose the tool gutter', async () => {
    const stdout: Source = { text: 'line one is long\nline two', isMarkdown: false }
    expect(repair('⎿  line one is\n   long\n   line two', stdout)).toBe('line one is long\nline two')
  })

  test('leaves plain single lines and unknown text alone', async () => {
    expect(repair('改法：按钮改成', md(LIST))).toBeUndefined()
    expect(repair('完全不相干的\n一段文字', md(LIST))).toBeUndefined()
  })

  test('a single line loses its gutter only where the source pins it down', async () => {
    expect(repair('  ▎ 引用内容只出现一次', md('> 引用内容只出现一次'))).toBe('引用内容只出现一次')
    expect(repair('  - [ ] 写一条任务项', md('**任务**\n- [ ] 写一条任务项'))).toBe('- [ ] 写一条任务项')
    expect(repair('  ▎ 重复的话', md('> 重复的话\n\n> 重复的话'))).toBeUndefined()
  })

  test('sources resolve a selection by its row', async () => {
    const sources = createSources()
    sources.record('row-1', LIST, true)
    sources.record('row-2', '另一条消息', false)
    expect(sources.fix('改法：按钮改成「图标 +\n  空格」共 2 格。', 'row-1')).toBe('改法：按钮改成「图标 + 空格」共 2 格。')
    expect(sources.fix('改法：按钮改成「图标 +\n  空格」共 2 格。', 'row-2')).toBeUndefined()
  })
})

describe('rendering', () => {
  test('a cell copy button copies the whole cell on the terminal', async ($, on) => {
    const copies: string[] = []
    on('ui.copy', ($, e) => {
      copies.push(e.text)
      return { value: { isCopied: true } }
    })

    const ui = await $.ui.mount({
      plugin: 'desktop-copy',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text: REPLY, isFirstOfReply: true },
      viewport: { columns: 60, rows: 30, isFullscreen: true },
    })

    expect(await ui.find({ type: 'Markdown', text: '三台机器' })).toBeDefined()
    expect((await ui.find({ key: 'c1.1.1' }))?.text).toContain('Copy')
    expect((await ui.find({ key: 'c1.1.0' }))?.text).not.toContain('Copy')
    await ui.press({ key: 'c1.1.1' })
    expect(copies).toEqual([ROLE])
    expect(await ui.find({ type: 'Text', text: '\u{f00c}' })).toBeDefined()

    await ui.press({ key: 'tsv1' })
    expect(copies[1]).toBe(toTsv(tableOf(REPLY)))
    await ui.unmount()
  })

  test('other surfaces keep the engine drawing', async ($, on) => {
    on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'engine' }))

    const ui = await $.ui.mount({
      plugin: 'desktop-copy',
      surface: 'desktop',
      component: 'AssistantMessage',
      props: { text: REPLY, isFirstOfReply: true },
      viewport: { columns: 60, rows: 30 },
    })
    expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(0)
    await ui.unmount()
  })
})
