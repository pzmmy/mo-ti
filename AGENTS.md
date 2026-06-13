# AGENTS.md — Tolaria App

## 1. 开发流程

### 开始处理任务

**在编写任何代码之前：** 运行 `mcp__codescene__code_health_score` 检查当前代码库健康度是否满足 `.codescene-thresholds` 的要求。如果分数已低于阈值，**请先停下来进行重构**——通过 MCP 找出最差的文件，改进它们，提交后再开始任务。切勿在代码库已低于关卡阈值时开始新功能开发。

- 完整阅读任务描述和所有注释
- 对于待返工任务：❌ QA 失败的注释会明确告诉你需要修复什么
- 在做出架构决策前，先检查 `docs/adr/` 中相关的架构决策记录
- 检查 `docs/ARCHITECTURE.md` 和 `docs/ABSTRACTIONS.md` 获取相关结构信息
- 对于 UI 任务：先研究应用的视觉语言和组件。优先复用现有组件、资源和变量，而不是重新创建
- 如果正在处理 Todoist 任务，添加一条评论：`🚀 开始处理此任务。[方法简要描述]`

### 提交与推送

- 直接推送到 `main`——没有 PR，没有分支。推送前钩子会阻止非 `main` 分支的推送
- 每 20–30 分钟提交一次：`feat:`、`fix:`、`refactor:`、`test:`、`docs:`
- 推送前钩子会运行完整的检查套件（构建 + 测试 + 核心 Playwright 冒烟测试 + CodeScene）
- **在 `git push origin main` 成功之前，任务不算完成。** 如果钩子拦截了：阅读错误信息，修复它（clippy、测试、CodeScene、构建），提交修复，再次推送。**⛔ 切勿使用 --no-verify**

### TDD（强制要求）

红 → 绿 → 重构 → 提交。每个提交一个循环。对于缺陷：先编写失败的回归测试，然后再修复。纯 CSS/布局变更除外。

**测试质量（Kent Beck 的期望标准）：** 隔离的 · 确定性的 · 快速的 · 行为驱动的 · 结构不敏感的 · 特定的 · 可预测的。先修复不稳定的测试。用户流程优先使用 E2E 测试而非单元测试。

### 国际化（UI 文案强制要求）

所有面向用户的 UI 标签/文案必须放在 `src/lib/locales/en.json` 中，并翻译成 `lara.yaml` 中列出的每一种目标语言。添加或修改界面文案时：

```bash
pnpm l10n:translate
```

仅在有意识地重新生成现有翻译时使用 `pnpm l10n:translate:force`。提交生成的 `src/lib/locales/*.json`、`lara.yaml`/`lara.lock` 更改，并验证占位符/产品名称保持不变。

### 产品分析（有意义的功能强制要求）

新功能通常应发送 PostHog 事件，以便我们了解用户是否真正发现并使用它们。仅对于非常小的、专用事件会造成噪音的更改，可以跳过埋点。使用清晰、稳定的事件名称，避免包含 PII 或笔记内容，只包含有助于评估采用率和失败情况的安全元数据。

在添加或更改有意义的面向用户功能时，在 Todoist 完成评论中包含事件名称，同时附上 QA、文档和代码健康信息。如果有意不对某个功能进行埋点，请在完成评论中说明原因。

### 代码健康（强制要求）

提交前和推送前钩子会强制执行**热点代码健康度**和**平均代码健康度** ≥ `.codescene-thresholds` 中的阈值。两个关卡都会阻止提交/推送。阈值是**棘轮机制**——只会上升。当推送前钩子发现远程分数有提升时，它会更新 `.codescene-thresholds`，暂存该更改，然后停止，以便你可以在再次推送前使用正常的已验证钩子提交新的下限。切勿添加 `// eslint-disable`、`#[allow(...)]` 或 `as any`。

**发布规则：** CodeScene 是一个前后关卡，而不仅仅是最终分数。每个任务必须在编辑前记录 CodeScene 起始状态，并在编辑后记录最终状态。如果被触及的代码变差了，在提交前进行重构。

**⛔ 切勿编辑 `.codescene-thresholds` 来降低数值。** 如果关卡阻止了你，请改进代码——不要降低标准。

**CodeScene 访问顺序：** 如果可用，优先使用 CodeScene MCP 工具。如果 MCP 不可用，使用已安装的 `cs` CLI 进行文件级别的审查/差异分析，并使用 CodeScene API（`CODESCENE_PAT` + `CODESCENE_PROJECT_ID`）从 `.codescene-thresholds` 进行项目范围的 Hotspot/Average 阈值检查。

**在编辑任何现有代码文件之前：** 捕获其当前的 CodeScene 文件级分数。编辑完成后，重新运行相同的文件级审查，并验证分数已提高。如果文件起始分数已经是 `10.0`，则必须保持 `10.0`。

**新文件：** 每个新的**可评分代码文件**在提交前必须达到 CodeScene 分数 `10.0`。如果 CodeScene 对新文件报告 `null` / "no scorable code"，则它仍必须具有零个 CodeScene 发现/警告。

**每次提交前：** 对每个被触及或新创建的代码文件运行 CodeScene 文件级审查，并验证上述规则。**童子军规则：** 你接触的每个文件离开时必须具有更高的分数，除非它已经是 `10.0`，在这种情况下它必须保持 `10.0`。

**如果 CodeScene 关卡阻止了你的推送：** 使用 `mcp__codescene__code_health_score` 找出最差的文件，重构它，提交，再次推送。不要停下来等待 laputa-refactor——那是一个后台循环，不能替代修复你自己的回归问题。

### Codacy 安全扫描（强制要求）

在任务被认为可发布之前，将 Codacy 作为安全和静态分析关卡来使用。

- 优先使用 Codex 中的 Codacy MCP 来检查每个被触及代码文件的仓库/文件问题
- 如果 MCP 不可用，使用本地 CLI 包装器，例如 `.codacy/cli.sh analyze <path> --format sarif`；在有用时选择合适的工具（`eslint`、`opengrep`、`trivy`、`lizard`）
- **始终修复由你的更改引入的 Critical 和 High 严重性发现。** 不要带着新的 Critical/High Codacy 问题将任务移至 In Review。
- 审查 Medium 发现。如果是真实的缺陷或安全问题，请修复它们；否则在完成评论中说明为什么它们是可以接受的。
- 切勿仅仅为了通过扫描而静默 Codacy 规则。优先选择能够消除发现的小型代码更改。

### 检查套件（每次推送时运行）
```bash
pnpm lint && npx tsc --noEmit && pnpm test && pnpm test:coverage  # 前端 ≥70%
cargo test && cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85
```

覆盖率是发布关卡，而不是虚荣指标：
- 前端覆盖率必须保持 ≥70%
- Rust 行覆盖率必须保持 ≥85%
- 对于缺陷修复，在可行时添加回归测试
- 对于新行为，在变更代码附近添加有针对性的覆盖测试；不要仅依赖广泛的 E2E 覆盖

### UI 与原生 QA

**阶段 1 — Playwright（仅限核心用户流程）：**

仅当功能涉及以下内容时，才在 `tests/smoke/<slug>.spec.ts` 中编写 Playwright 测试：保险库打开、笔记创建/保存/删除、搜索、维基链接导航、git 提交/推送、冲突解决。仅在测试保护核心推送前工作流时才标记为 `@smoke`。不要标记纯外观或大量模拟的检查——将这些保留在完整回归通道中。精心策划的 `pnpm playwright:smoke` 套件必须保持在 **5 分钟以内**；对于完整的 Playwright 测试，使用 `pnpm playwright:regression`。

```bash
pnpm dev --port 5201 &
sleep 3
BASE_URL="http://localhost:5201" npx playwright test tests/smoke/<slug>.spec.ts
```

**阶段 2 — 原生应用 QA：**

```bash
pnpm tauri dev &
sleep 10
bash ~/.openclaw/skills/tolaria-qa/scripts/focus-app.sh laputa
bash ~/.openclaw/skills/tolaria-qa/scripts/screenshot.sh /tmp/qa-native.png
```

在可用时，使用 computer-use/browser-control 风格的交互进行原生 UI QA：像真实用户使用鼠标和触控板一样进行点击、悬停、拖拽、选择、滚动和输入。对于每个 UI 功能，先测试主要的鼠标驱动路径，然后验证任何相关的键盘快捷键或键盘优先工作流仍然有效。Tolaria 仍然是一个键盘优先的应用，但 QA 不能假设用户只通过键盘交互。

使用 `osascript` 进行应用聚焦、键盘快捷键和键盘特定检查。**⚠️ WKWebView：** `osascript keystroke` 可能在编辑器内容中被阻塞——尽可能使用 computer use 进行原生编辑器交互，并依赖 Playwright 进行确定性的文本输入覆盖。在 Todoist 中将结果写为评论（✅ 或 ❌）。

### 发布就绪检查清单

在推送或将任务移至 In Review 之前，验证发布关卡并添加一条**完成评论**到 Todoist 任务。评论必须包含：

- 实现了什么（涵盖逻辑和 UX/UI 的几行说明）
- QA：测试了什么以及如何测试的（Playwright / 原生截图 / osascript）
- 测试/覆盖率：运行的命令和最终覆盖率结果
- CodeScene：被触及文件的修改前后检查结果，以及推送后的最终 Hotspot 和 Average 分数；最终分数必须通过 `.codescene-thresholds`
- 覆盖率命令已通过（`pnpm test:coverage` 和 `cargo llvm-cov ... --fail-under-lines 85`），或者变更仅涉及文档
- Codacy：MCP/CLI 扫描摘要；确认没有新的 Critical/High 发现
- 国际化：所有面向用户的文案都在 `src/lib/locales/en.json` 中，已运行 `pnpm l10n:translate`，并且 `pnpm l10n:validate` 通过。如果没有文案变更，则说明 "Localization: no UI copy changes"
- PostHog：有意义的用户操作/事件已使用安全元数据进行埋点；嘈杂/微小的变更明确说明 "PostHog: no event needed because …"
- 重构：为满足 CodeScene 关卡而重构的任何文件，或 "none needed"
- ADR：任何新增/更新的 ADR，或 "none"
- 文档：任何更新的文档（`ARCHITECTURE.md`、`ABSTRACTIONS.md` 等），或 "none"
- 演示仓库脏文件检查：除非是有意更改测试数据，否则 `git status --short -- demo-vault demo-vault-v2` 应为空

### ADR 与文档

ADR 存放在 `docs/adr/` 中。在与代码相同的提交中创建。切勿编辑已有的 ADR——创建一个新的来取代它。使用 `/create-adr`。**何时需要：** 新依赖、存储策略、平台目标、核心抽象、跨切面模式。**不需要的情况：** 缺陷修复、样式调整、重构。

在添加任何 Tauri 命令、新组件/钩子、数据模型更改或新集成之后，在同一提交中更新 `docs/ARCHITECTURE.md`、`docs/ABSTRACTIONS.md` 和/或 `docs/GETTING-STARTED.md`。

---

## 2. 产品规则

### 演示仓库卫生（`demo-vault/`、`demo-vault-v2/`）

默认使用 `demo-vault-v2/` 进行测试。

- 将 `demo-vault/` 和 `demo-vault-v2/` 视为一次性 QA 测试数据，除非任务明确要求更改演示内容
- 如果你在那里创建了未追踪的笔记、附件或其他临时文件用于测试，请在任务完成前删除它们
- 如果你修改了已追踪的演示仓库文件仅用于测试或 QA 行为，请在最终提交前撤销这些修改
- 在宣布任务完成之前，确保 `git status --short -- demo-vault demo-vault-v2` 为空，除非演示测试数据变更是任务的一部分
- 如果开始新的运行且唯一的本地脏文件位于 `demo-vault/` 或 `demo-vault-v2/` 内，请先清理这些路径然后继续。这种情况是可恢复的 QA 残留，不是阻塞项

### 用户仓库（`~/Laputa/`）

默认使用 `demo-vault-v2/`。如果你必须使用 `~/Laputa/` 进行测试：
- **切勿提交或推送**任何测试笔记到远程仓库
- **完成后删除磁盘上的所有测试笔记**——不要留下无标题或临时笔记。运行 `cd ~/Laputa && git checkout -- . && git clean -fd` 将仓库恢复到上次提交的状态
- **理由：** 测试笔记会随着时间的推移污染本地仓库，使其变成一堆无意义的无标题文件。仓库必须在磁盘上保持干净，而不仅仅是在远程

### UI 组件——强制规则

**始终使用 shadcn/ui 组件。** 切勿在面向用户的 UI 中使用原始 HTML 表单元素（`<input>`、`<select>`、`<button>`、原生 `<input type="date">` 等）。每个交互元素必须使用 shadcn/ui 的对应组件：

| 需求 | 使用 |
|---|---|
| 文本输入 | shadcn/ui 的 `Input` |
| 下拉菜单/选择 | shadcn/ui 的 `Select` |
| 日期选择器 | shadcn/ui 的 `Calendar` + `Popover`（不要使用原生 `<input type="date">`） |
| 按钮 | shadcn/ui 的 `Button` |
| 自动完成/组合框 | 复用应用中现有的组合框组件（检查 `src/components/`） |
| 维基链接选择器 | 复用编辑器和属性面板中已使用的维基链接自动完成组件 |
| 表情选择器 | 复用于笔记/类型图标的表情选择器组件 |
| 颜色选择器 | 复用于类型自定义的颜色样本选择器 |
| 切换/开关 | shadcn/ui 的 `Switch` 或 `ToggleGroup` |
| 对话框/模态框 | shadcn/ui 的 `Dialog` |

**有疑问时：** 在构建新组件之前，先搜索 `src/components/` 中已有的组件。**视觉语言：** 所有新 UI 必须感觉像是 Tolaria 原生的——如果看起来像浏览器默认样式，那就是错的。

---

## 3. 参考

### macOS / Tauri 注意事项

- `Option+N` → macOS 上的特殊字符。使用 `e.code` 或 `Cmd+N`
- Tauri 菜单快捷键：`MenuItemBuilder::new(label).accelerator("CmdOrCtrl+1")`
- `app.set_menu()` 会替换**整个**菜单栏——需要包含所有子菜单
- `mock-tauri.ts` 会静默吞掉 Tauri 调用——不能替代原生测试

### QA 脚本

```bash
bash ~/.openclaw/skills/tolaria-qa/scripts/focus-app.sh Tolaria
bash ~/.openclaw/skills/tolaria-qa/scripts/screenshot.sh /tmp/out.png
bash ~/.openclaw/skills/tolaria-qa/scripts/shortcut.sh "command" "s"
```

### 图表

优先使用 Mermaid（`flowchart`、`sequenceDiagram`、`classDiagram`、`stateDiagram-v2`）。仅空间线框图布局使用 ASCII。
