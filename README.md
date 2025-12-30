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

**⚡ Fast Setup**: See [QUICKSTART.md](QUICKSTART.md) for a 5-minute local development setup.

**📖 Detailed Guide**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for comprehensive development guide.

### Quick Setup (3 steps)

1. **Start database**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Install & setup**
   ```bash
   npm install
   cd backend
   npm run prisma:generate
   npm run migrate
   ```

3. **Start servers**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
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
```

### Building for Production

```bash
# Build all
npm run build

# Build backend only
npm run build:backend

# Build frontend only
npm run build:frontend
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

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment instructions.

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
