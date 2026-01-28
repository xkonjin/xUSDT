import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Configuration for the Redis client.
 */
const redisConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

/**
 * Simple in-memory cache for API responses.
 * In production, use Redis or similar distributed cache.
 */
const memoryCache = new Map<string, { data: string; expires: number }>();

/**
 * Cleans expired entries from the memory cache.
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expires < now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * A higher-order function to add caching to an API route.
 * Uses in-memory cache with optional Redis fallback.
 * 
 * @param handler The API route handler.
 * @param ttlSeconds The Time To Live for the cache in seconds.
 * @returns The wrapped handler with caching.
 */
export const withCache = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  ttlSeconds: number
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, res);
    }

    const key = `cache:${req.url}`;
    const now = Date.now();

    // Check memory cache first
    const cached = memoryCache.get(key);
    if (cached && cached.expires > now) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(JSON.parse(cached.data));
      return;
    }

    // Clean expired entries periodically
    if (Math.random() < 0.1) {
      cleanExpiredCache();
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Store in memory cache
      memoryCache.set(key, {
        data: JSON.stringify(body),
        expires: now + ttlSeconds * 1000,
      });
      return originalJson(body);
    };

    try {
      await handler(req, res);
    } catch (error) {
      console.error('Cache middleware error:', error);
      throw error;
    }
  };
};

/**
 * Creates a lazy import function for dynamic imports.
 * Use with Next.js dynamic() for code splitting.
 * 
 * @param importFn The dynamic import function
 * @returns The import function for use with next/dynamic
 */
export function createLazyImport<T>(
  importFn: () => Promise<{ default: T }>
): () => Promise<{ default: T }> {
  return importFn;
}

/**
 * A utility to be used in next.config.js to enable bundle analysis.
 * 
 * @returns The Next.js config with bundle analyzer.
 */
export const analyzeBundle = () => {
  if (process.env.ANALYZE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    return withBundleAnalyzer;
  }
  return (config: unknown) => config;
};

/**
 * Performance monitoring utilities.
 */
export const performanceUtils = {
  /**
   * Measures the execution time of an async function.
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name}: ${durationMs.toFixed(2)}ms`);
    }
    
    return { result, durationMs };
  },

  /**
   * Creates a debounced version of a function.
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delayMs: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => fn(...args), delayMs);
    };
  },

  /**
   * Creates a throttled version of a function.
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limitMs: number
  ): (...args: Parameters<T>) => void {
    let lastRun = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun >= limitMs) {
        lastRun = now;
        fn(...args);
      }
    };
  },
};
