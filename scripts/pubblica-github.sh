#!/usr/bin/env bash
#
# Pubblica il progetto su GitHub senza chiedere la chiave ogni volta.
#
# La chiave si mette una volta sola in $HOME/.github-token (una riga, fuori dal
# progetto: non finisce mai nel repository). Questo script imposta il remote e
# un credential helper locale che legge quel file, così dopo basta `git push`.
#
# Uso:  scripts/pubblica-github.sh <utente>/<nome-repo> [nuovo]
#   nuovo = crea prima il repository su GitHub (serve gh autenticato o il token)

set -euo pipefail

REPO="${1:-}"
CREA="${2:-}"
CHIAVE="$HOME/.github-token"

if [[ -z "$REPO" ]]; then
  echo "Uso: scripts/pubblica-github.sh <utente>/<nome-repo> [nuovo]" >&2
  exit 2
fi

if [[ ! -s "$CHIAVE" ]]; then
  echo "Manca la chiave in $CHIAVE (una riga sola, permessi 600)." >&2
  exit 3
fi

chmod 600 "$CHIAVE"

# Impostazioni valide solo per questo repository: nessun token scritto in chiaro.
git config --local credential.helper '!f() { test "$1" = get && echo username=x-access-token && printf "password=%s\n" "$(cat "$HOME/.github-token")"; }; f'

REMOTO="https://github.com/$REPO.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTO"
else
  git remote add origin "$REMOTO"
fi

if [[ "$CREA" == "nuovo" ]]; then
  if command -v gh >/dev/null 2>&1; then
    GH_TOKEN="$(cat "$CHIAVE")" gh repo create "$REPO" --private --source . --remote origin 2>/dev/null || true
  else
    echo "gh non disponibile: crea il repository vuoto su github.com e rilancia senza 'nuovo'." >&2
    exit 4
  fi
fi

git push -u origin main
echo "Fatto: https://github.com/$REPO"
