import type { EngineInterface } from 'claude-code'

import { repairAcross, type Source } from './repair'

const MAX_ROWS = 300
const POLL_MS = 200
// 选区连续两次轮询不变才处理：此时原生的 copy-on-select 已经写过剪贴板，修正结果后写、后到
const STABLE_TICKS = 2
const STATUS_MS = 3000

export type Sources = {
  record: (requestId: string, text: string, isMarkdown: boolean) => void
  fix: (selected: string, requestId: string | undefined) => string | undefined
}

export function createSources(): Sources {
  const rows = new Map<string, Source[]>()

  return {
    record(requestId, text, isMarkdown) {
      if (!text) return
      const list = rows.get(requestId) ?? []
      const index = list.findIndex(known => text.startsWith(known.text) || known.text.startsWith(text))
      if (index === -1) list.push({ text, isMarkdown })
      else if (text.length > list[index]!.text.length) list[index] = { text, isMarkdown }
      rows.delete(requestId)
      rows.set(requestId, list)
      if (rows.size > MAX_ROWS) rows.delete(rows.keys().next().value!)
    },
    fix(selected, requestId) {
      if (requestId !== undefined) {
        const own = rows.get(requestId)
        return own === undefined ? undefined : repairAcross(selected, own)
      }
      return repairAcross(selected, [...rows.values()].reverse().flat())
    },
  }
}

export function watchSelection($: EngineInterface, sources: Sources): void {
  let seen: string | undefined
  let handled: string | undefined
  let stable = 0
  let isBusy = false
  let statusToken = 0

  const tick = async () => {
    const selection = await $.ui.selection()
    const key = selection === undefined ? undefined : `${selection.requestId ?? ''}\n${selection.text}`
    if (key !== seen) {
      seen = key
      stable = 0
      handled = undefined
      return
    }
    if (selection === undefined || key === handled || ++stable < STABLE_TICKS) return
    handled = key

    const fixed = sources.fix(selection.text, selection.requestId)
    if (fixed === undefined || fixed === selection.text) return
    const result = await $.ui.copy({ text: fixed })
    if (!result.isCopied) return

    const token = ++statusToken
    $.ui.status('已修正复制：去掉折行与缩进')
    $.clock.after(STATUS_MS, () => {
      if (token === statusToken) $.ui.status(undefined)
    })
  }

  $.clock.every(POLL_MS, () => {
    if (isBusy) return
    isBusy = true
    void tick().finally(() => {
      isBusy = false
    })
  })
}

const normalize = (text: string): string => text.replace(/\r\n/g, '\n').trim()

// 修正抢在粘贴之后才到时的兜底：粘进输入框的正是原生复制的选区原文，就换成修正版
export async function fixPaste($: EngineInterface, sources: Sources, pasted: string): Promise<string | undefined> {
  if (!pasted.includes('\n')) return undefined
  const selection = await $.ui.selection()
  if (selection === undefined || normalize(selection.text) !== normalize(pasted)) return undefined
  return sources.fix(selection.text, selection.requestId)
}

const visible = (text: string): string =>
  text
    .split('\n')
    .map(line => line.replace(/^ +/, spaces => '·'.repeat(spaces.length)).replace(/\t/g, '→'))
    .join('⏎\n')

const fenced = (text: string): string => `\`\`\`\`text\n${text}\n\`\`\`\``

export async function debugSelection($: EngineInterface, sources: Sources): Promise<string> {
  const selection = await $.ui.selection()
  if (selection === undefined) return '没有鼠标选区：先用鼠标选中一段文字再执行。'

  const fixed = sources.fix(selection.text, selection.requestId)
  return [
    `选区所在行：${selection.requestId ?? '（跨多行或不在 transcript 内）'}`,
    '原生复制（⏎ 换行，· 行首空格，→ 制表符）：',
    fenced(visible(selection.text)),
    fixed === undefined ? '修正结果：对不上源文本，保留原样。' : '修正后：',
    ...(fixed === undefined ? [] : [fenced(visible(fixed))]),
  ].join('\n')
}
