import express, { Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import axios from 'axios';
import { validateToken } from './middleware/auth';
import { distributedRateLimit } from './middleware/rateLimiter';
import { requireRole } from './middleware/roles';

const app = express();
const PORT = process.env.PORT || 3000;
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3001';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});

// Current user profile (read from Redis / created automatically on first login in the auth middleware)
app.get('/api/profile', validateToken, distributedRateLimit, (req: Request & { user?: any }, res) => {
    const user = req.user || {};
    res.json({
        id: user.sub,
        username: user.preferred_username || user.username,
        email: user.email,
        roles: user.roles || []
    });
});

// Access for patient / doctor / admin
app.get('/api/appointments', validateToken, distributedRateLimit, requireRole(['patient', 'doctor', 'admin']),
    async (req, res) => {
        try {
            // Proxy request către appointment-service
            const response = await axios.get(`${APPOINTMENT_SERVICE_URL}/list`, {
                headers: {
                    Authorization: req.headers.authorization
                }
            });
            const data = response.data;
            if (Array.isArray(data)) {
                res.json(data);
            } else {
                console.warn('Appointment service returned non-array:', data);
                res.json([]);
            }
        } catch (error: any) {
            console.error('Error fetching appointments:', error.message);
            res.status(error.response?.status || 500).json({
                error: error.message || 'Failed to fetch appointments'
            });
        }
    }
);

app.get('/api-notifications', (req, res) => {
    res.json({ res: 'Notification Service' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});

