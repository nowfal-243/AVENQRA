# AVENQRA - REST API Documentation

## Base URL
`http://localhost:5000/api/v1`

---

## Authentication Endpoints (`/auth`)

### 1. Register User
- **POST** `/auth/register`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "phone": "+1234567890",
    "role": "CITIZEN"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "jwt_token_string",
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com", "role": "CITIZEN" }
  }
  ```

### 2. Login User
- **POST** `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```

---

## Complaint Endpoints (`/complaints`)

### 1. Submit Complaint
- **POST** `/complaints` (Multipart form-data)
- **Headers**: `Authorization: Bearer <token>`
- **Fields**: `title`, `description`, `category`, `latitude`, `longitude`, `address`
- **Files**: `image` (JPEG/PNG)

### 2. List Complaints
- **GET** `/complaints?status=SUBMITTED&category=POTHOLE&page=1&limit=10`
- **Headers**: `Authorization: Bearer <token>`

### 3. Update Complaint Status
- **PATCH** `/complaints/:id/status`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS",
    "remarks": "Officer dispatched to site"
  }
  ```

---

## AI Microservice Endpoints (`http://localhost:8000`)

### 1. Analyze Image & Issue Classification
- **POST** `/api/v1/ai/classify`
- **Request**: Multipart image file
- **Response**:
  ```json
  {
    "category": "POTHOLE",
    "confidence": 0.94,
    "suggested_priority": "HIGH",
    "severity_score": 8.2
  }
  ```

### 2. Duplicate Check
- **POST** `/api/v1/ai/duplicate-check`
- **Request Body**:
  ```json
  {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "category": "POTHOLE"
  }
  ```
- **Response**:
  ```json
  {
    "is_duplicate": true,
    "existing_complaint_id": "uuid-1234",
    "distance_meters": 14.2
  }
  ```
