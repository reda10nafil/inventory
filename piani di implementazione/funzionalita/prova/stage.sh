#!/usr/bin/env bash
# Mette in stage i file indicati conservando i fine riga che hanno nel repository (alcuni file sono CRLF
# nell'indice, gli altri LF; con core.autocrlf=true un `git add` normale convertirebbe i primi in LF e il
# diff mostrerebbe tutto il file). Uso dalla radice del worktree: bash ".../stage.sh" file1 file2 ...
for f in "$@"; do
  if git cat-file -e "HEAD:$f" 2>/dev/null && [ "$(git show "HEAD:$f" | tr -cd '\r' | wc -c)" -gt 0 ]; then
    git -c core.autocrlf=false add -- "$f"
  else
    git add -- "$f"
  fi
done
