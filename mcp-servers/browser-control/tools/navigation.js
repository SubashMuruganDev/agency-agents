/**
 * Navigation tools — move between pages and capture screenshots.
 */
import browser from '../browser.js';

export const navigationTools = [
  {
    name: 'browser_navigate',
    description:
      'Navigate the browser to a URL. Waits for the page to load before returning.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to (must include http:// or https://)',
        },
        wait_until: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle', 'commit'],
          description:
            'When to consider navigation finished. Default: "domcontentloaded". Use "networkidle" for SPAs.',
          default: 'domcontentloaded',
        },
        timeout: {
          type: 'number',
          description: 'Maximum navigation time in milliseconds. Default: 30000.',
          default: 30000,
        },
      },
      required: ['url'],
    },
    handler: async ({ url, wait_until = 'domcontentloaded', timeout = 30000 }) => {
      const page = await browser.getActivePage();
      await page.goto(url, { waitUntil: wait_until, timeout });
      return {
        url: page.url(),
        title: await page.title(),
        status: 'navigated',
      };
    },
  },

  {
    name: 'browser_screenshot',
    description:
      'Take a screenshot of the current page or a specific element. Returns a base64-encoded PNG image.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description:
            'CSS selector of element to screenshot. If omitted, captures the full viewport.',
        },
        full_page: {
          type: 'boolean',
          description: 'Capture the full scrollable page (ignored if selector is given). Default: false.',
          default: false,
        },
      },
    },
    handler: async ({ selector, full_page = false }) => {
      const page = await browser.getActivePage();
      let screenshotBuffer;

      if (selector) {
        const element = await page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 10000 });
        screenshotBuffer = await element.screenshot();
      } else {
        screenshotBuffer = await page.screenshot({ fullPage: full_page });
      }

      return {
        type: 'image',
        data: screenshotBuffer.toString('base64'),
        mimeType: 'image/png',
        url: page.url(),
        title: await page.title(),
      };
    },
  },

  {
    name: 'browser_back',
    description: 'Navigate back to the previous page in browser history.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const page = await browser.getActivePage();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      return { url: page.url(), title: await page.title() };
    },
  },

  {
    name: 'browser_forward',
    description: 'Navigate forward to the next page in browser history.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const page = await browser.getActivePage();
      await page.goForward({ waitUntil: 'domcontentloaded' });
      return { url: page.url(), title: await page.title() };
    },
  },

  {
    name: 'browser_refresh',
    description: 'Reload the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        wait_until: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle'],
          default: 'domcontentloaded',
        },
      },
    },
    handler: async ({ wait_until = 'domcontentloaded' }) => {
      const page = await browser.getActivePage();
      await page.reload({ waitUntil: wait_until });
      return { url: page.url(), title: await page.title() };
    },
  },
];
