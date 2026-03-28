#!/usr/bin/env bash
# launch-chrome.sh — Start Chrome/Chromium with remote debugging enabled.
#
# Run this ONCE before starting your Claude Code session.
# Your existing Chrome profile, saved passwords, and active logins are preserved.
#
# Usage:
#   bash mcp-servers/browser-control/scripts/launch-chrome.sh
#   CDP_PORT=9223 bash mcp-servers/browser-control/scripts/launch-chrome.sh
#   bash mcp-servers/browser-control/scripts/launch-chrome.sh --profile-directory="Profile 2"
#
# After running this, add to ~/.claude/mcp_settings.json:
#   "env": { "BROWSER_CDP_URL": "http://localhost:9222" }

set -euo pipefail

PORT="${CDP_PORT:-9222}"

# ── Locate Chrome/Chromium executable ────────────────────────────────────────

if [[ "$OSTYPE" == "darwin"* ]]; then
  CHROME_CANDIDATES=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )
elif [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux"* ]]; then
  CHROME_CANDIDATES=(
    "$(which google-chrome 2>/dev/null || true)"
    "$(which google-chrome-stable 2>/dev/null || true)"
    "$(which chromium-browser 2>/dev/null || true)"
    "$(which chromium 2>/dev/null || true)"
  )
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* ]]; then
  CHROME_CANDIDATES=(
    "/c/Program Files/Google/Chrome/Application/chrome.exe"
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  )
else
  echo "ERROR: Unsupported OS: $OSTYPE" >&2
  echo "Start Chrome manually with: --remote-debugging-port=$PORT --remote-allow-origins=*" >&2
  exit 1
fi

CHROME=""
for candidate in "${CHROME_CANDIDATES[@]}"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "ERROR: Could not find Chrome or Chromium." >&2
  echo "Install Google Chrome or set CHROME env var to the executable path." >&2
  echo "Then run manually:" >&2
  echo "  \$CHROME --remote-debugging-port=$PORT --remote-allow-origins=* &" >&2
  exit 1
fi

echo "Using: $CHROME"
echo "Debug port: $PORT"
echo ""
echo "Chrome will open normally with your profile and saved logins."
echo "Configure the MCP server with: BROWSER_CDP_URL=http://localhost:$PORT"
echo ""

# ── Launch Chrome ─────────────────────────────────────────────────────────────
# Pass any extra arguments through (e.g. --profile-directory="Profile 2")

exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --remote-allow-origins="*" \
  "$@"
