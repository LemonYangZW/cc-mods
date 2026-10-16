English | [简体中文](README.zh-CN.md)

# cc-mods

Practical, low-distraction mods for [Claude Code](https://claude.com/claude-code), built on its plugin hooks API.

| Mod | What it does |
| --- | --- |
| [desktop-copy](plugins/desktop-copy) | Desktop-style copy in the terminal UI: copy whole table cells or tables with one click, and get clean text when you mouse-copy wrapped list items, quotes, code and tool output |

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install <mod> --marketplace LemonYangZW/cc-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope loads the mod in every session). For example:

```
/plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

From a shell:

```
claude plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `LemonYangZW/cc-mods`, then **Add plugin**.

## Repository layout

```
.claude-plugin/marketplace.json   lists every mod in this repository
plugins/<mod>/                    one folder per mod, with its own README
```

## Developing a mod

```sh
claude --plugin-dir plugins/<mod>        # run a session with the mod loaded from its folder
claude plugin test plugins/<mod>         # run the mod's tests
claude plugin validate plugins/<mod>     # check the manifest and hooks the way the engine will
```

Once Claude Code has loaded a mod, it lays type definitions in `plugins/<mod>/.claude-plugin/types/` (ignored by git), and `tsc -p plugins/<mod>` type-checks it.

Each mod is versioned on its own. Releases are tagged `<mod>@<version>`, for example `desktop-copy@0.2.0`.

## License

[MIT](LICENSE)
