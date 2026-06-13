# 墨屉 v1.0.0 — 专为中国知识工作者打造的 Git-native 知识库

> 基于 Tolaria 的中国增强版。免费开源、本地优先、Markdown 原生。

## 中国用户专属功能

### 🤖 国产 AI 深度集成
内置 **7 家国产 AI 供应商**，开箱即用：

DeepSeek · 通义千问 (DashScope) · 智谱 GLM · 月之暗面 Kimi · 百度文心一言 · 百川智能 · 字节豆包

AI 面板直接调用，无需配置代理或中转。

### 🔍 中文全文搜索
专为中文优化的 **CJK 二元分词引擎**。搜「北京」能找到「北京大学」「北京路」。英文搜索不受影响。

### ☁️ WebDAV 多端同步
桌面端 + 手机浏览器（SPA）双端同步。配合坚果云/Nextcloud/自建 NAS，实现跨设备笔记同步。无需 Git，无需技术背景。

### 📱 移动 Web 伴侣
手机浏览器打开 `https://pzmmy.github.io/mo-ti/mobile/` 即可浏览和编辑笔记。添加到主屏幕后就像原生 App 一样用。

### 🀄 全中文界面
97% 界面已中文化，系统语言自动识别。搜狗/百度输入法兼容，中文字体优先渲染。

### 🚀 国内网络友好
- 移除被墙的 Google Fonts，中文字体系统栈渲染更快
- 阿里云 OSS 更新镜像，国内用户下载加速
- 深度链接 `mo-ti://`

## 快速开始

```bash
# 下载安装包
# 前往 https://github.com/pzmmy/mo-ti/releases

# 或自行构建
pnpm install
pnpm tauri build
```

## 对比其他知识库工具

| 维度 | 墨屉 | Obsidian | 思源笔记 | 飞书文档 |
|------|:----:|:--------:|:--------:|:--------:|
| 国产 AI 原生 | ✅ 7家 | ❌ 需插件 | ❌ 需配置 | ❌ 仅自研 |
| 中文搜索 | ✅ CJK 分词 | ⚠️ 英文优先 | ✅ | ✅ |
| Git 版本管理 | ✅ 原生 | ⚠️ 插件 | ❌ | ❌ |
| 离线可用 | ✅ 全功能 | ✅ | ✅ | ❌ 限客户端 |
| 数据自有 | ✅ 纯 Markdown | ✅ | ⚠️ 私有格式 | ❌ 云端 |
| 价格 | 免费开源 | 个人免费 | 免费开源 | 企业付费 |

## 升级说明

首次使用：
- 从 [Releases](https://github.com/pzmmy/mo-ti/releases) 下载对应平台安装包
- 详细文档: https://pzmmy.github.io/mo-ti/
- 手机伴侣: https://pzmmy.github.io/mo-ti/mobile/

## 感谢

- 上游项目 [Tolaria](https://github.com/refactoringhq/tolaria) 及其作者 Luca Rossi
- 所有参与测试和反馈的社区成员

---

**墨屉** — 你的知识抽屉。📖
