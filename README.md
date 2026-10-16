<div align="center">

# cc-mods

**Practical, low-distraction mods for [Claude Code](https://claude.com/claude-code)**

[![CI](https://github.com/LemonYangZW/cc-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/LemonYangZW/cc-mods/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cc-mods?logo=npm)](https://www.npmjs.com/package/cc-mods)
[![Release](https://img.shields.io/github/v/release/LemonYangZW/cc-mods?sort=date&display_name=tag)](https://github.com/LemonYangZW/cc-mods/releases)
[![License: MIT](https://img.shields.io/github/license/LemonYangZW/cc-mods)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-D97757?logo=claude&logoColor=white)](https://code.claude.com/docs/en/plugins)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)

English · [简体中文](README.zh-CN.md)

</div>

## Mods

| Mod | What it does |
| --- | --- |
| [desktop-copy](plugins/desktop-copy) | Desktop-style copy in the terminal UI: copy whole table cells or tables with one click, and get clean text when you mouse-copy wrapped list items, quotes, code and tool output |

## Quick start

Install a mod with one command, no clone needed:

```sh
npx cc-mods install desktop-copy
```

| Command | What it does |
| --- | --- |
| `npx cc-mods list` | List the mods and where they are installed |
| `npx cc-mods install <mod...>` | Install mods, adding the `cc-mods` marketplace if needed |
| `npx cc-mods update [mod...]` | Update mods to their latest version (default: every installed one) |
| `npx cc-mods uninstall <mod...>` | Uninstall mods; the marketplace is removed once no `cc-mods` mod is left |

Mods install in the user scope, so every session loads them. Add `--scope project` or `--scope local` to install for the current project only.

The CLI drives Claude Code's own `claude plugin` commands, so it needs Node.js 18+, git and the `claude` CLI on your `PATH`. To run it straight from this repository instead of the npm registry, use `npx github:LemonYangZW/cc-mods` in place of `npx cc-mods`.

## Install from Claude Code

At the prompt of a Claude Code terminal session:

```
/plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

Answer `y` to add the marketplace, then pick a scope. From a shell, run `claude plugin install desktop-copy --marketplace LemonYangZW/cc-mods`.

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `LemonYangZW/cc-mods`, then **Add plugin**.

## Repository layout

```
.claude-plugin/marketplace.json   lists every mod in this repository
plugins/<mod>/                    one folder per mod, with its own README
bin/cc-mods.mjs                   the npx installer
```

## Development

```sh
claude --plugin-dir plugins/<mod>        # run a session with the mod loaded from its folder
claude plugin test plugins/<mod>         # run the mod's tests
claude plugin validate plugins/<mod>     # check the manifest and hooks the way the engine will
```

Once Claude Code has loaded a mod, it lays type definitions in `plugins/<mod>/.claude-plugin/types/` (ignored by git), and `tsc -p plugins/<mod>` type-checks it. CI validates the marketplace and validates and tests every mod on each push and pull request.

Each mod is versioned on its own. For a release, bump `version` in the mod's `plugin.json` (`claude plugin update` compares it) and tag `<mod>@<version>`, for example `desktop-copy@0.2.0`. The npx CLI is released by tag: bump `version` in `package.json`, then push a `cc-mods@<version>` tag. The Release workflow publishes it to npm through trusted publishing (OIDC, with provenance) and creates the GitHub release.

## Contributing

Issues and pull requests are welcome. Please keep each mod in its own folder under `plugins/`, list it in `.claude-plugin/marketplace.json`, and include tests and English and Chinese READMEs.

## License

[MIT](LICENSE) © LemonYangZW
