<div align="center">

Casalinga Tours: Full-Stack Booking & Analytics Platform
An AI-integrated booking ecosystem designed to eliminate manual scheduling chaos, sync role-based dashboards, and save operators 15+ hours of admin work per week.

</div>

<div align="center">
<img src="docs/dashboard-preview.gif" alt="Admin Dashboard & Analytics Demo" width="800"/>



<i>Real-time revenue tracking and interactive capacity management.</i>
</div>

🚀 The Context
The Problem
Many independent tour operators still run their businesses on a messy mix of WhatsApp threads, manual spreadsheets, and phone calls. This fragmented approach inevitably leads to double-booked tours, disorganized payment tracking, and zero visibility into business trends.

The Solution
I engineered a centralized, full-stack MVC platform to completely digitize the booking lifecycle. The application automates capacity management to prevent scheduling conflicts, provides dedicated dashboards for different user roles, and hooks into a machine learning service to offer predictive business insights.

💻 Tech Stack
Frontend

Templating: EJS (Embedded JavaScript)

Styling: Tailwind CSS, Custom CSS Variables

Data Visualization: Chart.js

Backend

Core: Node.js, Express.js

Security & Auth: Bcrypt, Helmet, Express-Session

Architecture: Strict MVC (Model-View-Controller)

Database & Machine Learning

Primary Database: PostgreSQL

AI Integration: Python, Scikit-learn (Demand forecasting)

⚡ Top 3 Features
Atomic Booking Engine: Real-time capacity verification that actively prevents overbooking using database-level constraints.

AI-Powered Demand Forecasting: Seamless communication between the Node backend and a Python ML model to analyze historical data and predict high-traffic dates.

Role-Based BI Dashboards: Custom portals for Customers, Managers, and Admins featuring interactive revenue trends and automated report generation.

🧠 Architectural Decisions (The "Why")
Why PostgreSQL instead of MongoDB?
A booking system deals with money and limited inventory, meaning absolute data integrity (ACID compliance) is non-negotiable. I opted for PostgreSQL because the relational model maps perfectly to the complex connections between Users, Tours, and Bookings. It also allowed me to utilize robust SQL features like row-level locking to handle concurrent bookings safely.

Why the Node/Express + EJS Stack?
I needed highly efficient, non-blocking I/O to handle multiple users browsing and booking simultaneously. I chose server-side rendering with EJS to ensure fast initial load times and straightforward routing, avoiding the heavy overhead of a Single Page Application framework while keeping the UI dynamic.

Why decoupled Python ML Services?
Because Node.js is single-threaded, running a heavy machine learning model directly on the backend would block the event loop and freeze the app for all users. I architected the ML engine as a completely separate Python service to keep the main booking API fast and responsive.

🛠 Challenges Overcome
1. Handling Concurrency and Race Conditions
The Roadblock: What happens if two different users try to book the exact same, final spot on a tour at the exact same millisecond? Relying solely on JavaScript validation meant both requests could theoretically pass, resulting in negative capacity and an overbooked tour.
The Fix: I moved the validation logic down to the database layer. I engineered a strict transactional workflow utilizing BEGIN, COMMIT, and ROLLBACK alongside FOR UPDATE row-level locking. This optimization ensures that checking capacity and inserting the booking are treated as a single, atomic action, guaranteeing 100% data integrity even during high traffic spikes.

2. Synchronizing Node.js with the Python ML Model
The Roadblock: Initially, syncing live transactional data from Node.js to the Python service in real-time caused noticeable latency. Forcing the user to wait for the ML model to ingest data during checkout created a sluggish user experience.
The Fix: I architected an asynchronous, event-driven pipeline. Instead of blocking the checkout flow, successful bookings now trigger background payload dispatches to the Python service. The predictive model updates its demand forecasts asynchronously, completely removing the bottleneck and reducing user wait times to zero.

⚙️ Quick Start Setup
To run this project locally, you will need Node.js (v18+) and an active PostgreSQL instance.

Step 1: Clone and Install

Bash
git clone https://github.com/yourusername/casalinga-tours.git
cd casalinga-tours
npm install
Step 2: Environment Configuration
Create a .env file in the root directory and configure your database variables:

Code snippet
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=casalinga_tours
DB_HOST=localhost
DB_PORT=5432
SESSION_SECRET=your_random_secret_string
Note: Run the queries in setup.sql in your pgAdmin or terminal to initialize the tables.

Step 3: Launch the Application

Bash
npm run dev
The system will now be accessible at http://localhost:8200.
