#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPLY=0

if [ "${1:-}" = "--apply" ]; then
  APPLY=1
elif [ "${1:-}" != "" ]; then
  echo "usage: $0 [--apply]" >&2
  exit 2
fi

dangerous_re='(^|/)(\.git|src|public|prisma|docs|scripts|ops|tests|app|components|lib|styles|assets)$|(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|next\.config\.ts|tsconfig\.json|\.env[^/]*|AGENTS\.md|CLAUDE\.md|README\.md)$'
allowed_re='/(node_modules|\.next|dist|build|\.turbo|\.cache|coverage|test-results|playwright-report|\.playwright)$'
media_re='\.(png|jpe?g|gif|webp|svg|mp4|mov|mxf|wav|mp3|aiff?|flac|aac|m4a)$'

targets=()

add_target() {
  local path="$1"
  [ -e "$path" ] || return 0
  case "$path" in
    "$ROOT_DIR/.git"|"$ROOT_DIR/.git"/*) return 0 ;;
  esac
  targets+=("$path")
}

add_target "$ROOT_DIR/.next"
add_target "$ROOT_DIR/dist"
add_target "$ROOT_DIR/build"
add_target "$ROOT_DIR/.turbo"
add_target "$ROOT_DIR/.cache"
add_target "$ROOT_DIR/coverage"
add_target "$ROOT_DIR/test-results"
add_target "$ROOT_DIR/playwright-report"
add_target "$ROOT_DIR/.playwright"

while IFS= read -r dir; do
  add_target "$dir"
done < <(find "$ROOT_DIR/.codex-worktrees" -mindepth 2 -maxdepth 3 -type d \( -name node_modules -o -name .next -o -name dist -o -name build -o -name .turbo -o -name .cache \) -print 2>/dev/null || true)

if [ "${#targets[@]}" -eq 0 ]; then
  echo "No generated targets found."
  exit 0
fi

echo "Generated targets:"
for path in "${targets[@]}"; do
  printf '%s\t%s\n' "$(du -sh "$path" 2>/dev/null | awk '{print $1}')" "$path"
done

echo
echo "Safety check:"
for path in "${targets[@]}"; do
  rel="${path#$ROOT_DIR/}"
  if [[ "$rel" =~ $dangerous_re ]]; then
    echo "BLOCKED dangerous path: $path" >&2
    exit 1
  fi
  if [[ "$path" =~ $media_re ]]; then
    echo "BLOCKED media path: $path" >&2
    exit 1
  fi
  if ! [[ "$path" =~ $allowed_re ]]; then
    echo "BLOCKED outside generated allowlist: $path" >&2
    exit 1
  fi
done
echo "OK"

if [ "$APPLY" -ne 1 ]; then
  echo "dry-run only. Re-run with --apply to delete these generated directories."
  exit 0
fi

echo "Deleting generated targets..."
for path in "${targets[@]}"; do
  rm -rf -- "$path"
done
echo "done"
