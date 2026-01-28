import { NextApiRequest, NextApiResponse } from 'next';
import { ComponentType, lazy, Suspense, ReactNode } from 'react';
import { createClient, RedisClientType } from 'redis';

/**
 * Configuration for the Redis client.
 */
const redisConfig = {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

let redisClient: RedisClientType | null = null;

/**
 * @name getRedisClient
 * @description Initializes and returns a Redis client instance.
 * @returns {RedisClientType} The Redis client.
 */
const getRedisClient = (): RedisClientType => {
    if (!redisClient) {
        redisClient = createClient(redisConfig);
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
    }
    return redisClient;
};

/**
 * @name withCache
 * @description A higher-order function to add caching to an API route.
 * @param {(req: NextApiRequest, res: NextApiResponse) => Promise<void>} handler The API route handler.
 * @param {number} ttlSeconds The Time To Live for the cache in seconds.
 * @returns {(req: NextApiRequest, res: NextApiResponse) => Promise<void>} The wrapped handler with caching.
 */
export const withCache = (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
    ttlSeconds: number
) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const client = getRedisClient();
        const key = `cache:${req.url}`;

        try {
            await client.connect();
            const cachedData = await client.get(key);

            if (cachedData) {
                res.setHeader('X-Cache', 'HIT');
                res.status(200).json(JSON.parse(cachedData));
                return;
            }

            res.setHeader('X-Cache', 'MISS');
            const originalJson = res.json;

            res.json = (body: any) => {
                client.setEx(key, ttlSeconds, JSON.stringify(body));
                return originalJson.call(res, body);
            };

            await handler(req, res);
        } catch (error) {
            console.error('Cache middleware error:', error);
            // Fallback to original handler without caching
            await handler(req, res);
        } finally {
            if (client.isOpen) {
                await client.quit();
            }
        }
    };
};

/**
 * @name lazyLoad
 * @description A higher-order function to lazy load a React component.
 * @param {() => Promise<{ default: ComponentType<P> }> } importFn The import function for the component.
 * @param {ReactNode} fallback The fallback UI to show while the component is loading.
 * @returns {ComponentType<P>} The lazy-loaded component.
 */
export const lazyLoad = <P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    fallback: ReactNode = <div>Loading...</div>
): ComponentType<P> => {
    const LazyComponent = lazy(importFn);

    const a = (props: P) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} />
        </Suspense>
    );
    return a
};

/**
 * @name analyzeBundle
 * @description A utility to be used in next.config.js to enable bundle analysis.
 * @returns {(config: any, { isServer }: any) => any} The Next.js config with bundle analyzer.
 */
export const analyzeBundle = () => {
    if (process.env.ANALYZE === 'true') {
        const withBundleAnalyzer = require('@next/bundle-analyzer')({
            enabled: true,
        });
        return withBundleAnalyzer;
    }
    return (config: any) => config;
};
