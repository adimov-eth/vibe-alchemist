/**
 * Browser Tool Wrapper
 * Wraps puppeteer-core for browser automation with timeout management
 */

import type { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer-core';

export interface BrowserToolOptions {
  headless?: boolean;
  executablePath?: string;
  timeout?: number;
  userDataDir?: string;
  args?: string[];
}

export interface NavigationResult {
  url: string;
  title: string;
  status: number;
  html?: string;
  screenshot?: Buffer;
  timing: {
    start: number;
    domContentLoaded?: number;
    load?: number;
    end: number;
  };
}

export class BrowserTool {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private options: BrowserToolOptions;
  private defaultTimeout: number;

  constructor(options: BrowserToolOptions = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      ...options,
    };
    this.defaultTimeout = this.options.timeout || 30000;
  }

  /**
   * Initialize browser instance
   */
  async init(): Promise<void> {
    if (this.browser) return;

    // Dynamic import to avoid bundling issues
    const puppeteer = await import('puppeteer-core');
    
    const launchOptions: PuppeteerLaunchOptions = {
      headless: this.options.headless,
      executablePath: this.options.executablePath,
      userDataDir: this.options.userDataDir,
      args: this.options.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    };

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(this.defaultTimeout);
  }

  /**
   * Navigate to URL with timeout management
   */
  async navigate(url: string, options: {
    waitFor?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    screenshot?: boolean;
    html?: boolean;
  } = {}): Promise<NavigationResult> {
    if (!this.page) {
      await this.init();
    }

    const timing: NavigationResult['timing'] = {
      start: Date.now(),
      end: 0,
    };

    try {
      // Navigate with specified wait condition
      const response = await this.page!.goto(url, {
        waitUntil: options.waitFor || 'load',
        timeout: options.timeout || this.defaultTimeout,
      });

      timing.end = Date.now();

      // Get page metrics
      const metrics = await this.page!.metrics();
      if (metrics.Timestamp) {
        timing.domContentLoaded = metrics.Timestamp * 1000;
      }

      const result: NavigationResult = {
        url: this.page!.url(),
        title: await this.page!.title(),
        status: response?.status() || 0,
        timing,
      };

      // Capture HTML if requested
      if (options.html) {
        result.html = await this.page!.content();
      }

      // Capture screenshot if requested
      if (options.screenshot) {
        result.screenshot = Buffer.from(await this.page!.screenshot({
          type: 'png',
          fullPage: true,
        }));
      }

      return result;
    } catch (error) {
      timing.end = Date.now();
      throw new Error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(fn: string | Function, ...args: any[]): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return await this.page.evaluate(fn as any, ...args) as T;
  }

  /**
   * Wait for selector with timeout
   */
  async waitForSelector(selector: string, options: {
    visible?: boolean;
    hidden?: boolean;
    timeout?: number;
  } = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.waitForSelector(selector, {
      ...options,
      timeout: options.timeout || this.defaultTimeout,
    });
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.click(selector);
  }

  /**
   * Type text into element
   */
  async type(selector: string, text: string, options: {
    delay?: number;
  } = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.type(selector, text, options);
  }

  /**
   * Get current page URL
   */
  getUrl(): string {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return this.page.url();
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Check if browser is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.page !== null;
  }
}

/**
 * Factory function for creating browser tool instances
 */
export function createBrowserTool(options?: BrowserToolOptions): BrowserTool {
  return new BrowserTool(options);
}