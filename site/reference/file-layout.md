# 文件布局

Tolaria 对文件夹结构没有强制性要求。它会递归地遍历整个库查找笔记，默认将新笔记存储在根目录，并使用类型和关系进行真正的组织。

```txt
my-vault/
  project-alpha.md
  weekly-review.md
  research/
    source-notes.md
  attachments/
    diagram.png
    source.pdf
  project.md
  person.md
  views/
    active-projects.yml
```

## 根目录笔记

Tolaria 在扁平化库中运行良好。文件夹是可选的，有助于与其他工具兼容，但对于人物、项目、主题或任何其他笔记类别来说并非必须。

类型不是从文件夹位置推断出来的。它来自 frontmatter，关系通过字段中的维基链接表达。这就是 Tolaria 用于侧边栏、属性面板、搜索、自定义视图和邻域导航的依据。

## 特殊文件夹

| 文件夹 | 用途 |
| --- | --- |
| `views/` | 已保存的自定义视图。 |
| `attachments/` | 图片和其他附件文件。 |

PDF、图片和其他非 Markdown 文件保持为普通文件。文件夹浏览可以在原位显示它们，设置项控制 PDF、图片和不支持的文件是否出现在"所有笔记"中。

白板是带有持久化 tldraw 数据的 Markdown 文件，因此它们与笔记放在一起，而不是放在 `attachments/` 中。

类型定义是带有 `type: Type` 的 frontmatter 的 Markdown 笔记。新的类型文档是普通笔记，旧文件夹中已有的类型文档仍然有效。

## Git 文件

如果库是一个 Git 仓库，`.git/` 属于 Git。Tolaria 读取 Git 状态，但不会将 `.git/` 视为笔记。
