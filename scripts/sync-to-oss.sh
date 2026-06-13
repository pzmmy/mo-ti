#!/usr/bin/env bash
# ============================================================
# 同步 Release 构建产物到阿里云 OSS
#
# 用法:
#   ./scripts/sync-to-oss.sh <artifacts-dir> [version]
#
#   参数:
#     artifacts-dir  - 包含构建产物的目录 (.AppImage, .deb, .msi, .exe)
#     version        - 版本号 (默认从目录中文件推断)
#
# 环境变量:
#   OSS_ACCESS_KEY_ID      - 阿里云 RAM 子用户 AccessKey ID
#   OSS_ACCESS_KEY_SECRET  - 阿里云 RAM 子用户 AccessKey Secret
#   OSS_ENDPOINT           - OSS 地域 endpoint (默认: oss-cn-hangzhou.aliyuncs.com)
#   OSS_BUCKET             - OSS Bucket 名称 (默认: mo-ti)
#   OSS_PREFIX             - OSS 上传路径前缀 (默认: releases)
#
# 示例:
#   export OSS_ACCESS_KEY_ID="LTAI5t***"
#   export OSS_ACCESS_KEY_SECRET="your-secret-key"
#   ./scripts/sync-to-oss.sh ./dist v1.0.0
# ============================================================
set -euo pipefail

# --------------- 默认值 ---------------
OSS_ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"
OSS_BUCKET="${OSS_BUCKET:-mo-ti}"
OSS_PREFIX="${OSS_PREFIX:-releases}"

# --------------- 颜色输出 ---------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# --------------- 参数检查 ---------------
if [ $# -lt 1 ]; then
  echo "用法: $0 <artifacts-dir> [version]"
  echo ""
  echo "示例: $0 ./dist v1.0.0"
  exit 1
fi

ARTIFACTS_DIR="$1"
VERSION="${2:-}"

if [ ! -d "$ARTIFACTS_DIR" ]; then
  error "产物目录不存在: $ARTIFACTS_DIR"
  exit 1
fi

# 如果没有指定版本，尝试从文件名推断
if [ -z "$VERSION" ]; then
  # 查找类似 mo-ti_1.0.0_amd64.deb 或 Mo-Ti-1.0.0-x86_64.AppImage 的文件
  SAMPLE_FILE=$(ls "$ARTIFACTS_DIR"/*.{AppImage,deb,msi,exe} 2>/dev/null | head -1)
  if [ -n "$SAMPLE_FILE" ]; then
    BASENAME=$(basename "$SAMPLE_FILE")
    # 尝试提取版本号 (匹配 v1.0.0 或 1.0.0 模式)
    VERSION=$(echo "$BASENAME" | grep -oP 'v?\d+\.\d+\.\d+' | head -1 || true)
  fi
  if [ -z "$VERSION" ]; then
    VERSION="latest"
    warn "无法推断版本号，使用默认值: $VERSION"
  else
    info "推断版本号: $VERSION"
  fi
fi

# --------------- 检查阿里云 CLI ---------------
OSSUTIL_CMD=""

# 尝试找到 ossutil
if command -v ossutil &>/dev/null; then
  OSSUTIL_CMD="ossutil"
elif command -v ossutil64 &>/dev/null; then
  OSSUTIL_CMD="ossutil64"
elif [ -f "/usr/local/bin/ossutil" ]; then
  OSSUTIL_CMD="/usr/local/bin/ossutil"
elif [ -f "/usr/local/bin/ossutil64" ]; then
  OSSUTIL_CMD="/usr/local/bin/ossutil64"
else
  warn "ossutil 未安装，尝试自动下载..."
  if command -v curl &>/dev/null; then
    DOWNLOAD_URL="https://gosspublic.alicdn.com/ossutil/1.7.19/ossutil64"
    if [ "$(uname)" = "Linux" ]; then
      curl -sL "$DOWNLOAD_URL" -o /tmp/ossutil64
      chmod +x /tmp/ossutil64
      OSSUTIL_CMD="/tmp/ossutil64"
    else
      error "仅支持 Linux 系统自动下载，请手动安装 ossutil"
      exit 1
    fi
  else
    error "curl 不可用，请先安装 ossutil: https://help.aliyun.com/zh/oss/developer-reference/install-ossutil"
    exit 1
  fi
fi

info "使用 ossutil: $OSSUTIL_CMD"

# --------------- 检查环境变量 ---------------
if [ -z "${OSS_ACCESS_KEY_ID:-}" ]; then
  error "环境变量 OSS_ACCESS_KEY_ID 未设置"
  exit 1
fi
if [ -z "${OSS_ACCESS_KEY_SECRET:-}" ]; then
  error "环境变量 OSS_ACCESS_KEY_SECRET 未设置"
  exit 1
fi

# --------------- 配置 ---------------
OSS_CONFIG_FILE="/tmp/ossutil_config_$$"
cat > "$OSS_CONFIG_FILE" <<EOF
[Credentials]
language=CH
endpoint=$OSS_ENDPOINT
accessKeyID=$OSS_ACCESS_KEY_ID
accessKeySecret=$OSS_ACCESS_KEY_SECRET
EOF

cleanup() {
  rm -f "$OSS_CONFIG_FILE"
}
trap cleanup EXIT

OSS_OPTS=(-c "$OSS_CONFIG_FILE" -f)

# --------------- 上传文件 ---------------
TARGET_PATH="oss://${OSS_BUCKET}/${OSS_PREFIX}/${VERSION}"
info "目标路径: $TARGET_PATH"
info "正在上传产物..."

# 统计
UPLOAD_COUNT=0
FAIL_COUNT=0

# 上传函数
upload_file() {
  local file="$1"
  local target="$2"
  info "上传: $file -> $target"
  if "$OSSUTIL_CMD" cp "${OSS_OPTS[@]}" "$file" "$target" --acl public-read; then
    UPLOAD_COUNT=$((UPLOAD_COUNT + 1))
  else
    error "上传失败: $file"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# 上传所有构建产物
for file in "$ARTIFACTS_DIR"/*.AppImage "$ARTIFACTS_DIR"/*.deb "$ARTIFACTS_DIR"/*.msi "$ARTIFACTS_DIR"/*.exe; do
  if [ -f "$file" ]; then
    upload_file "$file" "$TARGET_PATH/"
  fi
done

# 也上传一份到 releases/latest 供最新版下载引用
info "同步到 releases/latest..."
LATEST_PATH="oss://${OSS_BUCKET}/${OSS_PREFIX}/latest"
for file in "$ARTIFACTS_DIR"/*.AppImage "$ARTIFACTS_DIR"/*.deb "$ARTIFACTS_DIR"/*.msi "$ARTIFACTS_DIR"/*.exe; do
  if [ -f "$file" ]; then
    upload_file "$file" "$LATEST_PATH/"
  fi
done

# --------------- 结果 ---------------
echo ""
info "======== 同步完成 ========"
info "上传成功: $UPLOAD_COUNT 个文件"
if [ "$FAIL_COUNT" -gt 0 ]; then
  warn "上传失败: $FAIL_COUNT 个文件"
fi

# 生成下载链接
echo ""
info "下载链接:"
for file in "$ARTIFACTS_DIR"/*.AppImage "$ARTIFACTS_DIR"/*.deb "$ARTIFACTS_DIR"/*.msi "$ARTIFACTS_DIR"/*.exe; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file")
    echo "  https://${OSS_BUCKET}.${OSS_ENDPOINT}/${OSS_PREFIX}/${VERSION}/${BASENAME}"
  fi
done

exit $FAIL_COUNT
