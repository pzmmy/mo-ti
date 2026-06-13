# 笔记

笔记是一个带有可选 YAML frontmatter 的 Markdown 文件。Tolaria 将第一个一级标题作为主标题，并将文件保留在磁盘上作为持久化表示。

## 结构

```md
---
type: Project
status: Active
belongs_to:
  - "[[workspace]]"
---

# Launch Documentation

Draft the public Tolaria docs and keep them close to code changes.
```

## 标题

第一个一级标题就是笔记标题。Tolaria 在显示笔记的任何地方都使用该标题：笔记列表、搜索结果、维基链接建议、关系选择器、标签页和窗口标题。

标题与文件名是分开的。文件名保持显示在面包屑导航中，以便你看到磁盘上的文件，并且可以在需要时独立重命名。

使用面包屑操作将文件重命名为与标题一致。新建的未命名笔记也可以在首次获得真实标题时根据第一个一级标题自动重命名。如果你希望文件名在手动重命名之前保持不变，可以在"设置 > Vault 内容 > 标题与文件名"中关闭此行为。

## 正文链接

使用 `[[维基链接]]` 从正文中连接笔记。Tolaria 在你输入时显示自动补全建议，链接可以按文件名或标题解析。

## Frontmatter

使用 frontmatter 处理结构化字段，例如类型、状态、日期、URL 和关系。将自由思考的内容放在正文中。
