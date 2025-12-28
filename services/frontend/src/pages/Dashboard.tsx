import { useState, useEffect } from 'react';
import { KeycloakInstance } from 'keycloak-js';
import axios from 'axios';

interface DashboardProps {
    keycloak: KeycloakInstance;
    onViewProfile: () => void;
}

interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    dateTime: string;
    status: string;
}

function Dashboard({ keycloak, onViewProfile }: DashboardProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/appointments', {
                headers: {
                    Authorization: `Bearer ${keycloak.token}`,
                },
            });
            // Asigură-te că răspunsul este întotdeauna un array
            const data = response.data;
            if (Array.isArray(data)) {
                setAppointments(data);
            } else {
                console.warn('Expected array but got:', data);
                setAppointments([]);
            }
        } catch (error) {
            console.error('Error fetching appointments', error);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        keycloak.logout();
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Healthcare Dashboard</h1>
                <div className="user-info">
                    <span>Welcome, {keycloak.tokenParsed?.preferred_username}</span>
                    <button onClick={onViewProfile} className="secondary-button">
                        Profile
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <section className="appointments-section">
                    <h2>Your Appointments</h2>

                    {loading ? (
                        <p>Loading appointments...</p>
                    ) : appointments.length === 0 ? (
                        <p>No appointments found.</p>
                    ) : (
                        <div className="appointments-grid">
                            {appointments.map((appointment) => (
                                <div key={appointment.id} className="appointment-card">
                                    <h3>Appointment #{appointment.id}</h3>
                                    <p><strong>Date:</strong> {new Date(appointment.dateTime).toLocaleString()}</p>
                                    <p><strong>Doctor ID:</strong> {appointment.doctorId}</p>
                                    <p><strong>Status:</strong> <span className={`status ${appointment.status}`}>{appointment.status}</span></p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="actions-section">
                    <button className="primary-button">Book New Appointment</button>
                </section>
            </main>
        </div>
    );
}

export default Dashboard;