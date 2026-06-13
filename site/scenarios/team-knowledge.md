# 家庭/小团队共享知识库

## 场景描述

家庭需要共享——食谱收藏、旅行计划、装修攻略、育儿知识。小团队需要协作——项目文档、运维手册、团队 Wiki。大厂的协作工具要么收费高昂，要么把数据锁在云端。墨屉的本地优先 + Git 方案，让家庭和小团队可以用最自然的方式共享知识：每个人在自己的设备上编辑，通过 Git 远程仓库（GitHub/GitLab/自建）同步，数据完全由自己掌控。

**适用人群**：家庭用户、创业小团队、开源项目组、5-15 人的协作群体。

## 操作指南

1. **创建共享知识库** — 在一台主设备上创建 Vault，添加所有家庭成员或团队成员需要共享的笔记。
2. **初始化 Git 仓库** — 在 Vault 目录中 `git init` 并推送到 GitHub/GitLab 的私有仓库。参见[连接 Git 远程](/guides/connect-a-git-remote)。
3. **团队成员克隆仓库** — 其他成员使用「从 Git 克隆」功能，将同一仓库拉到自己的设备上。参见[打开或创建知识库](/start/open-or-create-vault)。
4. **约定笔记类型规则** — 统一使用「食谱/旅行计划/项目文档/手册」等类型，方便所有人按分类查找。参见[创建类型](/guides/create-types)。
5. **用 Wikilink 建立目录** — 创建索引笔记，用 Wikilink 列出所有共享笔记，新成员上手即用。参见[使用 Wikilink](/guides/use-wikilinks)。
6. **提交和推送变更** — 每个人编辑完笔记后，通过墨屉内置的 Git 界面提交并推送到远程仓库。参见[管理 Git](/guides/commit-and-push)。
7. **处理同步冲突** — 当两人同时编辑同一文件时，墨屉会提示冲突，按 Git 标准流程解决即可。参见[同步冲突](/troubleshooting/sync-conflicts)。
8. **拼音搜索快速定位** — 即使笔记命名不规范，拼音搜索也能帮助团队成员快速找到内容。参见[拼音搜索](/features/pinyin-search)。

## 使用的功能点

- [Vaults（知识库）](/concepts/vaults) — 共享笔记容器
- [Types（类型）](/concepts/types) — 统一分类体系
- [Wikilinks（关系链接）](/guides/use-wikilinks) — 建立共享目录
- [Git 远程连接](/guides/connect-a-git-remote) — 团队同步基础
- [Git 提交与推送](/guides/commit-and-push) — 日常协作流程
- [拼音搜索](/features/pinyin-search) — 快速定位内容
- [WebDAV 同步](/features/webdav-sync) — 非技术成员可选的同步方式

## 模板引用

- [会议纪要模板](/../demo-vault-zh/templates/会议纪要模板.md) — 团队讨论记录
- [周报模板](/../demo-vault-zh/templates/周报模板.md) — 团队成员进度同步
- [日报模板](/../demo-vault-zh/templates/日报模板.md) — 每日工作记录
- [项目复盘模板](/../demo-vault-zh/templates/项目复盘模板.md) — 项目结项回顾
- [读书笔记模板](/../demo-vault-zh/templates/读书笔记模板.md) — 团队读书会分享
