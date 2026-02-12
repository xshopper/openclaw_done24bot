/**
 * Puppeteer Actions Module
 * Browser automation wrapper using puppeteer-core
 */

class PuppeteerActions {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleMessages = [];
  }

  /**
   * Initialize with browser instance.
   * NOTE: disconnected listener is managed by browser-server.js to avoid stacking.
   */
  async initialize(browser) {
    this.browser = browser;

    this.page = await browser.newPage();
    await this.page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

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

    this.page.on('pageerror', (err) => {
      console.error('Page error:', err.message);
    });

    return this.page;
  }

  /**
   * Guard: throw if page is not available
   */
  ensurePage() {
    if (!this.page) {
      throw new Error('No active page - browser may be disconnected');
    }
  }

  async navigate(params) {
    if (!params.url || typeof params.url !== 'string') {
      return { success: false, error: 'Missing or invalid url parameter' };
    }
    this.ensurePage();
    const start = Date.now();
    await this.page.goto(params.url, {
      waitUntil: params.waitUntil || 'networkidle2',
      timeout: params.timeout || 30000
    });
    return {
      success: true,
      url: this.page.url(),
      title: await this.page.title().catch(() => null),
      loadTime: Date.now() - start
    };
  }

  async back() {
    this.ensurePage();
    await this.page.goBack({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  async forward() {
    this.ensurePage();
    await this.page.goForward({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  async reload() {
    this.ensurePage();
    await this.page.reload({ waitUntil: 'networkidle2' });
    return { success: true, url: this.page.url() };
  }

  async snapshot() {
    this.ensurePage();
    const content = await this.page.evaluate(() => document.body.innerText);
    return {
      success: true,
      content,
      url: this.page.url(),
      title: await this.page.title().catch(() => null),
      length: content.length
    };
  }

  async html() {
    this.ensurePage();
    return {
      success: true,
      html: await this.page.content(),
      url: this.page.url()
    };
  }

  async elements(params) {
    this.ensurePage();
    const elements = await this.page.evaluate((limit) => {
      const selectors = 'a, button, input, select, textarea, [role="button"], [onclick]';
      return [...document.querySelectorAll(selectors)]
        .filter(el => el.offsetParent !== null)
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

  async click(params) {
    this.ensurePage();
    if (params.text) {
      const clicked = await this.page.evaluate((text) => {
        const selectors = 'a, button, [role="button"], input[type="submit"], input[type="button"]';
        const el = [...document.querySelectorAll(selectors)]
          .find(e => e.textContent?.toLowerCase().includes(text.toLowerCase()) ||
                     e.value?.toLowerCase().includes(text.toLowerCase()));
        if (el) { el.click(); return true; }
        return false;
      }, params.text);

      if (!clicked) {
        return { success: false, error: `No clickable element with text: ${params.text}` };
      }
    } else if (params.selector) {
      await this.page.click(params.selector);
    } else {
      return { success: false, error: 'Need text or selector' };
    }

    return { success: true };
  }

  async type(params) {
    this.ensurePage();
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

  async scroll(params) {
    this.ensurePage();
    if (params.selector) {
      await this.page.evaluate(sel => {
        document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  async wait(params) {
    this.ensurePage();
    if (params.selector) {
      await this.page.waitForSelector(params.selector, { timeout: params.timeout || 30000 });
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

  async screenshot(params) {
    this.ensurePage();
    const path = params.path || '/tmp/screenshot.png';
    await this.page.screenshot({
      path,
      fullPage: params.fullPage !== false,
      type: path.endsWith('.jpg') ? 'jpeg' : 'png'
    });

    return { success: true, path };
  }

  async evaluate(params) {
    this.ensurePage();
    if (!params.script || typeof params.script !== 'string') {
      return { success: false, error: 'Missing or invalid script parameter' };
    }
    // Wrap string as function body so both expressions and statements work
    const result = await this.page.evaluate(new Function('return (' + params.script + ')'));
    return { success: true, result };
  }

  async console(params) {
    const level = params.level;
    const messages = level
      ? this.consoleMessages.filter(m => m.type === level)
      : this.consoleMessages;

    return { success: true, messages };
  }

  async status(sessionInfo) {
    return {
      success: true,
      wsConnected: sessionInfo.connected,
      sessionId: sessionInfo.sessionId,
      puppeteerRunning: this.browser?.isConnected() || false,
      url: this.page?.url() || null,
      title: this.page ? await this.page.title().catch(() => null) : null
    };
  }

  async sessionInfo(sessionInfo) {
    return {
      success: true,
      connected: sessionInfo.connected,
      wsConnected: sessionInfo.wsConnected,
      sessionId: sessionInfo.sessionId,
      puppeteerConnected: this.browser?.isConnected() || false,
      server: sessionInfo.server,
      wsEndpoint: sessionInfo.wsEndpoint,
      hasApiKey: sessionInfo.hasApiKey,
      hasAddonSessionId: sessionInfo.hasAddonSessionId,
      addonSessionId: sessionInfo.addonSessionId
    };
  }

  async newPage() {
    if (!this.browser) {
      throw new Error('No browser connected');
    }
    const newPage = await this.browser.newPage();
    await newPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    this.page = newPage;

    this.page.on('console', msg => {
      this.consoleMessages.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
      if (this.consoleMessages.length > 100) this.consoleMessages.shift();
    });

    return { success: true, message: 'New page/tab created' };
  }

  async close() {
    if (this.browser) {
      this.browser.disconnect();
      this.browser = null;
      this.page = null;
    }

    return { success: true, message: 'Browser disconnected' };
  }

  async execute(action, params, sessionInfo = {}) {
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
