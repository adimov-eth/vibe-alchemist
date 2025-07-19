/**
 * Browser Strategies
 * Static-first approach for content extraction and navigation
 */

import type { BrowserTool, NavigationResult } from './tool';

export interface ExtractionStrategy {
  name: string;
  pattern: RegExp | ((url: string) => boolean);
  extract: (tool: BrowserTool, url: string) => Promise<any>;
}

export interface NavigationStrategy {
  name: string;
  canHandle: (url: string) => boolean;
  navigate: (tool: BrowserTool, url: string) => Promise<NavigationResult>;
}

/**
 * Static content extraction strategies
 */
export const extractionStrategies: ExtractionStrategy[] = [
  {
    name: 'json-api',
    pattern: /\.(json|api)$/i,
    extract: async (tool, url) => {
      // For JSON endpoints, fetch directly without browser
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  },
  {
    name: 'static-html',
    pattern: /\.(html?|htm)$/i,
    extract: async (tool, url) => {
      // For static HTML, use simple fetch first
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        return { html, fromCache: false };
      } catch (error) {
        // Fall back to browser if fetch fails
        const result = await tool.navigate(url, { html: true });
        return { html: result.html, fromCache: false };
      }
    },
  },
  {
    name: 'github-api',
    pattern: /api\.github\.com/i,
    extract: async (tool, url) => {
      // GitHub API - use fetch with proper headers
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SwarmConductor/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return await response.json();
    },
  },
];

/**
 * Navigation strategies for different content types
 */
export const navigationStrategies: NavigationStrategy[] = [
  {
    name: 'spa-navigation',
    canHandle: (url) => {
      // Detect SPA frameworks
      const spaPatterns = [
        /\/(app|dashboard|portal)\//i,
        /\#\//,  // Hash routing
        /\/(?!.*\.).*$/,  // No file extension (likely SPA route)
      ];
      return spaPatterns.some(pattern => pattern.test(url));
    },
    navigate: async (tool, url) => {
      // For SPAs, wait for network idle
      return await tool.navigate(url, {
        waitFor: 'networkidle0',
        timeout: 45000,
      });
    },
  },
  {
    name: 'document-navigation',
    canHandle: (url) => {
      // Static documents
      return /\.(pdf|doc|docx|txt)$/i.test(url);
    },
    navigate: async (tool, url) => {
      // For documents, just navigate and capture
      return await tool.navigate(url, {
        waitFor: 'domcontentloaded',
        screenshot: true,
      });
    },
  },
  {
    name: 'default-navigation',
    canHandle: () => true,  // Fallback for all URLs
    navigate: async (tool, url) => {
      // Default strategy - wait for load event
      return await tool.navigate(url, {
        waitFor: 'load',
        timeout: 30000,
      });
    },
  },
];

/**
 * Strategy selector
 */
export class StrategySelector {
  private extractionStrategies: ExtractionStrategy[];
  private navigationStrategies: NavigationStrategy[];

  constructor(
    extraction = extractionStrategies,
    navigation = navigationStrategies,
  ) {
    this.extractionStrategies = extraction;
    this.navigationStrategies = navigation;
  }

  /**
   * Select extraction strategy for URL
   */
  selectExtractionStrategy(url: string): ExtractionStrategy | null {
    for (const strategy of this.extractionStrategies) {
      if (strategy.pattern instanceof RegExp) {
        if (strategy.pattern.test(url)) {
          return strategy;
        }
      } else if (strategy.pattern(url)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Select navigation strategy for URL
   */
  selectNavigationStrategy(url: string): NavigationStrategy {
    for (const strategy of this.navigationStrategies) {
      if (strategy.canHandle(url)) {
        return strategy;
      }
    }
    // Return default strategy if no match found
    return this.navigationStrategies[this.navigationStrategies.length - 1]!;
  }

  /**
   * Check if URL can be extracted statically
   */
  canExtractStatically(url: string): boolean {
    return this.selectExtractionStrategy(url) !== null;
  }

  /**
   * Extract content using appropriate strategy
   */
  async extract(tool: BrowserTool, url: string): Promise<any> {
    const strategy = this.selectExtractionStrategy(url);
    if (strategy) {
      return await strategy.extract(tool, url);
    }
    // Fall back to browser navigation
    const navStrategy = this.selectNavigationStrategy(url);
    const result = await navStrategy.navigate(tool, url);
    return result;
  }
}

/**
 * Create preconfigured strategy selector
 */
export function createStrategySelector(): StrategySelector {
  return new StrategySelector();
}

/**
 * Performance optimization - cache static responses
 */
export class CachedStrategySelector extends StrategySelector {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number;

  constructor(cacheTimeout = 300000) {  // 5 minutes default
    super();
    this.cacheTimeout = cacheTimeout;
  }

  override async extract(tool: BrowserTool, url: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.data, fromCache: true };
    }

    // Extract using parent method
    const result = await super.extract(tool, url);
    
    // Cache if it was a static extraction
    if (this.canExtractStatically(url)) {
      this.cache.set(url, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}