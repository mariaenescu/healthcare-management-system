import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'appointment-service'
    });
});

// Routes will be added here
app.get('/appointment', (req, res
) => {
    res.send("Creating appointment");
});

app.get('/list', (req, res) => {
    // Return an array of appointments (mock data for now)
    res.json([
        {
            id: '1',
            patientId: 'patient1',
            doctorId: 'doctor1',
            dateTime: new Date().toISOString(),
            status: 'scheduled'
        },
        {
            id: '2',
            patientId: 'patient1',
            doctorId: 'doctor1',
            dateTime: new Date(Date.now() + 86400000).toISOString(),
            status: 'confirmed'
        }
    ]);
});

app.listen(PORT, () => {
    console.log(`Appointment Service running on port ${PORT}`);
});
