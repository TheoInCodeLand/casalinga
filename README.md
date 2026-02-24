<div align="center">

<img src="https://via.placeholder.com/1200x350/1e6b38/ffffff?text=Casalinga+Tours:+AI-Powered+Ecosystem" alt="Casalinga Tours Hero" width="100%" style="border-radius: 15px;" />

<br/>

<h1>🌍 Casalinga Tours</h1>
<h3>An Enterprise-Grade Booking Ecosystem & AI Concierge</h3>

<p align="center">
  <a href="#-the-problem"><img src="https://img.shields.io/badge/Architecture-MVC-1e6b38?style=for-the-badge" alt="Architecture"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Database-PostgreSQL_Neon-316192?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/></a>
  <a href="#-ai-integration"><img src="https://img.shields.io/badge/AI-Gemini_2.5-8E75B2?style=for-the-badge&logo=googlebard" alt="Gemini AI"/></a>
  <a href="#-status"><img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" alt="Status"/></a>
</p>

*Architected to synchronize administrative dashboards, manage real-time inventory, and automate customer engagement.*

</div>

<br/>

## 🛸 System Preview

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Client Booking Flow</b><br/>
      <img src="https://via.placeholder.com/600x400/faf8f5/1e6b38?text=Animated+GIF:+Booking+Flow" width="100%" alt="Booking Flow GIF"/>
    </td>
    <td width="50%" align="center">
      <b>Admin Analytics Dashboard</b><br/>
      <img src="https://via.placeholder.com/600x400/faf8f5/1e6b38?text=Animated+GIF:+Admin+Dashboard" width="100%" alt="Admin Dashboard GIF"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>"Casi" AI Concierge Live Chat</b><br/>
      <img src="https://via.placeholder.com/600x400/faf8f5/1e6b38?text=Screenshot:+Gemini+AI+Chat" width="100%" alt="AI Chatbot"/>
    </td>
    <td width="50%" align="center">
      <b>Automated E-Ticket Generation</b><br/>
      <img src="https://via.placeholder.com/600x400/faf8f5/1e6b38?text=Screenshot:+PDF+Ticket" width="100%" alt="PDF Generation"/>
    </td>
  </tr>
</table>

## 🧠 The Architecture

<table width="100%">
  <tr>
    <td width="60%" valign="top">
      <h3>The Problem</h3>
      <p>Traditional travel booking systems suffer from fragmented data, requiring excessive administrative overhead to synchronize customer inquiries, inventory capacity, and payment statuses.</p>
      <h3>The Engineering Solution</h3>
      <p>I engineered a centralized, full-stack application that unifies the booking pipeline. The system enforces real-time capacity constraints at the database level to prevent overbooking, automates personalized e-ticket generation via PDFKit, and integrates a custom-trained AI concierge to handle immediate customer inquiries based on live database context.</p>
    </td>
    <td width="40%" align="center" valign="middle">
      <img src="https://via.placeholder.com/400x400/1e6b38/ffffff?text=System+Architecture+Diagram" width="100%" alt="Architecture Diagram"/>
      <br/>
      <i>High-level data flow diagram</i>
    </td>
  </tr>
</table>

## ⚡ Interactive Feature Breakdown

<details>
  <summary><b>🤖 1. Intelligent AI Concierge ("Casi")</b> <i>(Click to expand)</i></summary>
  <br/>
  Integrated the <b>Gemini AI API</b>, injecting real-time PostgreSQL context (tour availability, user booking history) into the prompt matrix. This constrains the LLM to provide hyper-relevant, hallucinatory-free customer support and personalized tour recommendations based on live pricing.
</details>

<details>
  <summary><b>🛡️ 2. Deterministic Booking Engine</b> <i>(Click to expand)</i></summary>
  <br/>
  Engineered a robust transaction system that calculates live availability against dynamic capacities. Includes custom webhook integrations for PayFast and automated PDF e-ticket generation complete with QR code placeholders and bespoke user configurations.
</details>

<details>
  <summary><b>📊 3. Data-Driven Admin Dashboard</b> <i>(Click to expand)</i></summary>
  <br/>
  Developed an analytics pipeline utilizing raw SQL <code>generate_series</code> for zero-filled revenue mapping, tracking the complete user funnel from visitor, to favorited tour, to confirmed booking.
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

## 🚧 Engineering Challenges Overcome

> **Asynchronous Network Bottlenecks in Production**
> **The Roadblock:** During cloud deployment, the application experienced indefinite hangs during user registration. Implicit SSL (Port 465) connections were being blocked by the hosting provider's firewall.
> **The Fix:** Refactored the Nodemailer architecture to force IPv4 routing via Port 587 (Explicit SSL/STARTTLS). Implemented strict `connectionTimeout` and `socketTimeout` parameters, wrapping the service in a fail-safe `try/catch` block to ensure PostgreSQL database transactions (user creation) succeeded seamlessly even if the third-party SMTP server experienced latency.

---
<div align="center">
  <p><i>Engineered by Theophilus Thobejane</i></p>
  <a href="https://linkedin.com/in/yourprofile"><img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin"/></a>
  <a href="mailto:thobejanetheo@gmail.com"><img src="https://img.shields.io/badge/Email-Contact_Me-EA4335?style=for-the-badge&logo=gmail"/></a>
</div>
