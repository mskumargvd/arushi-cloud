# Arushi Cloud Manager: Development Roadmap (Zero to Production)

**Objective:** Transform the local "Hello World" prototype into a secure, multi-tenant SaaS platform for managing OPNsense firewalls and Windows/Linux servers.
**Timeline:** Approx. 10–12 Weeks (Solo Developer Speed)
**Tech Stack:** React (Frontend), Node.js (Backend), Python (Agent), PostgreSQL/Redis (Data).

---

## 🚩 Phase 1: Security Core (The "Do Not Get Hacked" Phase)
**Goal:** Secure the WebSocket connection so random people cannot hijack your agents.
**Current State:** Agents connect openly. No passwords.

### 1.1. Implement Agent Authentication
* **Task:** Modify `agent.py` to send a secret `API_KEY` during connection.
* **Task:** Middleware in `server.js` to reject connections without a valid key.
* **Code Logic:**
    * **Agent:** `sio.connect(url, auth={'token': 'MY_SECRET_KEY'})`
    * **Server:** Check `socket.handshake.auth.token` against a database or `.env` file.

### 1.2. Secure Command Execution (Input Sanitation)
* **Critical:** Prevent "Command Injection" attacks.
* **Task:** Update `agent.py`. Never run raw strings like `os.system(cmd)`.
* **Fix:** Continue using `subprocess.run(['cmd', 'arg1'], shell=False)`.
* **Validation:** Add a whitelist. Only allow specific commands (`ping`, `pkg update`, `ufw`). Reject everything else.

---

## 🛠️ Phase 2: The Universal Agent (Device Logic)
**Goal:** Make `agent.py` smart enough to handle OPNsense (FreeBSD), Windows, and Linux automatically.

### 2.1. Build the "OS Detector" Module
* **Task:** Create a class structure in Python.
    * `BaseAgent`: Shared logic (WebSocket connection, Heartbeat).
    * `WindowsAgent(BaseAgent)`: Windows-specific commands (PowerShell).
    * `LinuxAgent(BaseAgent)`: Linux commands (Bash/Systemd).
    * `OPNsenseAgent(BaseAgent)`: OPNsense API calls.
* **Logic:** On startup, detect `platform.system()` and load the correct class.

### 2.2. Implement OPNsense Specifics (The Core Product)
* **Prerequisite:** Install OPNsense in VirtualBox (as discussed).
* **Task:** Write Python functions to interact with the local OPNsense API.
    * `get_firewall_logs()`: Call `/api/diagnostics/log/core/firewall`.
    * `backup_config()`: Call `/api/core/backup/download`.
    * `update_firmware()`: Run `pkg update`.

### 2.3. Build the Auto-Updater
* **Problem:** How do you update the Python script on 1,000 machines?
* **Task:** Write a `self_update()` function in the agent.
    1.  Check Cloud for a new version number.
    2.  Download `agent_v2.exe` or `agent_v2.py`.
    3.  Replace the old file and restart the service.

---

## 💾 Phase 3: The SaaS Backend (Multi-Tenancy)
**Goal:** Allow multiple users (MSPs) to log in and see *only* their devices.

### 3.1. Set up the Database (PostgreSQL)
* **Schema Design:**
    * `Users` table (email, password_hash).
    * `Devices` table (device_id, owner_id, os_type, last_seen).
    * `Logs` table (device_id, timestamp, message).
* **Task:** Connect Node.js to PostgreSQL using `Prisma` or `Sequelize`.

### 3.2. Build the "Device Registration" Flow
* **Workflow:**
    1.  User logs in to Dashboard -> Clicks "Add Device".
    2.  Server generates a unique `INSTALL_KEY`.
    3.  User runs installer script on their server: `curl arushi.com/install.sh?key=INSTALL_KEY`.
    4.  Agent connects using that key. Server links Agent ID to User ID.

### 3.3. Data Persistence (Redis)
* **Task:** Store "Live Stats" (CPU/RAM) in Redis (fast access).
* **Task:** Store "Historical Data" (Uptime logs) in PostgreSQL (long-term storage).

---

## 📊 Phase 4: The Dashboard Experience (Frontend)
**Goal:** Move from a "Debug Screen" to a "Professional Dashboard."

### 4.1. Historical Charts
* **Tool:** Use `Recharts` or `Chart.js`.
* **Feature:** Click a device -> View "CPU Usage over last 24 Hours."
* **Backend:** Create an API endpoint `/api/stats/history/:deviceId`.

### 4.2. The "Command Center" UI
* **Feature:** A "Terminal-like" window in the browser.
* **Logic:**
    1.  User types command in React.
    2.  Node.js sends it to Agent via WebSocket.
    3.  Agent runs it and streams stdout (text output) back line-by-line.
    4.  React appends text to the black console window.

### 4.3. Alerting System
* **Feature:** If a device goes "Offline" (disconnects from WebSocket), show a Red Alert on the dashboard.
* **Feature:** Send an email notification (using SendGrid/Resend) to the user.

---

## 🚀 Phase 5: Deployment (Going Live)
**Goal:** Move off `localhost`.

### 5.1. Cloud Infrastructure
* **Server:** Rent a VPS (DigitalOcean/Hetzner) ~ $5/mo.
* **Dockerize:** Create a `Dockerfile` for your Node.js server and a `docker-compose.yml` for the Database + Redis.
* **Domain:** Buy `arushicloud.com` (or similar). Point DNS to your VPS IP.
* **SSL:** Set up Nginx + Certbot (Let's Encrypt) for HTTPS/WSS security.

### 5.2. The "One-Line Installer"
* **Linux/OPNsense:** Write a Bash script (`install.sh`) that:
    1.  Installs Python & Pip.
    2.  Downloads your `agent.py`.
    3.  Creates a `systemd` service file (`arushi-agent.service`) so it runs in the background.
* **Windows:** Create a PowerShell script (`install.ps1`) that:
    1.  Downloads your `agent.exe`.
    2.  Uses NSSM to install it as a Windows Service.

---

## ✅ Final Checklist: Definition of "Done"
You are ready to sell when:
- [ ] You can log in to your website (Auth).
- [ ] You can copy a "Install Command" from the dashboard.
- [ ] You can run that command on a fresh VM (Windows/Linux).
- [ ] The device appears "Online" in the dashboard instantly.
- [ ] You can click "Update" and the VM actually updates.
- [ ] If you reboot the VM, the Agent starts automatically.