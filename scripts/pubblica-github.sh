#!/usr/bin/env bash
#
# Pubblica il progetto su GitHub senza chiedere la chiave a ogni push.
#
# La chiave si mette una volta sola e viene cercata in quest'ordine:
#   1. variabile d'ambiente GH_TOKEN
#   2. file .github-token nella radice del progetto (ignorato da git)
#   3. file $HOME/.github-token
# Lo script imposta il remote e un credential helper valido solo per questo
# repository: da lì in poi basta `git push` e non chiede niente.
#
# Uso:  scripts/pubblica-github.sh <utente>/<nome-repo> [nuovo]
#       scripts/pubblica-github.sh --verifica
#   nuovo     = crea prima il repository su GitHub (serve gh + chiave)
#   --verifica = controlla la chiave e dice a quale account appartiene

set -euo pipefail

REPO="${1:-}"
CREA="${2:-}"
RADICE="$(cd "$(dirname "$0")/.." && pwd)"

trova_chiave() {
  if [[ -n "${GH_TOKEN:-}" ]]; then
    echo "env"
    return 0
  fi
  for file in "$RADICE/.github-token" "$HOME/.github-token"; do
    if [[ -s "$file" ]]; then
      chmod 600 "$file" 2>/dev/null || true
      echo "$file"
      return 0
    fi
  done
  return 1
}

CHIAVE="$(trova_chiave || true)"
if [[ -z "$CHIAVE" ]]; then
  echo "Manca la chiave: mettila in .github-token nella radice (una riga) o in \$HOME/.github-token." >&2
  exit 3
fi

# Con --verifica controlla la chiave su GitHub e mostra a chi appartiene.
if [[ "$REPO" == "--verifica" ]]; then
  if [[ "$CHIAVE" == "env" ]]; then
    TOKEN="$GH_TOKEN"
  else
    TOKEN="$(cat "$CHIAVE")"
  fi
  RISPOSTA="$(curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/user)"
  if printf '%s' "$RISPOSTA" | grep -q '"login"'; then
    echo "Chiave valida per l'account: $(printf '%s' "$RISPOSTA" | sed -n 's/.*"login": "\([^"]*\)".*/\1/p' | head -1)"
    exit 0
  fi
  echo "Chiave non valida o scaduta: $(printf '%s' "$RISPOSTA" | sed -n 's/.*"message": "\([^"]*\)".*/\1/p' | head -1)" >&2
  exit 5
fi

if [[ -z "$REPO" ]]; then
  echo "Uso: scripts/pubblica-github.sh <utente>/<nome-repo> [nuovo]" >&2
  echo "     scripts/pubblica-github.sh --verifica   (controlla la chiave)" >&2
  exit 2
fi

# Credential helper solo per questo repository: la chiave non finisce in config.
if [[ "$CHIAVE" == "env" ]]; then
  git config --local credential.helper '!f() { test "$1" = get && echo username=x-access-token && printf "password=%s\n" "$GH_TOKEN"; }; f'
else
  git config --local credential.helper "!f() { test \"\$1\" = get && echo username=x-access-token && printf \"password=%s\\n\" \"\$(cat '$CHIAVE')\"; }; f"
fi

REMOTO="https://github.com/$REPO.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTO"
else
  git remote add origin "$REMOTO"
fi

if [[ "$CREA" == "nuovo" ]]; then
  if command -v gh >/dev/null 2>&1; then
    if [[ "$CHIAVE" == "env" ]]; then
      gh repo create "$REPO" --private --source . --remote origin 2>/dev/null || true
    else
      GH_TOKEN="$(cat "$CHIAVE")" gh repo create "$REPO" --private --source . --remote origin 2>/dev/null || true
    fi
  else
    echo "gh non disponibile: crea il repository vuoto su github.com e rilancia senza 'nuovo'." >&2
    exit 4
  fi
fi

git push -u origin main
echo "Fatto: https://github.com/$REPO"
