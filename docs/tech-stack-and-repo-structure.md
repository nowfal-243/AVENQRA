# Tech Stack Confirmation & Repository Guidelines - AVENQRA

This document confirms the chosen technology stack, architectural rationale, mono-repo directory layout, and developer setup instructions for Phase 1.

---

## 1. Confirmed Technology Stack

| Layer / Component | Technology Selected | Rationale & Benefits |
|---|---|---|
| **Mobile Client** | Flutter 3.x (Dart 3.x) | Single cross-platform codebase compiling natively to iOS and Android; rich UI widget library and native GPS/camera integrations. |
| **Web Dashboard** | React 18 + Vite | Lightning-fast HMR build times, modular component architecture, flexible state management (Zustand/Context), and easy dashboard chart integrations. |
| **REST API Server** | Node.js 18 + Express | Asynchronous non-blocking I/O event loop ideal for API Gateway request routing, JWT handling, and microservice proxying. |
| **Database & Spatial Engine** | PostgreSQL 15 + PostGIS | Enterprise spatial database providing native GIS indexing (`ST_DWithin`, `ST_Distance`) for precise radius-based duplicate detection. |
| **ORM Layer** | Prisma ORM | Type-safe database queries, auto-generated migrations, and robust schema management. |
| **AI Microservice** | Python 3.10 + FastAPI | Standard machine learning ecosystem (PyTorch, OpenCV, NumPy) paired with high-performance asynchronous ASGI Web Framework. |
| **Containerization** | Docker & Docker Compose | Containerized local environment ensuring complete environment parity between development and deployment. |

---

## 2. Mono-Repo Directory Architecture

```
avenqra/
├── README.md                           # Main repository entry guide
├── .gitignore                          # Mono-repo gitignore settings
├── docker-compose.yml                  # Multi-container local orchestration
│
├── docs/                               # Phase 1 Design Blueprints
│   ├── srs.md                          # Software Requirements Specification
│   ├── use-cases-user-flows.md         # Use Cases & Sequence Flow Diagrams
│   ├── database-schema.md              # 12-Table ER Diagram & Data Dictionary
│   ├── architecture.md                 # System Architecture Blueprint
│   ├── ui-wireframes.md                # Citizen Mobile & Web Dashboard Wireframes
│   └── tech-stack-and-repo-structure.md# Tech Stack & Repo Guidelines
│
├── mobile/                             # Flutter Mobile Client Submodule
├── web/                                # React.js Web Admin & Officer Portal
├── backend/                            # Node.js + Express REST Server Submodule
├── ai-service/                         # Python FastAPI Machine Learning Microservice
├── database/                           # Raw DDL SQL & Seed Scripts
└── scripts/                            # Bootstrap & Utility Scripts
```

---

## 3. Git Workflow & Branching Conventions

- **`main`**: Production-ready release branch.
- **`develop`**: Primary integration branch for active development.
- **Feature Branches**: `feature/<submodule>-<feature-name>` (e.g. `feature/mobile-geolocator`, `feature/ai-duplicate-check`).
- **Commit Conventions**: Conventional Commits standard (`feat:`, `fix:`, `docs:`, `chore:`).
