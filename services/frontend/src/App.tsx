import { useEffect, useState } from 'react';
import Keycloak from 'keycloak-js';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';

const keycloak = new Keycloak({
    url: 'http://localhost:8080',
    realm: 'healthcare',
    clientId: 'healthcare-web',
});

type View = 'dashboard' | 'profile';

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>('dashboard');

    useEffect(() => {
        keycloak
            .init({ onLoad: 'check-sso' })
            .then((auth) => {
                setAuthenticated(auth);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Keycloak init failed', error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (!authenticated) {
        return (
            <div className="app">
                <Login keycloak={keycloak} />
            </div>
        );
    }

    return (
        <div className="app">
            {view === 'dashboard' ? (
                <Dashboard
                    keycloak={keycloak}
                    onViewProfile={() => setView('profile')}
                />
            ) : (
                <Profile
                    keycloak={keycloak}
                    onBackToDashboard={() => setView('dashboard')}
                />
            )}
        </div>
    );
}

export default App;
