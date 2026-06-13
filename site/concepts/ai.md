# AI

Tolaria 提供两条 AI 路径：能够使用工具检查和编辑 vault 的编码智能体，以及基于笔记上下文以聊天模式回答的直接模型目标。

## 编码智能体

AI 面板可以通过 Tolaria 标准化的事件层流式传输受支持的本地 CLI 智能体。当前支持的目标包括已安装在机器上的 Claude Code、Codex、OpenCode、Pi 和 Gemini CLI。

编码智能体可在以下模式中运行：

- **Vault 安全**模式，仅限于文件、搜索和编辑工具。
- **高级用户**模式，对于支持 shell 访问的智能体，允许在活动 vault 范围内执行本地 shell 命令。

## 直接模型

直接模型目标以聊天模式运行。它们接收当前笔记、链接上下文和对话历史，但不接收 vault 写入工具或 shell 访问权限。

支持的提供商类型包括：

- 通过 Ollama 或 LM Studio 运行的本地模型。
- 托管提供商，如 OpenAI、Anthropic、Gemini 和 OpenRouter。
- 自定义兼容 OpenAI 的端点。

## 外部 MCP 设置

Tolaria 为外部工具暴露了一个 MCP 服务器。设置流程可以将 Tolaria 的 MCP 条目写入 Claude Code、Gemini CLI、Cursor 和通用 MCP 配置路径，也可以复制精确的 JSON 片段供手动设置。

MCP 设置是显式的。关闭对话框不会改动第三方配置文件。

## 为什么 AI 需要 Git

AI 生成的变更应该是可审查的。Git 提供差异对比、历史记录、回滚功能，以及在建议和已提交工作之间的清晰边界。
