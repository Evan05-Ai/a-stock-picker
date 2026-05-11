#!/bin/bash
# 部署 dist 到 GitHub Pages (gh-pages 分支)
set -e

DIST_DIR="dist"
REMOTE="origin"
BRANCH="gh-pages"
TMP_DIR=$(mktemp -d)

echo "📦 准备部署 dist → $BRANCH 分支..."

# 复制 dist 内容到临时目录
cp -r "$DIST_DIR/." "$TMP_DIR/"
cd "$TMP_DIR"

# 初始化 git 并切换到 gh-pages 分支
git init
git remote add origin $(cd - > /dev/null && git remote get-url origin)
git checkout --orphan "$BRANCH"
git add -A
git commit -m "deploy: 更新 GitHub Pages ($(date '+%Y-%m-%d %H:%M:%S'))"

echo "🚀 推送到 $BRANCH 分支..."
git push origin "$BRANCH" --force

cd - > /dev/null
rm -rf "$TMP_DIR"
echo "✅ 部署完成！"
