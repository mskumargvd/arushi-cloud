# Phase 1: Security Core - Implementation Plan

## Goal Description
Implement API Key authentication to prevent unauthorized agents from connecting to the server.

## Proposed Changes

### Configuration
#### [NEW] [.env](file:///d:/Business/arushi-cloud/server/.env)
- Store `AGENT_SECRET_KEY`.

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- Load `dotenv`.
- Add middleware to `io` to check `socket.handshake.auth.token`.
- Reject connection if token doesn't match `AGENT_SECRET_KEY`.

### Agent (Python)
#### [MODIFY] [agent.py](file:///d:/Business/arushi-cloud/agent/agent.py)
- Add `API_KEY` constant (hardcoded for now, or env var).
- Update `sio.connect` to include `auth={'token': API_KEY}`.

## Verification Plan

### Automated Tests
- **Positive Test**: Agent connects successfully with correct key.
- **Negative Test**: Modify Agent to send wrong key, verify connection is rejected (Server logs "Authentication error").

### Manual Verification
- Restart Server and Agent.
- Check Server logs for "Authentication successful" or "Authentication failed".
