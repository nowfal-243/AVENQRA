# AVENQRA - UI Wireframes & Screen Mockup Blueprints

This document outlines the visual layouts, navigation flows, and UI component specifications for the Citizen Mobile App, Field Officer Portal, and Admin Web Dashboard.

---

## 1. Citizen Mobile Application Wireframes

### Screen 1: Login & Registration Screen (`/auth`)
```
+------------------------------------------+
|  [Logo] AVENQRA                          |
|  Civic Issue Resolution Portal           |
|                                          |
|  [ Email Address                       ] |
|  [ Password                            ] |
|                                          |
|  [   LOG IN                             ] |
|                                          |
|  ------------------ OR ----------------- |
|                                          |
|  Don't have an account? [ Register Now ] |
+------------------------------------------+
```
- **Primary Actions**: Authenticate user, store JWT token, toggle between Login and Sign-Up.

---

### Screen 2: Citizen Home Screen (`/home`)
```
+------------------------------------------+
| = AVENQRA                       [Bell 🔔]|
+------------------------------------------+
| Welcome back, Alex!                      |
|                                          |
| +--------------------------------------+ |
| | Report a Civic Issue                 | |
| | Spot a pothole or waste dump? Take a | |
| | photo to alert city officers.        | |
| |                                      | |
| | [ 📷 REPORT NEW ISSUE ]             | |
| +--------------------------------------+ |
|                                          |
| Active Complaints (2)                    |
| +--------------------------------------+ |
| | ⚠️ Pothole on 5th Ave                | |
| | Ticket: AVN-2026-89102               | |
| | Status: IN_PROGRESS  •  ETA: 24 hrs  | |
| +--------------------------------------+ |
| | 💧 Pipe Leak near Central Park       | |
| | Ticket: AVN-2026-44129               | |
| | Status: ASSIGNED                     | |
| +--------------------------------------+ |
|                                          |
| [Home 🏠]   [Complaints 📋]   [Profile 👤]|
+------------------------------------------+
```

---

### Screen 3: Report Issue Screen (`/report-issue`)
```
+------------------------------------------+
| < Back         New Complaint             |
+------------------------------------------+
| +--------------------------------------+ |
| |                                      | |
| |       [ 📷 Camera Preview ]          | |
| |      Tap to Capture Image            | |
| |                                      | |
| +--------------------------------------+ |
| 📍 GPS: 12.9716° N, 77.5946° E (Auto)    |
| 🏠 Address: 5th Avenue, Indiranagar      |
|                                          |
| Category:                                |
| [ Pothole                        v ]     |
|                                          |
| Title:                                   |
| [ Large pothole blocking right lane    ] |
|                                          |
| Description:                             |
| [ Deep hole dangerous for two-wheelers ] |
|                                          |
| [      SUBMIT COMPLAINT TO AI SERVICE  ] |
+------------------------------------------+
```

---

### Screen 4: Track Complaint Details Screen (`/complaint-details`)
```
+------------------------------------------+
| < Back      Ticket # AVN-2026-89102      |
+------------------------------------------+
| [ Photo Thumbnail: Pothole ]             |
| Priority: HIGH | AI Severity: 8.4/10     |
|                                          |
| Resolution Lifecycle:                    |
|  (✓) SUBMITTED   - Oct 5, 10:15 AM      |
|  (✓) ASSIGNED    - Oct 5, 11:30 AM      |
|  (•) IN_PROGRESS - Officer Dispatched    |
|  ( ) RESOLVED    - Pending Completion    |
|                                          |
| Assigned Officer: Officer Ramesh (Roads) |
| Target SLA: 48 Hours                     |
|                                          |
| [ Provide Feedback (Post-Resolution)   ] |
+------------------------------------------+
```

---

### Screen 5: Citizen Profile Screen (`/profile`)
```
+------------------------------------------+
| Profile                                  |
+------------------------------------------+
| [ 👤 User Avatar ]                       |
| Alex Johnson                             |
| alex.johnson@example.com                 |
| +1 (555) 019-2834                        |
|                                          |
| Stats:                                   |
| - Total Complaints Submitted: 7          |
| - Resolved Complaints: 5                 |
|                                          |
| [ Notifications Settings               ] |
| [ Change Password                      ] |
| [ LOG OUT                              ] |
+------------------------------------------+
```

---

## 2. Officer Dashboard Wireframe (`/officer-dashboard`)

```
+-----------------------------------------------------------------------------------+
| AVENQRA Officer Portal | Assigned Dept: Roads & Infrastructure  [ Badge: #RD-402 ] |
+-----------------------------------------------------------------------------------+
| Tasks Assigned To Me (3)               | Map View                                 |
| +------------------------------------+ | +--------------------------------------+ |
| | Ticket: AVN-2026-89102             | | | [ Map Canvas ]                       | |
| | Title: Pothole on 5th Ave          | | |  📍 (AVN-89102 - 5th Ave)           | |
| | Severity: 8.4  | Priority: HIGH    | | |  📍 (AVN-44129 - Park Leak)         | |
| | Actions:                           | | |                                      | |
| | [ Start Job ] [ Mark Resolved 📷 ] | | +--------------------------------------+ |
| +------------------------------------+ |                                          |
| | Ticket: AVN-2026-91283             | | Resolution Work Proof Upload:          | |
| | Title: Damaged Curb Structure      | | [ Choose Photo ] [ Upload & Close ]    | |
| +------------------------------------+ |                                          | |
+-----------------------------------------------------------------------------------+
```

---

## 3. Admin Web Dashboard Wireframe (`/admin-dashboard`)

```
+-----------------------------------------------------------------------------------+
| AVENQRA Admin Portal | User: Super Admin                             [ Logout 🚪 ]|
+-----------------------------------------------------------------------------------+
| [📊 Overview]  [📋 Complaints Triage]  [👷 Officers]  [🏢 Departments]  [⚙️ Settings]|
+-----------------------------------------------------------------------------------+
| Executive Summary Metrics                                                         |
| +------------------+ +------------------+ +------------------+ +------------------+ |
| | Total Complaints | | Pending Triage   | | In Progress      | | Resolved (SLA)   | |
| |    1,248         | |     142          | |     318          | |   788 (94.2%)    | |
| +------------------+ +------------------+ +------------------+ +------------------+ |
|                                                                                   |
| Complaints Management Queue                                                        |
| Search: [ Find ticket... ]  Filter Category: [ All v ]  Status: [ SUBMITTED v ]   |
| +------------+----------------------+----------+----------+----------+----------+ |
| | Ticket #   | Issue Title          | Category | AI Sever | Status   | Assign   | |
| +------------+----------------------+----------+----------+----------+----------+ |
| | AVN-89102  | Pothole on 5th Ave   | POTHOLE  | 8.4/10   | SUBMITTED| [Assign] | |
| | AVN-44129  | Pipe Burst Main St   | WATER    | 9.1/10   | ASSIGNED | [Reassign| |
| | AVN-10293  | Trash Dump Corner    | WASTE    | 4.2/10   | RESOLVED | [Details]| |
| +------------+----------------------+----------+----------+----------+----------+ |
+-----------------------------------------------------------------------------------+
```
