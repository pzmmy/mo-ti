import { defineConfig } from "vitepress";

const base = process.env.VITEPRESS_BASE ?? "/";

export default defineConfig({
  title: "墨屉",
  description:
    "墨屉是一个本地优先的 Markdown 知识库管理工具，支持原生关系链接、Git 版本历史和 AI 工作流。",
  base,
  ignoreDeadLinks: [/^\/download\/?(?:index)?$/, /^\/releases\/?(?:index)?$/],
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", type: "image/png", href: `${base}landing/favicon.png` }],
    ["meta", { property: "og:title", content: "墨屉" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "AI 时代的第二大脑。免费开源、本地优先、Markdown 原生、Git 就绪。",
      },
    ],
  ],
  themeConfig: {
    logo: { src: "/landing/tolaria-icon.png", alt: "墨屉" },
    nav: [
      { text: "开始使用", link: "/start/install" },
      { text: "概念", link: "/concepts/vaults" },
      { text: "指南", link: "/guides/capture-a-note" },
      { text: "场景", link: "/scenarios/" },
      { text: "模板", link: "/templates/portent" },
      { text: "下载", link: "https://mo-ti.io/download/", target: "_self", noIcon: true },
    ],
    search: {
      provider: "local",
    },
    sidebar: [
      {
        text: "开始",
        items: [
          { text: "安装墨屉", link: "/start/install" },
          { text: "首次启动", link: "/start/first-launch" },
          { text: "快速入门", link: "/start/getting-started-vault" },
          { text: "打开或创建知识库", link: "/start/open-or-create-vault" },
        ],
      },
      {
        text: "Concepts",
        items: [
          { text: "Vaults", link: "/concepts/vaults" },
          { text: "Notes", link: "/concepts/notes" },
          { text: "Editor", link: "/concepts/editor" },
          { text: "Properties", link: "/concepts/properties" },
          { text: "Types", link: "/concepts/types" },
          { text: "Relationships", link: "/concepts/relationships" },
          { text: "Files And Media", link: "/concepts/files-and-media" },
          { text: "Inbox", link: "/concepts/inbox" },
          { text: "Git", link: "/concepts/git" },
          { text: "AI", link: "/concepts/ai" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Capture A Note", link: "/guides/capture-a-note" },
          { text: "Organize The Inbox", link: "/guides/organize-inbox" },
          { text: "Use Wikilinks", link: "/guides/use-wikilinks" },
          { text: "Create Types", link: "/guides/create-types" },
          { text: "Build Custom Views", link: "/guides/build-custom-views" },
          { text: "Connect A Git Remote", link: "/guides/connect-a-git-remote" },
          { text: "Manage Git", link: "/guides/commit-and-push" },
          { text: "Use The AI", link: "/guides/use-ai-panel" },
          { text: "Configure AI Models", link: "/guides/configure-ai-models" },
          { text: "Use The Table Of Contents", link: "/guides/use-table-of-contents" },
          { text: "Use Media Previews", link: "/guides/use-media-previews" },
          { text: "Manage Display Preferences", link: "/guides/manage-display-preferences" },
          { text: "Use The Command Palette", link: "/guides/use-command-palette" },
        ],
      },
      {
        text: "功能",
        items: [
          { text: "拼音搜索", link: "/features/pinyin-search" },
          { text: "WebDAV 同步", link: "/features/webdav-sync" },
        ],
      },
      {
        text: "场景",
        items: [
          { text: "场景概览", link: "/scenarios/" },
          { text: "考研/考公备考", link: "/scenarios/exam-prep" },
          { text: "职场知识库", link: "/scenarios/daily-work" },
          { text: "知识付费课程", link: "/scenarios/knowledge-pay" },
          { text: "家庭/小团队共享", link: "/scenarios/team-knowledge" },
        ],
      },
      {
        text: "Templates",
        items: [
          { text: "Portent", link: "/templates/portent" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Supported Platforms", link: "/reference/supported-platforms" },
          { text: "File Layout", link: "/reference/file-layout" },
          { text: "Frontmatter Fields", link: "/reference/frontmatter-fields" },
          { text: "View Filters", link: "/reference/view-filters" },
          { text: "Keyboard Shortcuts", link: "/reference/keyboard-shortcuts" },
          { text: "Release Channels", link: "/reference/release-channels" },
          { text: "Contribute", link: "/reference/contribute" },
          { text: "Docs Maintenance", link: "/reference/docs-maintenance" },
        ],
      },
      {
        text: "Troubleshooting",
        items: [
          { text: "Vault Not Loading", link: "/troubleshooting/vault-not-loading" },
          { text: "Git Authentication", link: "/troubleshooting/git-auth" },
          { text: "AI Agent Not Found", link: "/troubleshooting/ai-agent-not-found" },
          { text: "Model Provider Connection", link: "/troubleshooting/model-provider-connection" },
          { text: "Sync Conflicts", link: "/troubleshooting/sync-conflicts" },
        ],
      },
    ],
    footer: {
      message: "Free and open source. Local-first, Git-first, and Markdown-based.",
      copyright:
        "Tolaria is AGPL-3.0-or-later. The Tolaria name and logo remain covered by the project trademark policy.",
    },
  },
});
