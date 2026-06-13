# 发布通道

Tolaria 将稳定版和 Alpha 版的发布元数据发布到 GitHub Pages。

## 稳定版

稳定版跟随手动推送的发布版本。这是正常使用的正确通道。

稳定版更新器元数据位于：

```txt
/stable/latest.json
```

公共下载页面指向最新的稳定版。

## Alpha 版

Alpha 版跟随 `main` 分支的推送。它会更早地接收修复和功能，但可能比稳定版粗糙。

Alpha 版更新器元数据位于：

```txt
/alpha/latest.json
```

兼容性端点也指向 Alpha 版元数据：

```txt
/latest.json
/latest-canary.json
```

## 切换前

在更改发布通道或安装更新之前，请提交或推送重要的库变更。你的笔记是本地文件，但干净的 Git 状态使恢复更加简单。
