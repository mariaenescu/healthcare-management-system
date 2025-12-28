export function requireRole(allowedRoles: string[]) {
    return (req: any, res: any, next: any) => {
        const user = req.user;

        if (!user || !Array.isArray(user.roles)) {
            return res.status(401).json({ error: 'Unauthenticated or roles not available' });
        }

        const hasRole = user.roles.some((role: string) => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }

        next();
    };
}


