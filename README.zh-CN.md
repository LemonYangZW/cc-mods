[English](README.md) | 简体中文

# cc-mods

一组基于 [Claude Code](https://claude.com/claude-code) 插件 hooks API 的实用 mod，不打扰注意力。

| Mod | 作用 |
| --- | --- |
| [desktop-copy](plugins/desktop-copy/README.zh-CN.md) | 让终端界面拥有接近桌面客户端的复制体验：一键复制整个表格单元格或整张表；鼠标复制折行的列表项、引用、代码和工具输出时，得到干净的文本 |

## 安装

在 Claude Code 终端会话的输入框里：

```
/plugin install <mod> --marketplace LemonYangZW/cc-mods
```

回答 `y` 添加 marketplace，再选择作用范围（user 范围会在每个会话里加载）。例如：

```
/plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

在 shell 里：

```
claude plugin install desktop-copy --marketplace LemonYangZW/cc-mods
```

桌面应用里不能运行 `/plugin`：点输入框旁边的 **+**，选 **Plugins**，**Add marketplace** 填 `LemonYangZW/cc-mods`，再 **Add plugin**。

## 仓库结构

```
.claude-plugin/marketplace.json   列出本仓库的全部 mod
plugins/<mod>/                    每个 mod 一个目录，各自带 README
```

## 开发

```sh
claude --plugin-dir plugins/<mod>        # 从目录加载 mod 启动会话
claude plugin test plugins/<mod>         # 运行 mod 的测试
claude plugin validate plugins/<mod>     # 按引擎的方式检查 manifest 和 hooks
```

Claude Code 加载过 mod 之后，会在 `plugins/<mod>/.claude-plugin/types/` 生成类型定义（已被 git 忽略），之后可以用 `tsc -p plugins/<mod>` 做类型检查。

每个 mod 独立发版，tag 格式为 `<mod>@<version>`，例如 `desktop-copy@0.2.0`。

## 许可证

[MIT](LICENSE)
