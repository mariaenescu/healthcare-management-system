import { KeycloakInstance } from 'keycloak-js';

interface LoginProps {
    keycloak: KeycloakInstance;
}

function Login({ keycloak }: LoginProps) {
    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Healthcare Appointment System</h1>
                <p>Manage your appointments with ease</p>
                <button
                    className="login-button"
                    onClick={() => keycloak.login()}
                >
                    Sign In with Keycloak
                </button>
            </div>
        </div>
    );
}

export default Login;