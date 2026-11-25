#!/usr/bin/env bash
# Install or update the patched wherdr (see PATCHED.md). Linux and macOS.
#   install-patched.sh [--dir <dir>] [--name <name>] [--port <n>] [--branch <b>] [--no-restart] [--stock]
# - No wherdr in <dir> (default ~/wherdr-v3) and systemd --user available: wherdr's own installer
#   (scripts/install-v3-beside-v2.sh) installs this fork's branch: hc, service, build, health.
# - Otherwise (wherdr there, or macOS / --no-restart): fetch the branch into <dir>/src, build aside,
#   swap the build in, restart the service, check /api/health. A failed build leaves the running one.
# - --stock: point <dir>/src back at upstream and run wherdr's own update.sh.
# Only <dir>/src, <dir>/build.log and (fresh install) what wherdr's installer writes are touched:
# never <dir>/data, wherdr's tokens, ~/.claude or ~/.codex.
set -euo pipefail

REPO="${WHERDR_PATCHED_REPO:-https://github.com/simonsmallchua/wherdr.git}"
UPSTREAM="https://github.com/afloury/wherdr.git"
BRANCH=patched dir="$HOME/wherdr-v3" name=wherdr-v3 port=7684 restart=1 stock=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) dir="${2:?--dir needs a folder}"; shift 2 ;;
    --name) name="${2:?--name needs a name}"; shift 2 ;;
    --port) port="${2:?--port needs a number}"; shift 2 ;;
    --branch) BRANCH="${2:?--branch needs a branch}"; shift 2 ;;
    --no-restart) restart=0; shift ;;
    --stock) stock=1; shift ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "ERROR usage: unknown option $1 (--help)" >&2; exit 2 ;;
  esac
done
case "$dir" in "~"*) dir="$HOME${dir#\~}" ;; esac
case "$name$port$BRANCH" in *[!0-9A-Za-z._/+-]*) echo "ERROR usage: bad --name, --port or --branch" >&2; exit 2 ;; esac

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR missing-$1: $1 is required" >&2; exit 3; }; }
need git; need node; need npm; need curl
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || { echo "ERROR missing-node: Node.js 22 or newer is required (found $(node --version))" >&2; exit 3; }

src="$dir/src"
health="http://127.0.0.1:$port/api/health"
systemd=0; [ "$(uname)" = Linux ] && command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1 && systemd=1

if [ "$stock" = 1 ]; then
  [ -d "$src/.git" ] && [ -x "$dir/update.sh" ] || { echo "ERROR no-install: no wherdr install in $dir" >&2; exit 3; }
  git -C "$src" remote set-url origin "$UPSTREAM"
  echo "wherdr: back to stock, running $dir/update.sh"
  exec "$dir/update.sh"
fi

# Fresh Linux install: wherdr's installer, from this fork's branch, so hc, the service and the first build are upstream's.
if [ ! -d "$src/.git" ] && [ "$systemd" = 1 ] && [ "$restart" = 1 ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  git clone -q --depth 1 --branch "$BRANCH" "$REPO" "$tmp/w"
  echo "wherdr: installing $BRANCH with wherdr's installer into $dir"
  "$tmp/w/scripts/install-v3-beside-v2.sh" --yes --skip-import --dir "$dir" --name "$name" --port "$port" --repo "$REPO" --branch "$BRANCH"
  exit $?
fi

if [ ! -d "$src/.git" ]; then
  echo "wherdr: cloning $BRANCH into $src"
  mkdir -p "$dir"; git clone -q --branch "$BRANCH" "$REPO" "$src"
fi
cd "$src"
git remote get-url patched >/dev/null 2>&1 && git remote set-url patched "$REPO" || git remote add patched "$REPO"
git fetch -q patched "$BRANCH"
git checkout -q -f --detach FETCH_HEAD
echo "wherdr: source at $(git rev-parse --short HEAD) ($BRANCH)"

run=""
if [ "$(node -p 'require("v8").getHeapStatistics().heap_size_limit')" -lt 1610612736 ]; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1536"
  run="nice -n 19"; if command -v ionice >/dev/null 2>&1; then run="$run ionice -c3"; fi
fi
export NITRO_OUTPUT_DIR=.output.next
rm -rf .output.next
log="$dir/build.log"
echo "wherdr: building (several minutes; log $log)"
{ $run npm ci --no-audit --no-fund --loglevel=error && $run npm run build; } > "$log" 2>&1 && [ -f .output.next/server/index.mjs ] \
  && rm -rf .output.prev && { [ ! -e .output ] || mv .output .output.prev; } && mv .output.next .output \
  || { tail -20 "$log"; rm -rf .output.next; echo "ERROR build-failed: the running build (.output) is unchanged; see $log" >&2; exit 5; }

if [ "$restart" = 1 ] && [ "$systemd" = 1 ] && systemctl --user cat "$name.service" >/dev/null 2>&1; then
  systemctl --user restart "$name.service"
  for _ in $(seq 1 60); do curl -fsS "$health" >/dev/null 2>&1 && break; sleep 1; done
  curl -fsS "$health" >/dev/null || { echo "ERROR not-answering: journalctl --user -u $name; the previous build is in $src/.output.prev" >&2; exit 5; }
  echo "OK patched wherdr $(curl -fsS "$health" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p') answers on $health"
else
  echo "OK built $src/.output. Restart wherdr to use it (Linux: systemctl --user restart $name; otherwise start it as you did: HC_SOCKET=<hc socket> DATA_DIR=$dir/data PORT=$port node $src/.output/server/index.mjs from $src)."
fi
