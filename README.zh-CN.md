<div align="center">

# cc-mods

**一组实用、不打扰注意力的 [Claude Code](https://claude.com/claude-code) mod**

[![CI](https://github.com/LemonYangZW/cc-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/LemonYangZW/cc-mods/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cc-mods?logo=npm)](https://www.npmjs.com/package/cc-mods)
[![Release](https://img.shields.io/github/v/release/LemonYangZW/cc-mods?sort=date&display_name=tag)](https://github.com/LemonYangZW/cc-mods/releases)
[![License: MIT](https://img.shields.io/github/license/LemonYangZW/cc-mods)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-D97757?logo=claude&logoColor=white)](https://code.claude.com/docs/en/plugins)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)

[English](README.md) · 简体中文

</div>

## Mod 列表

| Mod | 作用 |
| --- | --- |
| [desktop-copy](plugins/desktop-copy/README.zh-CN.md) | 让终端界面拥有接近桌面客户端的复制体验：一键复制整个表格单元格或整张表；鼠标复制折行的列表项、引用、代码和工具输出时，得到干净的文本 |

## 快速开始

一条命令安装，不需要克隆仓库：

```sh
npx cc-mods install desktop-copy
```

| 命令 | 作用 |
| --- | --- |
| `npx cc-mods list` | 列出所有 mod 及其安装位置 |
| `npx cc-mods install <mod...>` | 安装 mod，需要时自动添加 `cc-mods` marketplace |
| `npx cc-mods update [mod...]` | 更新到最新版本（不指定时更新全部已安装的） |
| `npx cc-mods uninstall <mod...>` | 卸载 mod；不再有任何 `cc-mods` 的 mod 时，同时移除 marketplace |

默认安装在 user 作用域，每个会话都会加载。加上 `--scope project` 或 `--scope local` 可以只为当前项目安装。

这个命令行工具调用的是 Claude Code 自带的 `claude plugin` 命令，需要 Node.js 18+、git，并且 `claude` 命令在 `PATH` 里。如果不想经过 npm 仓库，可以把 `npx cc-mods` 换成 `npx github:LemonYangZW/cc-mods`，直接从本仓库运行。

## 在 Claude Code 里安装

在 Claude Code 终端会话的输入框里：

```
/plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

回答 `y` 添加 marketplace，再选择作用范围。在 shell 里则运行 `claude plugin install desktop-copy --marketplace LemonYangZW/cc-mods`。

桌面应用里不能运行 `/plugin`：点输入框旁边的 **+**，选 **Plugins**，**Add marketplace** 填 `LemonYangZW/cc-mods`，再 **Add plugin**。

## 仓库结构

```
.claude-plugin/marketplace.json   列出本仓库的全部 mod
plugins/<mod>/                    每个 mod 一个目录，各自带 README
bin/cc-mods.mjs                   npx 安装工具
```

## 开发

```sh
claude --plugin-dir plugins/<mod>        # 从目录加载 mod 启动会话
claude plugin test plugins/<mod>         # 运行 mod 的测试
claude plugin validate plugins/<mod>     # 按引擎的方式检查 manifest 和 hooks
```

Claude Code 加载过 mod 之后，会在 `plugins/<mod>/.claude-plugin/types/` 生成类型定义（已被 git 忽略），之后可以用 `tsc -p plugins/<mod>` 做类型检查。每次 push 和 pull request，CI 都会校验 marketplace，并校验和测试每个 mod。

每个 mod 独立发版。发版时先改 mod 的 `plugin.json` 里的 `version`（`claude plugin update` 靠它判断有没有新版本），再打 `<mod>@<version>` 格式的 tag，例如 `desktop-copy@0.2.0`。npx 工具通过 tag 发版：改 `package.json` 的 `version`，再推送 `cc-mods@<version>` 的 tag。Release 工作流会通过 trusted publishing（OIDC，附带 provenance）发布到 npm，并创建 GitHub release。

## 参与贡献

欢迎提 issue 和 pull request。每个 mod 请放在 `plugins/` 下的独立目录里，在 `.claude-plugin/marketplace.json` 中登记，并附上测试和中英文 README。

## 许可证

[MIT](LICENSE) © LemonYangZW
