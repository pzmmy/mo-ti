# 未找到 AI 代理

Tolaria 只能启动已安装且可发现的本地 CLI 代理。

## 症状

- AI 面板显示没有可用的受支持代理。
- Claude Code 或其他代理在某个 shell 中正常，但在 Tolaria 中不行。

## 检查步骤

打开一个终端，直接运行代理命令。对于 Claude Code：

```bash
claude --version
```

如果命令执行失败，请先安装或修复该代理。

## 路径问题

桌面应用可能继承与交互式 shell 不同的 `PATH`。Tolaria 会检查常见的安装位置，但 shell 配置仍可能有差异。建议将 CLI 工具安装到标准位置，或使其可从登录 shell 中使用。
