/**
 * Puppeteer Actions Module
 * Wrapper functions for browser automation using Puppeteer API
 */

class PuppeteerActions {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleMessages = [];
  }

  /**
   * Initialize browser and page with console message tracking
   */
  async initialize(browser) {
    this.browser = browser;

    // Listen for browser disconnection
    browser.on('disconnected', () => {
      console.log('\n⚠️  Browser disconnected from DevTools');
      console.log('   Timestamp:', new Date().toISOString());
      console.log('   Browser target:', browser.target()?.url() || '(unknown)');
      console.log('   → Browser instance is no longer usable\n');
      this.browser = null;
      this.page = null;
    });

    // Listen for target crashed events
    browser.on('targetdestroyed', (target) => {
      console.log('⚠️  Browser target destroyed:', target.url());
    });

    this.page = await browser.newPage();
    await this.page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Track console messages
    this.page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        ts: Date.now()
      });
      // Keep only last 100 messages
      if (this.consoleMessages.length > 100) {
        this.consoleMessages.shift();
      }
    });

    // Listen for page errors
    this.page.on('error', (err) => {
      console.error('⚠️  Page error:', err.message);
    });

    this.page.on('pageerror', (err) => {
      console.error('⚠️  Page JavaScript error:', err.message);
    });

    return this.page;
  }

  /**
   * Navigation: Navigate to URL
   */
  async navigate(params) {
    const start = Date.now();
    await this.page.goto(params.url, {
      waitUntil: params.waitUntil || 'networkidle2',
      timeout: params.timeout || 30000
    });
    return {
      success: true,
      url: this.page.url(),
      title: await this.page.title(),
      loadTime: Date.now() - start
    };
  }

  /**
   * Navigation: Go back
   */
  async back() {
    await this.page.goBack({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  /**
   * Navigation: Go forward
   */
  async forward() {
    await this.page.goForward({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  /**
   * Navigation: Reload page
   */
  async reload() {
    await this.page.reload({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  /**
   * Content: Get page text content
   */
  async snapshot() {
    const content = await this.page.evaluate(() => document.body.innerText);
    return {
      success: true,
      content,
      url: this.page.url(),
      title: await this.page.title(),
      length: content.length
    };
  }

  /**
   * Content: Get page HTML
   */
  async html() {
    return {
      success: true,
      html: await this.page.content(),
      url: this.page.url()
    };
  }

  /**
   * Content: List interactive elements
   */
  async elements(params) {
    const elements = await this.page.evaluate((limit) => {
      const selectors = 'a, button, input, select, textarea, [role="button"], [onclick]';
      return [...document.querySelectorAll(selectors)]
        .filter(el => el.offsetParent !== null) // visible only
        .slice(0, limit || 30)
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          text: (el.textContent || el.value || el.placeholder || '').slice(0, 60).trim(),
          id: el.id || null,
          name: el.name || null,
          href: el.href || null,
          selector: el.id ? `#${el.id}` :
                    el.name ? `[name="${el.name}"]` :
                    el.className ? `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}` : null
        }));
    }, params?.limit);

    return { success: true, count: elements.length, elements };
  }

  /**
   * Interaction: Click element by text or selector
   */
  async click(params) {
    if (params.text) {
      const clicked = await this.page.evaluate((text) => {
        const selectors = 'a, button, [role="button"], input[type="submit"], input[type="button"]';
        const el = [...document.querySelectorAll(selectors)]
          .find(e => e.textContent?.toLowerCase().includes(text.toLowerCase()) ||
                     e.value?.toLowerCase().includes(text.toLowerCase()));
        if (el) {
          el.click();
          return true;
        }
        return false;
      }, params.text);

      if (!clicked) {
        return {
          success: false,
          error: `No clickable element with text: ${params.text}`
        };
      }
    } else if (params.selector) {
      await this.page.click(params.selector);
    } else {
      return { success: false, error: 'Need text or selector' };
    }

    return { success: true };
  }

  /**
   * Interaction: Type text into input
   */
  async type(params) {
    if (!params.selector) {
      return { success: false, error: 'Need selector' };
    }

    if (params.clear) {
      await this.page.click(params.selector, { clickCount: 3 });
      await this.page.keyboard.press('Backspace');
    }

    await this.page.type(params.selector, params.text || '', {
      delay: params.delay || 0
    });

    if (params.submit) {
      await this.page.keyboard.press('Enter');
    }

    return { success: true };
  }

  /**
   * Interaction: Scroll page
   */
  async scroll(params) {
    if (params.selector) {
      await this.page.evaluate(sel => {
        document.querySelector(sel)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, params.selector);
    } else if (params.direction === 'up') {
      await this.page.evaluate(() => window.scrollBy(0, -500));
    } else if (params.direction === 'down') {
      await this.page.evaluate(() => window.scrollBy(0, 500));
    } else if (params.direction === 'top') {
      await this.page.evaluate(() => window.scrollTo(0, 0));
    } else if (params.direction === 'bottom') {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }

    return { success: true };
  }

  /**
   * Interaction: Wait for element, text, or time
   */
  async wait(params) {
    if (params.selector) {
      await this.page.waitForSelector(params.selector, {
        timeout: params.timeout || 30000
      });
    } else if (params.text) {
      await this.page.waitForFunction(
        text => document.body.innerText.includes(text),
        { timeout: params.timeout || 30000 },
        params.text
      );
    } else if (params.ms) {
      await new Promise(r => setTimeout(r, params.ms));
    }

    return { success: true };
  }

  /**
   * Media: Take screenshot
   */
  async screenshot(params) {
    const path = params.path || '/tmp/screenshot.png';
    await this.page.screenshot({
      path,
      fullPage: params.fullPage !== false,
      type: path.endsWith('.jpg') ? 'jpeg' : 'png'
    });

    return { success: true, path };
  }

  /**
   * Advanced: Execute JavaScript
   */
  async evaluate(params) {
    const result = await this.page.evaluate(params.script);
    return { success: true, result };
  }

  /**
   * Advanced: Get console messages
   */
  async console(params) {
    const level = params.level;
    const messages = level
      ? this.consoleMessages.filter(m => m.type === level)
      : this.consoleMessages;

    return { success: true, messages };
  }

  /**
   * Browser: Get current status
   */
  async status(sessionInfo) {
    const target = this.browser?.target();
    return {
      success: true,
      wsConnected: sessionInfo.connected,
      sessionId: sessionInfo.sessionId,
      puppeteerRunning: this.browser?.isConnected() || false,
      url: this.page?.url() || null,
      title: this.page ? await this.page.title().catch(() => null) : null,
      puppeteerSessionId: target?.sessionId() || null,
      browserId: target?.browserId() || null
    };
  }

  /**
   * Browser: Get detailed session info
   */
  async sessionInfo(sessionInfo) {
    const target = this.browser?.target();
    return {
      success: true,
      connected: sessionInfo.connected,
      wsConnected: sessionInfo.wsConnected,
      sessionId: sessionInfo.sessionId,
      puppeteerConnected: this.browser?.isConnected() || false,
      puppeteerSessionId: target?.sessionId() || null,
      browserId: target?.browserId() || null,
      server: sessionInfo.server,
      wsEndpoint: sessionInfo.wsEndpoint,
      hasApiKey: sessionInfo.hasApiKey,
      hasAddonSessionId: sessionInfo.hasAddonSessionId,
      addonSessionId: sessionInfo.addonSessionId
    };
  }

  /**
   * Browser: Create new page/tab
   */
  async newPage() {
    const newPage = await this.browser.newPage();
    await newPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    this.page = newPage; // Switch to new page as current

    // Setup console tracking for new page
    this.page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        ts: Date.now()
      });
      if (this.consoleMessages.length > 100) {
        this.consoleMessages.shift();
      }
    });

    return { success: true, message: 'New page/tab created' };
  }

  /**
   * Browser: Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    return { success: true, message: 'Browser closed' };
  }

  /**
   * Execute action by name
   */
  async execute(action, params, sessionInfo = {}) {
    // Map action names to methods
    const actionMap = {
      navigate: () => this.navigate(params),
      back: () => this.back(),
      forward: () => this.forward(),
      reload: () => this.reload(),
      snapshot: () => this.snapshot(),
      html: () => this.html(),
      elements: () => this.elements(params),
      click: () => this.click(params),
      type: () => this.type(params),
      scroll: () => this.scroll(params),
      wait: () => this.wait(params),
      screenshot: () => this.screenshot(params),
      evaluate: () => this.evaluate(params),
      console: () => this.console(params),
      status: () => this.status(sessionInfo),
      sessionInfo: () => this.sessionInfo(sessionInfo),
      newPage: () => this.newPage(),
      close: () => this.close()
    };

    const actionMethod = actionMap[action];
    if (!actionMethod) {
      return { success: false, error: `Unknown action: ${action}` };
    }

    return await actionMethod();
  }
}

module.exports = PuppeteerActions;
