import { atom, read, update } from 'claude-code'
import type { Register, UiPressArgument } from 'claude-code'

import { createSources, debugSelection, fixPaste, watchSelection } from './copyfix'
import { BOTTOM, border, layout, MID, TOP, type Layout } from './layout'
import { plain, segment, toTsv, type Table } from './markdown'
import { cellAtSelection } from './selection'
import { stringWidth } from './width'

const copied = atom({ plugin: 'desktop-copy', key: 'copied' } as const, null)

const BULLET = '●'
const FEEDBACK_MS = 1200
// Nerd Font 图标：nf-fa-copy / nf-fa-check；标签两侧留空，指针下的反色块才能完整包住实际宽于 1 格的图标
const COPY_ICON = '\u{f0c5}'
const DONE_ICON = '\u{f00c}'
const DONE_LABEL = ` ${DONE_ICON} Copied `
const CELL_LABEL = ` ${COPY_ICON} Copy `
const NARROW_LABEL = ` ${COPY_ICON} `
const NARROW_DONE_LABEL = ` ${DONE_ICON} `

export const register: Register = on => {
  const tablesByMessage = new Map<string, Table[]>()
  const sources = createSources()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'copy-cell',
      description: 'Copy the full content of the table cell where your mouse selection starts',
    })
    await $.command.register({
      name: 'copy-debug',
      description: 'Show what copying the current mouse selection gives, and how desktop-copy repairs it',
    })
    watchSelection($, sources)
    return next(e)
  })

  on('command.run', { command: 'copy-debug' }, async $ => ({ text: await debugSelection($, sources) }))

  on('prompt.edit', async ($, e, next) => {
    if (e.key !== undefined || !e.inputText.includes('\n')) return next(e)
    const fixed = await fixPaste($, sources, e.inputText)
    return next(fixed === undefined ? e : { ...e, inputText: fixed })
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    sources.record(e.requestId, e.props.text, false)
    return next(e)
  })

  on('ui.render', { component: 'CommandOutput' }, ($, e, next) => {
    sources.record(e.requestId, e.props.text, true)
    return next(e)
  })

  on('ui.render', { component: 'ToolResult' }, ($, e, next) => {
    const output = e.props.output as { stdout?: unknown } | undefined
    if (e.props.tool === 'Bash' && typeof output?.stdout === 'string') sources.record(e.requestId, output.stdout, false)
    return next(e)
  })

  on('command.run', { command: 'copy-cell' }, async $ => {
    const selection = await $.ui.selection()
    if (selection === undefined) return { text: '没有鼠标选区：先在表格单元格里拖选几个字。' }

    const own = selection.requestId === undefined ? undefined : tablesByMessage.get(selection.requestId)
    const tables = own ?? [...tablesByMessage.values()].flat()
    const text = cellAtSelection(selection.text, tables)
    if (text === undefined) return { text: '选区里没有找到表格单元格。' }

    const result = await $.ui.copy({ text })
    return { text: result.isCopied ? `已复制单元格（${text.length} 字符）` : `复制失败：${result.reason}` }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    sources.record(e.requestId, e.props.text, true)
    if (e.surface !== 'terminal' || e.props.isSummary || e.viewport === undefined) return next(e)

    const segments = segment(e.props.text)
    const tables = segments.flatMap(part => (part.kind === 'table' ? [part.table] : []))
    if (tables.length === 0) return next(e)

    const maxWidth = e.viewport.columns - 4
    const layouts = segments.map(part => (part.kind === 'table' ? layout(part.table, maxWidth) : null))
    if (segments.some((part, i) => part.kind === 'table' && layouts[i] === null)) return next(e)

    tablesByMessage.set(e.requestId, tables)

    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const done = await read($, copied)

    const copyButton = (id: string, text: string, label: string, doneLabel: string) => {
      const token = `${e.requestId}:${id}`
      const onPress = async (press: UiPressArgument) => {
        const result = await $.ui.copy({ text, surface: press.surface })
        if (!result.isCopied) {
          $.ui.toast(`复制失败：${result.reason}`)
          return
        }
        await update($, copied, () => token)
        $.clock.after(FEEDBACK_MS, () => {
          void update($, copied, current => (current === token ? null : current))
        })
      }
      return (
        <Button plain key={id} onPress={onPress}>
          <Text color={done === token ? 'success' : 'suggestion'}>{done === token ? doneLabel : label}</Text>
        </Button>
      )
    }

    const drawRow = (cells: string[][], source: string[], t: number, r: number, widths: number[]) => {
      const height = cells[0]?.length ?? 1
      const bar = <Text>{Array.from({ length: height }, () => '│').join('\n')}</Text>
      return (
        <Box flexDirection="row">
          {bar}
          {cells.flatMap((lines, c) => {
            const isNarrow = widths[c]! + 2 < stringWidth(DONE_LABEL)
            return [
              <Box key={`cell-${t}-${r}-${c}`} width={widths[c]! + 2} paddingX={1} flexDirection="column">
                {lines.map(line => (
                  <Text weight={r === 0 ? 'bold' : undefined}>{line}</Text>
                ))}
                <Box position="absolute" bottom={0} right={0} display="none" hover={{ display: 'flex' }}>
                  {copyButton(
                    `c${t}.${r}.${c}`,
                    plain(source[c] ?? ''),
                    isNarrow ? NARROW_LABEL : CELL_LABEL,
                    isNarrow ? NARROW_DONE_LABEL : DONE_LABEL,
                  )}
                </Box>
              </Box>,
              bar,
            ]
          })}
        </Box>
      )
    }

    const drawTable = (table: Table, shape: Layout, t: number) => (
      <Box key={`table-${t}`} flexDirection="column" width={shape.width}>
        <Text>{border(shape.widths, TOP)}</Text>
        {drawRow(shape.header, table.header, t, 0, shape.widths)}
        {shape.rows.flatMap((cells, i) => [
          <Text>{border(shape.widths, MID)}</Text>,
          drawRow(cells, table.rows[i]!, t, i + 1, shape.widths),
        ])}
        <Text>{border(shape.widths, BOTTOM)}</Text>
        <Box position="absolute" bottom={0} right={2} display="none" hover={{ display: 'flex' }}>
          {copyButton(`tsv${t}`, toTsv(table), ` ${COPY_ICON} TSV `, DONE_LABEL)}
          <Text>─</Text>
          {copyButton(`md${t}`, table.source, ` ${COPY_ICON} MD `, DONE_LABEL)}
        </Box>
      </Box>
    )

    return (
      <Box flexDirection="row" marginTop={1}>
        <Box minWidth={2}>
          <Text>{e.props.isFirstOfReply ? BULLET : ' '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} gap={1}>
          {segments.map((part, i) =>
            part.kind === 'table' ? drawTable(part.table, layouts[i]!, i) : <Markdown text={part.text} />,
          )}
        </Box>
      </Box>
    )
  })
}
