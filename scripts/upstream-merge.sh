#!/bin/bash
# 墨屉上游合并执行脚本
# 将 backup-main 中新增的文件（无冲突风险）移植到 upstream-rebase

set -euo pipefail

OUR="backup-main"
TARGET="upstream-rebase"
cd /home/young/mo-ti

# 确保在 target 分支
git checkout "$TARGET" 2>/dev/null

# 只移植 upstream 中完全不存在的新增文件（零冲突风险）
echo "移植新增文件..."
git diff --diff-filter=A --name-only "$OUR"..upstream/main 2>/dev/null | while read f; do
    # 跳过 demo vault（太大）和无关文件
    case "$f" in
        demo-vault-zh/*|docs/*|screenshots/*|site/*|.chunk/*)
            continue;;
    esac
    git checkout "$OUR" -- "$f" 2>/dev/null && echo "  + $f" || true
done

echo ""
echo "合并完成。需要手动处理:"
echo "1. 更新的文件（非新增）— 需要手动 cherry-pick 或重做修改"
echo "2. 编译检查 — cargo check"
echo "3. 测试 — cargo test"
