class ProxyManager {
  constructor(proxies = []) {
    this.proxies = proxies.map(proxy => {
      if (typeof proxy === 'string') {
        return { url: proxy, active: true, failures: 0 };
      }
      return { ...proxy, active: true, failures: 0 };
    });
    this.currentIndex = 0;
    this.maxFailures = 3;
  }

  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    const activeProxies = this.proxies.filter(p => p.active);
    if (activeProxies.length === 0) {
      this.resetProxies();
      return this.proxies[0];
    }

    const proxy = activeProxies[this.currentIndex % activeProxies.length];
    this.currentIndex++;
    return proxy;
  }

  markProxyFailure(proxyUrl) {
    const proxy = this.proxies.find(p => p.url === proxyUrl);
    if (proxy) {
      proxy.failures++;
      if (proxy.failures >= this.maxFailures) {
        proxy.active = false;
        global.logger.warn(`Proxy ${proxyUrl} deactivated after ${proxy.failures} failures`);
      }
    }
  }

  markProxySuccess(proxyUrl) {
    const proxy = this.proxies.find(p => p.url === proxyUrl);
    if (proxy) {
      proxy.failures = Math.max(0, proxy.failures - 1);
    }
  }

  resetProxies() {
    this.proxies.forEach(proxy => {
      proxy.active = true;
      proxy.failures = 0;
    });
    global.logger.info('All proxies reset and reactivated');
  }

  getStats() {
    return {
      total: this.proxies.length,
      active: this.proxies.filter(p => p.active).length,
      failed: this.proxies.filter(p => !p.active).length
    };
  }
}

module.exports = ProxyManager;