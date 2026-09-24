#!/bin/sh
set -eu

ROOT="${PWD}"
INCLUDE_GLOBAL=0
FORMAT="markdown"

usage() {
  cat <<'USAGE'
Usage: discover-agent-config.sh [--root PATH] [--include-global] [--format markdown|tsv]

Read-only discovery of candidate coding-agent instruction and configuration files.
The output is a candidate manifest; existence does not prove a source is active.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --root)
      shift
      [ "$#" -gt 0 ] || { echo "--root requires a path" >&2; exit 2; }
      ROOT=$1
      ;;
    --include-global)
      INCLUDE_GLOBAL=1
      ;;
    --format)
      shift
      [ "$#" -gt 0 ] || { echo "--format requires markdown or tsv" >&2; exit 2; }
      FORMAT=$1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

case "$FORMAT" in
  markdown|tsv) ;;
  *) echo "Unsupported format: $FORMAT" >&2; exit 2 ;;
esac

if [ ! -d "$ROOT" ]; then
  echo "Root is not a directory: $ROOT" >&2
  exit 2
fi

ROOT=$(cd "$ROOT" && pwd -P)
if command -v git >/dev/null 2>&1; then
  REPO_ROOT=$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)
else
  REPO_ROOT=""
fi
[ -n "$REPO_ROOT" ] || REPO_ROOT="$ROOT"
REPO_ROOT=$(cd "$REPO_ROOT" && pwd -P)

TMP="${TMPDIR:-/tmp}/agent-instruction-doctor.$$"
trap 'rm -f "$TMP"' EXIT HUP INT TERM
: > "$TMP"

canonical_dir() {
  (cd "$1" 2>/dev/null && pwd -P) || printf '%s' "$1"
}

add_file() {
  kind=$1
  scope=$2
  path=$3
  [ -e "$path" ] || return 0
  if [ -d "$path" ]; then
    return 0
  fi
  printf '%s\t%s\t%s\n' "$kind" "$scope" "$path" >> "$TMP"
}

kind_of_resource() {
  case "$1" in
    */rules/*) printf 'rule' ;;
    */agents/*) printf 'agent' ;;
    */commands/*|*/prompts/*) printf 'command' ;;
    */hooks/*) printf 'hook' ;;
    */skills/*) printf 'skill-resource' ;;
    */config.toml) printf 'settings' ;;
    *) printf 'candidate' ;;
  esac
}

scan_resource_dir() {
  dir=$1
  scope=$2
  [ -d "$dir" ] || return 0
  dir=$(canonical_dir "$dir")
  find "$dir" -type f 2>/dev/null | while IFS= read -r path; do
    add_file "$(kind_of_resource "$path")" "$scope" "$path"
  done
}

scan_tree() {
  base=$1
  scope=$2
  [ -d "$base" ] || return 0
  base=$(canonical_dir "$base")

  find "$base" \
    \( -type d \( -name .git -o -name node_modules -o -name dist -o -name build -o -name target -o -name vendor -o -name .venv -o -name __pycache__ \) -prune \) -o \
    \( -type f \( \
      -name AGENTS.md -o -name AGENTS.override.md -o -name CLAUDE.md -o -name SKILL.md -o \
      -name settings.json -o -name settings.local.json -o -name config.toml -o \
      -name .mcp.json -o -name mcp.json -o -name plugin.json \
    \) -print \) 2>/dev/null | while IFS= read -r path; do
      name=$(basename "$path")
      case "$name" in
        AGENTS.md|AGENTS.override.md|CLAUDE.md) kind="instruction" ;;
        SKILL.md) kind="skill" ;;
        settings.json|settings.local.json|config.toml) kind="settings" ;;
        .mcp.json|mcp.json) kind="mcp" ;;
        plugin.json) kind="plugin" ;;
        *) kind="candidate" ;;
      esac
      add_file "$kind" "$scope" "$path"
    done

  for dir in \
    "$base/.claude/rules" "$base/.claude/agents" "$base/.claude/commands" "$base/.claude/skills" \
    "$base/.agents/skills" "$base/.agents" "$base/.codex"; do
    scan_resource_dir "$dir" "$scope"
  done
}

scan_ancestors() {
  start=$1
  stop=$2
  dir=$start
  while :; do
    add_file "instruction" "ancestor" "$dir/AGENTS.md"
    add_file "instruction" "ancestor" "$dir/AGENTS.override.md"
    add_file "instruction" "ancestor" "$dir/CLAUDE.md"
    [ "$dir" = "$stop" ] && break
    parent=$(dirname "$dir")
    [ "$parent" = "$dir" ] && break
    dir=$parent
  done
}

scan_tree "$REPO_ROOT" "repo"
scan_ancestors "$ROOT" "$REPO_ROOT"

if [ "$INCLUDE_GLOBAL" -eq 1 ] && [ -n "${HOME:-}" ] && [ -d "$HOME" ]; then
  HOME_DIR=$(canonical_dir "$HOME")
  for path in \
    "$HOME_DIR/.claude/CLAUDE.md" "$HOME_DIR/.claude/settings.json" "$HOME_DIR/.claude/settings.local.json" \
    "$HOME_DIR/.codex/config.toml" "$HOME_DIR/.codex/AGENTS.md" "$HOME_DIR/.codex/AGENTS.override.md" "$HOME_DIR/.codex/hooks.json" \
    "$HOME_DIR/AGENTS.md" "$HOME_DIR/AGENTS.override.md" "$HOME_DIR/CLAUDE.md"; do
    case "$(basename "$path")" in
      CLAUDE.md|AGENTS.md|AGENTS.override.md) kind="instruction" ;;
      *) kind="settings" ;;
    esac
    add_file "$kind" "global" "$path"
  done

  for dir in \
    "$HOME_DIR/.claude/rules" "$HOME_DIR/.claude/agents" "$HOME_DIR/.claude/commands" "$HOME_DIR/.claude/skills" \
    "$HOME_DIR/.codex/skills" "$HOME_DIR/.codex/rules" "$HOME_DIR/.codex/hooks" "$HOME_DIR/.codex/agents" "$HOME_DIR/.codex/prompts" \
    "$HOME_DIR/.agents/skills"; do
    scan_resource_dir "$dir" "global"
  done
fi

sort -u "$TMP" > "$TMP.sorted"
mv "$TMP.sorted" "$TMP"

if [ "$FORMAT" = "tsv" ]; then
  printf 'kind\tscope\tpath\n'
  cat "$TMP"
else
  printf '# Agent configuration candidate manifest\n\n'
  printf -- '- cwd: `%s`\n' "$ROOT"
  printf -- '- repo root: `%s`\n' "$REPO_ROOT"
  printf -- '- global scan: `%s`\n\n' "$INCLUDE_GLOBAL"
  printf '| Kind | Scope | Path |\n'
  printf '|---|---|---|\n'
  tab=$(printf '\t')
  while IFS="$tab" read -r kind scope path; do
    escaped=$(printf '%s' "$path" | sed 's/|/\\|/g')
    printf '| %s | %s | `%s` |\n' "$kind" "$scope" "$escaped"
  done < "$TMP"
fi
