# 管理你的知识付费课程笔记

## 场景描述

买了十几门网课——得到、知乎盐选、小报童、极客时间、B站课堂……学完就忘，笔记散落在各个平台的收藏夹和备忘录中，无法统一检索和复用。墨屉作为本地优先的知识库，可以将所有课程笔记集中到一个 Vault 中，用类型区分课程、用关系串联同一主题的不同课程内容，再用 Git 记录你的学习进度。

**适用人群**：知识付费重度用户、在线课程学习者、终身学习者。

## 操作指南

1. **创建「学习笔记」Vault** — 将所有课程笔记集中在一个知识库中管理。
2. **为课程创建类型** — 创建「课程/章节/笔记/作业/总结」等类型，给每篇笔记打上标签。参见[创建类型](/guides/create-types)。
3. **按课程建立笔记层级** — 每门课程创建一个主笔记，用 Wikilink 链接到各章节笔记，形成课程目录结构。参见[使用 Wikilink](/guides/use-wikilinks)。
4. **跨课程主题关联** — 当不同课程讲到同一知识点时，用关系链接将其串联——比如「认知心理学」和「行为经济学」中的相同概念。参见[关系](/concepts/relationships)。
5. **利用编辑器记录思考** — 墨屉编辑器支持 Markdown 和实时预览，边学边记，重点内容加粗、引用、代码块自由使用。参见[编辑器](/concepts/editor)。
6. **用属性标注学习状态** — 在 frontmatter 中添加 `status: 学习中/已学完/待复习` 等属性，快速筛选学习进度。参见[属性](/concepts/properties)。
7. **Git 记录学习轨迹** — 每次学完一节课提交一次 Git 快照，可以看到自己知识体系的搭建过程。参见[管理 Git](/guides/commit-and-push)。
8. **自定义视图按状态过滤** — 创建「待复习」视图，只展示需要重温的课程笔记。参见[构建自定义视图](/guides/build-custom-views)。

## 使用的功能点

- [Vaults（知识库）](/concepts/vaults) — 统一存放所有课程笔记
- [Types（类型）](/concepts/types) — 课程/章节分类
- [Editor（编辑器）](/concepts/editor) — Markdown 写作体验
- [Properties（属性）](/concepts/properties) — 学习状态标记
- [Wikilinks（关系链接）](/guides/use-wikilinks) — 课程内章节串联
- [Relationships（关系）](/concepts/relationships) — 跨课程知识关联
- [自定义视图](/guides/build-custom-views) — 按学习状态筛选
- [Git 版本管理](/concepts/git) — 学习轨迹回溯

## 模板引用

- [读书笔记模板](/../demo-vault-zh/templates/读书笔记模板.md) — 整理课程核心知识点
- [会议纪要模板](/../demo-vault-zh/templates/会议纪要模板.md) — 记录课程中的讨论与答疑
- [项目复盘模板](/../demo-vault-zh/templates/项目复盘模板.md) — 课程学完后的整体复盘
