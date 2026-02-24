<div align="center">

<img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&h=350&q=80" alt="Aviation and Travel Concept" width="100%" style="border-radius: 15px; object-fit: cover;" />

<br/>

<h1>🌍 Casalinga Tours: AI-Powered Travel Ecosystem</h1>
<h3>An Enterprise-Grade Booking Ecosystem & AI Concierge</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-MVC-1e6b38?style=for-the-badge" alt="Architecture"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL-316192?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/AI-Gemini_2.5-8E75B2?style=for-the-badge&logo=googlebard" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" alt="Status"/>
</p>

*An enterprise-grade, AI-integrated booking ecosystem engineered to synchronize administrative dashboards, manage real-time inventory, and automate customer engagement.*

---

### 🚀 LIVE DEMO & TESTING

The application is deployed and ready for evaluation. Experience the ecosystem from both the client and administrative perspectives.

**https://www.casalingatours.online/**

| Access Level | Email | Password | What to Test |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@casalingatours.com` | `AdminTest2026!` | Revenue analytics, tour creation, and AI knowledge training. |
| **Traveler (User)** | `traveler@demo.com` | `TravelDemo2026!` | Tour booking, PDF e-ticket generation, and AI concierge chat. |

</div>

<br/>

## 🛸 Conceptual Architecture

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Data-Driven Intelligence</b><br/>
      <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&h=400&q=80" width="100%" alt="Data Analytics Concept" style="border-radius: 10px;"/>
      <br/><i>Representing the raw SQL analytics pipeline tracking the complete booking funnel.</i>
    </td>
    <td width="50%" align="center">
      <b>Automated Concierge Services</b><br/>
      <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&h=400&q=80" width="100%" alt="AI Concept" style="border-radius: 10px;"/>
      <br/><i>Representing the Gemini AI integration injecting real-time context into traveler inquiries.</i>
    </td>
  </tr>
</table>

## 🧠 Project Context

**The Problem:** Traditional travel booking systems suffer from fragmented data, requiring excessive administrative overhead to synchronize customer inquiries, inventory capacity, and payment statuses. 

**The Solution:** A centralized, full-stack application was architected to unify the booking pipeline. The system automates e-ticket generation, enforces real-time capacity constraints to prevent overbooking, and integrates a custom-trained AI concierge to handle immediate customer inquiries, reducing manual support requirements.

## ⚡ Core Features

<details>
  <summary><b>🤖 1. Intelligent AI Concierge ("Casi")</b> <i>(Click to expand)</i></summary>
  <br/>
  The Gemini AI API was integrated by injecting real-time PostgreSQL context (tour availability, user booking history) into the prompt matrix. This constrains the LLM to provide hyper-relevant, hallucinatory-free customer support and personalized tour recommendations based on live pricing.
</details>

<details>
  <summary><b>🛡️ 2. Deterministic Booking Engine</b> <i>(Click to expand)</i></summary>
  <br/>
  A robust transaction system was engineered to calculate live availability against dynamic capacities. It includes custom webhook integrations for PayFast and automated PDF e-ticket generation complete with QR code placeholders and bespoke user configurations.
</details>

<details>
  <summary><b>📊 3. Zero-Filled Analytics Dashboard</b> <i>(Click to expand)</i></summary>
  <br/>
  An analytics pipeline was developed utilizing raw SQL <code>generate_series</code> for zero-filled revenue mapping, tracking the complete user funnel from visitor, to favorited tour, to confirmed booking.
</details>

<br/>

## 🛠 The Stack

<table width="100%" align="center">
  <tr>
    <th width="25%">Frontend</th>
    <th width="25%">Backend</th>
    <th width="25%">Database & Infrastructure</th>
    <th width="25%">Integrations</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://img.shields.io/badge/EJS-B4CA65?style=flat-square&logo=ejs&logoColor=black" /><br/>
      <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Lucide_Icons-FF6C37?style=flat-square" />
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Express.js-404D59?style=flat-square" /><br/>
      <img src="https://img.shields.io/badge/Bcrypt-Security-red?style=flat-square" />
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Neon_Serverless-00E599?style=flat-square" />
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=flat-square&logo=googlebard&logoColor=white" /><br/>
      <img src="https://img.shields.io/badge/Nodemailer-22B573?style=flat-square" /><br/>
      <img src="https://img.shields.io/badge/PDFKit-Generate-blue?style=flat-square" />
    </td>
  </tr>
</table>

## 📐 Architectural Decisions ("The Why")

* **Relational Database Over NoSQL:** PostgreSQL was selected over document stores to enforce strict data integrity. Features like booking capacity limits and revenue analytics require complex `JOIN` operations and aggregate functions that are significantly more performant and reliable in a structured relational model.
* **Strict Separation of Concerns:** The architecture heavily utilizes a modular `views/`, `routes/`, `public/`, and `database/` folder structure. This pattern ensures that routing logic, business logic, and presentation layers remain entirely decoupled for scalable feature iteration.
* **Server-Side Rendering (SSR):** EJS was chosen to ensure high SEO performance for public-facing tour pages and to maintain absolute control over the initial payload speed, eliminating the "loading spinner" fatigue common in heavy Client-Side Rendered applications.

## 🚧 Technical Challenge Overcome

> **Asynchronous Network Bottlenecks in Production**
> 
> **The Roadblock:** During cloud deployment, the application experienced indefinite hangs during user registration. Implicit SSL (Port 465) connections were being blocked by the hosting provider's firewall, causing the Node event loop to halt.
> 
> **The Fix:** The Nodemailer architecture was refactored to force IPv4 routing via Port 587 (Explicit SSL/STARTTLS). Strict `connectionTimeout` and `socketTimeout` parameters were implemented, wrapping the service in a fail-safe `try/catch` block. This ensured that PostgreSQL database transactions (user creation) succeeded seamlessly and provided a fallback UI state even if the third-party SMTP server experienced severe latency.

## ⚙️ Setup & Installation Guide

**Step 1: Clone & Install**
```bash
git clone [https://github.com/USERNAME/casalinga-tours.git](https://github.com/USERNAME/casalinga-tours.git)
cd casalinga-tours
npm install
