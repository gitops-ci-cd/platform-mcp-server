// Simple session-scoped cache for completion results with TTL
// TODO: Remove this once resources have proper lookback support
// https://github.com/modelcontextprotocol/typescript-sdk/issues/678

import { getCurrentSessionId } from "./auth/context.js";

interface CacheEntry {
  results: any[];
  timestamp: number;
  ttl: number;
}

class ResourceCache {
  private cache = new Map<string, Map<string, CacheEntry>>();

  /**
   * Get the session ID and key for cache operations
   */
  private getSessionAndKey(key: string): { sessionId: string; cacheKey: string } {
    try {
      const sessionId = getCurrentSessionId();
      return { sessionId, cacheKey: key };
    } catch {
      // Fallback for when no session context is available (e.g., during tests)
      return { sessionId: "global", cacheKey: key };
    }
  }

  /**
   * Get cached results if they exist and haven't expired
   */
  get(key: string): any[] | null {
    const { sessionId, cacheKey } = this.getSessionAndKey(key);
    const sessionCache = this.cache.get(sessionId);
    if (!sessionCache) {
      return null;
    }

    const entry = sessionCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      sessionCache.delete(cacheKey);
      // Clean up empty session cache
      if (sessionCache.size === 0) {
        this.cache.delete(sessionId);
      }
      return null;
    }

    return entry.results;
  }

  /**
   * Set cached results with TTL in milliseconds
   */
  set(key: string, results: any[], ttlMs: number = 30 * 60 * 1000): any[] {
    const { sessionId, cacheKey } = this.getSessionAndKey(key);

    // Get or create session cache
    let sessionCache = this.cache.get(sessionId);
    if (!sessionCache) {
      sessionCache = new Map<string, CacheEntry>();
      this.cache.set(sessionId, sessionCache);
    }

    sessionCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    return results;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries for a specific session only
   */
  clearSession(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [sessionId, sessionCache] of this.cache.entries()) {
      for (const [key, entry] of sessionCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          sessionCache.delete(key);
        }
      }
      // Clean up empty session caches
      if (sessionCache.size === 0) {
        this.cache.delete(sessionId);
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): {
    size: number;
    sessionId: string | null;
    entries: Array<{ key: string; age: number; ttl: number; sessionScoped: boolean }>
    } {
    const now = Date.now();
    let currentSessionId: string | null = null;

    try {
      currentSessionId = getCurrentSessionId();
    } catch {
      // No session context
    }

    const allEntries: Array<{ key: string; age: number; ttl: number; sessionScoped: boolean }> = [];
    let totalSize = 0;

    for (const [sessionId, sessionCache] of this.cache.entries()) {
      for (const [key, entry] of sessionCache.entries()) {
        totalSize++;
        allEntries.push({
          key: `${sessionId}:${key}`,
          age: now - entry.timestamp,
          ttl: entry.ttl,
          sessionScoped: sessionId !== "global"
        });
      }
    }

    return {
      size: totalSize,
      sessionId: currentSessionId,
      entries: allEntries
    };
  }
}

// Global completion cache instance
export const resourceCache = new ResourceCache();

// Function to check cache for completion results
export const checkCache = ({ cacheKey, value, lookupKey }: {
  cacheKey: string,
  value?: string,
  lookupKey?: string
}): any[] => {
  const cachedResults = resourceCache.get(cacheKey);
  if (cachedResults && value) {
    const filtered = cachedResults.filter(entry => {
      if (lookupKey && typeof entry === "object") {
        return entry[lookupKey].toLowerCase().includes(value.toLowerCase());
      } else {
        return entry.toLowerCase().includes(value.toLowerCase());
      }
    });

    return filtered;
  } else {
    return cachedResults || [];
  }
};

// Periodic cleanup (run every 5 minutes)
setInterval(() => {
  resourceCache.cleanup();
}, 5 * 60 * 1000);
