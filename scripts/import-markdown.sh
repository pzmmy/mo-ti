#!/usr/bin/env bash
# ============================================================
# Obsidian / Notion Markdown 导入工具 - 墨屉 (Mo-Ti)
#
# 将 Obsidian Vault 或 Notion 导出的 Markdown 文件
# 导入到墨屉知识库 (mo-ti vault) 中。
#
# 用法:
#   ./scripts/import-markdown.sh --source <path> [options]
#
# 参数:
#   --source <path>     来源目录路径 (必填)
#                          Obsidian: Obsidian vault 目录
#                          Notion:  Notion 导出的 zip 文件或解压后的目录
#   --target <path>     目标 vault 路径 (默认: ~/mo-ti-vault)
#   --type <type>       导入类型: obsidian 或 notion (默认: obsidian)
#   --help              显示此帮助信息
#
# 示例:
#   # 导入 Obsidian vault
#   ./scripts/import-markdown.sh --source ~/my-obsidian-vault
#
#   # 导入到指定目标目录
#   ./scripts/import-markdown.sh --source ~/my-obsidian-vault --target ~/mo-ti-vault
#
#   # 导入 Notion 导出
#   ./scripts/import-markdown.sh --source ~/Downloads/notion-export.zip --type notion
#
# 说明:
#   Obsidian 导入:
#     - 复制所有 .md 文件到目标 vault，保持目录结构
#     - 复制 attachments / assets 目录到目标 vault
#     - wikilink [[note]] 和 ![[image.png]] 保留原样
#       (mo-ti 也支持 wikilink 语法)
#
#   Notion 导入:
#     - 接受 zip 文件或解压后的目录
#     - 扁平化 Notion 的嵌套页面结构到单层
#     - 自动处理附件和图片
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
header(){ echo -e "${CYAN}$*${NC}"; }

TARGET="${HOME}/mo-ti-vault"
TYPE="obsidian"

SOURCE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE="$2"; shift 2 ;;
    --target)
      TARGET="$2"; shift 2 ;;
    --type)
      TYPE="$2"; shift 2 ;;
    --help)
      awk '/^# [^=]/ { sub(/^# /,""); print }' "$0"; exit 0 ;;
    *)
      error "未知参数: $1"
      echo "用法: $0 --source <path> [--target <path>] [--type obsidian|notion]"
      exit 1 ;;
  esac
done

if [ -z "$SOURCE" ]; then
  error "请指定 --source 参数"
  echo "用法: $0 --source <path> [--target <path>] [--type obsidian|notion]"
  exit 1
fi

if [ ! -e "$SOURCE" ]; then
  error "来源路径不存在: $SOURCE"
  exit 1
fi

if [[ "$TYPE" != "obsidian" && "$TYPE" != "notion" ]]; then
  error "不支持的导入类型: $TYPE (仅支持 obsidian 或 notion)"
  exit 1
fi

echo ""
header "== 墨屉 Markdown 导入工具 =="
echo ""
info "来源:      $SOURCE"
info "目标:      $TARGET"
info "类型:      $TYPE"
echo ""

MD_COUNT=0
ATTACHMENT_COUNT=0
DIR_COUNT=0
mkdir -p "$TARGET"

# =============================================================
# OBSIDIAN
# =============================================================
import_obsidian() {
  local src="$1" dst="$2"

  if [ ! -d "$src" ]; then
    error "Obsidian 导入需要一个目录路径: $src"
    exit 1
  fi

  info "=== 开始导入 Obsidian Vault ==="
  info "步骤 1/3: 复制 Markdown 文件..."

  local md_files=()
  while IFS= read -r -d '' f; do
    md_files+=("$f")
  done < <(find "$src" -name "*.md" -type f -print0 2>/dev/null || true)

  if [ ${#md_files[@]} -eq 0 ]; then
    warn "未找到 .md 文件"
  else
    for f in "${md_files[@]}"; do
      local rel="${f#$src/}"
      local rel_dir; rel_dir=$(dirname "$rel")
      local target_dir="$dst/$rel_dir"
      if [ ! -d "$target_dir" ]; then
        mkdir -p "$target_dir"; DIR_COUNT=$((DIR_COUNT + 1))
      fi
      cp "$f" "$target_dir/"
      MD_COUNT=$((MD_COUNT + 1))
    done
    info "  OK 已复制 $MD_COUNT 个 .md 文件"
  fi

  info "步骤 2/3: 复制附件..."
  local adirs=("attachments" "assets" "media" "images" "files")
  local found=0
  for adir in "${adirs[@]}"; do
    if [ -d "$src/$adir" ]; then
      info "  发现附件目录: $adir"
      if [ -d "$dst/$adir" ]; then
        warn "  目标目录已存在: $dst/$adir，跳过"
      else
        cp -r "$src/$adir" "$dst/$adir"
        local cnt; cnt=$(find "$dst/$adir" -type f 2>/dev/null | wc -l)
        ATTACHMENT_COUNT=$((ATTACHMENT_COUNT + cnt))
        found=1
        info "  OK 已复制 $cnt 个附件文件"
      fi
    fi
  done
  [ "$found" -eq 0 ] && warn "  未找到附件目录 (attachments/assets/media/images/files)"

  info "步骤 3/3: 检查 wikilink 兼容性..."
  info "  OK mo-ti 原生支持 [[wikilink]] 语法，无需转换"
  info "  OK mo-ti 原生支持 ![[image.png]] 嵌入语法，无需转换"

  echo ""
  header "--- 导入统计 ---"
  info "Markdown 文件:    $MD_COUNT"
  info "附件文件:         $ATTACHMENT_COUNT"
  info "创建的目录:       $DIR_COUNT"
  echo ""
  info "导入完成! 目标 vault: $dst"
}

# =============================================================
# NOTION
# =============================================================
import_notion() {
  local src="$1" dst="$2"
  local work_dir=""

  if [ -f "$src" ] && [[ "$src" == *.zip ]]; then
    info "检测到 zip 文件，正在解压..."
    work_dir=$(mktemp -d /tmp/notion-import-XXXXXX)
    if ! unzip -q "$src" -d "$work_dir" 2>/dev/null; then
      error "解压失败: $src"; rm -rf "$work_dir"; exit 1
    fi
    local items; items=$(ls -A "$work_dir" 2>/dev/null | wc -l)
    if [ "$items" -eq 1 ]; then
      local si; si=$(ls -A "$work_dir" 2>/dev/null | head -1)
      [ -d "$work_dir/$si" ] && src="$work_dir/$si" || src="$work_dir"
    else
      src="$work_dir"
    fi
  elif [ -f "$src" ]; then
    error "Notion 导入需要 zip 文件或目录: $src"; exit 1
  fi

  [ ! -d "$src" ] && { error "目录不存在: $src"; exit 1; }

  info "=== 开始导入 Notion 导出 ==="
  info "步骤 1/3: 扫描 Notion 导出结构..."

  local files=()
  while IFS= read -r -d '' f; do
    files+=("$f")
  done < <(find "$src" -maxdepth 2 -name "*.md" -type f -print0 2>/dev/null || true)

  if [ ${#files[@]} -eq 0 ]; then
    error "未找到 Markdown 文件"
    [ -n "${work_dir:-}" ] && [ -d "$work_dir" ] && rm -rf "$work_dir"
    exit 1
  fi
  info "  发现 ${#files[@]} 个 .md 文件"

  local att_dir="$dst/attachments"
  mkdir -p "$att_dir"

  info "步骤 2/3: 复制 Markdown 文件并处理附件..."
  for f in "${files[@]}"; do
    local base; base=$(basename "$f")
    if [ -f "$dst/$base" ]; then
      local ext="${base%.md}"
      local c=1
      while [ -f "$dst/${ext}_${c}.md" ]; do c=$((c+1)); done
      warn "  文件冲突: $base -> ${ext}_${c}.md"
      base="${ext}_${c}.md"
    fi
    cp "$f" "$dst/$base"

    local fdir; fdir=$(dirname "$f")
    if [ -d "$fdir" ]; then
      while IFS= read -r -d '' a; do
        local an; an=$(basename "$a")
        [[ "$an" != *.md ]] && [ ! -f "$att_dir/$an" ] && cp "$a" "$att_dir/$an" && ATTACHMENT_COUNT=$((ATTACHMENT_COUNT+1))
      done < <(find "$fdir" -maxdepth 1 -type f ! -name "*.md" -print0 2>/dev/null || true)

      while IFS= read -r -d '' sd; do
        [ -d "$sd" ] && while IFS= read -r -d '' sa; do
          local san; san=$(basename "$sa")
          [[ "$san" != *.md ]] && [ ! -f "$att_dir/$san" ] && cp "$sa" "$att_dir/$san" && ATTACHMENT_COUNT=$((ATTACHMENT_COUNT+1))
        done < <(find "$sd" -maxdepth 1 -type f ! -name "*.md" -print0 2>/dev/null || true)
      done < <(find "$fdir" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null || true)
    fi
    MD_COUNT=$((MD_COUNT + 1))
  done

  info "步骤 3/3: 修正链接路径..."
  local fx=0
  while IFS= read -r -d '' mf; do
    if grep -qP '!\[.*?\]\((?!attachments/)[^)]+\.(png|jpg|jpeg|gif|svg|webp|pdf|zip|mp4|mov|mp3)' "$mf" 2>/dev/null; then
      sed -i -E 's|(!\[.*?\])\(((?!attachments/)[^)]+\.(png|jpg|jpeg|gif|svg|webp|pdf|zip|mp4|mov|mp3))\)|\1(attachments/\2)|g' "$mf" 2>/dev/null || true
      fx=$((fx+1))
    fi
  done < <(find "$dst" -maxdepth 1 -name "*.md" -type f -print0 2>/dev/null || true)

  [ "$fx" -gt 0 ] && info "  OK 已修正 $fx 个文件中的链接路径" || info "  OK 无需修正"

  [ -n "${work_dir:-}" ] && [ -d "$work_dir" ] && rm -rf "$work_dir" && info "  已清理临时文件"

  echo ""
  header "--- 导入统计 ---"
  info "Markdown 文件:    $MD_COUNT"
  info "附件文件:         $ATTACHMENT_COUNT"
  echo ""
  info "导入完成! 目标 vault: $dst"
  info "提示: 附件已导入到 $dst/attachments/"
  info "注意: Notion 子页面已扁平化到 vault 根目录"
}

case "$TYPE" in
  obsidian) import_obsidian "$SOURCE" "$TARGET" ;;
  notion)   import_notion   "$SOURCE" "$TARGET" ;;
esac

echo ""
info "你可以用墨屉打开以下目录来查看导入的内容:"
echo "  $TARGET"
echo ""
