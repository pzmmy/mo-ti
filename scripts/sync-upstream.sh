#!/usr/bin/env bash
# ============================================================================
# sync-upstream.sh — 同步上游仓库的最新变更
#
# 用法:
#   ./scripts/sync-upstream.sh [远程仓库URL]
#
# 说明:
#   1. 如果未提供远程仓库 URL，尝试从 git remote 读取
#   2. 自动添加 upstream remote（如果不存在）
#   3. git fetch upstream
#   4. 尝试 git merge upstream/main --ff-only
#   5. 如果合并失败，列出冲突文件
#   6. 输出当前同步状态
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── 确定上游仓库 URL ────────────────────────────────────────────────────────
UPSTREAM_URL="${1:-}"

if [ -z "$UPSTREAM_URL" ]; then
  ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
  if [ -n "$ORIGIN_URL" ]; then
    UPSTREAM_URL="$ORIGIN_URL"
    info "未指定上游 URL，使用 origin 作为上游: $UPSTREAM_URL"
  else
    err "无法确定上游仓库 URL"
    echo "用法: $0 [远程仓库URL]"
    echo "示例: $0 https://github.com/nousresearch/mo-ti.git"
    exit 1
  fi
fi

info "上游仓库: $UPSTREAM_URL"

# ── 检查 git 仓库 ────────────────────────────────────────────────────────────
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  err "当前目录不是 git 仓库"
  exit 1
fi

# ── 检查是否有未提交的变更 ──────────────────────────────────────────────────
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  warn "你有未提交的变更，建议先提交或 stash"
  read -rp "是否继续？[y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    info "已取消同步"
    exit 0
  fi
fi

# ── 确保 upstream remote 存在 ────────────────────────────────────────────────
if git remote get-url upstream > /dev/null 2>&1; then
  CURRENT_UPSTREAM="$(git remote get-url upstream)"
  if [ "$CURRENT_UPSTREAM" != "$UPSTREAM_URL" ]; then
    info "upstream 已存在但 URL 不匹配: $CURRENT_UPSTREAM"
    info "更新为: $UPSTREAM_URL"
    git remote set-url upstream "$UPSTREAM_URL"
  else
    ok "upstream remote 已存在: $UPSTREAM_URL"
  fi
else
  info "添加 upstream remote → $UPSTREAM_URL"
  git remote add upstream "$UPSTREAM_URL"
  ok "upstream remote 已添加"
fi

# ── 切换到 main 分支 ────────────────────────────────────────────────────────
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  warn "当前不在 main 分支 (当前: $CURRENT_BRANCH)"
  read -rp "切换到 main 分支？[Y/n] " SWITCH
  if [[ ! "$SWITCH" =~ ^[Nn]$ ]]; then
    git checkout main
    ok "已切换到 main 分支"
  else
    warn "在分支 '$CURRENT_BRANCH' 上尝试同步 upstream/main"
  fi
fi

# ── Fetch upstream ────────────────────────────────────────────────────────────
info "正在从 upstream 获取最新变更..."
git fetch upstream
ok "已获取 upstream 最新变更"

# ── 尝试快进合并 ─────────────────────────────────────────────────────────────
info "尝试 git merge upstream/main --ff-only ..."
if git merge upstream/main --ff-only 2>&1; then
  ok "快进合并成功 ✓"
  echo ""
  echo "────────────────────────────────────────────"
  echo "  当前状态: 已同步到最新"
  echo "────────────────────────────────────────────"
  git log --oneline -3 --graph
else
  EXIT_CODE=$?
  echo ""
  err "快进合并失败 — 存在冲突或无法快进"
  echo ""

  # ── 列出冲突文件 ──────────────────────────────────────────────────────────
  CONFLICTS="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
  if [ -n "$CONFLICTS" ]; then
    echo -e "${YELLOW}以下文件存在冲突:${NC}"
    echo "$CONFLICTS" | while IFS= read -r file; do
      echo "  ⚠  $file"
    done
  else
    CONFLICT_FILES="$(git status --porcelain | grep -E '^(DD|AU|UD|UA|DU|AA|UU)' | awk '{print $2}' || true)"
    if [ -n "$CONFLICT_FILES" ]; then
      echo -e "${YELLOW}以下文件存在冲突:${NC}"
      echo "$CONFLICT_FILES" | while IFS= read -r file; do
        echo "  ⚠  $file"
      done
    else
      warn "未检测到冲突文件，但合并失败。可能原因：不是快进合并"
      echo "  提示: 使用 'git merge --abort' 取消合并"
      echo "        使用 'git merge upstream/main' 进行常规合并"
    fi
  fi

  echo ""
  echo "────────────────────────────────────────────"
  echo "  当前 HEAD: $(git rev-parse --short HEAD)"
  echo "  upstream/main: $(git rev-parse --short upstream/main 2>/dev/null || echo 'unknown')"
  echo "  状态: 未同步 — 需要手动解决冲突"
  echo "────────────────────────────────────────────"
  exit $EXIT_CODE
fi