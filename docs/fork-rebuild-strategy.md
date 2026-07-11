# 墨屉上游重建策略

## 为什么重建

```
旧方案：在旧 fork 上 rebase 3,342 个 upstream commit
结果：1,075 个文件冲突，几乎每个 cherry-pick 都撞墙

新方案：重新 fork 最新 upstream，只移植我们的定制代码
结果：30 个新增文件零冲突移植成功，修改文件逐个处理
```

## 策略

```
┌──────────────────────────────────────────────┐
│  上游 (refactoringhq/tolaria)                │
│        │ git clone (最新版)                    │
│        ▼                                      │
│  新的本地仓库 (mo-ti-reborn)                   │
│        │                                      │
│        ├── 移植 30 个新增文件 (零冲突) ✅       │
│        ├── 移植中文翻译/配置 (低冲突)           │
│        ├── 移植功能修改 (中冲突)                │
│        └── 移植文档/CI (低冲突)                │
│        │                                      │
│        ▼                                      │
│  git push -f → 替换 main                      │
└──────────────────────────────────────────────┘
```

## 执行步骤

### 1. 备份 + 重建（一次性）

```bash
# 一键执行（约 5 分钟）
bash scripts/fork-rebuild.sh
```

### 2. 移植修改文件（逐日进行）

`/tmp/our-modified-files.txt` 列出了需要我们审查的修改文件。按优先级：

| 优先级 | 文件 | 工作量 |
|--------|------|--------|
| P0 | 中文翻译（public/locales, src/locales） | 半天 |
| P0 | 前端中文化修改 | 半天 |
| P1 | WebDAV 集成 | 已移植 |
| P1 | 拼音搜索 | 1天 |
| P1 | DeepSeek/AI 配置 | 半天 |
| P2 | CI/CD 配置 | 2小时 |

### 3. 替换主分支

```bash
cd /home/young/mo-ti-reborn
git remote add origin git@github.com:pzmmy/mo-ti.git
git push -f origin main
```

### 4. 恢复 cron 任务

```bash
# 重建后的仓库要重新指向
cronjob update --id mo-ti-upstream-weekly --workdir /home/young/mo-ti-reborn
```
