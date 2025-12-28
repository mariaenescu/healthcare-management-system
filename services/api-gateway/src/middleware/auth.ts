import axios from 'axios';
import Redis from 'ioredis';
import { Pool } from 'pg';


const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const REALM = 'healthcare';

// Redis connection
let redis: Redis | null = null;
try {
    redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: 6379,
        retryStrategy: () => null,
        lazyConnect: true
    });

    redis.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
        redis = null;
    });
} catch (error) {
    console.warn('Redis initialization failed, continuing without Redis');
    redis = null;
}

// Reusable connection to PostgreSQL for saving the profile
const pgPool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'keycloak',
    user: process.env.DB_USER || 'keycloak',
    password: process.env.DB_PASSWORD || 'keycloak'
});

async function ensureUserProfile(user: any) {
    if (!user?.sub) {
        return;
    }

    // Derive primary role based on roles from Keycloak
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    let primaryRole = 'patient';

    if (roles.includes('admin')) {
        primaryRole = 'admin';
    } else if (roles.includes('doctor')) {
        primaryRole = 'doctor';
    }

    const profile = {
        id: user.sub,
        username: user.preferred_username || user.username || '',
        email: user.email || '',
        role: primaryRole
    };

    // 1) Save profile in Redis for fast access
    if (redis) {
        const key = `profile:${user.sub}`;
        try {
            const exists = await redis.exists(key);
            if (!exists) {
                await redis.hset(key, {
                    id: profile.id,
                    username: profile.username,
                    email: profile.email,
                    role: profile.role,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (error: any) {
            console.warn('Failed to ensure user profile in Redis:', error.message || error);
        }
    }

    // 2) Save profile and in PostgreSQL (table user_profiles)
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT,
                primary_role TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await pgPool.query(
            `
            INSERT INTO user_profiles (id, username, email, primary_role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
            `,
            [profile.id, profile.username, profile.email, profile.role]
        );
    } catch (error: any) {
        console.warn('Failed to ensure user profile in Postgres:', error.message || error);
    }
}

export async function validateToken(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if token is in blacklist (if Redis is available)
    if (redis) {
        try {
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ error: 'Token revoked' });
            }
        } catch (redisError) {
            console.warn('Redis check failed, continuing without blacklist check');
        }
    }

    // Validate token with Keycloak using userinfo endpoint
    try {
        const response = await axios.get(
            `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
            {
                headers: { Authorization: `Bearer ${token}` },
                validateStatus: (status) => status < 500
            }
        );

        if (response.status === 200) {
            req.user = response.data;
            await ensureUserProfile(req.user);
            next();
        } else {
            // If userinfo fails, try to decode the JWT token for basic verification
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        return res.status(401).json({ error: 'Token expired' });
                    }

                    if (payload.iss && !payload.iss.includes(REALM)) {
                        return res.status(401).json({ error: 'Invalid token realm' });
                    }

                    req.user = {
                        sub: payload.sub,
                        username: payload.preferred_username,
                        email: payload.email,
                        roles: payload.realm_access?.roles || [],
                        ...payload
                    };
                    await ensureUserProfile(req.user);
                    next();
                } else {
                    return res.status(401).json({ error: 'Invalid token format' });
                }
            } catch (decodeError) {
                console.error('Token decode error:', decodeError);
                return res.status(401).json({ error: 'Invalid token' });
            }
        }
    } catch (error: any) {
        console.error('Keycloak validation error:', error.response?.data || error.message);

        // Fallback: try to decode the JWT token directly
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    return res.status(401).json({ error: 'Token expired' });
                }

                req.user = {
                    sub: payload.sub,
                    username: payload.preferred_username,
                    email: payload.email,
                    roles: payload.realm_access?.roles || [],
                    ...payload
                };
                await ensureUserProfile(req.user);
                next();
            } else {
                return res.status(401).json({ error: 'Invalid token' });
            }
        } catch (decodeError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
}

// Function for logout (add token to blacklist)
export async function revokeToken(token: string) {
    if (!redis) {
        console.warn('Redis not available, cannot revoke token');
        return;
    }

    try {
        // Extract expiration from token
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const ttl = payload.exp - Math.floor(Date.now() / 1000);

        if (ttl > 0) {
            await redis.setex(`blacklist:${token}`, ttl, '1');
        }
    } catch (error) {
        console.error('Error revoking token:', error);
    }
}

