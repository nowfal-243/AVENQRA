# Software Requirements Specification (SRS) - AVENQRA

**Project Name**: AVENQRA (AI-Powered Civic Issue Resolution System)  
**Version**: 1.0.0  
**Date**: October 5, 2026  
**Target Audience**: Software Engineers, System Architects, Project Evaluators, Municipal Stakeholders  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document details the complete functional, non-functional, data, and architectural requirements for **AVENQRA**. The system provides an automated, AI-assisted platform for citizens to report civic infrastructure defects (e.g. potholes, water leakages, waste accumulation, streetlights), and enables municipal authorities to automatically classify, prioritize, dispatch, and track complaints to resolution.

### 1.2 Scope
AVENQRA consists of four primary subsystems:
1. **Citizen Mobile Application (Flutter)**: Allows citizens to register, capture geotagged photo reports, track resolution progress, and submit feedback.
2. **REST API Gateway (Node.js + Express)**: Provides secure authentication, business logic, notification triggers, and database transactions.
3. **AI Microservice (Python + FastAPI)**: Applies computer vision for issue classification, severity calculation, and spatial duplicate report detection.
4. **Admin & Officer Web Portal (React + Vite)**: Provides department managers and field officers with real-time complaint queues, spatial heatmaps, officer dispatching, and SLA compliance analytics.

---

## 2. Functional Requirements

### 2.1 User Management & Authentication (FR-AUTH)
- **FR-AUTH-1**: The system shall support Role-Based Access Control (RBAC) with four roles: `CITIZEN`, `OFFICER`, `DEPARTMENT_ADMIN`, and `SUPER_ADMIN`.
- **FR-AUTH-2**: Users shall register using Name, Email, Password, and Phone Number. Passwords must be hashed using `bcrypt` with a minimum cost factor of 10.
- **FR-AUTH-3**: Authentication shall issue JSON Web Tokens (JWT) signed with HMAC-SHA256, expiring after 7 days.

### 2.2 Citizen Issue Reporting (FR-REP)
- **FR-REP-1**: The mobile app shall enable camera capture and photo upload for issue reports.
- **FR-REP-2**: The app shall automatically fetch current GPS coordinates (`latitude`, `longitude`) and perform reverse-geocoding to store formatted street addresses.
- **FR-REP-3**: The citizen shall select an issue category (`Pothole`, `Waste Management`, `Water Leakage`, `Streetlight Issue`, `Drainage Block`, `Other`) or rely on AI auto-detection.
- **FR-REP-4**: The system shall generate a unique ticket tracking number (e.g., `AVN-2026-849102`) upon successful submission.

### 2.3 Automated AI Analysis & Duplicate Detection (FR-AI)
- **FR-AI-1**: The AI microservice shall process uploaded complaint images and return predicted categories with confidence scores ($\ge 0.85$).
- **FR-AI-2**: The AI microservice shall calculate a severity score (scale $1.0 - 10.0$) based on visual anomaly intensity.
- **FR-AI-3**: The system shall check for duplicate complaints within a configurable spatial radius (e.g. 50 meters) using PostGIS spatial queries (`ST_DWithin`).
- **FR-AI-4**: If a duplicate is detected, the system shall mark `is_duplicate = true` and link the complaint to the master ticket.

### 2.4 Workflow & Task Assignment (FR-WORK)
- **FR-WORK-1**: Incoming complaints shall transition through status stages: `SUBMITTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` (or `REJECTED`).
- **FR-WORK-2**: Department Admins shall assign complaints to Field Officers within their department.
- **FR-WORK-3**: Field Officers shall update task status and attach resolution proof photos upon job completion.
- **FR-WORK-4**: The system shall log every status change with timestamp, modifier ID, and remarks in `complaint_status_logs`.

### 2.5 Analytics & Dashboards (FR-DASH)
- **FR-DASH-1**: The web portal shall render interactive summary cards (Total, Pending, In Progress, Resolved).
- **FR-DASH-2**: The web portal shall render geospatial heatmaps showing complaint density.
- **FR-DASH-3**: The portal shall track Service Level Agreement (SLA) compliance based on target department resolution hours.

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements (NFR-PERF)
- **NFR-PERF-1**: REST API endpoint response time shall not exceed **300 ms** for standard CRUD queries under a load of 100 concurrent requests.
- **NFR-PERF-2**: AI image classification and severity scoring response time shall not exceed **2.5 seconds** per request.
- **NFR-PERF-3**: Mobile app UI rendering shall maintain a minimum of 60 FPS.

### 3.2 Security Requirements (NFR-SEC)
- **NFR-SEC-1**: All HTTP communication shall be encrypted via TLS 1.3 (HTTPS).
- **NFR-SEC-2**: API endpoints shall enforce CORS policies restricting requests to verified origins.
- **NFR-SEC-3**: Database credentials and JWT secrets must be loaded via environment variables and never committed to source control.

### 3.3 Reliability & Availability (NFR-REL)
- **NFR-REL-1**: System uptime shall achieve **99.5%** availability during operational hours.
- **NFR-REL-2**: If the AI microservice is unreachable, the API gateway shall fallback gracefully to manual category selection without throwing system exceptions.

---

## 4. System Interfaces & Dependencies

| Interface | Technology | Purpose |
|---|---|---|
| **Mobile Client** | Flutter (Dart 3.x) | iOS & Android Citizen/Officer App |
| **Web Dashboard** | React 18 + Vite | Admin & Officer Web Portal |
| **Backend Gateway** | Node.js 18 + Express | Core Business Logic REST Server |
| **Database** | PostgreSQL 15 + PostGIS | Spatial & Relational Data Store |
| **AI Engine** | Python 3.10 + FastAPI | CV Classification & Duplicate Detection |
| **Storage** | Cloudinary / Local Disk | Image & Video Media Hosting |
