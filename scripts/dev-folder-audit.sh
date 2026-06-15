#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
case "$SCRIPT_ROOT" in
  */.codex-worktrees/*) ROOT_DIR="${SCRIPT_ROOT%%/.codex-worktrees/*}" ;;
  *) ROOT_DIR="$SCRIPT_ROOT" ;;
esac
PROJECTS_DIR="${PROJECTS_DIR:-$(dirname "$ROOT_DIR")}"
MAX_REPO_GB="${MAX_REPO_GB:-18}"
MAX_NODE_MODULES_GB="${MAX_NODE_MODULES_GB:-2}"
MAX_NEXT_GB="${MAX_NEXT_GB:-2}"
MAX_CODEX_WORKTREES_GB="${MAX_CODEX_WORKTREES_GB:-8}"
MAX_MEDIA_MB="${MAX_MEDIA_MB:-500}"
DU_SECONDS="${DU_SECONDS:-1}"

warn_count=0

bounded_du() {
  local seconds="$1"
  shift
  perl -e '
    my $seconds = shift @ARGV;
    my $pid = fork();
    exit 127 unless defined $pid;
    if ($pid == 0) {
      exec @ARGV or exit 127;
    }
    local $SIG{ALRM} = sub {
      kill "TERM", $pid;
      waitpid($pid, 0);
      exit 124;
    };
    alarm $seconds;
    waitpid($pid, 0);
    exit($? >> 8);
  ' "$seconds" du "$@" 2>/dev/null
}

to_kib() {
  local path="$1"
  local output
  if output="$(bounded_du "$DU_SECONDS" -sk "$path" | awk '{print $1}')"; then
    [ -n "$output" ] && printf '%s\n' "$output" && return 0
  fi
  return 1
}

human_size() {
  local path="$1"
  local output
  if output="$(bounded_du "$DU_SECONDS" -sh "$path" | awk '{print $1}')"; then
    [ -n "$output" ] && printf '%s\n' "$output" && return 0
  fi
  printf 'SIZE_TIMEOUT'
}

warn_if_over_gb() {
  local label="$1"
  local path="$2"
  local max_gb="$3"

  [ -e "$path" ] || return 0
  local kib
  if ! kib="$(to_kib "$path")"; then
    printf 'WARN %s: %s SIZE_TIMEOUT\n' "$label" "$path"
    warn_count=$((warn_count + 1))
    return 0
  fi
  local max_kib=$((max_gb * 1024 * 1024))
  if [ "$kib" -gt "$max_kib" ]; then
    printf 'WARN %s: %s > %sG (%s)\n' "$label" "$path" "$max_gb" "$(human_size "$path")"
    warn_count=$((warn_count + 1))
  else
    printf 'OK %s: %s (%s)\n' "$label" "$path" "$(human_size "$path")"
  fi
}

warn_if_over_mb() {
  local label="$1"
  local path="$2"
  local max_mb="$3"

  [ -e "$path" ] || return 0
  local kib
  if ! kib="$(to_kib "$path")"; then
    printf 'WARN %s: %s SIZE_TIMEOUT\n' "$label" "$path"
    warn_count=$((warn_count + 1))
    return 0
  fi
  local max_kib=$((max_mb * 1024))
  if [ "$kib" -gt "$max_kib" ]; then
    printf 'WARN %s: %s > %sM (%s)\n' "$label" "$path" "$max_mb" "$(human_size "$path")"
    warn_count=$((warn_count + 1))
  else
    printf 'OK %s: %s (%s)\n' "$label" "$path" "$(human_size "$path")"
  fi
}

echo "root: $ROOT_DIR"
echo "projects: $PROJECTS_DIR"
echo

echo "== HP siblings under projects =="
shopt -s nullglob
siblings=("$PROJECTS_DIR"/norikane_satoshi_HP*)
if [ "${#siblings[@]}" -eq 0 ]; then
  echo "none"
else
  for path in "${siblings[@]}"; do
    if [ "$path" != "$ROOT_DIR" ]; then
      printf 'WARN outer sibling: %s\n' "$path"
      warn_count=$((warn_count + 1))
    else
      printf 'OK main repo: %s\n' "$path"
    fi
  done
fi
echo

echo "== Heavy generated folders =="
echo "WARN repo total size skipped or bounded: recursive repo du is disabled in fast audit"
warn_count=$((warn_count + 1))
warn_if_over_gb "node_modules" "$ROOT_DIR/node_modules" "$MAX_NODE_MODULES_GB"
warn_if_over_gb ".next" "$ROOT_DIR/.next" "$MAX_NEXT_GB"
warn_if_over_gb ".codex-worktrees" "$ROOT_DIR/.codex-worktrees" "$MAX_CODEX_WORKTREES_GB"
warn_if_over_gb ".claude" "$ROOT_DIR/.claude" "$MAX_CODEX_WORKTREES_GB"
generated_names=(node_modules .next dist build .turbo .cache coverage test-results playwright-report .playwright)
for name in "${generated_names[@]}"; do
  warn_if_over_gb "generated-dir" "$ROOT_DIR/$name" 1
done
for worktree_parent in "$ROOT_DIR/.codex-worktrees" "$ROOT_DIR/.claude/worktrees"; do
  [ -d "$worktree_parent" ] || continue
  for worktree in "$worktree_parent"/*; do
    [ -d "$worktree" ] || continue
    for name in "${generated_names[@]}"; do
      warn_if_over_gb "generated-dir" "$worktree/$name" 1
    done
  done
done
echo

echo "== Media footprint =="
echo "WARN media scan skipped or bounded: no recursive media scan in fast audit"
warn_count=$((warn_count + 1))
echo

echo "== Worktrees =="
if ! git -C "$ROOT_DIR" worktree list; then
  echo "WARN worktree list failed"
  warn_count=$((warn_count + 1))
fi
echo

echo "== Warnings =="
echo "warnings: $warn_count"
