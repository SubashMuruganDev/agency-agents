/**
 * Interaction tools — click, type, fill, scroll, hover, keyboard, file upload.
 * These replicate how a human interacts with the browser.
 */
import browser from '../browser.js';

/**
 * Resolve a selector: if it looks like a plain string (no CSS special chars),
 * try to find it as visible text first, then fall back to CSS selector.
 */
async function resolveLocator(page, selector) {
  // If selector starts with text= or css= prefixes, use as-is via getByRole/locator
  if (selector.startsWith('text=')) {
    return page.getByText(selector.slice(5), { exact: false }).first();
  }
  return page.locator(selector).first();
}

export const interactionTools = [
  {
    name: 'browser_click',
    description:
      'Click on an element identified by a CSS selector. Waits for the element to be visible before clicking.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description:
            'CSS selector of the element to click. Use "text=Submit" to click by visible text.',
        },
        button: {
          type: 'string',
          enum: ['left', 'right', 'middle'],
          description: 'Mouse button to use. Default: "left".',
          default: 'left',
        },
        click_count: {
          type: 'number',
          description: 'Number of clicks. Use 2 for double-click. Default: 1.',
          default: 1,
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
      required: ['selector'],
    },
    handler: async ({ selector, button = 'left', click_count = 1, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click({ button, clickCount: click_count });
      return { clicked: selector, url: page.url() };
    },
  },

  {
    name: 'browser_fill',
    description:
      'Clear and fill an input field, textarea, or contenteditable element with a value.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the input element.',
        },
        value: {
          type: 'string',
          description: 'The value to fill in.',
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
      required: ['selector', 'value'],
    },
    handler: async ({ selector, value, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.fill(value);
      return { selector, filled: value };
    },
  },

  {
    name: 'browser_type',
    description:
      'Type text into an element character by character, simulating a real human typing. Use this instead of browser_fill when you need realistic typing behavior (e.g., to trigger autocomplete or keystroke events).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to type into.',
        },
        text: {
          type: 'string',
          description: 'The text to type.',
        },
        delay: {
          type: 'number',
          description: 'Delay between keystrokes in milliseconds. Default: 50.',
          default: 50,
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
      required: ['selector', 'text'],
    },
    handler: async ({ selector, text, delay = 50, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click(); // focus first
      await page.keyboard.type(text, { delay });
      return { selector, typed: text };
    },
  },

  {
    name: 'browser_hover',
    description: 'Move the mouse over an element (hover). Useful for triggering tooltips or dropdown menus.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to hover over.',
        },
        timeout: {
          type: 'number',
          description: 'Max time to wait for element in ms. Default: 10000.',
          default: 10000,
        },
      },
      required: ['selector'],
    },
    handler: async ({ selector, timeout = 10000 }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.hover();
      return { hovered: selector };
    },
  },

  {
    name: 'browser_press_key',
    description:
      'Press a keyboard key, optionally while focused on an element. Use standard key names like "Enter", "Tab", "Escape", "ArrowDown", "Control+A", etc.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description:
            'Key to press. Examples: "Enter", "Tab", "Escape", "ArrowDown", "Control+A", "Shift+Tab".',
        },
        selector: {
          type: 'string',
          description:
            'CSS selector of the element to focus before pressing the key. If omitted, sends key to the page.',
        },
      },
      required: ['key'],
    },
    handler: async ({ key, selector }) => {
      const page = await browser.getActivePage();
      if (selector) {
        const locator = await resolveLocator(page, selector);
        await locator.press(key);
      } else {
        await page.keyboard.press(key);
      }
      return { pressed: key, on: selector || 'page' };
    },
  },

  {
    name: 'browser_scroll',
    description: 'Scroll the page or a specific element up, down, left, or right.',
    inputSchema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Direction to scroll.',
        },
        amount: {
          type: 'number',
          description: 'Pixels to scroll. Default: 500.',
          default: 500,
        },
        selector: {
          type: 'string',
          description: 'CSS selector of element to scroll inside. If omitted, scrolls the page.',
        },
      },
      required: ['direction'],
    },
    handler: async ({ direction, amount = 500, selector }) => {
      const page = await browser.getActivePage();
      const deltaX = direction === 'right' ? amount : direction === 'left' ? -amount : 0;
      const deltaY = direction === 'down' ? amount : direction === 'up' ? -amount : 0;

      if (selector) {
        const locator = await resolveLocator(page, selector);
        await locator.evaluate(
          (el, [dx, dy]) => el.scrollBy(dx, dy),
          [deltaX, deltaY]
        );
      } else {
        await page.evaluate(([dx, dy]) => window.scrollBy(dx, dy), [deltaX, deltaY]);
      }
      return { scrolled: direction, amount, selector: selector || 'page' };
    },
  },

  {
    name: 'browser_select',
    description: 'Select an option from a <select> dropdown element by its value, label, or index.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the <select> element.',
        },
        value: {
          type: 'string',
          description: 'The option value attribute to select.',
        },
        label: {
          type: 'string',
          description: 'The visible text label of the option to select (use instead of value).',
        },
        index: {
          type: 'number',
          description: 'Zero-based index of the option to select (use instead of value/label).',
        },
      },
      required: ['selector'],
    },
    handler: async ({ selector, value, label, index }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout: 10000 });

      let selected;
      if (value !== undefined) {
        selected = await locator.selectOption({ value });
      } else if (label !== undefined) {
        selected = await locator.selectOption({ label });
      } else if (index !== undefined) {
        selected = await locator.selectOption({ index });
      } else {
        throw new Error('Provide value, label, or index to select an option.');
      }
      return { selector, selected };
    },
  },

  {
    name: 'browser_upload_file',
    description: 'Upload a file using a file input element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the file input element.',
        },
        file_path: {
          type: 'string',
          description: 'Absolute path to the file to upload.',
        },
      },
      required: ['selector', 'file_path'],
    },
    handler: async ({ selector, file_path }) => {
      const page = await browser.getActivePage();
      const locator = await resolveLocator(page, selector);
      await locator.setInputFiles(file_path);
      return { selector, uploaded: file_path };
    },
  },
];
