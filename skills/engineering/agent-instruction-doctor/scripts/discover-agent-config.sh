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

add_file() {
  kind=$1
  scope=$2
  path=$3
  [ -e "$path" ] || return 0
  if [ -d "$path" ]; then
    return 0
  fi
  canonical=$(cd "$(dirname "$path")" 2>/dev/null && printf '%s/%s' "$(pwd -P)" "$(basename "$path")" || printf '%s' "$path")
  printf '%s\t%s\t%s\n' "$kind" "$scope" "$canonical" >> "$TMP"
}

scan_tree() {
  base=$1
  scope=$2
  [ -d "$base" ] || return 0

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
    [ -d "$dir" ] || continue
    find "$dir" -type f 2>/dev/null | while IFS= read -r path; do
      case "$path" in
        */rules/*) kind="rule" ;;
        */agents/*) kind="agent" ;;
        */commands/*) kind="command" ;;
        */skills/*) kind="skill-resource" ;;
        *) kind="candidate" ;;
      esac
      add_file "$kind" "$scope" "$path"
    done
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
  for path in \
    "$HOME/.claude/CLAUDE.md" "$HOME/.claude/settings.json" "$HOME/.claude/settings.local.json" \
    "$HOME/.codex/config.toml" "$HOME/AGENTS.md" "$HOME/AGENTS.override.md" "$HOME/CLAUDE.md"; do
    case "$(basename "$path")" in
      CLAUDE.md|AGENTS.md|AGENTS.override.md) kind="instruction" ;;
      *) kind="settings" ;;
    esac
    add_file "$kind" "global" "$path"
  done

  for dir in \
    "$HOME/.claude/rules" "$HOME/.claude/agents" "$HOME/.claude/commands" "$HOME/.claude/skills" \
    "$HOME/.codex" "$HOME/.agents/skills"; do
    [ -d "$dir" ] || continue
    find "$dir" -type f 2>/dev/null | while IFS= read -r path; do
      case "$path" in
        */rules/*) kind="rule" ;;
        */agents/*) kind="agent" ;;
        */commands/*) kind="command" ;;
        */skills/*) kind="skill-resource" ;;
        */config.toml) kind="settings" ;;
        *) kind="candidate" ;;
      esac
      add_file "$kind" "global" "$path"
    done
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
