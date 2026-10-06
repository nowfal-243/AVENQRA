# AVENQRA - Comprehensive System Architecture Blueprint

## System Topology & Microservices Blueprint

AVENQRA employs a multi-tier microservices-inspired architecture that separates user-facing clients (Mobile & Web), API Gateway logic, AI Machine Learning inferencing, and PostgreSQL/PostGIS spatial data persistence.

```mermaid
graph TD
    subgraph Client Layer
        A[Flutter Mobile App<br/>Citizen & Officer]
        B[React + Vite Web App<br/>Admin & Department Portal]
    end

    subgraph Gateway & Middleware Layer
        C[Express REST API Gateway<br/>Port 5000]
        D[JWT Auth & RBAC Middleware]
        E[Multer Media Upload Handler]
    end

    subgraph Service & AI Layer
        F[Python FastAPI AI Microservice<br/>Port 8000]
        G[Computer Vision Model<br/>ResNet/YOLO Anomaly Detector]
        H[Duplicate Detector Engine<br/>PostGIS ST_DWithin + Vector Match]
    end

    subgraph Persistence & Cloud Layer
        I[(PostgreSQL 15 + PostGIS<br/>Port 5432)]
        J[Cloudinary / Disk Storage<br/>Media Files]
    end

    A -->|HTTPS / REST API| C
    B -->|HTTPS / REST API| C
    C --> D
    C --> E
    E --> J
    C -->|Internal HTTP Call| F
    F --> G
    F --> H
    H -->|Spatial Radius Query| I
    C -->|Prisma ORM Queries| I
```

---

## Service Responsibilities & Protocols

### 1. Client Tier (Mobile & Web)
- **Mobile (Flutter)**: Performs client-side photo capture, native location hardware polling via GPS, state management, and push notification listening.
- **Web Portal (React + Vite)**: Uses Axios with JWT request interceptors to render officer triage queues, GIS spatial heatmaps, SLA progress bars, and department analytics.

### 2. API Gateway Tier (Node.js + Express)
- **Security**: JWT validation, CORS origin verification, Helmet HTTP security headers, and role-based route guard authorization (`CITIZEN`, `OFFICER`, `DEPARTMENT_ADMIN`, `SUPER_ADMIN`).
- **Orchestration**: Manages complaint state transitions (`SUBMITTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`), writes audit logs, and coordinates async calls to the AI Service.

### 3. AI Inferencing Tier (Python FastAPI)
- **Image Classifier**: Evaluates complaint photos to detect category labels (`Pothole`, `Waste`, `Water Leak`, `Streetlight`) with probability confidence values.
- **Severity Scoring Engine**: Computes visual damage intensity score on a scale of $1.0 - 10.0$.
- **Duplicate Detector**: Performs PostGIS spatial queries (`ST_DWithin`) combined with category match to flag nearby duplicate tickets.

### 4. Data Persistence Tier (PostgreSQL + PostGIS)
- **Relational Tables**: Manages 12 normalized entities (Users, Citizens, Officers, Departments, Complaints, Images, Locations, AI Analysis, Status Logs, Assignments, Notifications, Feedback).
- **Spatial Indexing**: GIST spatial indexes on `GEOMETRY(Point, 4326)` coordinates for millisecond-level location searches.
