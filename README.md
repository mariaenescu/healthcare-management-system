# Healthcare Appointment Management System

##  Documentation - Enescu Maria 341C3

### 1. Introduction

Web platform for managing medical appointments with centralized authentication, automated notifications, and real-time bookings, built on a microservices architecture. Key capabilities:
- Single Sign-On via Keycloak
- Role-based access: Patient, Doctor, Administrator
- Real-time bookings
- Automated notifications
- Scalability through container orchestration

### 2. Architecture

Distributed microservices, containerized with Docker and orchestrated with Docker Swarm (prod) / Docker Compose (local):
- SSO via Keycloak with Patient, Doctor, Admin roles
- API Gateway for routing, authentication, and rate limiting
- Redis for distributed rate limiting, queueing between Appointment and Notification services, and temporary token storage
- Appointment Service uses a read-only replica for analytical queries
- Notification Service sends automatic notifications on create/update of appointments (email/push)
- Real-time scheduling
- Frontend: React + Vite + TypeScript

### 3. Project structure

Independent services (gateway, functional services, and web UI), each with its own configuration and dependencies. See Project Structure for directory details.

### 4. Features

1) Authentication Module (SSO)
- Users log into Keycloak
- System receives a JWT token
- API Gateway validates the token and extracts the role

2) User & Role Management Module
- Automatic profile creation on first login
- 3 roles: patient, doctor, admin, each with distinct API permissions

3) Appointment Management Module
- Patient can view doctors’ availability and create/update/cancel an appointment
- Doctor sees their own appointments
- Admin can view all appointments
- Conflict checks: a doctor cannot have overlapping appointments
- REST API for all operations

### 5. Service endpoints

- API Gateway – `http://localhost:3000`
  - Proxy routes to internal services
  - Keycloak token validation
  - Distributed rate limiting
- Appointment Service – `http://localhost:3001`
  - CRUD for appointments
  - Reporting endpoints
- Notification Service – `http://localhost:3002`
  - Handles notifications related to appointments
- Frontend – `http://localhost:8086`
  - Secure UI access to platform features

### 7. Advanced capabilities

1) Distributed rate limiting with Redis: the API Gateway monitors requests per user over a time window, mitigating abusive traffic; Redis can also temporarily store tokens/notifications.  
2) Reporting via read replica: Appointment Service uses a read-only replica for analytical queries without impacting the primary DB.  
3) Asynchronous notifications: Notification Service sends notifications automatically on appointment changes; inter-service communication is asynchronous (Redis as a queue) and extensible for email/push.

### 8. Key Technologies

- **Language**: Node.js + TypeScript
- **Frontend**: React 19 + Vite
- **Backend**: Express.js microservices
- **Database**: PostgreSQL (master/replica pattern for reporting)
- **Cache/Queue**: Redis
- **Authentication**: Keycloak realm (\`healthcare\`)
- **Orchestration**: Docker Swarm & Docker Compose
- **ORM**: TypeORM
- **Containerization**: Docker

---
##  Architecture

### Services Overview

```text
┌───────────────────────────┐
│        Frontend           │
│  (React + Vite, Nginx)    │
└─────────────▲─────────────┘
│ HTTP
│
┌─────────────┴─────────────┐
│       API Gateway          │
│  (Express, Auth, RateLim.) │
└───────▲───────────▲───────┘
│           │
│           │
┌──────┴──────┐ ┌──┴─────────────────┐
│ Appointment │ │   Notification      │
│  Service    │ │     Service         │
│ (TypeORM)   │ │ (Email/SMS/etc.)    │
└──────▲──────┘ └──────────▲─────────┘
│                    │
│                    │
┌────┴────┐          ┌────┴────┐
│Postgres │          │  Redis  │
└─────────┘          └─────────┘

        ┌───────────────────────────┐
        │         Keycloak          │
        │   (Auth & RBAC realm)     │
        └───────────────────────────┘
```

## Project Structure

```text
.
├── scan-project.sh          # Convenience script to print project tree, excluding node_modules/.git/.idea
├── README.md
├── .gitignore
├── package.json             # Root scripts, tooling, shared dev dependencies
├── docker-compose.yml       # Local multi-service environment
├── docker-stack.yml         # Swarm stack definition
├── keycloak
│   └── realm-export.json    # Keycloak realm configuration (healthcare)
└── services
  ├── api-gateway
  │   ├── Dockerfile
  │   ├── package.json
  │   ├── tsconfig.json
  │   └── src
  │       ├── index.ts     # Entry point, service wiring
  │       └── middleware
  │           ├── auth.ts  # Keycloak token validation
  │           └── rateLimiter.ts # Redis-based distributed rate limiting
  │
  ├── appointment-service
  │   ├── Dockerfile
  │   ├── package.json
  │   ├── tsconfig.json
  │   └── src
  │       ├── index.ts     # Main service, routes, DB connection
  │       ├── reports.ts   # Read-heavy reports using replica connection
  │       └── entities
  │           └── Appointment.ts
  │
  ├── notification-service
  │   ├── Dockerfile
  │   ├── package.json
  │   ├── tsconfig.json
  │   └── src
  │       └── index.tsx    # Notification worker/service entry
  │
  └── frontend
```
## Quick Start (Docker Compose)

From the project root:

1. Build and start all services:
   ```bash
   docker-compose up --build
   ```

2. Once started, access:
    - Frontend: \`http://localhost:8086\`
    - API Gateway: \`http://localhost:3000\`
    - Keycloak Admin: \`http://localhost:8080/admin/\`
    - Appointment Service (direct): \`http://localhost:3001\`
    - Notification Service (direct): \`http://localhost:3002\`

3. Stop all services:
   ```bash
   docker-compose down
   ```

---

## Quick Start (Docker Swarm)

1. Initialize Swarm (if not already):
   ```bash
   docker swarm init
   ```

2. Deploy the stack (example stack name: \`healthcare\`):
   ```bash
   docker stack deploy -c docker-stack.yml healthcare
   ```

3. Check running services:
   ```bash
   docker stack services healthcare
   ```

4. Remove the stack:
   ```bash
   docker stack rm healthcare
   ```
---

## Development Workflow

### 1. Install dependencies (per service)

From each service directory:

- API Gateway:
  ```bash
  cd services/api-gateway
  npm install
  ```

- Appointment Service:
  ```bash
  cd services/appointment-service
  npm install
  ```

- Notification Service:
  ```bash
  cd services/notification-service
  npm install
  ```

- Frontend:
  ```bash
  cd services/frontend
  npm install
  ```

### 2. Local development (example pattern)

Each service is a separate Node/TypeScript project. Typical scripts (check each \`package.json\`):

- Start in dev mode:
  ```bash
  npm run dev
  ```

- Build:
  ```bash
  npm run build
  ```

- Lint / test (if configured):
  ```bash
  npm run lint
  npm test
  ```

You can run services individually if you want to debug without running the full Docker stack.

---

## Keycloak Setup

Keycloak is configured using a realm export located at:

- \`keycloak/realm-export.json\`

Basic notes:

- Realm name: \`healthcare\`
- Contains client(s) such as:
    - \`healthcare-api\` (for backend/API access)
- Typical setup:
    - Create a Keycloak container with this realm imported (compose/stack should handle this).
    - Use tokens from this realm in the Authorization header:
        - \`Authorization: Bearer <access_token>\`

The API gateway middleware is expected to:

- Validate tokens by calling Keycloak
- Enforce role-based access for protected routes

---

## Docker Swarm Commands

For reference when using \`docker-stack.yml\`:

- Deploy stack:
  ```bash
  docker stack deploy -c docker-stack.yml healthcare
  ```

- List stacks:
  ```bash
  docker stack ls
  ```

- List services of a stack:
  ```bash
  docker stack services healthcare
  ```

- Inspect service:
  ```bash
  docker service inspect <service_name>
  ```

- View logs:
  ```bash
  docker service logs -f <service_name>
  ```

- Remove stack:
  ```bash
  docker stack rm healthcare
  ```

---

## Docker Compose Commands

Using \`docker-compose.yml\`:

- Build and start:
  ```bash
  docker-compose up --build
  ```

- Start in detached mode:
  ```bash
  docker-compose up -d
  ```

- Stop:
  ```bash
  docker-compose down
  ```

- View logs:
  ```bash
  docker-compose logs -f
  ```

- Rebuild a specific service:
  ```bash
  docker-compose up -d --build <service_name>
  ```
---