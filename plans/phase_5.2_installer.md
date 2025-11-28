# Phase 5.2: One-Line Installer - Implementation Plan

## Goal Description
Create scripts (`install.sh` and `install.ps1`) that users can run on their devices to automatically install and run the agent.

## Proposed Changes

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- Serve static files from a `public` directory (or specific routes) to host the install scripts.
- Ensure the `download/agent` endpoint is robust.

### Install Scripts
#### [NEW] [server/public/install.sh](file:///d:/Business/arushi-cloud/server/public/install.sh)
- **Target:** Linux / OPNsense (FreeBSD).
- **Logic:**
    1.  Check for Python 3.
    2.  Create directory `/opt/arushi-agent`.
    3.  Download `main.py` from Server.
    4.  Create a `systemd` service (Linux) or `rc.d` script (FreeBSD/OPNsense) to run it on boot.
    5.  Start the service.

#### [NEW] [server/public/install.ps1](file:///d:/Business/arushi-cloud/server/public/install.ps1)
- **Target:** Windows.
- **Logic:**
    1.  Create directory `C:\ArushiAgent`.
    2.  Download `main.py`.
    3.  Create a Scheduled Task to run the agent on boot (simplest method without external tools like NSSM).

## Verification Plan

### Manual Verification
- **Linux/OPNsense:** Run `curl http://localhost:3000/install.sh | bash`.
- **Windows:** Run `iwr http://localhost:3000/install.ps1 -useb | iex`.
- Verify the agent starts and appears in the dashboard.
