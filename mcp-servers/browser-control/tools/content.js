/**
 * Content tools — read page text/HTML, find elements, run JavaScript.
 */
import browser from '../browser.js';

export const contentTools = [
  {
    name: 'browser_get_text',
    description:
      'Get the visible text content of the current page or a specific element. Strips HTML tags.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description:
            'CSS selector of element to get text from. If omitted, returns the full page text.',
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
    },
    handler: async ({ selector, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      if (selector) {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'attached', timeout });
        const text = await locator.innerText().catch(() => locator.textContent());
        return { selector, text: text?.trim() || '' };
      }
      // Full page — use body innerText for readable content
      const text = await page.evaluate(() => document.body.innerText);
      return { url: page.url(), text: text?.trim() || '' };
    },
  },

  {
    name: 'browser_get_html',
    description: 'Get the HTML source of the current page or a specific element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description:
            'CSS selector of element to get HTML from. If omitted, returns the full page outer HTML.',
        },
        outer: {
          type: 'boolean',
          description:
            'If true, includes the element\'s own tag (outerHTML). If false, returns only the inner content (innerHTML). Default: true.',
          default: true,
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
    },
    handler: async ({ selector, outer = true, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      if (selector) {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'attached', timeout });
        const html = outer
          ? await locator.evaluate((el) => el.outerHTML)
          : await locator.innerHTML();
        return { selector, html };
      }
      const html = await page.content();
      return { url: page.url(), html };
    },
  },

  {
    name: 'browser_find_element',
    description:
      'Find elements matching a CSS selector and return their key properties (tag, text, attributes, visibility, bounding box). Useful for inspection before interacting.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to find elements.',
        },
        limit: {
          type: 'number',
          description: 'Max number of elements to return. Default: 10.',
          default: 10,
        },
      },
      required: ['selector'],
    },
    handler: async ({ selector, limit = 10 }) => {
      const page = await browser.getActivePage();
      const locators = page.locator(selector);
      const count = await locators.count();
      const results = [];

      const take = Math.min(count, limit);
      for (let i = 0; i < take; i++) {
        const el = locators.nth(i);
        const info = await el.evaluate((node) => ({
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          className: node.className || null,
          text: (node.innerText || node.textContent || '').trim().slice(0, 200),
          value: node.value ?? null,
          type: node.type ?? null,
          href: node.href ?? null,
          src: node.src ?? null,
          placeholder: node.placeholder ?? null,
          ariaLabel: node.getAttribute('aria-label'),
          role: node.getAttribute('role'),
          visible:
            node.offsetWidth > 0 &&
            node.offsetHeight > 0 &&
            window.getComputedStyle(node).visibility !== 'hidden' &&
            window.getComputedStyle(node).display !== 'none',
        }));
        const box = await el.boundingBox().catch(() => null);
        results.push({ index: i, ...info, boundingBox: box });
      }

      return { selector, total: count, showing: take, elements: results };
    },
  },

  {
    name: 'browser_execute_js',
    description:
      'Execute arbitrary JavaScript in the browser page context and return the result. The script runs as a function body — use "return" to return values.',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description:
            'JavaScript code to execute. Example: "return document.title" or "return Array.from(document.querySelectorAll(\'a\')).map(a => a.href)"',
        },
        arg: {
          description:
            'Optional argument passed to the script as the first parameter (accessible as the first argument in the function).',
        },
      },
      required: ['script'],
    },
    handler: async ({ script, arg }) => {
      const page = await browser.getActivePage();
      const fn = new Function(script); // validate syntax only
      void fn; // suppress lint
      const result = await page.evaluate(
        ([s, a]) => {
          // eslint-disable-next-line no-new-func
          const f = new Function('arg', s);
          return f(a);
        },
        [script, arg]
      );
      return { result };
    },
  },
];
