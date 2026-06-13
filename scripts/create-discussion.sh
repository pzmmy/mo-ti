#!/usr/bin/env bash
set -euo pipefail

REPO="pzmmy/mo-ti"

echo "Step 1: Checking gh CLI..."
if ! command -v gh 1>/dev/null 2>&1; then
  echo "ERROR: gh CLI not found."
  echo "Install via: sudo apt install gh  or  brew install gh"
  echo "Then: gh auth login"
  exit 1
fi

echo "Step 2: Checking auth..."
if ! gh auth status 1>/dev/null 2>&1; then
  echo "Please run: gh auth login"
  exit 1
fi

echo "Step 3: Fetching repo info..."
REPO_ID=$(gh repo view "$REPO" --json id -q .id)
CATEGORY_ID=$(gh api "repos/$REPO/discussions/categories" -q '.[0].id')
echo "  Repo ID: $REPO_ID"
echo "  Category ID: $CATEGORY_ID"

echo "Step 4: Creating discussion..."
gh api graphql -f query='
  mutation($rid: ID!, $title: String!, $body: String!, $cid: ID!) {
    createDiscussion(input: {
      repositoryId: $rid
      title: $title
      body: $body
      categoryId: $cid
    }) {
      discussion { id url }
    }
  }
' -F rid="$REPO_ID" \
  -F title='🎉 墨屉来了！欢迎试用与反馈' \
  -F body="🎉 墨屉（Mo-Ti）来了！

**墨屉** 是 [Tolaria](https://github.com/refactoringhq/tolaria) 的中文友好 fork，面向中文 AI 开发者和用户。

### ✨ 核心特性

- **国产 AI 全接入** - 原生支持 7 家国产大模型 API（DeepSeek、通义千问、文心一言、智谱 GLM、Moonshot、MiniMax、零一万物）
- **拼音搜索** - 支持拼音首字母/全拼搜索联系人，国人习惯无门槛
- **WebDAV 同步** - 数据自有，可自建 WebDAV 服务同步聊天记录与配置
- **全中文界面** - 完全本地化的 UI/UX，无英文残留
- **Tolaria 所有原生功能** - 联系人管理、标签分组、AI 聚合对话、Markdown 渲染等

### 📦 下载方式

- **OSS 镜像（国内高速）** -> https://mo-ti.oss-cn-beijing.aliyuncs.com
- **GitHub Releases** -> https://github.com/pzmmy/mo-ti/releases

### 📖 文档站

访问 https://pzmmy.github.io/mo-ti/ 查看完整文档（安装指南、配置说明、API 接入教程）。

### 💬 参与社区

我们欢迎一切形式的贡献：

- **提 Bug/需求** -> https://github.com/pzmmy/mo-ti/issues
- **贡献代码** -> https://github.com/pzmmy/mo-ti/pulls
- **讨论反馈** -> 就在本 Discussions 板块
- **Star 支持** -> 点个 ⭐ 让更多人看到

墨屉还在早期阶段，任何反馈都对我们极其宝贵。欢迎来聊！" \
  -F cid="$CATEGORY_ID"

echo ""
echo "Done! Check https://github.com/$REPO/discussions"
