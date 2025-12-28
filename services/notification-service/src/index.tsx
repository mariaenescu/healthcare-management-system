import express from 'express';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'notification-service'
    });
});

app.get('notifications', (req, res) => {
    res.send("Notifications");
});

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
