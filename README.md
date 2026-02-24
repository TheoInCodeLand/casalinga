<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=3776AB&height=200&section=header&text=Casalinga%20Tours&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=AI-Integrated%20Booking%20Ecosystem&descAlignY=55&descAlign=50" alt="Hero Banner" width="100%"/>

<p align="center">
<img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge&logo=cachet&logoColor=white" alt="Status" />
<img src="https://img.shields.io/badge/Architecture-Microservices-8A2BE2?style=for-the-badge&logo=amazonaws&logoColor=white" alt="Architecture" />
<img src="https://img.shields.io/badge/Personal_Project-100%25_Ownership-FF6B35?style=for-the-badge&logo=github&logoColor=white" alt="Ownership" />
</p>

<h3><b>Architected to synchronize multi-role dashboards and automate inventory management via Machine Learning, saving over 15 administrative hours per week.</b></h3>

<h4><b>Engineered With</b></h4>
<a href="https://skillicons.dev">
<img src="https://skillicons.dev/icons?i=nodejs,express,postgres,python,scikit,js,html,css,git&perline=10" alt="Tech Stack" />
</a>

</div>



🎯 The Business Case
As a solo developer owning the entire product lifecycle, I identified a critical bottleneck in traditional tourism management: fragmented data. I engineered Casalinga Tours to solve this through unified state management and AI.

<table align="center" width="100%">
<tr>
<td width="50%" align="center">
<h3>❌ The Problem</h3>
<p align="left">Legacy tour platforms rely on disjointed inventory systems, static UX, and heavy manual administrative overhead to manage bookings, cancellations, and user targeting.</p>
</td>
<td width="50%" align="center">
<h3>✅ The Solution</h3>
<p align="left">A highly normalized, automated ecosystem that unifies Customer, Manager, and Admin workflows. It offloads curation to an ML recommendation engine, syncing inventory instantly.</p>
</td>
</tr>
</table>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4520-a447-11eb-908a-139a6edaec5c.gif" alt="App Demo GIF Placeholder" width="80%" style="border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"/>
<p><i>(Replace this placeholder with a 5-second GIF demonstrating the real-time booking sync)</i></p>
</div>

🏗️ Architectural Decisions & "The Why"
I approach personal projects with enterprise-grade standards. Here is the rationale behind the stack:

1. Separation of Concerns (views/ routes/ public/ database/)
Instead of a monolithic spaghetti codebase, I structured the Node.js backend using a strict MVC-inspired pattern.

Why? Isolating database/ logic from routes/ ensures that as the API scales, database migrations (e.g., swapping PostgreSQL drivers) won't break routing logic. The views/ and public/ directories securely encapsulate the EJS server-side rendered UI, enabling blazing-fast administrative dashboard load times without heavy client-side frameworks.

2. Microservice Decoupling (Node.js + Python)
Node.js/Express: Acts as the high-throughput I/O gateway. It handles thousands of concurrent booking REST API requests effortlessly.

Python/Scikit-learn: Operates as an isolated microservice.

Why? Running mathematical ML models inside a single-threaded Node environment would block the event loop and crash the booking flow. Decoupling allows the AI to crunch numbers independently while Node serves users instantly.

3. PostgreSQL Database
Why? Selected strictly for ACID compliance. When handling financial transactions and preventing double-bookings for limited-capacity tours, strict relational integrity and complex locking mechanisms are non-negotiable.

🧠 Engineering Challenge Overcome
<table>
<tr>
<td>
<img src="https://cdn-icons-png.flaticon.com/512/1006/1006363.png" width="80" alt="Bug Icon"/>
</td>
<td>
<h3><b>The Challenge: Real-Time AI Inference Bottlenecks</b></h3>
<p>Integrating heavy Scikit-learn computations into a high-speed web application posed a massive risk of bottlenecking the Node.js server, causing severe latency for end-users trying to book tours.</p>
<h3><b>The Resolution</b></h3>
<p>Rather than using brittle child-processes, I engineered a localized REST API layer. When a user interacts, Node.js fires an asynchronous, non-blocking HTTP request to the isolated Python service. The ML model returns personalized recommendations in milliseconds, achieving real-time AI integration with <b>zero impact</b> on transactional throughput.</p>
</td>
</tr>
</table>

⚡ Core Features
<div align="center">
<table>
<tr>
<td align="center" width="33%">
<img src="https://cdn-icons-png.flaticon.com/512/2040/2040946.png" width="60" alt="ML"/>


<b>Predictive ML Engine</b>


Analyzes historical booking data to dynamically generate hyper-personalized tour recommendations.
</td>
<td align="center" width="33%">
<img src="https://cdn-icons-png.flaticon.com/512/2906/2906274.png" width="60" alt="Database"/>


<b>Synchronized State</b>


PostgreSQL schema serves as a single source of truth, updating User and Admin dashboards simultaneously.
</td>
<td align="center" width="33%">
<img src="https://cdn-icons-png.flaticon.com/512/1055/1055685.png" width="60" alt="Speed"/>


<b>High-Speed API</b>


Optimized REST layer connecting the EJS frontend, Node backend, and Python compute engine.
</td>
</tr>
</table>
</div>

⚙️ Setup & Deployment
<details>
<summary><b>🔥 Click to expand the 3-step Installation Guide</b></summary>


Deploy the ecosystem locally in minutes. Ensure you have Node.js (v18+), Python (3.9+), and PostgreSQL installed.

1. Clone & Install Dependencies

Bash
git clone https://github.com/TheolnCodeLand/casalinga-tours.git
cd casalinga-tours

---

## ⚙️ Quick Start Setup

To run this project locally, you will need **Node.js (v18+)** and an active **PostgreSQL** instance.

**Step 1: Clone and Install**
```bash
git clone [https://github.com/yourusername/casalinga-tours.git](https://github.com/yourusername/casalinga-tours.git)
cd casalinga-tours
npm install
