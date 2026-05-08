# 📅 Slotra - Modern Appointment Management System

**Slotra** is a scalable, secure, and performance-oriented appointment management system built for businesses and customers. The backend architecture follows **Clean Architecture** principles, utilizing **Controller-Service-Repository** layers to ensure a robust and maintainable codebase.

---

## 🚀 Key Features

* **🛡️ Advanced Authentication & RBAC:** Secure session management via JWT (Access & Refresh Tokens). Features Refresh Token Rotation and HttpOnly Cookie support. Robust Role-Based Access Control (Admin, Provider, Customer).
* **👑 Master Admin Panel & Analytics:** Comprehensive dashboard for system-wide analytics, user management, and advanced financial tracking (calculating realized vs. expected revenue, completed vs. upcoming visits).
* **🏢 Advanced Provider Management:** Dynamic handling of provider profiles, multi-provider service assignments with custom pricing (via `provider_services` bridge tables), and customizable weekly working hours.
* **⚡ Smart Data Fetching & Filtering:** Highly optimized admin interfaces that filter heavy datasets (like appointments and client lists) by specific providers to ensure UI performance and prevent backend bottlenecks.
* **🔄 Transactional Data Integrity:** Guaranteed data consistency across multiple relational tables (e.g., simultaneously creating a User and Provider profile) using strict SQL transactions (BEGIN/COMMIT/ROLLBACK) and lazy-creation patterns.
* **⚡ Performance Focused:** High-performance caching for appointment slots and availability using **Redis**.
* **🐇 Message Queues:** Asynchronous processing of intensive tasks (like email notifications) via **RabbitMQ** to prevent main thread blocking.
* **⏰ Reminder Service:** Automated background jobs using **node-cron** to send reminders for upcoming appointments.
* **🛡️ Robust Security:** Hardened with **Helmet** (HTTP security headers) and Redis-backed **Rate Limiting** to prevent brute-force attacks.
* **📖 Interactive Documentation:** Full API documentation with **Swagger/OpenAPI 3.0**, allowing for live testing of all endpoints.
* **🐳 Dockerized Infrastructure:** Seamless deployment in any environment using **Docker** and **Docker-Compose**.

---

## 🛠️ Tech Stack

### **Backend**
* **Runtime:** Node.js (v20+)
* **Framework:** Express.js
* **Database:** PostgreSQL
* **Caching:** Redis
* **Messaging:** RabbitMQ
* **Documentation:** Swagger UI & JSDoc

### **Frontend (In Progress)**
* **Framework:** Angular 17+ (Standalone Components, Signals)
* **Styling:** Tailwind CSS
* **State Management:** Angular Signals & Computed Properties
* **UI Components:** Custom Glassmorphism UI, FullCalendar Integration

### **Security & Utilities**
* **Auth:** JWT (Json Web Token)
* **Encryption:** Bcrypt
* **Validation:** Joi / JSDoc Validation
* **Security:** Helmet, Express-Rate-Limit (with Redis Store)
* **Env Management:** Dotenv

---

## 📂 Project Structure

```text
src/
├── config/             # DB, Redis, RabbitMQ, and Swagger configurations
├── controllers/        # Handles HTTP requests and returns responses
├── services/           # Contains Business Logic
├── repositories/       # Data Access Layer (SQL queries & Transactions)
├── middleware/         # Auth, Error Handling, Rate Limiting, and Logger
├── routes/             # API Route definitions
├── workers/            # RabbitMQ message consumers (Email worker, etc.)
├── jobs/               # Scheduled tasks (Cron-jobs)
├── scripts/            # Database seeding scripts
├── utils/              # Helper functions and custom error classes
└── validations/        # Request body validation rules
```

---

## ⚙️ Installation & Setup

### **1. Prerequisites**
* Docker & Docker-Compose
* Node.js (LTS recommended)

### **2. Environment Variables**
Create a `.env` file in the root directory and define the following:

```env
PORT=3000
DATABASE_URL=postgresql://admin:admin@postgres:5432/appointment_db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq
JWT_SECRET=your_super_secret_key
```

### **3. Running with Docker**
```bash
docker-compose up --build
```
Once started, the **PostgreSQL, Redis, RabbitMQ**, and **Node.js** services will be automatically configured and linked.

---

## 🧪 Database Seeding

To populate the database with test data (Services, Providers, and Sample Users):

```bash
node src/scripts/seed.js
```

---

## 📘 API Documentation

Access the interactive Swagger UI to explore and test the API endpoints:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## 👨‍💻 Developer

* **Ege Telli** - *Full Stack Developer*

---

### **Roadmap**

* [x] Master Admin Dashboard and advanced provider/service routing.
* [x] Client analytics and revenue calculation via SQL aggregations.
* [ ] Complete remaining Frontend implementation using **Angular 17+** Signals.
* [ ] Implement Unit and Integration testing using **Jest**.
* [ ] Transition to a database migration system (e.g., Knex or Sequelize).
```
