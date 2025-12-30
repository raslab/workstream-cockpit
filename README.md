# Workstream Cockpit

A personal productivity tool for tracking active workstreams with status history. Designed for engineering managers who need to maintain context across 15-20 parallel initiatives and report status quickly in meetings.

## Features

- **Glanceable Cockpit View**: Scan all active workstreams in 10 seconds
- **Minimal Friction Status Updates**: Click → type → save workflow
- **Timeline View**: Cross-workstream reporting for meetings
- **Tag Management**: Categorize workstreams with color-coded tags
- **Google OAuth**: Secure authentication with Google accounts
- **Status History**: Complete historical tracking for each workstream

## Tech Stack

### Backend
- Node.js 20+ with TypeScript
- Express.js framework
- Prisma ORM with PostgreSQL
- Google OAuth 2.0
- Jest for testing

### Frontend
- React 18+ with TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Query for server state
- React Router for navigation
- Vitest + React Testing Library

### Infrastructure
- Docker containers
- PostgreSQL 15 database
- Nginx reverse proxy
- Docker Compose orchestration

## Project Structure

```
workstream-cockpit/
├── backend/           # Node.js/TypeScript backend
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── models/    # Data models
│   │   └── middleware/# Express middleware
│   ├── tests/         # Backend tests
│   └── prisma/        # Database schema & migrations
├── frontend/          # React/TypeScript frontend
│   ├── src/
│   │   ├── components/# Reusable components
│   │   ├── pages/     # Page components
│   │   ├── hooks/     # Custom hooks
│   │   ├── api/       # API client
│   │   └── contexts/  # React contexts
│   └── tests/         # Frontend tests
├── docker-compose.yml # Docker orchestration
└── docs/              # Documentation
```

## Project Status

**Current Phase**: Phase 1 Complete - Infrastructure & Project Setup ✅  
**Branch**: `001-cockpit-core`  
**Next Phase**: Phase 2 - Authentication & User Management

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development guide.

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine
- Node.js 20+
- Google OAuth credentials (for authentication features)

### Setup & Run

1. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd workstream-cockpit
   cp .env.example .env
   # Edit .env with your Google OAuth credentials
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

That's it! The application will be available at:
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Database**: localhost:5433

### Development Mode (Local)

For faster development with hot-reload:

```bash
# Start database only
docker-compose up -d postgres

# Install dependencies
npm install

# Terminal 1: Backend (with auto-reload)
cd backend && npm run dev

# Terminal 2: Frontend (with hot-reload)
cd frontend && npm run dev
```

Access:
- Frontend: http://localhost:3002
- Backend: http://localhost:3001
- Database: localhost:5433

### Running Tests

```bash
# All tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# With coverage
npm run test:coverage
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View service status
docker-compose ps
```

## Development Workflow

This project follows Test-Driven Development (TDD):
1. Write failing test first
2. Implement minimal code to pass test
3. Refactor for clarity and performance
4. Add edge case tests
5. Document test scenarios

## Architecture

### Database Schema

- **Person**: User accounts (linked to Google OAuth)
- **Project**: Logical grouping of workstreams
- **Tag**: Categories with colors for workstreams
- **Workstream**: Ongoing initiatives being tracked
- **StatusUpdate**: Point-in-time status snapshots

### API Endpoints

- `/auth/*` - Authentication (Google OAuth)
- `/api/projects` - Project management
- `/api/tags` - Tag CRUD operations
- `/api/workstreams` - Workstream management
- `/api/status-updates` - Status update operations
- `/api/timeline` - Cross-workstream reporting

## Ports

- **3002**: Frontend (React app via nginx)
- **3001**: Backend API (Express.js)
- **5433**: PostgreSQL database

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/workstream_cockpit"
SESSION_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"

# Frontend
VITE_API_URL="http://localhost:3001"
```

## Contributing

1. Create a feature branch from `main`
2. Follow the task breakdown in `specs/001-cockpit-core/tasks.md`
3. Write tests first (TDD)
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please use the GitHub issue tracker.
