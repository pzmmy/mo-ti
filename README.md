# 💧 墨屉 (Mo-Ti)

> **你的知识抽屉** — AI 时代本地优先的 Markdown 知识库

墨屉是一个跨平台桌面应用（macOS / Windows / Linux），帮助你管理 **Markdown 知识库**。你可以用它来：

- 搭建第二大脑和个人知识体系
- 组织团队文档作为 AI 上下文
- 存储 AI Agent 的记忆和工作流程

上游项目：[Tolaria](https://github.com/refactoringhq/tolaria) — AGPL-3.0 开源协议

---

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 📝 **Markdown 原生** | 纯 Markdown 存储，无私有格式，随时迁移 |
| 🔗 **关系链接** | 笔记之间原生关系链接，构建知识图谱 |
| 🤖 **AI 集成** | 内置 AI 面板，支持 DeepSeek / 通义千问 / 智谱 GLM / 月之暗面 Kimi / 百度文心一言 / 百川智能 / 字节豆包 / OpenAI / Anthropic / Ollama |
| 🗂 **Git 版本管理** | 内置 Git 支持，历史版本可追溯 |
| 📥 **收件箱工作流** | 快速捕获灵感，集中处理 |
| 🏷 **属性 + 类型系统** | 结构化元数据管理 |
| 🔍 **全文搜索** | Markdown 内容全文索引，毫秒级检索 |
| 🌏 **多语言界面** | 内置简体中文、繁体中文，自动适配系统语言 |
| 🔒 **本地优先** | 数据存在本地，无需云端，隐私安全 |

---

## 🚀 快速开始

### 下载安装

从 [Releases 页面](https://github.com/pzmmy/mo-ti/releases) 下载对应平台的安装包：

| 平台 | 下载 |
|------|------|
| **macOS (Intel)** | `.dmg` (x64) |
| **macOS (Apple Silicon)** | `.dmg` (arm64) |
| **Windows** | `.msi` / `.exe` |
| **Linux** | `.deb` / `.AppImage` / `.rpm` |

### 首次使用

1. 安装后启动墨屉
2. 创建或打开一个 Markdown 知识库（Vault）
3. 开始记录你的知识！

> 📖 详细文档：[墨屉文档](https://pzmmy.github.io/mo-ti/)

---

## 🧩 中国用户专属功能

本 Fork 在保留上游全部功能的基础上，针对中国用户做了以下增强：

| 增强项 | 说明 |
|--------|------|
| 🇨🇳 **全中文界面** | 系统语言自动识别，默认简体中文 |
| 🀄 **中国 AI 供应商** | 内置 DeepSeek / 通义千问 / 智谱 GLM / 月之暗面 Kimi / 百度文心一言 / 百川智能 / 字节豆包 |
| 🚀 **国内加速** | 移除 Google Fonts 等被墙资源，系统字体渲染更快 |
| 📖 **中文文档** | 完整的中文使用指南和文档 |

---

## 🖥 截图

> *待补充*

---

## 🔧 自行构建

```bash
# 克隆
git clone git@github.com:pzmmy/mo-ti.git
cd mo-ti

# 安装依赖 (使用 pnpm)
pnpm install

# 开发模式
pnpm dev

# 构建桌面应用
pnpm tauri build
```

---

## 🤝 参与贡献

欢迎提交 Issue 和 PR！请确保：

1. 遵守 [AGPL-3.0 许可证](LICENSE)
2. 保持上游代码可同步
3. 提交前运行 `pnpm lint`

---

## 📄 许可证

本项目的原始代码基于 **AGPL-3.0-or-later** 许可证开源。

- 上游：[Tolaria](https://github.com/refactoringhq/tolaria) © Refactoring HQ
- 中国增强版：[墨屉](https://github.com/pzmmy/mo-ti) © pzmmy

> 墨屉名称和 Logo 受项目商标政策保护。
