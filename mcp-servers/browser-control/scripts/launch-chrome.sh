#!/usr/bin/env bash
# launch-chrome.sh — Kill any running Chrome, then restart it with remote
# debugging enabled on the SAME user profile so logins are preserved.
#
# Why kill first?
#   Chrome locks its profile directory. If Chrome is already running with the
#   default profile, adding --remote-debugging-port just opens a new window in
#   the existing process — without the debug port — and DevToolsActivePort is
#   never written. The MCP attach then times out.
#
# Usage:
#   bash mcp-servers/browser-control/scripts/launch-chrome.sh
#
# Environment variables:
#   CDP_PORT=9222          Override the debug port (default: 9222)
#   USER_DATA_DIR=<path>   Override the Chrome profile directory
#                          (default: the standard Chrome profile for your OS)
#   CHROME=<path>          Override the Chrome executable path
#
# After running this, set in ~/.claude/mcp_settings.json:
#   "env": { "BROWSER_CDP_URL": "http://localhost:9222" }

set -euo pipefail

PORT="${CDP_PORT:-9222}"

# ── Locate Chrome executable ──────────────────────────────────────────────────

if [[ -n "${CHROME:-}" ]]; then
  : # user-supplied, use as-is
elif [[ "$OSTYPE" == "darwin"* ]]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  [[ -x "$CHROME" ]] || CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
elif [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux"* ]]; then
  CHROME=""
  for candidate in google-chrome google-chrome-stable chromium-browser chromium; do
    if command -v "$candidate" &>/dev/null; then
      CHROME="$(command -v "$candidate")"
      break
    fi
  done
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* ]]; then
  CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
  [[ -x "$CHROME" ]] || CHROME="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
fi

if [[ -z "${CHROME:-}" || ! -x "$CHROME" ]]; then
  echo "ERROR: Could not find Chrome. Set CHROME=/path/to/chrome and retry." >&2
  exit 1
fi

# ── Locate default profile directory ─────────────────────────────────────────

if [[ -n "${USER_DATA_DIR:-}" ]]; then
  PROFILE_DIR="$USER_DATA_DIR"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  PROFILE_DIR="$HOME/Library/Application Support/Google/Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux"* ]]; then
  PROFILE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/google-chrome"
  # Chromium fallback
  [[ -d "$PROFILE_DIR" ]] || PROFILE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/chromium"
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* ]]; then
  PROFILE_DIR="$LOCALAPPDATA/Google/Chrome/User Data"
fi

echo "Chrome executable : $CHROME"
echo "Profile directory : $PROFILE_DIR"
echo "Debug port        : $PORT"
echo ""

# ── Kill any existing Chrome that holds the profile lock ─────────────────────
# Chrome refuses to open the same profile in a new process, so the debug port
# flag is silently ignored. We must close Chrome first.

if [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux"* ]]; then
  if pgrep -x "chrome\|google-chrome\|chromium" &>/dev/null; then
    echo "Stopping existing Chrome processes (profile lock must be released)..."
    pkill -x "chrome" 2>/dev/null || true
    pkill -f "google-chrome" 2>/dev/null || true
    pkill -f "chromium" 2>/dev/null || true
    sleep 1
    echo "Done."
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  if pgrep -x "Google Chrome" &>/dev/null || pgrep -x "Chromium" &>/dev/null; then
    echo "Stopping existing Chrome processes (profile lock must be released)..."
    pkill -x "Google Chrome" 2>/dev/null || true
    pkill -x "Chromium" 2>/dev/null || true
    sleep 1
    echo "Done."
  fi
fi

# ── Remove stale lock files ───────────────────────────────────────────────────
# Chrome writes SingletonLock / SingletonSocket when it starts. If it crashed
# or was killed hard, these prevent a clean restart on the same profile.

for lockfile in \
  "$PROFILE_DIR/SingletonLock" \
  "$PROFILE_DIR/SingletonSocket" \
  "$PROFILE_DIR/SingletonCookie" \
  "$PROFILE_DIR/DevToolsActivePort"
do
  if [[ -e "$lockfile" ]]; then
    echo "Removing stale lock: $lockfile"
    rm -f "$lockfile"
  fi
done

echo ""
echo "Starting Chrome with remote debugging on port $PORT..."
echo "Your profile and saved logins will be available."
echo ""
echo "Once Chrome is open, Claude can attach with:"
echo "  BROWSER_CDP_URL=http://localhost:$PORT"
echo ""

# ── Launch Chrome ─────────────────────────────────────────────────────────────

exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --remote-allow-origins="*" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "$@"
