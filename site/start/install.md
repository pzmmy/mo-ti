# 安装 Tolaria

Tolaria 发布适用于 macOS、Windows 和 Linux 的桌面版本。macOS 是日常开发的主要目标平台，Windows 和 Linux 版本通过发布流程提供支持，并随着平台问题的发现进行修复。

## 下载

使用最新的稳定版本，除非你特意测试预发布版本：

- <a href="https://tolaria.md/download/" target="_self">下载最新稳定版</a>
- [浏览所有 GitHub 发布版本](https://github.com/refactoringhq/tolaria/releases)
- <a href="https://tolaria.md/releases/" target="_self">阅读发布说明</a>

## Homebrew

在 macOS 上，你可以通过 Homebrew 安装：

```bash
brew install --cask tolaria
```

## 平台状态

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| macOS | 主要 | 发布 Apple Silicon 和 Intel 版本。支持 Homebrew 安装。 |
| Windows | 已支持，早期阶段 | NSIS 安装程序和更新包已通过 Tauri 签名。Authenticode 发布者签名将在 Windows 证书配置完成后添加；公司管理的 SmartScreen、Defender 或 WDAC 策略仍可能需要在安装前获得 IT 批准。 |
| Linux | 已支持，早期阶段 | 发布 AppImage、deb 和 RPM 包。桌面行为取决于发行版的 WebKitGTK 和输入法集成。 |

参见[支持平台](/reference/supported-platforms)了解当前支持策略。

## 托管 Windows 设备

不要为了安装 Tolaria 而禁用 SmartScreen 或 Windows 安全中心。在托管 Windows 设备上，如果策略阻止未签名或未知发布者的安装程序，请通过正常的软件审批流程安装 Tolaria。在 Authenticode 配置完成后，请在安装前验证下载的安装程序具有有效的 Tolaria 发布者签名。

## 安装后

1. 打开 Tolaria。
2. 如果你想体验引导示例，选择"入门知识库"。
3. 或者打开一个已有的 Markdown 文件文件夹作为知识库。
4. 使用 `Cmd+K`（macOS）或 `Ctrl+K`（Linux 和 Windows）打开命令面板。
