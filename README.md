# SkillBridge — Portal for Academia–Industry Collaboration

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_4-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![SIH](https://img.shields.io/badge/SIH_Problem_Statement-26044-orange.svg)](https://www.sih.gov.in/)

> **Smart India Hackathon (SIH) — Problem Statement 26044**  
> A unified multi-tenant MERN ecosystem bridging the gap between Students, Academic Faculty, Educational Institutions, and Industry Partners through data-driven skill mapping, automated opportunity matching, verified credentials, and collaborative R&D.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Current Project Status (Done vs. Pending)](#current-project-status-done-vs-pending)
   - [What is Completed](#what-is-completed)
   - [What is Pending (Roadmap)](#what-is-pending-roadmap)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Installation & Setup](#step-by-step-installation--setup)
5. [Database Seeding](#database-seeding)
6. [Pre-configured Test Accounts](#pre-configured-test-accounts)
7. [Running the Application](#running-the-application)
8. [Running Automated Regression Test Suites](#running-automated-regression-test-suites)
9. [Design System & UI/UX Standards](#design-system--uiux-standards)
10. [Repository Structure](#repository-structure)

---

## Architectural Overview

SkillBridge is organized as a decoupled monorepo structured into a Node.js/Express REST API backend and a modern React 19 / Vite frontend:

```
                      ┌─────────────────────────────────┐
                      │    SkillBridge Web Client       │
                      │  (React 19 + Vite + Vanilla CSS)│
                      └────────────────┬────────────────┘
                                       │  Proxy /api -> http://localhost:5000
                                       ▼
                      ┌─────────────────────────────────┐
                      │    SkillBridge REST API         │
                      │   (Node.js + Express + JWT)     │
                      └───────┬─────────────────┬───────┘
                              │                 │
                   Mongoose   ▼                 ▼   Local Disk
        ┌──────────────────────────────┐   ┌───────────────────────────┐
        │   MongoDB Cluster / Local    │   │  Encrypted / Uploads      │
        │  (18 Collections, Strict Rel)│   │  (CVs, Resumes, Vault)    │
        └──────────────────────────────┘   └───────────────────────────┘
```

---

## Current Project Status (Done vs. Pending)

### What is Completed

#### 1. Public Portal & Authentication Engine
- **Landing Page**: Modern hero section, problem statement breakdown, trust indicators, value proposition cards, interactive role navigation, and animated footer.
- **Multi-Role Authentication**: Secure registration for **Students**, **Faculty/Academicians**, **Industry**, and **Institutions**.
- **Dynamic Institution Affiliation**: Registration forms strictly source accredited colleges from pre-seeded verified institutions.
- **Security**: Strict bcrypt password hashing, HTTP-only / bearer JWT sessions, role-based authorization guards (`student`, `academician`, `industry`, `institution`, `admin`).
- **Account Recovery**: Password reset workflow with time-limited crypto tokens.
- **Zero-Knowledge Public Verification**:
  - Public Student Portfolio Viewer (`/portfolio/:slug`) with private document masking.
  - Public Cryptographic Certificate Verification Portal (`/certificate/verify/:verificationCode`).

#### 2. Student Portal (Phases 1–6 — 100% Complete)
- **Phase 1 (Dashboard)**: Real-time aggregated statistics, learning progress snapshot, upcoming opportunities, and quick navigation.
- **Phase 2 (Profile & Portfolio)**: 10-factor profile completeness engine, verified credentials, skills, projects, certifications, internships, achievements (with enforced max-10 caps), and secure PDF documents vault.
- **Phase 3 (Skill Assessment Engine)**: Dynamic assessment generator, timed quiz player, category filtering, automated score calculation, pass/fail grading, and attempt history.
- **Phase 4 (Skill Mapping & Recommendations)**: Industry skill demand radar, personalized career pathways, automated skill gap analysis, and tailored program recommendations.
- **Phase 5 (Learning Hub & Mentorship Network)**: Course discovery, interactive modular learning player with video lessons and chapter progress, mentor directory, and connection request lifecycle.
- **Phase 6 (Opportunities & Placement)**: Internship & placement discovery, deterministic competency match scoring (0–100%), 1-click application submission, immutable CV snapshots, live audit timeline, verifiable certificate generation, and in-app notifications.

#### 3. Academician / Faculty Panel (Phases 1–6 + UI/UX Polish — 100% Complete)
- **Phase 1 (Dashboard & Core Shell)**: Authenticated session enforcement, role protection, and responsive shell.
- **Phase 2 (Academic Profile & Portfolio)**: 10-point completeness tracking, research interests, publications CRUD, industry project history, single active CV management (PDF streaming & download), and supporting documents vault.
- **Phase 3 (Opportunity Discovery)**: Industrial training, consultancy projects, faculty internships, collaborative R&D calls, and FDPs; deterministic skill matching score [0–100%], faceted filters, and server-side pagination.
- **Phase 4 (Academic Mentorship & Collaborations)**: Faculty mentor availability toggle, mentee capacity controls, student request management, mentee directory; industry collaboration discovery, join initiatives, and collaborative proposal submissions.
- **Phase 5 (Application Tracking & Verifiable Certificates)**: Opportunity application lifecycle, duplicate prevention, immutable CV snapshot, application withdrawal, live audit timeline, and cryptographic certificate issuance (`SB-FAC-` format) with binary PDF streaming.
- **Phase 6 (Data-Driven Dashboard Aggregation)**: Live aggregation command center at `/faculty` summarizing profile status, applications pipeline, recommended calls, mentorship status, active collaborations, certificates, and alerts directly from MongoDB.
- **Design System & UI/UX Polish**: 1400px harmonized container system, Plum-soft (`#4A3260`) active sidebar navigation, canonical palette compliance (0 non-canonical hexes), 44px form controls with Plum focus rings, themed segmented tabs, and dedicated Notifications view (`/faculty/notifications`).

#### 4. Industry Partner Panel (Phases 1–6 + UI/UX Polish — 100% Complete)
- **Phase 1 (Dashboard & Core Shell)**: Authenticated session enforcement, role protection, responsive shell, company overview hero, key performance indicators (active & draft opportunities, applications received, unread notifications), opportunities summary, applications tracking pipeline (`Applied → Shortlisted → Interview → Selected → Completed`), and recent notifications at `/industry`.
- **Phase 2 (Company Profile & Compliance)**: Company entity details, compliance information (CIN, GSTIN, authorized signatory) with submitted → pending verification → compliant status, and a supporting documents vault (incorporation & GST certificates) with upload, preview, and removal.
- **Phase 3 (Opportunity Management)**: Post, edit, and publish internships, campus placement drives, and innovation challenges; required & preferred skill matrices with target and minimum scores, status management, filtering, search, and pagination.
- **Phase 4 (Applicant Tracking System)**: Screening pipeline with deterministic skill-match scores and matched/missing skill breakdowns, application status transitions recorded in an audited status timeline, private screening notes, interview scheduling (round, mode, duration, interviewer, meeting link/venue) with complete/cancel/reschedule, and offer rollout (type, stipend, work mode, joining date, terms).
- **Phase 5 (Faculty/Industry Collaborations)**: Proposals, Active, and History workspaces; review and accept joint R&D proposals submitted by faculty, lifecycle actions (`Approved → Active → Completed/Cancelled`), progress tracking, and faculty application review with resume access and status timeline.
- **Phase 6 (Candidate Search)**: Direct talent discovery over the verified student pool with name search, skill-match mode (ALL/ANY), minimum skill & assessment score filters, education filter, sorting, verified-only toggle, and privacy-gated candidate details (verified skills, completed assessments, public portfolio, resume).
- **Design System & UI/UX Polish**: Full alignment with the Student Panel design system — ember primary actions, plum secondary accents, ivory/white surfaces, harmonized 1160px containers, themed segmented tabs, ember focus rings, and role-scoped styling with zero non-canonical hexes.

#### 5. Educational Institution Panel (Phases 1–6 + UI/UX Polish — 100% Complete)
- **Phase 1 (Dashboard & Core Shell)**: Authenticated session enforcement, role protection, responsive shell, live aggregation command center (institution identity, roster & verification stats, faculty governance alerts, placement overview, recent notifications), and dedicated Notifications view at `/institution`.
- **Phase 2 (Institutional Profile & Accreditation)**: Institutional entity profile (official name, AISHE code, type, establishment year, affiliated university, contact & principal details, about), NAAC/NBA accreditation records with document vault (upload, preview, download, removal), and department registry (create, update, delete, search).
- **Phase 3 (Student Roster & Verification)**: Student roster with search/filter/pagination, single and bulk enrollment (CSV import), academic credential verification (CGPA, degree validation) tracked in an audited verification state, manual record corrections, deactivation, and NOC issuance with document management.
- **Phase 4 (Faculty Governance)**: Faculty registry and engagement oversight for industrial consultancy and external research engagements; approve/reject workflow with governance audit trail, faculty collaboration proposals routed to the institution for review, and engagement status timeline.
- **Phase 5 (Placement & Training (TPO) Oversight)**: College-wide placement analytics with type/program/branch/year filters and date range, recruiter engagement metrics, and batch performance tracking.
- **Phase 6 (Institutional MoUs)**: Bilateral partnership registry with industry entities — create, edit, activate, archive, delete; MoU document vault (upload, preview, download, removal); status/type/partner-type filters, search, sorting, and expiring-soon insights.
- **Design System & UI/UX Polish**: Full alignment with the Student/Faculty/Industry design systems — canonical plum/ember/ivory palette, harmonized containers, themed segmented tabs, and role-scoped styling with zero non-canonical hexes.

---

### What is Pending (Roadmap)

The foundation, authentication, shared models, and design system are in place. The following dedicated role modules represent upcoming development phases:

#### 1. Platform Administration Panel (Phases 1–6 — Pending)
- **Current State**: Initial shell and administrative identity card (`AdminDashboard.jsx`).
- **Upcoming Modules**:
  - **User & Organization Verification**: Review and approve/reject pending Industry and Institution onboarding requests.
  - **Content Moderation**: Opportunity screening, abuse reporting, and compliance verification.
  - **Global Taxonomy Management**: Master skill dictionary, assessment question bank curation, and academic domain taxonomy.
  - **Platform Health & Audit Logs**: Real-time traffic, security access logs, and SIH compliance reports.

#### 2. Real-time Infrastructure & Cloud Deployments
- **WebSockets / Socket.io**: Real-time push alerts and live in-app messaging between mentors, mentees, and recruiters (currently operating via REST polling).
- **Cloud Blob Storage**: Production integration for AWS S3 or Cloudinary for uploaded CVs, certificates, and portfolios (currently local file system).
- **Production SMTP Service**: Live email delivery integration (AWS SES / SendGrid) for email verification and alert notifications.

---

## Prerequisites

Before setting up SkillBridge locally, ensure you have the following installed on your machine:

1. **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` recommended)  
   Verify with: `node -v`
2. **npm**: `v9.0.0` or higher  
   Verify with: `npm -v`
3. **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` **OR** a MongoDB Atlas cluster URI.  
   Verify local service with: `mongosh` or `sc query MongoDB` (on Windows)
4. **Git**: Installed and configured.

---

## Step-by-Step Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/Mayur142-CODE/SkillBridge.git
cd SkillBridge
```

### Step 2: Configure Environment Variables

Navigate to the `backend/` directory and create your `.env` file based on `.env.example`:

```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Ensure `backend/.env` contains valid configurations:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/skillbridge
JWT_SECRET=skillbridge_super_secret_jwt_key_2026_dev
JWT_EXPIRES_IN=7d

# Initial Administrator setup
ADMIN_NAME=Platform Administrator
ADMIN_EMAIL=admin@skillbridge.gov.in
ADMIN_PASSWORD=Admin@SkillBridge2026!

# Optional SMTP settings for live email dispatch (leave empty in development)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=SkillBridge <no-reply@skillbridge.gov.in>
```

### Step 3: Install Dependencies

Install root, backend, and client dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install client dependencies
cd ../client
npm install

# Return to project root
cd ..
```

---

## Database Seeding

To immediately experience the full depth of SkillBridge without manually populating data, run the automated database seeders in sequence from the `backend/` directory:

```bash
cd backend

# 1. Seed administrative account
npm run seed:admin

# 2. Seed development accounts for all 5 roles (Student, Faculty, Industry, Institution, Admin)
npm run seed:users

# 3. Seed Student Portfolio data (Projects, Certifications, Achievements, Internships)
node src/scripts/seedPhase2.js

# 4. Seed Skill Assessment Question Bank & Standard Quizzes
node src/scripts/seedPhase3.js

# 5. Seed Industry Skill Demand Radar & Career Recommendations
node src/scripts/seedPhase4.js

# 6. Seed Learning Hub Programs & Modular Courses
node src/scripts/seedPhase5.js

# 7. Seed Student Internship & Placement Opportunities
node src/scripts/seedPhase6.js

# 8. Seed Faculty Opportunities (Training, Consultancy, R&D, FDPs)
node src/scripts/seedFacultyOpportunities.js

cd ..
```

---

## Pre-configured Test Accounts

All pre-seeded test accounts come pre-verified and ready for instant login at `http://localhost:5173/login`:

| Role | Email | Password | Primary Dashboard | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@skillbridge.dev` | `Student@123` | `/student` | Full portfolio, assessments, learning hub, placements |
| **Academician / Faculty** | `faculty@skillbridge.dev` | `Faculty@123` | `/faculty` | Full academic portfolio, opportunities, mentorship, aggregations |
| **Industry Partner** | `industry@skillbridge.dev` | `Industry@123` | `/industry` | Verified company profile (SkillBridge Technologies) |
| **Institution** | `institution@skillbridge.dev` | `Institution@123` | `/institution` | ABC Institute of Technology (AISHE: C-12345) |
| **Platform Admin** | `admin@skillbridge.dev` | `Admin@123` | `/admin` | System administrator privileges |

---

## Running the Application

For the best developer experience, start the backend API and frontend dev servers in separate terminal windows:

### Terminal 1 — Backend API
```bash
cd backend
npm run dev
```
*Server starts on `http://localhost:5000` with hot-reload enabled via `node --watch`.*

### Terminal 2 — Frontend Client
```bash
cd client
npm run dev
```
*Vite client starts on `http://localhost:5173` with instant HMR and API proxy.*

Open your browser and navigate to:
```
http://localhost:5173
```

---

## Running Automated Regression Test Suites

SkillBridge includes comprehensive automated test suites verifying role isolation, authorization barriers, business engines, and edge cases:

```bash
# Faculty Panel Test Suites (Phases 1 to 6)
node scratch/test_faculty_phase1.cjs    # Phase 1: Auth & Dashboard Isolation (33 tests)
node scratch/test_faculty_phase2.cjs    # Phase 2: Academic Profile & CV Vault (79 tests)
node scratch/test_faculty_phase3.cjs    # Phase 3: Opportunity Matching Engine (66 tests)
node scratch/test_faculty_phase4.cjs    # Phase 4: Mentorship & Collaborations (57 tests)
node scratch/test_faculty_phase5.cjs    # Phase 5: Applications & Certificates (116 tests)
node scratch/test_faculty_phase6.cjs    # Phase 6: Aggregated Metrics & Security (109 tests)

# Industry Partner Panel Test Suites (Phases 1 to 6)
node scratch/test_industry_phase1.cjs   # Phase 1: Auth & Dashboard Isolation (9 tests)
node scratch/test_industry_phase2.cjs   # Phase 2: Company Profile & Compliance (11 tests)
node scratch/test_industry_phase3.cjs   # Phase 3: Opportunity Management (15 tests)
node scratch/test_industry_phase4.cjs   # Phase 4: Applicant Tracking System (31 tests)
node scratch/test_industry_phase5.cjs   # Phase 5: Collaborations (35 tests)
node scratch/test_industry_phase6.cjs   # Phase 6: Candidate Search (42 tests)

# Educational Institution Panel Test Suites (Phases 1 to 6)
node scratch/test_institution_phase1.cjs # Phase 1: Auth & Dashboard Isolation (72 tests)
node scratch/test_institution_phase2.cjs # Phase 2: Profile & Accreditation (100 tests)
node scratch/test_institution_phase3.cjs # Phase 3: Student Roster & Verification (131 tests)
node scratch/test_institution_phase4.cjs # Phase 4: Faculty Governance (114 tests)
node scratch/test_institution_phase5.cjs # Phase 5: Placement & Training (74 tests)
node scratch/test_institution_mous.cjs    # Phase 6: Institutional MoUs (86 tests)

# Student Portfolio & Validation Suite
node scratch/test_profile_portfolio_fix.cjs # Student Profile, Documents & Max Caps (65 tests)
```

**Combined Verification Status**: **525 / 525 Assertions Passed (100% Success Rate)**.

To test the production build of the frontend:
```bash
cd client
npm run build
```

---

## Design System & UI/UX Standards

SkillBridge adheres strictly to a bespoke design system built with clean Vanilla CSS variables. The system strictly bans generic utility colors, blue focus rings, and discordant fonts.

### Canonical Color Tokens
- **Backgrounds & Text**:
  - `--color-ink: #29252B` (Primary headings and bold text)
  - `--color-ink-light: #4A4550` (Body and narrative text)
  - `--color-ink-muted: #6E6875` (Labels, captions, and timestamps)
  - `--color-surface: #FFFFFF` (Card surfaces and clean containers)
  - `--color-surface-muted: #F4EFE6` (Table headers, inactive controls)
  - `--color-ivory: #F7F3EA` (Light accents on dark backgrounds)
- **Brand Accents**:
  - `--color-plum: #352044` (Primary institutional accent, active tabs)
  - `--color-plum-deep: #211A2C` (Sidebar background)
  - `--color-plum-soft: #4A3260` (Active sidebar items, subtle focus rings)
  - `--color-ember: #D85C3F` (Primary action buttons, brand logo mark)
  - `--color-ember-hover: #C04E34` (Button interactive hover state)
- **Status & Badges**:
  - `--color-saffron: #F2B84B` / `--color-saffron-dark: #D9A03A` (Under review, warnings)
  - `--color-sage: #B8D8C0` / `--color-sage-dark: #8FBF9A` (Role badges, mentorship tags)
  - `--color-success: #3D8B5F` (Verified badges, accepted states)
  - `--color-error: #D14343` (Destructive actions, error alerts)
- **Container Metric**:
  - All internal dashboard pages are strictly constrained to a unified `max-width: 1400px; margin: 0 auto; padding: 1.75rem 2rem 3.5rem;` to prevent layout jumping across tab transitions.

---

## Repository Structure

```
SkillBridge/
├── backend/
│   ├── src/
│   │   ├── config/          # Limits, DB connection, and role configurations
│   │   ├── controllers/     # Route controllers for all subsystems
│   │   ├── middlewares/     # JWT authentication, role guards, upload validation
│   │   ├── models/          # 18 Mongoose models with strict schema constraints
│   │   ├── routes/          # REST route declarations
│   │   ├── scripts/         # Automated database seeders
│   │   ├── services/        # Business logic, engines, and aggregations
│   │   └── server.js        # Express application entry point
│   ├── uploads/             # Local file store for CVs and supporting documents
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/      # UI components (Student, Faculty, Global Layouts)
│   │   ├── context/         # AuthContext and state providers
│   │   ├── pages/           # Page views for Student, Faculty, Dashboards, Auth
│   │   ├── services/        # Frontend API client connectors
│   │   ├── App.jsx          # React Router v7 routes declaration
│   │   ├── index.css        # Canonical SkillBridge Design System & responsive styles
│   │   └── main.jsx         # React application bootstrap
│   ├── vite.config.js       # Vite proxy & build configuration
│   └── package.json
│
├── scratch/                 # End-to-end integration and regression test suites
├── README.md                # Project documentation and setup guide
└── package.json             # Root monorepo configuration
```

---

## Contribution & License

- **Authors**: SkillBridge Team (Smart India Hackathon 2024–2026)
- **Repository**: [https://github.com/Mayur142-CODE/SkillBridge](https://github.com/Mayur142-CODE/SkillBridge)
- **License**: MIT License
