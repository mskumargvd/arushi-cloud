# Phase 2.3: Auto-Updater - Implementation Plan

## Goal Description
Allow the Agent to self-update by downloading a new version of itself from the server and restarting.

## Proposed Changes

### Agent (Python)
#### [MODIFY] [main.py](file:///d:/Business/arushi-cloud/agent/main.py)
- Add `CURRENT_VERSION = "1.0.0"` constant.
- Add `check_for_updates` method to `BaseAgent`.
- Implement `self_update` logic:
    1.  Fetch `version.json` (or similar) from Server.
    2.  If `remote_version > CURRENT_VERSION`:
        - Download `agent.py` (or executable).
        - Rename current file to `agent.py.bak`.
        - Write new file.
        - Restart process using `os.execv`.

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- Add a simple HTTP endpoint `/api/version` returning `{"version": "1.0.1", "url": "..."}`.
- Serve static files (the new agent script) if needed.

## Verification Plan

### Manual Verification
- **Simulated Update:**
    - Change `CURRENT_VERSION` to "0.9.9".
    - Trigger update command.
    - Verify Agent restarts and prints "Starting Arushi Cloud Agent...".
