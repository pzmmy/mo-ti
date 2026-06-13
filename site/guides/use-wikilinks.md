# 使用 Wikilinks

Wikilinks 通过名称连接笔记。

```md
This project belongs to [[content-systems]] and is related to [[git-workflows]].
```

## 在正文中链接

当关联关系是你正在书写的句子的一部分时，使用正文链接。

## 在 frontmatter 中链接

当关联关系应该成为结构化元数据时，使用 frontmatter 链接。

```yaml
related_to:
  - "[[git-workflows]]"
```

## 保持链接稳定

优先使用清晰的笔记标题和文件名。Tolaria 的 wikilink 自动完成功能在你输入时帮助你选择正确的目标。
