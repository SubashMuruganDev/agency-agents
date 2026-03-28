# Browser Control MCP Server

A Model Context Protocol (MCP) server that gives Claude Code and other MCP-compatible AI tools **full browser automation** capabilities via [Playwright](https://playwright.dev/). Claude can navigate websites, click buttons, fill forms, take screenshots, manage tabs, and interact with any web page — just like a human user.

---

## Features

| Category | Tools |
|---|---|
| Navigation | `browser_navigate`, `browser_back`, `browser_forward`, `browser_refresh` |
| Screenshots | `browser_screenshot` (viewport or element, full-page support) |
| Interaction | `browser_click`, `browser_fill`, `browser_type`, `browser_hover`, `browser_press_key`, `browser_scroll`, `browser_select`, `browser_upload_file` |
| Content | `browser_get_text`, `browser_get_html`, `browser_find_element`, `browser_execute_js` |
| Tabs | `browser_new_tab`, `browser_close_tab`, `browser_list_tabs`, `browser_switch_tab` |
| Utilities | `browser_wait`, `browser_get_url`, `browser_get_cookies`, `browser_set_cookie` |

**25 tools total** — everything you need to automate any website.

---

## Prerequisites

- **Node.js 18+**
- **npm** or **pnpm**

---

## Installation

```bash
cd mcp-servers/browser-control

# Install Node dependencies
npm install

# Install the Chromium browser binary
npm run install-browsers

# (Optional) Install all browsers: Chromium, Firefox, WebKit
npm run install-all-browsers
```

---

## Usage with Claude Code

Add this server to your Claude Code MCP settings.

### Quick setup

Edit `~/.claude/mcp_settings.json` (create it if it doesn't exist):

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "node",
      "args": ["/absolute/path/to/agency-agents/mcp-servers/browser-control/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/agency-agents` with the real path on your system.

### With session persistence (keeps cookies/login between restarts)

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "node",
      "args": ["/absolute/path/to/agency-agents/mcp-servers/browser-control/index.js"],
      "env": {
        "BROWSER_HEADLESS": "true",
        "BROWSER_PROFILE_DIR": "/home/youruser/.browser-mcp-profile"
      }
    }
  }
}
```

### Show the browser window (non-headless, useful for debugging)

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "node",
      "args": ["/absolute/path/to/agency-agents/mcp-servers/browser-control/index.js"],
      "env": {
        "BROWSER_HEADLESS": "false"
      }
    }
  }
}
```

### Connect to your real Chrome (CDP mode)

By default the MCP server launches a fresh headless Chromium with no saved logins. To use your **existing Chrome profile** — with LinkedIn, Naukri, Gmail, and other sites already logged in — use CDP (Chrome DevTools Protocol) attach mode.

#### Step 1 — Start Chrome with remote debugging

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --remote-allow-origins=*
```

**macOS:**
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --remote-allow-origins=*
```

**Windows (PowerShell):**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 --remote-allow-origins=*
```

Or use the included helper script (Linux/macOS):
```bash
bash mcp-servers/browser-control/scripts/launch-chrome.sh
```

> Chrome opens normally with your profile and all your logins. The only addition is the debug port listening on `9222`.

Verify it's working:
```bash
curl http://localhost:9222/json/version
# Should print Chrome version JSON
```

#### Step 2 — Configure the MCP server to attach

Add `BROWSER_CDP_URL` to your `~/.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "node",
      "args": ["/absolute/path/to/agency-agents/mcp-servers/browser-control/index.js"],
      "env": {
        "BROWSER_CDP_URL": "http://localhost:9222"
      }
    }
  }
}
```

#### Step 3 — Restart Claude Code

Claude will now see your existing tabs and can navigate, click, fill forms, and take screenshots inside your real Chrome window — with all your logins active.

> **Note:** When using CDP mode, closing the MCP server does **not** close your Chrome. Your browser session is fully preserved.

---

### Verify installation

After adding to MCP settings, restart Claude Code and run:
```
/mcp
```
You should see `browser-control` listed with 25 tools.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BROWSER_CDP_URL` | _(none)_ | **CDP attach mode** — `http://localhost:9222`. When set, attaches to your running Chrome instead of launching a new one. All other variables below are ignored in this mode. |
| `BROWSER_TYPE` | `chromium` | Launch mode only: browser engine (`chromium`, `firefox`, `webkit`) |
| `BROWSER_HEADLESS` | `true` | Launch mode only: run headless (`true`) or show window (`false`) |
| `BROWSER_PROFILE_DIR` | _(none)_ | Launch mode only: path to persist cookies/sessions across restarts |

---

## Tool Reference

### Navigation

#### `browser_navigate`
Navigate to a URL.
```json
{ "url": "https://example.com", "wait_until": "domcontentloaded" }
```

#### `browser_screenshot`
Capture a screenshot. Returns a base64 PNG image.
```json
{ "full_page": true }
{ "selector": "#main-content" }
```

#### `browser_back` / `browser_forward` / `browser_refresh`
History and reload controls. No required parameters.

---

### Interaction

#### `browser_click`
Click an element by CSS selector or text.
```json
{ "selector": "#submit-button" }
{ "selector": "text=Sign In", "button": "left" }
{ "selector": "tr:nth-child(2) td:first-child", "click_count": 2 }
```

#### `browser_fill`
Clear and fill an input field instantly.
```json
{ "selector": "input[name='email']", "value": "user@example.com" }
```

#### `browser_type`
Type text character-by-character (triggers autocomplete/keystroke events).
```json
{ "selector": "#search", "text": "playwright", "delay": 80 }
```

#### `browser_hover`
Hover over an element (opens dropdowns, tooltips).
```json
{ "selector": ".nav-menu > li:first-child" }
```

#### `browser_press_key`
Press a keyboard key.
```json
{ "key": "Enter" }
{ "key": "Tab", "selector": "#username" }
{ "key": "Control+A" }
```

#### `browser_scroll`
Scroll the page or a specific element.
```json
{ "direction": "down", "amount": 800 }
{ "direction": "up", "selector": ".sidebar" }
```

#### `browser_select`
Select a dropdown option.
```json
{ "selector": "#country", "label": "United States" }
{ "selector": "select[name='size']", "value": "XL" }
```

#### `browser_upload_file`
Upload a file via a file input.
```json
{ "selector": "input[type='file']", "file_path": "/home/user/document.pdf" }
```

---

### Content Extraction

#### `browser_get_text`
Get visible text from the page or element.
```json
{}
{ "selector": ".article-body" }
```

#### `browser_get_html`
Get HTML source.
```json
{ "selector": "form#login", "outer": true }
```

#### `browser_find_element`
Inspect elements — returns tag, text, attributes, visibility, bounding box.
```json
{ "selector": "button[type='submit']", "limit": 5 }
```

#### `browser_execute_js`
Run arbitrary JavaScript.
```json
{ "script": "return document.title" }
{ "script": "return Array.from(document.querySelectorAll('a')).map(a => a.href)" }
```

---

### Tab Management

#### `browser_new_tab`
Open a new tab, optionally navigating to a URL.
```json
{ "url": "https://github.com" }
```

#### `browser_list_tabs`
List all open tabs with IDs and URLs.

#### `browser_switch_tab`
Switch to another tab.
```json
{ "tab_id": "tab-2" }
```

#### `browser_close_tab`
Close a tab (defaults to current).
```json
{ "tab_id": "tab-3" }
```

---

### Utilities

#### `browser_wait`
Wait for an element or pause for N milliseconds.
```json
{ "selector": ".loading-spinner", "state": "hidden", "timeout": 15000 }
{ "timeout": 2000 }
```

#### `browser_get_url`
Get current URL and page title.

#### `browser_get_cookies` / `browser_set_cookie`
Read and set browser cookies for session management.

---

## Example Workflows

### Login to a website
```
1. browser_navigate  { "url": "https://app.example.com/login" }
2. browser_fill      { "selector": "#email", "value": "user@example.com" }
3. browser_fill      { "selector": "#password", "value": "secretpassword" }
4. browser_click     { "selector": "text=Sign In" }
5. browser_wait      { "selector": ".dashboard", "state": "visible" }
6. browser_screenshot {}
```

### Fill and submit a form
```
1. browser_navigate  { "url": "https://example.com/contact" }
2. browser_fill      { "selector": "input[name='name']", "value": "John Doe" }
3. browser_fill      { "selector": "input[name='email']", "value": "john@example.com" }
4. browser_type      { "selector": "textarea[name='message']", "text": "Hello..." }
5. browser_select    { "selector": "#subject", "label": "Support" }
6. browser_click     { "selector": "button[type='submit']" }
```

### Scrape data from multiple pages
```
1. browser_navigate      { "url": "https://example.com/products" }
2. browser_get_text      { "selector": ".product-list" }
3. browser_click         { "selector": ".next-page" }
4. browser_wait          { "selector": ".product-list", "state": "visible" }
5. browser_get_text      { "selector": ".product-list" }
```

---

## Architecture

```
mcp-servers/browser-control/
├── index.js          # MCP server entry — registers all tools, stdio transport
├── browser.js        # BrowserManager singleton (Playwright lifecycle)
├── tools/
│   ├── navigation.js # navigate, screenshot, back, forward, refresh
│   ├── interaction.js# click, fill, type, hover, press_key, scroll, select, upload
│   ├── content.js    # get_text, get_html, find_element, execute_js
│   └── tabs.js       # new_tab, close_tab, list_tabs, switch_tab, wait, cookies
└── package.json
```

The browser is launched once when the first tool is called and stays alive for the entire Claude session. This means login sessions, cookies, and page state persist between tool calls.

---

## Troubleshooting

**"Browser executable not found"**
```bash
npm run install-browsers
```

**"No active browser tab"**
Call `browser_navigate` or `browser_new_tab` first.

**Element not found / timeout**
- Use `browser_find_element` to inspect what's on the page
- Use `browser_screenshot` to see the current state
- Try `browser_wait` before interacting with dynamic content

**Selectors not working**
- Use `text=Button Label` to match by visible text
- Use `browser_execute_js` to inspect the DOM: `return document.querySelector('selector')?.outerHTML`
- Use browser DevTools (set `BROWSER_HEADLESS=false`) to find the right selector
