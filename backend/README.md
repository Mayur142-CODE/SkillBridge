# SkillBridge — Backend API

Node.js + Express backend service for the **SkillBridge** Academia–Industry Collaboration Platform.

## Architecture

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens) with role-based access control
- **Security & Cross-Origin**: CORS configured for Vite frontend (`http://localhost:5173`)
- **Data Layer**: In-memory extensible schema store with pre-seeded models (Students, Industry, Faculty, Institutions, Opportunities, Skills)

## Folder Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── data/
│   │   └── mockDatabase.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── opportunities.routes.js
│   │   ├── skills.routes.js
│   │   └── users.routes.js
│   └── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Available API Endpoints

### System & Health
- `GET /api/health` — Service healthcheck

### Authentication & Registration
- `POST /api/auth/login` — User login & JWT issuance
- `POST /api/auth/register/student` — Multi-step student registration
- `POST /api/auth/register/industry` — Industry / company registration
- `POST /api/auth/register/faculty` — Faculty / academician registration
- `POST /api/auth/register/institution` — Higher education institution registration
- `POST /api/auth/forgot-password` — Password reset link request
- `POST /api/auth/reset-password` — Password update with token
- `GET  /api/auth/me` — Current authenticated user profile (Requires Bearer token)

### Opportunities & Matching
- `GET  /api/opportunities` — List active opportunities (supports `?type=` and `?search=`)
- `GET  /api/opportunities/:id` — Specific opportunity details
- `POST /api/opportunities` — Create new opportunity (Industry)

### Skills & Assessments
- `GET  /api/skills` — Categorized skills catalog
- `POST /api/skills/assess` — Skill evaluation & readiness scoring

### Profiles & Portfolios
- `GET  /api/users/portfolio/:username` — Verified digital portfolio profile

## Quick Start

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Start development server with auto-reload
npm run dev
# Or production start
npm start
```
