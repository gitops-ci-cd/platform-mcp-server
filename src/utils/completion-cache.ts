// Simple global cache for completion results with TTL
// TODO: Remove this once resources have proper lookback support
// https://github.com/modelcontextprotocol/typescript-sdk/issues/678

interface CacheEntry {
  results: string[];
  timestamp: number;
  ttl: number;
}

class CompletionCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached results if they exist and haven't expired
   */
  get(key: string): string[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  /**
   * Set cached results with TTL in milliseconds
   */
  set(key: string, results: string[], ttlMs: number = 30 * 60 * 1000): void {
    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }
}

// Global completion cache instance
export const completionCache = new CompletionCache();

// Optional: Periodic cleanup (run every 5 minutes)
setInterval(() => {
  completionCache.cleanup();
}, 5 * 60 * 1000);
