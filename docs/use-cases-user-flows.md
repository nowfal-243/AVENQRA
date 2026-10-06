# AVENQRA - Detailed Use Cases & User Flows

This document details the primary Use Cases and User Flow Sequence Diagrams for the three core actors in the system: **Citizens**, **Field Officers**, and **Department Administrators**.

---

## 1. Actor Definitions

- **Citizen**: Public user who reports infrastructure issues, monitors status updates, and provides feedback.
- **Field Officer**: Municipal worker dispatched to inspect and resolve assigned civic complaints.
- **Department Admin**: Administrator responsible for managing department complaints, assigning field officers, and monitoring SLA performance.

---

## 2. Detailed Use Case Specifications

### UC-01: Citizen Registration & Login
- **Actor**: Citizen
- **Preconditions**: Citizen opens the mobile application.
- **Main Flow**:
  1. User selects "Register" and inputs name, email, phone, and password.
  2. Mobile app submits POST request to `/api/v1/auth/register`.
  3. API verifies email uniqueness, hashes password, saves user record, and returns a signed JWT.
  4. Mobile app stores JWT securely in `FlutterSecureStorage` and navigates to `HomeScreen`.
- **Alternative Flow (Login)**: Existing user enters credentials at `/api/v1/auth/login` to retrieve JWT.

---

### UC-02: Submit Geotagged Complaint
- **Actor**: Citizen
- **Preconditions**: User is logged in.
- **Main Flow**:
  1. Citizen taps "Report New Issue".
  2. Citizen captures a photo using device camera.
  3. App acquires current GPS coordinates (`latitude`, `longitude`) via `Geolocator`.
  4. Citizen selects issue category and enters description.
  5. App submits multipart form request to POST `/api/v1/complaints`.
  6. Backend stores complaint, triggers AI analysis asynchronously, generates ticket number (`AVN-XXXXXX`), and returns confirmation to mobile app.

---

### UC-03: AI Category Classification & Duplicate Check
- **Actor**: AI Microservice (System)
- **Preconditions**: Backend receives a new complaint submission.
- **Main Flow**:
  1. Backend sends image payload and GPS coordinates to AI Service (`POST /api/v1/ai/duplicate-check`).
  2. AI Service runs model inference to classify issue (e.g., Pothole, 94% confidence) and calculates severity score.
  3. AI Service executes spatial radius query against existing active complaints.
  4. If a duplicate exists within 50m, AI Service flags `isDuplicate = true`.
  5. AI Service returns evaluation payload back to Backend REST Gateway.

---

### UC-04: Admin Complaint Triage & Officer Dispatch
- **Actor**: Department Admin
- **Preconditions**: Admin is logged in to the Web Dashboard.
- **Main Flow**:
  1. Admin opens Complaints Triage view.
  2. System lists complaints sorted by priority and AI severity score.
  3. Admin views complaint details, photo, and geolocation on interactive map.
  4. Admin selects an active Field Officer from dropdown and clicks "Assign Officer".
  5. System updates complaint status to `ASSIGNED` and sends push notification to assigned officer.

---

### UC-05: Field Officer Resolution & Work Proof Upload
- **Actor**: Field Officer
- **Preconditions**: Officer has assigned tasks in mobile app.
- **Main Flow**:
  1. Officer views assigned task list on mobile map interface.
  2. Officer updates status to `IN_PROGRESS` upon arriving at location.
  3. After completing repair work, officer captures a resolution proof photo.
  4. Officer taps "Mark as Resolved".
  5. Backend updates complaint status to `RESOLVED`, logs timestamp, and notifies submitting Citizen.

---

## 3. User Flow Sequence Diagrams

### 3.1 Citizen Issue Reporting & AI Analysis Flow

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant MobileApp as Flutter Mobile App
    participant Gateway as Express REST API
    participant AIService as FastAPI AI Microservice
    participant Database as PostgreSQL + PostGIS

    Citizen->>MobileApp: 1. Capture Photo & GPS Location
    Citizen->>MobileApp: 2. Enter Title, Description & Submit
    MobileApp->>Gateway: 3. POST /api/v1/complaints (Bearer Token + Form Data)
    Gateway->>Database: 4. Save Complaint Record (Status: SUBMITTED)
    Gateway->>AIService: 5. POST /api/v1/ai/duplicate-check (Image & Coords)
    AIService->>AIService: 6. Run CV Classification & Severity Scoring
    AIService->>Gateway: 7. Return AI Analysis (Category, Confidence, Severity, DuplicateFlag)
    Gateway->>Database: 8. Update Complaint with AI Metrics & Status
    Gateway-->>MobileApp: 9. Return Created Complaint & Ticket #
    MobileApp-->>Citizen: 10. Display Success Toast & Ticket Ticket #
```

---

### 3.2 Officer Dispatch & Resolution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Dashboard as React Web Dashboard
    participant Gateway as Express REST API
    actor Officer
    participant OfficerApp as Flutter Mobile App
    participant Database as PostgreSQL

    Admin->>Dashboard: 1. View Triage Queue & AI Severity Scores
    Admin->>Dashboard: 2. Select Complaint & Assign Field Officer
    Dashboard->>Gateway: 3. PATCH /api/v1/complaints/:id/status (ASSIGNED, OfficerID)
    Gateway->>Database: 4. Update Complaint & Log Status Transition
    Gateway-->>OfficerApp: 5. Trigger Push Notification to Officer
    Officer->>OfficerApp: 6. Open App & Set Status to IN_PROGRESS
    OfficerApp->>Gateway: 7. PATCH Status = IN_PROGRESS
    Officer->>OfficerApp: 8. Complete Repair & Capture Resolution Photo
    OfficerApp->>Gateway: 9. PATCH Status = RESOLVED + Proof Photo
    Gateway->>Database: 10. Save Resolution Record & Update Log
    Gateway-->>Dashboard: 11. Reflect RESOLVED status in real-time
```
