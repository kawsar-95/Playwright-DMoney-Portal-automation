#!/usr/bin/env bash
# PostToolUse hook: after Claude edits a TypeScript file, type-check the project.
# Exit code 2 sends the compiler errors back to Claude so it fixes them immediately.
input="$(cat)"
file="$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&(j.tool_input.file_path||j.tool_input.path))||"")}catch{}})')"
case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out="$(npx --no-install tsc --noEmit 2>&1)"; then
  echo "TypeScript errors after editing $file:" >&2
  echo "$out" | head -40 >&2
  exit 2
fi
exit 0
