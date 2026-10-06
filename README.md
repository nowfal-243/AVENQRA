# AVENQRA - AI-Powered Civic Issue Resolution System

AVENQRA is a comprehensive, enterprise-grade AI-powered Civic Infrastructure & Complaint Management Platform designed to streamline public issue reporting, automated categorization, severity scoring, duplicate detection, and real-time status tracking for citizens, field officers, and administrators.

---

## 🚀 Key Features

- **📱 Mobile App (Flutter)**: Citizen complaint registration (photos, geo-location, category, description) and Field Officer task management & updates.
- **🖥️ Web Dashboard (React.js + Vite)**: Admin & Department Officer portal featuring interactive analytics, complaint workflow management, officer dispatching, and geospatial heatmaps.
- **⚡ Backend API (Node.js + Express + Prisma / PostgreSQL)**: Scalable RESTful API powering authentication (JWT), RBAC, complaint lifecycle, notifications, and integration with AI microservices.
- **🤖 AI Microservice (Python + FastAPI)**: Computer vision and NLP models for automated issue classification (potholes, garbage, water leaks, streetlights), severity evaluation, and spatial duplicate report detection.
- **🐳 Dockerized Infrastructure**: Containerized PostgreSQL database, backend service, web portal, and AI service for seamless local development and cloud deployment.

---

## 📁 Repository Structure

```
d:\AVENQRA final yr project/
├── docs/                      # SRS, Architecture, API Docs, DB Schema, User Manual
├── mobile/                    # Flutter Mobile App (Citizen & Officer)
├── web/                       # React.js Web Admin & Officer Dashboard
├── backend/                   # Node.js + Express + Prisma REST API
├── ai-service/                # Python FastAPI Machine Learning Service
├── database/                  # SQL Schemas, Seeds & Migration scripts
└── scripts/                   # Setup and seed utility scripts
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Node.js v18+](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/)
- [Flutter SDK 3.x+](https://flutter.dev/)
- [Docker & Docker Compose](https://www.docker.com/)

### 2. Environment Setup
```bash
# Clone repository and navigate to root
cd "d:\AVENQRA final yr project"

# Run setup script (creates local .env files and installs dependencies)
bash scripts/setup.sh
```

### 3. Spin up Docker Services
```bash
docker-compose up --build
```

---

## 📖 Documentation
Detailed documentation is available in the [`docs/`](./docs) folder:
- [Architecture Overview](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [API Documentation](./docs/api-documentation.md)
- [Software Requirements Specification (SRS)](./docs/srs.md)
- [User Manual](./docs/user-manual.md)

---

## 📄 License
This project is developed for final year engineering computer science capstone evaluation. All rights reserved.
