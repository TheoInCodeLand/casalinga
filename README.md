<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=1e6b38&height=150&section=header&text=Casalinga%20Tours&fontSize=50&fontColor=ffffff&animation=fadeIn" width="100%" alt="Header banner" />

### An AI-integrated booking ecosystem designed to eliminate manual scheduling chaos, sync role-based dashboards, and save operators 15+ hours of admin work per week.

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

<br>

<a href="https://your-live-demo-link.com" target="_blank">
  <img src="https://img.shields.io/badge/🚀_VIEW_LIVE_DEMO-1e6b38?style=for-the-badge" alt="View Live Demo" />
</a>
&nbsp;&nbsp;
<a href="https://github.com/yourusername/casalinga-tours" target="_blank">
  <img src="https://img.shields.io/badge/💻_VIEW_SOURCE_CODE-000000?style=for-the-badge&logo=github&logoColor=white" alt="View Source Code" />
</a>

<br><br>

<img src="docs/dashboard-preview.gif" alt="Admin Dashboard & Analytics Demo" width="100%" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);"/>
<br>
<i>Real-time revenue tracking, predictive insights, and interactive capacity management.</i>

</div>

---

## 📸 System Gallery

<details>
<summary><b>✨ Click to expand screenshots</b></summary>
<br>
<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=1.+Public+Home+Page+&+Tour+Browsing" alt="Home Page" width="49%" style="border-radius: 8px;"/>
  <img src="https://via.placeholder.com/800x450.png?text=2.+Customer+Booking+Checkout+Flow" alt="Booking Flow" width="49%" style="border-radius: 8px;"/>
</div>
<br>
<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=3.+Customer+Dashboard+&+History" alt="Customer Dashboard" width="49%" style="border-radius: 8px;"/>
  <img src="https://via.placeholder.com/800x450.png?text=4.+Admin+User+&+Role+Management" alt="Admin Dashboard" width="49%" style="border-radius: 8px;"/>
</div>
</details>

---

## 🚀 The Context

### The Problem
Casalinga Tours initially approached me requesting a simple, static portfolio website to display their marketing posters. During our discovery phase, I mapped out their operational workflow and found that their entire business was running on a fragmented mix of Instagram/TikTok DMs, WhatsApp threads, emails, and phone calls. 

This manual approach to managing inventory and customer data was highly unscalable. It created massive administrative bottlenecks, a high risk of double-booked tours, disorganized payment tracking, and zero visibility into their actual business metrics.

### The Solution
Instead of simply building the requested static brochure site, I pitched and engineered a centralized, full-stack booking ecosystem. I transformed their manual operation into an automated MVC platform that digitizes the entire booking lifecycle. The system now features real-time capacity management to eliminate scheduling conflicts, dedicated dashboards for different user roles, and hooks into a machine learning service to deliver predictive business intelligence.

---

## 💻 Tech Stack

<div align="center">

| Domain | Technologies |
| :--- | :--- |
| **Frontend UI** | `EJS (Embedded JS)` `Tailwind CSS` `Chart.js` `Lucide Icons` |
| **Backend Core** | `Node.js` `Express.js` `RESTful APIs` |
| **Database** | `PostgreSQL` `pg (node-postgres)` |
| **Security**| `Bcrypt` `Helmet` `Express-Session` |
| **AI Integration** | `Python` `Scikit-learn` *(Demand Forecasting)* |

</div>

---

## ⚡ Top 3 Features

1. **Atomic Booking Engine:** Real-time capacity verification that actively prevents overbooking using database-level constraints and row locking.
2. **AI-Powered Demand Forecasting:** Seamless communication between the Node backend and a Python ML model to analyze historical data and predict high-traffic dates.
3. **Role-Based BI Dashboards:** Custom portals for Customers, Managers, and Admins featuring interactive revenue trends and automated report generation.

---

## 🧠 Architectural Decisions (The "Why")

When designing this system, I prioritized scalability, data integrity, and performance. 



[Image of MVC software architecture diagram]


* **Why PostgreSQL instead of MongoDB?**
  A booking system deals with money and limited inventory, meaning absolute data integrity (ACID compliance) is non-negotiable. I opted for PostgreSQL because the relational model maps perfectly to the complex connections between Users, Tours, and Bookings. It also allowed me to utilize robust SQL features like row-level locking to handle concurrent bookings safely.
* **Why the Node/Express + EJS Stack?**
  I needed highly efficient, non-blocking I/O to handle multiple users browsing and booking simultaneously. I chose server-side rendering with EJS to ensure fast initial load times and straightforward routing, avoiding the heavy overhead of a Single Page Application (SPA) framework while keeping the UI dynamic and SEO-friendly.
* **Why decoupled Python ML Services?**
  Because Node.js is single-threaded, running a heavy machine learning model directly on the backend would block the event loop and freeze the app for all users. I architected the ML engine as a completely separate Python service to keep the main booking API fast and responsive.

---

## 🛠 Challenges Overcome

As a developer, I believe the true test of a system is how it handles edge cases. Here are two critical architectural hurdles I solved:

### 1. Handling Concurrency and Race Conditions
**The Roadblock:** What happens if two different users try to book the exact same, final spot on a tour at the exact same millisecond? Relying solely on JavaScript validation meant both requests could theoretically pass, resulting in negative capacity and an overbooked tour.

**The Fix:** I moved the validation logic down to the database layer. I engineered a strict transactional workflow utilizing `BEGIN`, `COMMIT`, and `ROLLBACK` alongside `FOR UPDATE` row-level locking. This optimization ensures that checking capacity and inserting the booking are treated as a single, atomic action, guaranteeing 100% data integrity even during high traffic spikes.

### 2. Synchronizing Node.js with the Python ML Model
**The Roadblock:** Initially, syncing live transactional data from Node.js to the Python service in real-time caused noticeable latency. Forcing the user to wait for the ML model to ingest data during checkout created a sluggish user experience.

**The Fix:** I architected an asynchronous, event-driven pipeline. Instead of blocking the checkout flow, successful bookings now trigger background payload dispatches to the Python service. The predictive model updates its demand forecasts asynchronously, completely removing the bottleneck and reducing user wait times to zero.

---

## ⚙️ Quick Start Setup

To run this project locally, you will need **Node.js (v18+)** and an active **PostgreSQL** instance.

**Step 1: Clone and Install**
```bash
git clone [https://github.com/yourusername/casalinga-tours.git](https://github.com/yourusername/casalinga-tours.git)
cd casalinga-tours
npm install
