#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
# Codex and the other Agent Skills harnesses read ~/.agents/skills.
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")

names=()
srcs=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  names+=("$name")
  srcs+=("$src")
done < <(find "$REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0)

for DEST in "${DESTS[@]}"; do
  if [ -L "$DEST" ]; then
    resolved="$(readlink -f "$DEST")"
    case "$resolved" in
      "$REPO"|"$REPO"/*)
        echo "error: $DEST is a symlink into this repo ($resolved)." >&2
        echo "Remove it (rm \"$DEST\") and re-run; the script will recreate it as a real dir." >&2
        exit 1
        ;;
    esac
  fi

  mkdir -p "$DEST"

  for i in "${!names[@]}"; do
    name="${names[$i]}"
    src="${srcs[$i]}"
    target="$DEST/$name"

    if [ -e "$target" ] && [ ! -L "$target" ]; then
      rm -rf "$target"
    fi

    # Link, do not copy. A git pull then updates every harness.
    ln -sfn "$src" "$target"
    echo "linked $name -> $src ($DEST)"
  done
done

# Only Claude Code reads subagents, from ~/.claude/agents. The other harnesses have no equivalent.
AGENTS_DEST="$HOME/.claude/agents"
mkdir -p "$AGENTS_DEST"
for agent_md in "$REPO"/agents/*.md; do
  [ -e "$agent_md" ] || continue
  name="$(basename "$agent_md")"
  target="$AGENTS_DEST/$name"

  # A real file there is the user's own agent. Do not overwrite it; the user must resolve the name clash.
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "skipped $name: $target exists and is not a symlink" >&2
    continue
  fi

  ln -sfn "$agent_md" "$target"
  echo "linked $name -> $agent_md ($AGENTS_DEST)"
done
