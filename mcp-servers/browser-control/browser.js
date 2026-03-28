/**
 * BrowserManager — singleton that owns the Playwright browser instance.
 * All tools share the same browser so cookies, auth, and session persist
 * across tool calls within a single Claude session.
 */
import { chromium, firefox, webkit } from 'playwright';

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.pages = new Map(); // tabId -> Page
    this.activeTabId = null;
    this.tabCounter = 0;
  }

  async init() {
    if (this.browser) return;

    const cdpUrl = process.env.BROWSER_CDP_URL;

    if (cdpUrl) {
      // ── CDP attach mode ────────────────────────────────────────────────────
      // Attaches to a running Chrome started with:
      //   google-chrome --remote-debugging-port=9222 --remote-allow-origins=*
      // This preserves your real Chrome profile, cookies, and active logins.
      process.stderr.write(`[browser-control] Attaching to Chrome via CDP: ${cdpUrl}\n`);
      this.browser = await chromium.connectOverCDP(cdpUrl);
      // Use the existing default browser context (carries the user's profile)
      const contexts = this.browser.contexts();
      this.context = contexts[0] ?? await this.browser.newContext();
      // Adopt all currently open pages as trackable tabs
      for (const page of this.context.pages()) {
        const id = this._nextTabId();
        this.pages.set(id, page);
        if (!this.activeTabId) this.activeTabId = id;
      }
      // Listen for new tabs opened by the user or by navigation
      this.context.on('page', (page) => {
        const id = this._nextTabId();
        this.pages.set(id, page);
        this.activeTabId = id;
      });
    } else {
      // ── Launch mode (default) ──────────────────────────────────────────────
      const browserType = process.env.BROWSER_TYPE || 'chromium';
      const headless = process.env.BROWSER_HEADLESS !== 'false';
      const profileDir = process.env.BROWSER_PROFILE_DIR || null;

      const launchOptions = {
        headless,
        args: headless ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      };

      const engines = { chromium, firefox, webkit };
      const engine = engines[browserType] || chromium;

      if (profileDir) {
        this.context = await engine.launchPersistentContext(profileDir, {
          ...launchOptions,
          viewport: { width: 1280, height: 720 },
        });
        this.browser = this.context.browser();
        // Adopt any pages already open in the persistent context
        const existingPages = this.context.pages();
        for (const page of existingPages) {
          const id = this._nextTabId();
          this.pages.set(id, page);
          if (!this.activeTabId) this.activeTabId = id;
        }
      } else {
        this.browser = await engine.launch(launchOptions);
        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
      }
    }

    // Open an initial blank page if none exist
    if (this.pages.size === 0) {
      await this._openNewPage();
    }
  }

  _nextTabId() {
    return `tab-${++this.tabCounter}`;
  }

  async _openNewPage(url = null) {
    await this.init();
    const page = await this.context.newPage();
    const id = this._nextTabId();
    this.pages.set(id, page);
    this.activeTabId = id;
    if (url) await page.goto(url, { waitUntil: 'domcontentloaded' });
    return { id, page };
  }

  async getActivePage() {
    await this.init();
    const page = this.pages.get(this.activeTabId);
    if (!page) throw new Error('No active browser tab. Use browser_new_tab first.');
    return page;
  }

  async newTab(url = null) {
    const { id, page } = await this._openNewPage(url);
    return { tabId: id, url: page.url() };
  }

  async closeTab(tabId) {
    await this.init();
    const id = tabId || this.activeTabId;
    const page = this.pages.get(id);
    if (!page) throw new Error(`Tab "${id}" not found.`);
    await page.close();
    this.pages.delete(id);
    // Switch to last remaining tab
    if (this.activeTabId === id) {
      const remaining = [...this.pages.keys()];
      this.activeTabId = remaining[remaining.length - 1] || null;
    }
    return { closed: id, activeTabId: this.activeTabId };
  }

  async switchTab(tabId) {
    await this.init();
    if (!this.pages.has(tabId)) throw new Error(`Tab "${tabId}" not found.`);
    this.activeTabId = tabId;
    const page = this.pages.get(tabId);
    await page.bringToFront();
    return { activeTabId: tabId, url: page.url() };
  }

  async listTabs() {
    await this.init();
    const tabs = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        tabId: id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        active: id === this.activeTabId,
      });
    }
    return tabs;
  }

  async close() {
    if (this.browser) {
      // In CDP-attach mode we do NOT close the browser — we don't own it.
      // The user's real Chrome session must keep running.
      if (!process.env.BROWSER_CDP_URL) {
        await this.browser.close();
      }
      this.browser = null;
      this.context = null;
      this.pages.clear();
      this.activeTabId = null;
    }
  }
}

// Singleton export
const manager = new BrowserManager();
export default manager;
