const axios = require('axios');

class RobotsChecker {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  async fetchRobotsTxt(baseUrl) {
    try {
      const url = new URL('/robots.txt', baseUrl).href;
      const cached = this.cache.get(url);

      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.content;
      }

      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200 || status === 404
      });

      const content = response.status === 200 ? response.data : '';
      this.cache.set(url, {
        content,
        timestamp: Date.now()
      });

      return content;
    } catch (error) {
      global.logger.warn(`Failed to fetch robots.txt from ${baseUrl}: ${error.message}`);
      return '';
    }
  }

  parseRobotsTxt(content, userAgent = '*') {
    const lines = content.split('\n');
    let currentUserAgent = null;
    let rules = { disallowed: [], allowed: [], crawlDelay: null };
    let defaultRules = { disallowed: [], allowed: [], crawlDelay: null };

    for (let line of lines) {
      line = line.trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (!key || !value) continue;

      const lowerKey = key.toLowerCase();

      if (lowerKey === 'user-agent') {
        currentUserAgent = value.toLowerCase();
      } else if (lowerKey === 'disallow') {
        if (currentUserAgent === userAgent.toLowerCase()) {
          rules.disallowed.push(value);
        } else if (currentUserAgent === '*') {
          defaultRules.disallowed.push(value);
        }
      } else if (lowerKey === 'allow') {
        if (currentUserAgent === userAgent.toLowerCase()) {
          rules.allowed.push(value);
        } else if (currentUserAgent === '*') {
          defaultRules.allowed.push(value);
        }
      } else if (lowerKey === 'crawl-delay') {
        if (currentUserAgent === userAgent.toLowerCase()) {
          rules.crawlDelay = parseInt(value);
        } else if (currentUserAgent === '*') {
          defaultRules.crawlDelay = parseInt(value);
        }
      }
    }

    // If no specific rules for user agent, use default
    if (rules.disallowed.length === 0 && rules.allowed.length === 0) {
      return defaultRules;
    }

    return rules;
  }

  isPathAllowed(path, rules) {
    // Check explicit allows first
    for (const allowedPath of rules.allowed) {
      if (this.matchesPattern(path, allowedPath)) {
        return true;
      }
    }

    // Check disallows
    for (const disallowedPath of rules.disallowed) {
      if (disallowedPath === '' || disallowedPath === '/') {
        // Empty disallow means everything is disallowed
        if (disallowedPath === '') return true;
        return false;
      }

      if (this.matchesPattern(path, disallowedPath)) {
        return false;
      }
    }

    return true;
  }

  matchesPattern(path, pattern) {
    // Convert robots.txt pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '\\?')
      .replace(/\$/g, '$');

    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }

  async canScrape(url, userAgent = '*') {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const path = urlObj.pathname + urlObj.search;

      const robotsTxt = await this.fetchRobotsTxt(baseUrl);
      const rules = this.parseRobotsTxt(robotsTxt, userAgent);

      const allowed = this.isPathAllowed(path, rules);

      return {
        allowed,
        crawlDelay: rules.crawlDelay,
        reason: allowed ? 'Allowed by robots.txt' : 'Disallowed by robots.txt'
      };
    } catch (error) {
      global.logger.error(`Error checking robots.txt for ${url}: ${error.message}`);
      return {
        allowed: true,
        crawlDelay: null,
        reason: 'Error checking robots.txt, proceeding with caution'
      };
    }
  }
}

module.exports = new RobotsChecker();
