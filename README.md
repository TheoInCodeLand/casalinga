<div align="center">

# Casalinga Tours: Enterprise Booking & Analytics Ecosystem

**Engineered a scalable, AI-enhanced booking platform that digitizes tour management, eliminates manual scheduling conflicts, and delivers predictive business intelligence for travel operators.**

</div>

---

<div align="center">
<img src="docs/dashboard-preview.gif" alt="Admin Dashboard & Analytics Demo" width="800"/>





<i>Real-time revenue tracking and interactive capacity management.</i>
</div>

## 🚀 The Context

### The Problem

Traditional tour operators frequently rely on fragmented operating models—utilizing printed posters, WhatsApp threads, and manual spreadsheet administration. This architecture inherently leads to booking collisions, disorganized payment tracking, high risks of miscommunication, and a complete lack of actionable data analytics.

### The Solution

Architected a centralized, full-stack MVC web application that automates the entire booking lifecycle. The system features role-based access control, atomic transaction handling for capacity management, dynamic frontend rendering, and seamless synchronization with a Python-based machine learning service for demand forecasting.

---

## 💻 Tech Stack

**Frontend Architecture**

* **Templating:** EJS (Embedded JavaScript)
* **Styling:** Tailwind CSS, Custom CSS variables, Responsive Grids
* **Data Visualization:** Chart.js for real-time analytics
* **Assets:** Lucide Icons, Ionicons

**Backend Engineering**

* **Core:** Node.js, Express.js
* **Security:** Helmet, Bcrypt (Password Hashing), Express-Session (PostgreSQL Store)
* **Architecture Pattern:** Strict MVC utilizing a modular `views/`, `routes/`, `public/`, `config/` folder structure.

**Database & AI Integration**

* **Primary Database:** PostgreSQL (Relational mapping, Stored Procedures)
* **Machine Learning / AI:** Python, Scikit-learn (Demand prediction and user preference modeling)

---

## ⚡ Top 3 Features

1. **Atomic Booking Engine & Capacity Management:** Real-time availability checks that prevent overbooking using database-level constraints and dynamic UI updates.
2. **AI-Powered Demand Forecasting:** Synchronization between the Node backend and Python ML models to analyze historical booking data and predict high-traffic tour dates.
3. **Role-Based Business Intelligence Dashboards:** Dedicated portals for Customers, Booking Managers, and Admins featuring interactive revenue trends, automated report generation, and status filtering.

---

## 🧠 Architectural Decisions (The "Why")

* **Why PostgreSQL instead of MongoDB?**
A booking ecosystem requires absolute data integrity and ACID compliance. Relational data maps perfectly to the complex, many-to-many relationships between Users, Tours, Bookings, and Amenities. Utilizing PostgreSQL enabled the use of robust SQL functions (like auto-generating `CT-YYMMDD-XXXX` invoice numbers) and strict row-level locking.
* **Why the Node/Express + EJS Stack?**
Selected for highly efficient, non-blocking I/O operations necessary for handling concurrent booking requests. EJS allows for rapid, server-side dynamic rendering of complex nested data (like tour filters and user dashboards) without the overhead of a heavy Single Page Application framework, ensuring fast time-to-interactive for SEO.
* **Why decoupled Python ML Services?**
Separating the predictive analytics engine into a distinct Python microservice prevents heavy, CPU-bound machine learning tasks from blocking the single-threaded Node.js event loop, ensuring the main booking API remains highly performant.

---

## 🛠 Challenges Overcome

### 1. Concurrency and Race Conditions in Booking

**The Roadblock:** During peak traffic, simultaneous users attempting to book the last available slot on a tour could bypass standard JavaScript validation, resulting in negative capacity and overbooked tours.
**The Resolution:** Engineered a robust transactional workflow within the database layer. Implemented `BEGIN`, `COMMIT`, and `ROLLBACK` sequences coupled with `FOR UPDATE` row-level locking. This optimization ensures that capacity verification and booking insertion execute as a single, atomic unit, guaranteeing 100% data integrity regardless of concurrent request volume.

### 2. Cross-Ecosystem Synchronization (Node.js to Python AI)

**The Roadblock:** Syncing live transactional data from the Node.js backend to the Python machine learning model in real-time caused latency bottlenecks during the checkout flow.
**The Resolution:** Architected an asynchronous event-driven pipeline. Booking events trigger background payload dispatches to the Python service via internal REST endpoints. This allows the predictive model to ingest training data and update demand forecasts asynchronously, reducing user wait times to zero while maintaining an up-to-date AI ecosystem.

---

## ⚙️ Quick Start Setup

Deployed environments require a running instance of PostgreSQL and Node.js (v18+).

**Step 1: Clone and Install**

```bash
git clone https://github.com/yourusername/casalinga-tours.git
cd casalinga-tours
npm install

```

**Step 2: Environment Configuration**
Create a `.env` file in the root directory and configure the database connection:

```env
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME=casalinga_tours
DB_HOST=localhost
DB_PORT=5432
SESSION_SECRET=cryptographically_secure_string

```

*Initialize the database by executing the queries found in `setup.sql`.*

**Step 3: Launch the Application**

```bash
npm run dev

```

*The system will be accessible at `http://localhost:8200`.*
