# Arushi Cloud: The OPNsense SaaS Roadmap

**Goal:** Build a "Command Center" for Managed Service Providers (MSPs) to manage multiple OPNsense firewalls without VPNs or port forwarding.
**Current Status:** Working Prototype (Ping/Stats).
**Target Status:** Production SaaS (Firewall Control, Backups, Alerts).

---

## 🏗️ Phase 1: The "Real" Backend (Data Persistence)
**Objective:** Ensure client data survives server restarts. Stop using SQLite/Memory.

### 1.1. Switch to PostgreSQL (Supabase/Neon)
* **Why:** SQLite on Render is deleted every 24h. You need a permanent cloud DB.
* **Action:**
    1.  Create free account on **Supabase.com**.
    2.  Get the connection string: `postgresql://postgres.xxxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`.
    3.  Update `.env` in your server folder: `DATABASE_URL="your_supabase_string"`.
    4.  Run migration: `npx prisma db push`.

### 1.2. User Authentication (Multi-Tenancy)
* **Why:** Currently hardcoded `admin123`. Clients need their own accounts.
* **Action:**
    1.  **Backend:** Add `register` and `login` endpoints in `server.js`. Use `bcrypt` to hash passwords and `jsonwebtoken` (JWT) for sessions.
    2.  **Middleware:** Update `io.use` to verify the User's JWT, not just a hardcoded agent key.
    3.  **Database:** Update `schema.prisma`:
        ```prisma
        model User {
          id       String  @id @default(uuid())
          email    String  @unique
          password String
          agents   Agent[] // Relation: One user has many agents
        }
        ```

---

## 🛡️ Phase 2: Deep OPNsense Integration (The "Product")
**Objective:** Move beyond "Monitoring" to "Management." Control the firewall rules.

### 2.1. The "Block IP" Feature (Firewall Wrapper)
* **Concept:** We don't write raw rules. We manage **Aliases** (Lists of IPs).
* **OPNsense Prep (Manual Step for Client):**
    * Create an Alias named `ARUSHI_BLOCKLIST`.
    * Create a WAN Rule: `Block` -> Source: `ARUSHI_BLOCKLIST`.
* **Agent Logic (`agent.py`):**
    * **Command:** `block_ip`
    * **API Call:** `POST /api/firewall/alias_util/add/ARUSHI_BLOCKLIST`
    * **Payload:** `{"address": "1.2.3.4"}`
* **Dashboard UI:**
    * Input box: "IP Address" -> Button: "Block Instantly".

### 2.2. The "Disaster Recovery" Feature (Backups)
* **Concept:** One-click backup of the entire firewall configuration.
* **Agent Logic:**
    * **Command:** `backup_config`
    * **API Call:** `GET /api/core/backup/download`
    * **Action:** Agent downloads the XML, encrypts it (optional), and streams it to your Cloud Server via WebSocket or HTTP Upload.
* **Cloud Logic:**
    * Save file to AWS S3 (or Supabase Storage) as `backup-{agentId}-{date}.xml`.
* **Dashboard UI:**
    * "Backups" Tab -> List of dates -> "Download" button.

### 2.3. The "Live Logs" Feature
* **Concept:** See who is attacking the firewall right now.
* **Agent Logic:**
    * **Command:** `get_logs`
    * **API Call:** `GET /api/diagnostics/log/core/firewall` (Limit to last 50 rows).
* **Dashboard UI:**
    * A "Matrix-style" scrolling log window showing `[Time] [Source IP] [Action: Blocked]`.

---

## 📦 Phase 3: The "One-Click" Distribution
**Objective:** Make it easy for a non-technical person to install.

### 3.1. The "Smart" Installer Script
* **Linux/BSD (OPNsense):**
    * Create `install.sh`.
    * It detects the OS (`FreeBSD` vs `Linux`).
    * Installs Python & Dependencies (`pkg install python3 py39-psutil`).
    * Downloads your `agent.py`.
    * Asks user for the "Install Key" (from Dashboard).
    * Creates a `rc.d` service so it starts on boot.
* **Windows:**
    * Use the `install.ps1` we drafted.
    * Downloads `agent.exe` and registers it as a Scheduled Task or Service.

### 3.2. Dashboard "Add Agent" Wizard
* **UI:** A big "Add Device" button.
* **Step 1:** Select OS (Windows / OPNsense / Linux).
* **Step 2:** Show the exact command to copy-paste.
    * *Example:* `curl -sL arushi.com/install.sh | sudo bash -s -- --key=USER_UNIQUE_KEY`

---

## 🚀 Phase 4: Commercial Polish (Ready to Sell)
**Objective:** Look like a billion-dollar company.

### 4.1. The "Security Score" Widget
* **Logic:** Calculate a score (0-100) based on checks.
    * Is CPU < 80%? (+10 pts)
    * Is Firmware updated? (+20 pts)
    * Is "Blocklist" active? (+20 pts)
* **UI:** A big Donut Chart on the main dashboard. Clients love this.

### 4.2. Email Alerts (SendGrid/Resend)
* **Trigger:** If `socket.on('disconnect')` happens and the agent doesn't reconnect in 5 minutes.
* **Action:** Send email: "ALERT: Firewall [Name] is DOWN."

### 4.3. Whitelabeling (Optional Upsell)
* **Feature:** Allow MSPs to upload their *own* logo to replace the "Arushi" logo on the report PDF.

---

## 🗓️ Execution Timeline (Solo Dev)

| Week | Focus Area | Key Deliverables |
| :--- | :--- | :--- |
| **1** | **Persistence** | Switch to Postgres. Build User Login/Register API. |
| **2** | **OPNsense Core** | Implement `block_ip` and `backup_config` in Python Agent using local API. |
| **3** | **Dashboard II** | Build the "Firewall Controls" UI and "Backups" list in React. |
| **4** | **Distribution** | Write the `install.sh` and `install.ps1` scripts. Test on fresh VMs. |
| **5** | **Alerts/Logs** | Build the Live Log viewer and Email Alerting system. |
| **6** | **Launch** | Deploy to Production URL. Onboard first Beta Tester. |