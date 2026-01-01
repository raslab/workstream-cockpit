# Development Guide - Workstream Cockpit

## Project Status

**Current Phase**: Phase 1 Complete - Infrastructure & Project Setup ✅  
**Branch**: `001-cockpit-core`  
**Implementation Progress**: Foundation ready for development

### Completed Work

✅ **Phase 1.1: Monorepo Structure**
- Created `/backend` and `/frontend` directories
- Set up root `package.json` with workspace configuration
- Configured `.gitignore` for Node.js projects
- Created comprehensive README.md

✅ **Phase 1.2: Backend Foundation**
- Initialized Node.js/TypeScript project with Express.js
- Configured Prisma ORM with PostgreSQL schema
- Set up Jest testing framework
- Created ESLint and Prettier configurations
- Implemented logging utility and error handling middleware
- Created health check endpoint
- Set up database connection utility

✅ **Phase 1.3: Frontend Foundation**
- Initialized React 18 + TypeScript project with Vite
- Configured Tailwind CSS for styling
- Set up React Query for server state management
- Configured React Router for navigation
- Set up Vitest + React Testing Library
- Created placeholder pages (Login, Cockpit, Timeline, Archive)
- Implemented API client with error handling

✅ **Phase 1.4: Docker & Deployment**
- Created Dockerfile for backend
- Created Dockerfile for frontend with nginx
- Created docker-compose.yml orchestrating all services
- Configured nginx reverse proxy for frontend
- Set up environment variable templates

### Database Schema

The Prisma schema defines the following models:

- **Person**: User accounts (Google OAuth)
- **Project**: Workstream groupings  
- **Tag**: Categories with colors
- **Workstream**: Tracked initiatives
- **StatusUpdate**: Status history

## Next Steps

### Immediate Actions (Phase 2)

1. **Install Dependencies**
   ```bash
   # From project root
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   # Copy environment templates
   cp .env.example .env
   
   # Edit .env files with your Google OAuth credentials
   ```

3. **Set Up Google OAuth**
   - Create a Google Cloud Project
   - Enable Google OAuth API
   - Create OAuth 2.0 credentials (client ID and secret)
   - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
   - Copy credentials to `.env` file

4. **Generate Prisma Client**
   ```bash
   cd backend
   npm run prisma:generate
   ```

5. **Create Initial Database Migration**
   ```bash
   cd backend
   npm run migrate
   ```

6. **Start Development Servers**
   ```bash
   # Option 1: Run with Docker
   docker-compose up

   # Option 2: Run locally
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Development Workflow

#### Running Tests

```bash
# All tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Watch mode
cd backend && npm run test:watch
cd frontend && npm run test:watch
```

#### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

#### Database Management

```bash
cd backend

# Create a new migration
npm run migrate

# Reset database
npx prisma migrate reset

# Open Prisma Studio (GUI for database)
npm run prisma:studio
```

## Implementation Roadmap

### Phase 2: Authentication & User Management (Week 2)
- [ ] Implement Google OAuth backend routes
- [ ] Create Person auto-creation on first login
- [ ] Create default Project and Tags on first login
- [ ] Implement session management
- [ ] Add authentication middleware
- [ ] Create Login page with OAuth integration
- [ ] Implement AuthContext for frontend
- [ ] Add data isolation enforcement

### Phase 3: Core Data Management (Weeks 3-5)
- [ ] Create Project CRUD API
- [ ] Create Tag CRUD API with default tags
- [ ] Create Workstream CRUD API
- [ ] Create StatusUpdate CRUD API
- [ ] Implement validation and error handling
- [ ] Write comprehensive tests (80% backend coverage)

### Phase 4: Primary UI Views (Weeks 6-8)
- [ ] Build Cockpit view (read-only)
- [ ] Create StatusUpdateDialog component
- [ ] Implement WorkstreamCreateDialog
- [ ] Build WorkstreamDetail view
- [ ] Create TagManagement UI
- [ ] Add skeleton loading states
- [ ] Write component tests (70% frontend coverage)

### Phase 5: Timeline & Reporting (Weeks 9-10)
- [ ] Create Timeline API endpoint
- [ ] Build Timeline view
- [ ] Implement date range filtering
- [ ] Add tag filtering
- [ ] Create Archive view
- [ ] Implement reopen functionality

### Phase 6: Polish & Testing (Weeks 11-12)
- [ ] Implement retry logic with exponential backoff
- [ ] Performance optimization
- [ ] End-to-end testing
- [ ] Cross-browser testing
- [ ] Documentation updates
- [ ] Production deployment preparation

## Architecture Notes

### Port Configuration

- **Backend**: Internal 3000 → Host 3000
- **Frontend**: Internal 5173 (dev) / 80 (prod) → Host 3001
- **PostgreSQL**: Internal 5432 → Host 5433

### API Structure

```
/health                 - Health check
/auth/google           - OAuth initiation
/auth/google/callback  - OAuth callback
/auth/logout           - Logout
/api/projects          - Project management
/api/tags              - Tag CRUD
/api/workstreams       - Workstream CRUD
/api/status-updates    - Status update CRUD
/api/timeline          - Cross-workstream reporting
```

### Frontend Routes

```
/login                  - Authentication page
/                       - Cockpit view (active workstreams)
/timeline               - Timeline view (reporting)
/archive                - Archived workstreams
```

## Testing Strategy

### Test Coverage Targets

- **Backend Unit Tests**: 80% coverage
- **Backend Integration Tests**: 100% of API endpoints
- **Frontend Component Tests**: 70% coverage
- **E2E Tests**: All critical user flows

### TDD Approach

For each feature:
1. Write failing test first
2. Implement minimal code to pass
3. Refactor for clarity
4. Add edge case tests
5. Document scenarios

## Troubleshooting

### Common Issues

**Dependencies Not Installing**
```bash
# Clear caches and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
rm package-lock.json backend/package-lock.json frontend/package-lock.json
npm install
```

**Prisma Client Not Generated**
```bash
cd backend
npm run prisma:generate
```

**Database Connection Failed**
- Ensure PostgreSQL is running (Docker or local)
- Check `DATABASE_URL` in `.env`
- Verify port 5433 is not in use

**TypeScript Errors**
- Run `npm install` in both backend and frontend
- Ensure dependencies are installed
- Check tsconfig.json configurations

**Docker Issues**
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## Contributing

1. Follow the task breakdown in `specs/001-cockpit-core/tasks.md`
2. Write tests first (TDD)
3. Ensure all tests pass before committing
4. Follow ESLint and Prettier configurations
5. Update documentation as needed

## Support

For questions or issues:
- Check this guide first
- Review the spec in `specs/001-cockpit-core/spec.md`
- Check the plan in `specs/001-cockpit-core/plan.md`
- Review task breakdown in `specs/001-cockpit-core/tasks.md`
