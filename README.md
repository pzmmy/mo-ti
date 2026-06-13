# 💧 墨屉 (Mo-Ti)

> **专为中国知识工作者打造的 Git-native 知识库** — 国产 AI 深度集成、中文全文搜索、WebDAV 同步、IM 兼容

墨屉是一个跨平台桌面应用（macOS / Windows / Linux），以 **Markdown + Git** 为核心，专为需要**本地优先、国产化、可联网**的知识管理场景设计。不仅是一个笔记软件，更是你的第二大脑、AI 上下文仓库、以及 Agent 记忆层的可视化前端。

上游项目：[Tolaria](https://github.com/refactoringhq/tolaria) — AGPL-3.0 开源协议

---

## 📊 与同类产品的差异

| 维度 | 墨屉 | Obsidian | 思源笔记 | 飞书文档 |
|------|------|----------|----------|----------|
| **数据存储** | 纯 Markdown + Git 仓库 | 纯 Markdown + 可选同步 | 块级 Markdown（私有格式） | 云端私有格式 |
| **AI 供应商** | DeepSeek / 通义千问 / GLM / Kimi / 文心一言 / 百川 / 豆包 + OpenAI / Anthropic / Ollama | 仅 OpenAI / Anthropic / 本地（需插件） | 仅 OpenAI | 飞书智能伙伴（闭源） |
| **国产 AI 原生** | ✅ 内置 7 家国产供应商 | ❌ 无内置国产供应商 | ❌ 需自行配置 | ⚠️ 仅飞书自研 |
| **中文搜索** | ✅ CJK 分词引擎，毫秒级全文索引 | ✅ 基本支持（依赖系统索引） | ✅ 块级索引 | ✅ 云端搜索 |
| **同步方式** | Git 原生 / WebDAV | Obsidian Sync（付费）/ 第三方插件 | S3 / WebDAV | 飞书云端（付费） |
| **IM 兼容** | ✅ 微信 / 飞书 / 钉钉剪藏兼容格式 | ❌ 无 | ❌ 无 | ❌ 仅飞书生态 |
| **Git 版本管理** | ✅ 内置 Git UI，历史可追溯 | ✅ 需 Git 插件 | ❌ 无 | ❌ 无 |
| **网络墙兼容** | ✅ 已移除 Google Fonts 等被墙资源 | ❌ 有被墙资源，部分用户需代理 | ⚠️ 部分需代理 | N/A（完全在中国） |
| **移动伴侣** | ✅ 手机浏览器通过 WebDAV 访问编辑 | ❌ 需付费同步 | ✅ 有移动端 | ✅ 有移动端 |
| **离线可用** | ✅ 本地优先，完全离线 | ✅ 本地优先 | ✅ 本地优先 | ❌ 强依赖网络 |
| **隐私可控** | ✅ 数据全在本地，Git 仓库自主管理 | ✅ 数据在本地 | ✅ 数据在本地 | ❌ 数据在飞书服务器 |
| **价格** | 免费开源 | 免费（同步付费） | 免费开源 | 按团队/企业付费 |

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📝 **Markdown 原生** | 纯 Markdown 存储，无私有格式，随时迁移 |
| 🔗 **关系链接** | 笔记之间原生关系链接，构建知识图谱 |
| 🤖 **国产 AI 深度集成** | 内置 DeepSeek / 通义千问 / 智谱 GLM / 月之暗面 Kimi / 百度文心一言 / 百川智能 / 字节豆包 + OpenAI / Anthropic / Ollama |
| 🗂 **Git 版本管理** | 内置 Git 支持，历史版本可追溯，支持多分支 |
| 📥 **收件箱工作流** | 快速捕获灵感，集中处理 |
| 🏷 **属性 + 类型系统** | 结构化元数据管理 |
| 🔍 **CJK 中文全文搜索** | 专为中文优化的分词引擎，毫秒级检索 |
| 🌏 **多语言界面** | 内置简体中文、繁体中文，自动适配系统语言 |
| 🔒 **本地优先** | 数据存在本地，无需云端，隐私安全 |
| ☁️ **WebDAV 同步** | 通过 WebDAV 在手机 / 平板 / 多设备间同步笔记 |
| 💬 **IM 兼容** | 微信 / 飞书 / 钉钉剪藏内容可直接导入 |
| 🚀 **国内加速** | 移除 Google Fonts 等被墙资源，系统字体渲染更快 |

---

## 🚀 快速开始

### 下载安装

> 🇨🇳 **国内用户优先使用 OSS 镜像加速下载**，速度更快、无需代理。

#### 📥 OSS 镜像（国内加速）

最新版本已自动同步到阿里云 OSS。各平台具体下载链接请查看 [GitHub Release 页面](https://github.com/pzmmy/mo-ti/releases/latest) 的 Assets 列表——每发布版本都会同步到 OSS `releases/<version>/` 目录，加载无需代理。

#### 📦 GitHub Releases（备用）

从 [GitHub Releases 页面](https://github.com/pzmmy/mo-ti/releases) 下载对应平台的安装包（需要 GitHub 可访问）：

| 平台 | 格式 |
|------|------|
| **Windows** | `.msi` / `.exe` |
| **Linux** | `.deb` / `.AppImage` / `.rpm` |
| **macOS (Intel)** | `.dmg` (x64) |
| **macOS (Apple Silicon)** | `.dmg` (arm64) |

### 首次使用

1. 安装后启动墨屉
2. 创建或打开一个 Markdown 知识库（Vault）
3. 在设置中选择你偏好的国产 AI 供应商（DeepSeek / 通义千问 / Kimi 等）
4. 开始记录你的知识！

> 📖 详细文档：[墨屉文档](https://pzmmy.github.io/mo-ti/)

---

## 🎯 为什么选择墨屉？

### 🇨🇳 中国知识工作者专属

墨屉不是 Obsidian 的另一个汉化版。我们从底层开始，为中国用户重新设计了知识管理体验：

- **国产 AI 供应商原生集成**：DeepSeek、通义千问、智谱 GLM、月之暗面 Kimi、百度文心一言、百川智能、字节豆包 — 开箱即用，无需 API 代理
- **CJK 中文搜索引擎**：专为中文分词语义优化的全文索引，不依赖系统搜索引擎
- **WebDAV 多端同步**：用你自己搭建的 WebDAV 服务器（群晖、NextCloud、Alist 等）在手机和电脑间同步笔记，数据不出境
- **IM 消息直接剪藏**：微信、飞书、钉钉中的聊天记录和文档可以直接导入墨屉
- **国内网络友好**：已移除 Google Fonts、Gravatar 等被墙资源，无需代理即可流畅使用
- **IME 输入法兼容**：修复 Linux/macOS 下中文输入法候选框不跟随、候选词丢失等问题，书写体验流畅
- **中文社区驱动**：完整的中文文档、中文 Issue 交流、微信群社区

### 🧠 知识工作者的战场装备

- 写作者：用 Markdown + Git 管理稿件版本，AI 辅助写作
- 研究者：构建个人知识图谱，AI 辅助文献总结
- 开发者：将技术笔记作为 AI Agent 的上下文
- 团队：用 Git 仓库协作文档，WebDAV 同步给成员

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

## 💬 社区

- 💬 **微信群**：扫描下方二维码加入墨屉用户群（二维码待补充）

  ```
  [微信群二维码 — 建设中]
  ```

- 💡 **Discussions**：[GitHub Discussions](https://github.com/pzmmy/mo-ti/discussions) — 提问、建议、功能讨论
- 🐛 **Issue**：[提交 Bug 或功能请求](https://github.com/pzmmy/mo-ti/issues)

---

## 🤝 贡献指南

欢迎参与墨屉的开发！请参考以下步骤：

1. **Fork** 本仓库
2. 创建你的特性分支：`git checkout -b feat/my-feature`
3. 提交你的改动：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feat/my-feature`
5. 创建 **Pull Request**

### 开发约定

- 遵守 [AGPL-3.0 许可证](LICENSE)
- 保持上游代码可同步，尽量减少对核心架构的破坏性修改
- 提交前运行 `pnpm lint`
- 新增特性请附带测试和文档
- Issue / PR 建议使用中文交流

---

## 🛠 开发指南

### OSS 镜像配置

Release 构建流程会自动将安装包同步到阿里云 OSS，实现国内加速下载。如果希望使用自己的 OSS bucket，请在 GitHub 仓库设置以下 Secrets：

| Secret 名称 | 说明 | 是否必填 |
|------------|------|---------|
| `OSS_ACCESS_KEY_ID` | 阿里云 RAM 子用户的 AccessKey ID | 是 |
| `OSS_ACCESS_KEY_SECRET` | 对应的 AccessKey Secret | 是 |
| `OSS_ENDPOINT` | OSS 地域节点，默认 `oss-cn-hangzhou.aliyuncs.com` | 否 |
| `OSS_BUCKET` | OSS Bucket 名称，默认 `mo-ti` | 否 |

**最小权限策略**：RAM 子用户只需以下权限即可正常工作：

```json
{
  "Effect": "Allow",
  "Action": "oss:PutObject",
  "Resource": "acs:oss:*:*:mo-ti/*"
}
```

> 不配置这些 Secrets 不影响 Release 构建流程——仅会跳过 OSS 同步步骤，GitHub Releases 仍会正常发布。

---

## 📄 许可证

本项目的原始代码基于 **AGPL-3.0-or-later** 许可证开源。

- 上游：[Tolaria](https://github.com/refactoringhq/tolaria) © Refactoring HQ
- 中国增强版：[墨屉](https://github.com/pzmmy/mo-ti) © pzmmy

> 墨屉名称和 Logo 受项目商标政策保护。
