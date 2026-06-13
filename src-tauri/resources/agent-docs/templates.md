# Portent

Source: templates/portent.md
URL: /templates/portent

# Portent

[Portent](https://portent.md) 是一个针对工作和个人知识库的开放规范及模板。

它为 Tolaria 保险库提供了一套最小的默认组织信息方式：清晰的类型、通用的类图关系，以及捕获知识的简单生命周期。目标是让知识库对人类和 AI 代理都同样有用，而无需强迫每个个人或团队先设计一套私有的本体。

## 核心问题

Portent 推崇约定优于配置。与其问"这个应该放在哪里？"，它问的是：

- 这是什么？
- 它有什么用处？
- 它是已捕获、已整理还是已归档？

这些问题自然地映射到 Tolaria 的类型文档、关系字段、收件箱、已整理状态、归档行为和自定义视图。

## 类型

Portent 定义了八种默认类型。

PORT 类型是可操作的：

- Project（项目）
- Operation（操作）
- Responsibility（职责）
- Task（任务）

ENTP 类型是不可操作的知识记录：

- Event（事件）
- Note（笔记）
- Topic（主题）
- Person（人员）

这些默认类型旨在几乎无需任何设置即可覆盖个人和工作知识的常见形态。您之后可以添加自定义类型，但 Portent 在默认词汇优先使用时效果最佳。

## 关系

Portent 将知识建模为图结构。两种默认关系是：

- `belongs_to`：主要归属关系、组成关系或上下文关系。
- `related_to`：较松散的语义连接。

在 Tolaria 中，这些关系可以放在 YAML frontmatter 中，并通过 wikilink 指向其他笔记。这使得图结构可移植、可搜索，并且可在应用外部阅读。

## 生命周期

Portent 将捕获与整理分开：

1. 快速捕获信息以免丢失。
2. 通过指定类型和有用的关系来整理信息。
3. 当信息完成使命后将其归档。

Tolaria 直接支持这一生命周期：收件箱存放捕获的笔记，整理笔记将其标记为可在正常视图中显示，归档则将过时或废弃的笔记从活跃界面中隐藏，同时仍保留其可访问性。

## 为什么要使用它

空白的保险库很灵活，但它也要求您在还没有形成动力之前就做出结构决策。Portent 为您提供了足够的结构，使您能够立即开始捕获、整理和检索笔记。

由于 Portent 基于文件且可移植，同一模型可以在本地 Markdown 保险库、笔记应用、文档工具和代理可读的知识库中工作。Tolaria 是首个预期实现，但该规范并不依赖于 Tolaria 的内部机制。

## 从模板开始

最快的起点是 Portent 模板保险库：

- [refactoringhq/portent-vault-template](https://github.com/refactoringhq/portent-vault-template)

可以直接使用，重命名部分以匹配您的语言偏好，或将其作为您自己 Tolaria 配置的参考模型。

## 了解更多

访问 [portent.md](https://portent.md) 查看完整规范、示例和实现说明。
