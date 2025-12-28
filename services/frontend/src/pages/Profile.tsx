import { useEffect, useState } from 'react';
import { KeycloakInstance } from 'keycloak-js';
import axios from 'axios';

interface ProfileProps {
    keycloak: KeycloakInstance;
    onBackToDashboard: () => void;
}

interface UserProfile {
    id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
}

function Profile({ keycloak, onBackToDashboard }: ProfileProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const tokenParsed: any = keycloak.tokenParsed || {};

            // Profil de bază construit doar din token (fallback sigur)
            const baseProfile: UserProfile = {
                id: tokenParsed.sub,
                username: tokenParsed.preferred_username,
                email: tokenParsed.email,
                firstName: tokenParsed.given_name,
                lastName: tokenParsed.family_name,
                roles: tokenParsed.realm_access?.roles || [],
            };

            try {
                const response = await axios.get('http://localhost:3000/api/profile', {
                    headers: {
                        Authorization: `Bearer ${keycloak.token}`,
                    },
                });

                const data = response.data || {};

                const roles =
                    data.roles ||
                    baseProfile.roles ||
                    tokenParsed.realm_access?.roles ||
                    [];

                setProfile({
                    id: data.id || baseProfile.id,
                    username: data.username || baseProfile.username,
                    email: data.email || baseProfile.email,
                    firstName: baseProfile.firstName,
                    lastName: baseProfile.lastName,
                    roles,
                });
            } catch (err: any) {
                console.error('Error fetching profile', err);
                // Fallback: folosim doar datele din token
                setProfile(baseProfile);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [keycloak]);

    const handleLogout = () => {
        keycloak.logout();
    };

    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }

    if (!profile) {
        return (
            <div className="dashboard">
                <header className="dashboard-header">
                    <h1>User Profile</h1>
                    <div className="user-info">
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </header>
                <main className="dashboard-content">
                    <p>Could not load any profile information.</p>
                    <button className="secondary-button" onClick={onBackToDashboard}>
                        Back to Dashboard
                    </button>
                </main>
            </div>
        );
    }

    const primaryRole = profile.roles[0] || 'patient';

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>User Profile</h1>
                <div className="user-info">
                    <span>Logged in as {profile.username}</span>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <section className="profile-section">
                    <h2>Profile Details</h2>
                    <div className="profile-grid">
                        <div className="profile-row">
                            <span className="profile-label">Username</span>
                            <span className="profile-value">{profile.username}</span>
                        </div>
                        {profile.firstName && (
                            <div className="profile-row">
                                <span className="profile-label">First name</span>
                                <span className="profile-value">{profile.firstName}</span>
                            </div>
                        )}
                        {profile.lastName && (
                            <div className="profile-row">
                                <span className="profile-label">Last name</span>
                                <span className="profile-value">{profile.lastName}</span>
                            </div>
                        )}
                        {profile.email && (
                            <div className="profile-row">
                                <span className="profile-label">Email</span>
                                <span className="profile-value">{profile.email}</span>
                            </div>
                        )}
                        <div className="profile-row">
                            <span className="profile-label">Primary role</span>
                            <span className="profile-chip">{primaryRole}</span>
                        </div>
                        {profile.roles.length > 1 && (
                            <div className="profile-row">
                                <span className="profile-label">All roles</span>
                                <span className="profile-value">
                                    {profile.roles.join(', ')}
                                </span>
                            </div>
                        )}
                        <div className="profile-row">
                            <span className="profile-label">User ID</span>
                            <span className="profile-value profile-id">
                                {profile.id}
                            </span>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button className="secondary-button" onClick={onBackToDashboard}>
                            Back to Dashboard
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Profile;


