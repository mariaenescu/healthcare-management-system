import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: 6379
});

export async function distributedRateLimit(req: any, res: any, next: any) {
    const key = `rate_limit:${req.user.sub}`;
    const limit = 100; // 100 requests
    const window = 3600; // per hour

    const current = await redis.incr(key);

    if (current === 1) {
        await redis.expire(key, window);
    }

    if (current > limit) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: await redis.ttl(key)
        });
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - current);
    next();
}
