#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: scripts/deploy.sh <env-file> [--contracts <dir>] | --rollback' >&2
  exit 1
}
[[ $# -gt 0 ]] || usage
: "${DEPLOY_HOST:?Set DEPLOY_HOST to an ssh target}"
: "${DEPLOY_DIR:?Set DEPLOY_DIR to the absolute served directory}"
# These values also travel through the remote login shell.
[[ "$DEPLOY_HOST" =~ ^[[:alnum:]_][[:alnum:]_@.:-]*$ ]] || { echo 'Invalid DEPLOY_HOST' >&2; exit 1; }
DEPLOY_DIR=${DEPLOY_DIR%/}
[[ "$DEPLOY_DIR" =~ ^/[[:alnum:]_./-]+$ && "$DEPLOY_DIR/" != *'/../'* && "$DEPLOY_DIR/" != *'/./'* && "$DEPLOY_DIR" != / ]] || { echo 'Invalid DEPLOY_DIR' >&2; exit 1; }
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
rollback=false
contracts=
if [[ "$1" == --rollback ]]; then
  [[ $# == 1 ]] || usage
  rollback=true
else
  [[ -f "$1" ]] || { echo 'Env file not found' >&2; exit 1; }
  env_file=$(realpath -- "$1")
  shift
  if [[ $# != 0 ]]; then
    [[ $# == 2 && "$1" == --contracts && -d "$2" ]] || usage
    contracts=$(realpath -- "$2")
  fi
fi
cd "$repo"
[[ -z "$(git status --porcelain)" ]] || { echo 'Refusing to deploy a dirty worktree' >&2; exit 1; }
work=$(mktemp -d)
token=$(basename "$work")
remote_started=false
remote() { ssh "$DEPLOY_HOST" python3 - "$DEPLOY_DIR" "$1" "$token" < "$repo/scripts/deploy-release.py"; }
cleanup() {
  if $remote_started; then remote abort || true; fi
  rm -rf -- "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if $rollback; then
  remote rollback > "$work/version.json"
  remote_started=true
else
  commit=$(git rev-parse HEAD)
  git archive HEAD | tar -x -C "$work"
  cp -- "$env_file" "$work/.env.production.local"
  (
    cd "$work"
    npm ci --include=dev
    if [[ -n "$contracts" ]]; then cp -a -- "$contracts/." public/contracts/; fi
    node scripts/validate-deploy.mjs .env.production.local
    # The selected file must win over variables from another build in this shell.
    for name in ${!VITE_@}; do unset "$name"; done
    NODE_ENV=production DUSK_DOMAINS_FRONTEND_COMMIT="$commit" npm run build
  )
  cp -- "$work/dist/version.json" "$work/version.json"
  remote prepare
  remote_started=true
  rsync -az --delete -- "$work/dist/" "$DEPLOY_HOST:$DEPLOY_DIR.next/"
  remote activate
fi

site=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).siteUrl)' "$work/version.json")
commit=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).frontendCommit)' "$work/version.json")
curl --fail --silent --show-error --retry 3 --connect-timeout 10 --max-time 60 \
  -H 'Cache-Control: no-cache' "$site/version.json?commit=$commit" > "$work/live-version.json"
node --input-type=module - "$work/live-version.json" "$commit" <<'JS'
import { readFileSync } from 'node:fs'
const actual = JSON.parse(readFileSync(process.argv[2], 'utf8')).frontendCommit
if (actual !== process.argv[3]) throw new Error(`Live commit ${actual} differs from expected ${process.argv[3]}`)
console.log(`Verified ${actual}`)
JS
remote finish
remote_started=false
