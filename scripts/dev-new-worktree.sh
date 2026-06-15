#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
case "$SCRIPT_ROOT" in
  */.codex-worktrees/*) ROOT_DIR="${SCRIPT_ROOT%%/.codex-worktrees/*}" ;;
  *) ROOT_DIR="$SCRIPT_ROOT" ;;
esac

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <branch-name> [base-ref]" >&2
  exit 2
fi

branch="$1"
base_ref="${2:-origin/staging}"

if [[ ! "$branch" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "unsafe branch name: $branch" >&2
  exit 2
fi

if [[ "$branch" == /* || "$branch" == *".."* || "$branch" == *"//"* || "$branch" == *".lock"* ]]; then
  echo "unsafe branch name: $branch" >&2
  exit 2
fi

safe_name="$(printf '%s' "$branch" | tr '/[:space:]' '-' | tr -cd 'A-Za-z0-9._-')"
if [ "$safe_name" = "" ]; then
  echo "branch name did not produce a safe folder name" >&2
  exit 2
fi

worktree_path="$ROOT_DIR/.codex-worktrees/$safe_name"
if [ -e "$worktree_path" ]; then
  echo "worktree path already exists: $worktree_path" >&2
  exit 1
fi

if git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "local branch already exists: $branch" >&2
  exit 1
fi

mkdir -p "$ROOT_DIR/.codex-worktrees"
git -C "$ROOT_DIR" fetch origin
git -C "$ROOT_DIR" worktree add -b "$branch" "$worktree_path" "$base_ref"

echo "created: $worktree_path"
echo "remove when finished:"
echo "git -C \"$ROOT_DIR\" worktree remove \"$worktree_path\""
