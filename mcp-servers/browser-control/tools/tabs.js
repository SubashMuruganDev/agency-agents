/**
 * Tab management and wait tools.
 */
import browser from '../browser.js';

export const tabTools = [
  {
    name: 'browser_new_tab',
    description: 'Open a new browser tab, optionally navigating to a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to open in the new tab. If omitted, opens a blank tab.',
        },
      },
    },
    handler: async ({ url }) => {
      return await browser.newTab(url || null);
    },
  },

  {
    name: 'browser_close_tab',
    description: 'Close a browser tab. If no tab ID is given, closes the currently active tab.',
    inputSchema: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description:
            'ID of the tab to close (from browser_list_tabs). If omitted, closes the active tab.',
        },
      },
    },
    handler: async ({ tab_id }) => {
      return await browser.closeTab(tab_id || null);
    },
  },

  {
    name: 'browser_list_tabs',
    description: 'List all open browser tabs with their IDs, URLs, titles, and which is active.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const tabs = await browser.listTabs();
      return { tabs };
    },
  },

  {
    name: 'browser_switch_tab',
    description: 'Switch focus to a different browser tab by its tab ID.',
    inputSchema: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description: 'ID of the tab to switch to (from browser_list_tabs).',
        },
      },
      required: ['tab_id'],
    },
    handler: async ({ tab_id }) => {
      return await browser.switchTab(tab_id);
    },
  },

  {
    name: 'browser_wait',
    description:
      'Wait for an element to appear/disappear, or simply pause for a number of milliseconds. Use this when pages are loading or animations are running.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to wait for. If omitted, waits for the specified duration.',
        },
        state: {
          type: 'string',
          enum: ['visible', 'hidden', 'attached', 'detached'],
          description:
            'Element state to wait for (only used with selector). Default: "visible".',
          default: 'visible',
        },
        timeout: {
          type: 'number',
          description:
            'Maximum wait time in milliseconds. For pure time waits (no selector), this is the exact duration to pause. Default: 5000.',
          default: 5000,
        },
      },
    },
    handler: async ({ selector, state = 'visible', timeout = 5000 }) => {
      const page = await browser.getActivePage();
      if (selector) {
        await page.locator(selector).first().waitFor({ state, timeout });
        return { waited: 'element', selector, state };
      }
      await page.waitForTimeout(timeout);
      return { waited: 'time', duration: timeout };
    },
  },

  {
    name: 'browser_get_url',
    description: 'Get the current URL and page title of the active tab.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const page = await browser.getActivePage();
      return { url: page.url(), title: await page.title() };
    },
  },

  {
    name: 'browser_get_cookies',
    description: 'Get cookies for the current page or all cookies in the browser context.',
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of URLs to get cookies for. If omitted, returns all cookies.',
        },
      },
    },
    handler: async ({ urls }) => {
      await browser.init();
      const cookies = await browser.context.cookies(urls);
      return { count: cookies.length, cookies };
    },
  },

  {
    name: 'browser_set_cookie',
    description: 'Set a cookie in the browser context.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Cookie name.' },
        value: { type: 'string', description: 'Cookie value.' },
        domain: { type: 'string', description: 'Cookie domain (e.g. ".example.com").' },
        path: { type: 'string', description: 'Cookie path. Default: "/".' },
        expires: {
          type: 'number',
          description: 'Expiry timestamp (Unix epoch seconds). Omit for session cookie.',
        },
        http_only: { type: 'boolean', description: 'HttpOnly flag.' },
        secure: { type: 'boolean', description: 'Secure flag.' },
      },
      required: ['name', 'value', 'domain'],
    },
    handler: async ({ name, value, domain, path = '/', expires, http_only, secure }) => {
      await browser.init();
      const cookie = { name, value, domain, path };
      if (expires !== undefined) cookie.expires = expires;
      if (http_only !== undefined) cookie.httpOnly = http_only;
      if (secure !== undefined) cookie.secure = secure;
      await browser.context.addCookies([cookie]);
      return { set: name, domain };
    },
  },
];
