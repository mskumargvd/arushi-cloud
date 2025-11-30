# 🛡️ Arushi Cloud: Next-Gen RMM & Security Platform

> **A Unified Remote Monitoring & Management (RMM) platform with deep OPNsense Firewall integration.** > *Monitor Servers. Manage Processes. Block Threats.*

---

## 📖 Project Overview
**Arushi Cloud** is a SaaS platform designed for Managed Service Providers (MSPs) and IT Admins. Unlike traditional RMM tools that only monitor CPU/RAM, Arushi Cloud integrates directly with **OPNsense Firewalls** to provide "Single Pane of Glass" security management.

It consists of three components:
1.  **The Agent (Python):** Runs on Windows, Linux, and FreeBSD (OPNsense). It collects stats, executes commands, and enforces security policies.
2.  **The Brain (Node.js):** A WebSocket server that acts as a real-time switchboard between the Dashboard and Agents.
3.  **The Dashboard (React):** A modern admin console for visualizing threats, managing processes, and deploying policies.

---

## ✨ Features (Current Status: v1.0 MVP)

### 🖥️ Remote Management
- [x] **Real-Time Monitoring:** Live WebSocket streams of CPU, RAM, Disk, and Uptime.
- [x] **Cross-Platform:** Single Python agent supports Windows, Linux (Ubuntu/Debian), and FreeBSD.
- [x] **Process Manager:** View top processes remotely and **Kill** stuck applications via the web.
- [x] **Remote Terminal:** Execute safe commands (`ping`, `logs`, `update`) remotely.

### 🛡️ Security & NGFW (OPNsense Integration)
- [x] **Threat Map:** Real-time visualization of attacks parsed from Suricata Logs (`eve.json`).
- [x] **App Control:** Block websites/apps (e.g., Facebook, YouTube) using Unbound DNS Sinkholing.
- [x] **Firewall Controls:** One-click IP Blocking (adds IPs to OPNsense Aliases).
- [x] **Disaster Recovery:** Remote config backup download.

### ⚙️ Platform Core
- [x] **Smart Distribution:** One-line installer command (`curl | bash`) for instant onboarding.
- [x] **Persistence:** Agents survive reboots (Systemd/Scheduled Task) and server restarts (Supabase DB).
- [x] **Audit Trails:** Full logs of who executed what command and the result.
- [x] **Alerting:** Real email alerts via Resend when agents go offline (30s grace period).

---

## 🛠️ Tech Stack

| Component | Technology | Hosting |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Recharts | Netlify |
| **Backend** | Node.js, Express, Socket.IO | Render.com |
| **Database** | PostgreSQL, Prisma ORM | Supabase |
| **Agent** | Python 3, `psutil`, `socketio`, `requests` | Client VM / VPS |
| **Alerts** | Nodemailer, Resend API | - |

---

## 🚀 Installation & Setup

### 1. Prerequisites
* Node.js v18+
* Python 3.9+
* PostgreSQL Database (Supabase recommended)

### 2. Backend Setup (`/server`)
```bash
cd server
npm install

# Create .env file
# DATABASE_URL="postgres://...:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgres://...:5432/postgres"
# AGENT_SECRET_KEY="your_secret_key"
# JWT_SECRET="your_jwt_secret"
# RESEND_API_KEY="re_123..."

# Push Schema to DB
npx prisma db push

# Start Server
node server.js