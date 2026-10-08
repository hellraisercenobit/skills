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
TREE_DEPTH=""
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$ROOT"
  TREE_DEPTH="-maxdepth 2"
fi
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

scan_resource_dir() {
  dir=$1
  scope=$2
  [ -d "$dir" ] || return 0
  dir=$(canonical_dir "$dir")
  parent=$(dirname "$dir")
  find -L "$dir" -type f 2>/dev/null | awk -v scope="$scope" -v parent="$parent" '{
    inside = substr($0, length(parent) + 1)
    if (inside ~ /\/skills\/.*\/SKILL\.md$/) kind = "skill"
    else if (inside ~ /\/skills\//) kind = "skill-resource"
    else if (inside ~ /\/rules\//) kind = "rule"
    else if (inside ~ /\/agents\//) kind = "agent"
    else if (inside ~ /\/(commands|prompts)\//) kind = "command"
    else if (inside ~ /\/hooks\//) kind = "hook"
    else if (inside ~ /\/config\.toml$/) kind = "settings"
    else kind = "candidate"
    printf "%s\t%s\t%s\n", kind, scope, $0
  }' >> "$TMP"
}

scan_tree() {
  base=$1
  scope=$2
  [ -d "$base" ] || return 0
  base=$(canonical_dir "$base")

  find "$base" $TREE_DEPTH \
    \( -type d \( -name .git -o -name node_modules -o -name dist -o -name build -o -name target -o -name vendor -o -name .venv -o -name __pycache__ \) -prune \) -o \
    \( -type f \( \
      -name AGENTS.md -o -name AGENTS.override.md -o -name CLAUDE.md -o -name SKILL.md -o \
      -name settings.json -o -name settings.local.json -o -name config.toml -o \
      -name .mcp.json -o -name mcp.json -o -name plugin.json \
    \) -print \) 2>/dev/null | awk -v scope="$scope" '{
      count = split($0, parts, "/")
      name = parts[count]
      if (name == "AGENTS.md" || name == "AGENTS.override.md" || name == "CLAUDE.md") kind = "instruction"
      else if (name == "SKILL.md") kind = "skill"
      else if (name == "settings.json" || name == "settings.local.json" || name == "config.toml") kind = "settings"
      else if (name == ".mcp.json" || name == "mcp.json") kind = "mcp"
      else if (name == "plugin.json") kind = "plugin"
      else kind = "candidate"
      printf "%s\t%s\t%s\n", kind, scope, $0
    }' >> "$TMP"

  for dir in \
    "$base/.claude/rules" "$base/.claude/agents" "$base/.claude/commands" "$base/.claude/skills" \
    "$base/.agents/skills" "$base/.agents"; do
    scan_resource_dir "$dir" "$scope"
  done
  if [ -z "$TREE_DEPTH" ]; then
    scan_resource_dir "$base/.codex" "$scope"
    return 0
  fi
  for dir in \
    "$base/.codex/skills" "$base/.codex/rules" "$base/.codex/hooks" "$base/.codex/agents" "$base/.codex/prompts"; do
    scan_resource_dir "$dir" "$scope"
  done
  add_file "candidate" "$scope" "$base/.codex/hooks.json"
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
  OMITTED=$(awk -F '\t' '$1 == "skill-resource" { count += 1 } END { print count + 0 }' "$TMP")
  printf '# Agent configuration candidate manifest\n\n'
  printf -- '- cwd: `%s`\n' "$ROOT"
  printf -- '- repo root: `%s`\n' "$REPO_ROOT"
  printf -- '- global scan: `%s`\n' "$INCLUDE_GLOBAL"
  printf -- '- skill resources omitted: `%s` (files inside skill folders other than SKILL.md, listed by `--format tsv`)\n\n' "$OMITTED"
  printf '| Kind | Scope | Path |\n'
  printf '|---|---|---|\n'
  awk -F '\t' '$1 != "skill-resource" {
    path = substr($0, length($1) + length($2) + 3)
    gsub(/\|/, "\\|", path)
    printf "| %s | %s | `%s` |\n", $1, $2, path
  }' "$TMP"
fi
