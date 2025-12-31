<div align="center">

# 🚀 Workstream Cockpit

### *Never lose context across your parallel initiatives*

**A beautiful, self-hosted productivity tool for engineering managers tracking 15-20 active workstreams**

[Quick Start](#-quick-start) • [Features](#-features) • [Demo](#-screenshots) • [Documentation](#-documentation)

---

</div>

## 🎯 Why Workstream Cockpit?

You're juggling 20 parallel initiatives. Your daily standup is in 5 minutes. You need to know the status of everything, **right now**.

Workstream Cockpit gives you:
- 🔍 **10-second status overview** of all active work
- ⚡ **One-click updates** with visual traffic lights (🟢 🟡 🔴)
- 📊 **Cross-team timeline** for management reporting
- 🎨 **Emoji-tagged categories** for instant visual scanning
- 🔐 **Self-hosted** - your data stays yours

Perfect for engineering managers, team leads, and anyone managing multiple parallel workstreams.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Glanceable Cockpit** | See all active workstreams at a glance with visual status indicators |
| ⚡ **Quick Status Updates** | One-click status changes (green/yellow/red) with optional notes |
| 📊 **Timeline View** | Cross-workstream reporting with lifecycle events for meetings |
| 🏷️ **Smart Tags** | Categorize with custom colors and emojis (� 🎯 🚀 💡) |
| 📜 **Full History** | Complete chronological status history with inline editing |
| 📦 **Archive** | Close completed work, reopen when needed |
| 🔐 **Google OAuth** | Secure single sign-on, automatic setup |
| ⌨️ **Keyboard Shortcuts** | Fast workflows with Cmd/Ctrl+Enter |
| 🎨 **Grouping & Sorting** | Organize by tags, sort by name/date/updates |
| ⚡ **Optimistic UI** | Instant feedback, automatic error recovery |

---

## 🚀 Quick Start

Get up and running in 60 seconds:

```bash
# 1. Clone the repo
git clone https://github.com/raslab/workstream-cockpit.git
cd workstream-cockpit

# 2. Set up Google OAuth (see below for 2-minute setup)
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env and `backend/.env` and `frontend/.env` with your Google credentials and correct URLs

# 3. Launch with Docker
docker compose up -d

# 4. Open and sign in
open http://localhost:3000
```

**That's it!** 🎉 Sign in with Google and start tracking your workstreams.

### 🔑 Quick Google OAuth Setup (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google+ API" 
3. Create OAuth credentials (Web application)
4. Add redirect: `http://localhost:3001/api/auth/google/callback`
5. Copy Client ID & Secret to `backend/.env`

<details>
<summary>📋 Full environment setup</summary>

**Backend** (`backend/.env`):
```bash
DATABASE_URL="postgresql://postgres:postgres@db:5432/workstream_cockpit"
SESSION_SECRET="your-secure-random-secret"
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL="http://localhost:3001"
```
</details>

---

## 📸 Screenshots

> *Coming soon - screenshots of the cockpit view, timeline, and tag management*

---

---

## 🎮 Usage

### First Login
1. Click "Sign in with Google" 
2. ✨ Auto-magic setup creates your workspace with starter tags

### Managing Workstreams

**Create a new workstream:**
```
Cockpit → "New Workstream" → Add name, tag, context → Done!
```

**Quick status update:**
```
Click status circle → Pick 🟢/🟡/🔴 → Add note → Cmd+Enter
```

**View history:**
```
Click workstream name → See full timeline → Edit any update
```

### Tag Organization

Navigate to **Tags** page:
- Create tags with colors and emojis (📊 Engineering, 🎯 Product, 🚀 Launch)
- Tags auto-appear in grouping and filtering
- Can't delete tags still in use (prevents accidents)

### Timeline Reports

Perfect for daily standups and weekly reports:
- Filter by date range
- Filter by specific tags
- Shows workstream lifecycle (created → updates → closed)
- Click any workstream to jump to details

### Keyboard Shortcuts

- `Cmd/Ctrl + Enter` - Save anywhere
- `Esc` - Close dialogs

---

## 🛠️ Tech Stack

**Built with modern, battle-tested tools:**

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite |
| **State** | React Query v4, React Router v6 |
| **Backend** | Node.js 20, Express, TypeScript |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Auth** | Google OAuth 2.0, Passport.js |
| **Testing** | Jest (126 tests), Vitest (21 tests) |
| **Deploy** | Docker Compose, Nginx |

**Test Coverage:** Backend 80%+ | Frontend 70%+

---

## 🚢 Deployment

### Production Docker Deploy

```bash
# Pull latest
git pull origin main

# Build and start
docker compose up -d --build

# Verify
docker compose ps
docker compose logs -f
```

**Data persistence:** PostgreSQL data stored in named volume `workstream-cockpit_postgres-data`

### Development Mode

```bash
# Start database only
docker compose up -d db

# Terminal 1: Backend with hot-reload
cd backend && npm run dev

# Terminal 2: Frontend with hot-reload  
cd frontend && npm run dev
```

Access dev servers:
- Frontend: http://localhost:5173 (Vite)
- Backend: http://localhost:3001
- Database: localhost:5433

### Running Tests

```bash
npm test              # All tests
npm run test:backend  # Backend only
npm run test:frontend # Frontend only
npm run test:coverage # With coverage report
```

---

## 📚 Documentation

<details>
<summary>🏗️ Architecture Overview</summary>

### Database Schema
- **Person** - User accounts (Google OAuth)
- **Project** - Workspace container (1 per user)
- **Tag** - Categories with colors & emojis
- **Workstream** - Tracked initiatives
- **StatusUpdate** - Historical snapshots

### API Endpoints
- `GET /api/auth/google` - OAuth login
- `GET /api/workstreams` - List active workstreams
- `POST /api/status-updates` - Add status
- `GET /api/timeline` - Timeline view
- [Full API docs](docs/DEVELOPMENT.md)

### Frontend Routes
- `/` - Cockpit dashboard
- `/workstreams/:id` - Detail view
- `/timeline` - Timeline report
- `/archive` - Closed workstreams
- `/tags` - Tag management

</details>

<details>
<summary>🐳 Docker Configuration</summary>

**Services:**
- **db** - PostgreSQL 15 (port 5433)
- **backend** - Express API (port 3001)
- **frontend** - React + Nginx (port 3000)

**Volumes:**
- `workstream-cockpit_postgres-data` - Database persistence

**Networks:**
- `workstream-network` - Internal communication

</details>

<details>
<summary>🔧 Environment Variables</summary>

**Backend (.env):**
```bash
DATABASE_URL="postgresql://postgres:postgres@db:5432/workstream_cockpit"
SESSION_SECRET="generate-secure-random-string"
GOOGLE_CLIENT_ID="<from-google-cloud-console>"
GOOGLE_CLIENT_SECRET="<from-google-cloud-console>"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
```

**Frontend (.env):**
```bash
VITE_API_URL="http://localhost:3001"
```

</details>

---

## 🗺️ Roadmap

**✅ Phase 1 Complete** - MVP Core Features
- All 8 user stories shipped
- Production ready
- Full test coverage

**🔮 Future Ideas** (PRs welcome!)
- [ ] Multi-project support
- [ ] Team collaboration & permissions
- [ ] Slack/Discord notifications
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced search & filtering
- [ ] Custom fields
- [ ] Export reports (PDF/CSV)
- [ ] Webhooks & integrations
- [ ] Dark mode 🌙

---

## 🤝 Contributing

We love contributions! Here's how:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Write tests first (we use TDD)
4. Make your changes
5. Ensure tests pass: `npm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

**Development Philosophy:**
- Test-driven development (TDD)
- TypeScript strict mode
- Descriptive commit messages
- Small, focused PRs

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Free to use for personal and commercial projects.

---

## ⭐ Star History

If this project helps you stay organized, give it a star! ⭐

---

## 💬 Support

- 🐛 **Bug reports:** [GitHub Issues](https://github.com/raslab/workstream-cockpit/issues)
- 💡 **Feature requests:** [GitHub Discussions](https://github.com/raslab/workstream-cockpit/discussions)
- 📧 **Email:** [Your contact if you want]

---

<div align="center">

**Built with ❤️ for engineering managers who need to stay on top of everything**

[⬆ Back to Top](#-workstream-cockpit)

</div>
