English | [简体中文](README.zh-CN.md)

# desktop-copy

Desktop-style copy for Claude Code's terminal UI.

In a terminal, Claude Code draws long table cells over several rows and wraps long lines with a hanging indent. A mouse selection then either cannot reach a whole cell at all, or brings hard line breaks, indentation and UI glyphs (`●`, `⎿`, `▎`) along with the text. desktop-copy fixes both.

## Features

### Copy table cells and tables

Tables in Claude's replies are drawn by the mod, in the same box style, with copy buttons that appear on hover:

- **A cell**: hover it and a `Copy` button appears in its bottom-right corner. It copies the whole cell as plain text, however many rows it wraps over. Markdown markup is dropped and `<br>` becomes a line break. Narrow columns show the icon only.
- **A whole table**: hover it and `TSV` and `MD` buttons appear on its bottom border. `TSV` pastes straight into a spreadsheet, and `MD` copies the table's original markdown.
- **`/copy-cell`**: select a few characters inside a cell, then run the command to copy the whole cell.

Where a table cannot fit the window, and on other surfaces (desktop app, VS Code), Claude Code draws it as usual.

### Clean mouse copies

When you select text with the mouse, Claude Code copies it on release. Once the selection settles, desktop-copy compares it with the source of the message it came from and writes a repaired copy to the clipboard:

- rows the terminal wrapped are joined back into one line, with a space where the source has one;
- hanging indents and UI gutters (`●`, `⎿`, `▎`, `❯`, `│`) are removed;
- real line breaks, blank lines, list markers, nested list indentation and code indentation are kept.

This covers Claude's replies, your own messages, command output and Bash output. The status line briefly notes each copy the mod repaired. Text it cannot match to a source is left exactly as Claude Code copied it.

If you paste into Claude Code's own prompt before the repair lands, the paste is repaired too.

**`/copy-debug`** shows what Claude Code copied for the current selection (line breaks, leading spaces and tabs made visible) and what the mod turns it into.

## Requirements

- Claude Code with plugin hooks modules (tested on 2.1.301).
- The fullscreen terminal UI (`CLAUDE_CODE_NO_FLICKER=1`), where Claude Code handles the mouse itself. The hover buttons and the copy repair both depend on it.
- A [Nerd Font](https://www.nerdfonts.com/) for the copy and check icons. Without one the icons show as boxes, but the labels still read `Copy`, `TSV` and `MD`.

## Install

```
/plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

See the [repository README](../../README.md#install) for the other ways to install.

## Known limitations

- Claude Code's own copy-on-select cannot be intercepted, so the repaired text replaces it about half a second after the selection settles. Pasting into another app within that moment gives the unrepaired text.
- A mouse selection across the rows of a drawn table is copied as drawn. Use the cell and table buttons instead.
- Status and command messages are currently in Simplified Chinese.

## How it works

The mod keeps the source text of each message it has drawn. A selection is reduced to its visible characters and located in the message's source, reduced the same way. The source then tells, for each pair of copied rows, whether the break between them is a real line break or a wrap, and how far the line is really indented.

## License

[MIT](../../LICENSE)
