# 职场人用墨屉搭建个人知识库

## 场景描述

职场人每天接触大量信息——会议纪要、项目文档、行业资讯、技术方案。信息散落在邮件、微信、飞书、本地文件之间，需要用的时候总是找不到。墨屉帮你搭建一个个人知识库：所有笔记以 Markdown 文件存在本地，通过类型和关系链接组织，支持全文搜索和拼音搜索，再配合 Git 做版本历史，让你的知识资产真正属于你自己。

**适用人群**：产品经理、设计师、开发者、运营人员等任何有知识管理需求的职场人。

## 操作指南

1. **创建「工作知识库」** — 在墨屉中创建一个 Vault，用于存放所有工作相关的笔记。
2. **定义你的笔记类型** — 创建「会议纪要/项目/周报/技术方案」等类型，让每篇笔记归属清晰。参见[创建类型](/guides/create-types)。
3. **每日捕获到收件箱** — 开会时随手记下的要点、突然冒出的灵感，用快捷键快速捕获，不打断当前工作流。参见[捕获笔记](/guides/capture-a-note)。
4. **用关系链接串联项目** — 将「项目 A 的需求文档」、「项目 A 的会议纪要」、「项目 A 的技术方案」通过 Wikilink 关联在一起。参见[使用 Wikilink](/guides/use-wikilinks)。
5. **使用拼音搜索快速查找** — 墨屉内置拼音搜索，输入 `xmsq` 即可找到「项目申请书」，无需切换输入法。参见[拼音搜索](/features/pinyin-search)。
6. **用 WebDAV 实现跨设备同步** — 在家里的电脑和办公室电脑之间通过 WebDAV 同步知识库，工作笔记无缝衔接。参见[WebDAV 同步](/features/webdav-sync)。
7. **定期用 Git 记录里程碑** — 每个项目阶段完成时提交一次 Git，方便日后回顾项目演进历史。参见[管理 Git](/guides/commit-and-push)。

## 使用的功能点

- [Vaults（知识库）](/concepts/vaults) — 工作笔记统一存放
- [Types（类型系统）](/concepts/types) — 会议/项目/周报分类
- [Inbox（收件箱）](/concepts/inbox) — 快速捕获不中断
- [Capture a Note（捕获笔记）](/guides/capture-a-note) — 随手记下要点
- [Wikilinks（关系链接）](/guides/use-wikilinks) — 串联项目资料
- [拼音搜索](/features/pinyin-search) — 中文快速检索
- [WebDAV 同步](/features/webdav-sync) — 跨设备同步
- [Git 版本管理](/concepts/git) — 项目历程回溯

## 模板引用

- [会议纪要模板](/../demo-vault-zh/templates/会议纪要模板.md) — 标准会议记录格式
- [周报模板](/../demo-vault-zh/templates/周报模板.md) — 每周工作总结
- [日报模板](/../demo-vault-zh/templates/日报模板.md) — 每日工作记录
- [项目复盘模板](/../demo-vault-zh/templates/项目复盘模板.md) — 项目结项总结
