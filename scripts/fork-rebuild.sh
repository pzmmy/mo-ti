#!/bin/bash
# 墨屉上游重建脚本
# 策略：备份定制代码 → 重新 fork → 逐步移植

set -euo pipefail

REPO_DIR="/home/young/mo-ti"
BACKUP_DIR="/home/young/mo-ti-backup-$(date +%Y%m%d)"
UPSTREAM_URL="git@github.com:refactoringhq/tolaria.git"
NEW_DIR="/home/young/mo-ti-reborn"

echo "=== 墨屉上游重建 ==="
echo ""

# 步骤1：备份全部定制代码
echo "📦 [1/5] 备份当前代码..."
cp -a "$REPO_DIR" "$BACKUP_DIR"
echo "   ✅ 备份到 $BACKUP_DIR"

# 步骤2：生成定制代码清单
echo "📋 [2/5] 生成定制代码清单..."
cd "$BACKUP_DIR"
git checkout main 2>/dev/null || true

# 增量文件（我们新增的，上游没有的）
git diff --diff-filter=A --name-only upstream/main..HEAD 2>/dev/null > /tmp/our-added-files.txt
echo "   新增文件: $(wc -l < /tmp/our-added-files.txt)"

# 修改文件（我们改过的，上游也有）
git diff --diff-filter=M --name-only upstream/main..HEAD 2>/dev/null > /tmp/our-modified-files.txt
echo "   修改文件: $(wc -l < /tmp/our-modified-files.txt)"

# 删除文件（我们删掉的，上游还有）
git diff --diff-filter=D --name-only upstream/main..HEAD 2>/dev/null > /tmp/our-deleted-files.txt
echo "   删除文件: $(wc -l < /tmp/our-deleted-files.txt)"

# 步骤3：全量 fork 上游最新代码
echo ""
echo "🔄 [3/5] 克隆最新上游..."
git clone "$UPSTREAM_URL" "$NEW_DIR"
cd "$NEW_DIR"
echo "   ✅ 已克隆最新上游"

# 步骤4：移植新增文件（零冲突）
echo ""
echo "📝 [4/5] 移植新增文件..."
while read f; do
    # 跳过无关文件
    case "$f" in
        demo-vault-zh/*|site/*|screenshots/*|.chunk/*)
            continue;;
    esac
    mkdir -p "$(dirname "$f")"
    cp "$BACKUP_DIR/$f" "$f" 2>/dev/null && echo "   + $f" || true
done < /tmp/our-added-files.txt

echo ""
echo "   ✅ 新增文件移植完成"
echo ""
echo "⏳ [5/5] 修改文件需要手动处理:"
echo "   修改文件清单: /tmp/our-modified-files.txt"
echo "   逐个审查后 cherry-pick 或手动重做"
echo ""
echo "=== 完成 ==="
echo "备份: $BACKUP_DIR"
echo "新仓库: $NEW_DIR"
echo ""
echo "后续步骤:"
echo "   cd $NEW_DIR"
echo "   git add -A && git commit -m 'chore: port custom features'"
echo "   git remote add origin git@github.com:pzmmy/mo-ti.git"
echo "   git push -f origin main"
