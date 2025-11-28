# Phase 4.3: Alerting System - Implementation Plan

## Goal Description
Notify the user when an agent goes offline. This involves a visual alert on the dashboard and a backend hook for sending emails.

## Proposed Changes

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- **On `disconnect`**:
    - Call a new function `sendAlert(agentId, 'offline')`.
    - `sendAlert` will currently just log to console: `[ALERT] Agent <id> is OFFLINE! Sending email to admin...`.
    - (Future: Integrate Resend/SendGrid here).

### Dashboard (React)
#### [MODIFY] [src/App.jsx](file:///d:/Business/arushi-cloud/dashboard/src/App.jsx)
- Update the Agent List to visually distinguish offline agents (e.g., Red border or "Offline" badge).
- Add a "Recent Alerts" notification area (optional, but good for UX).

## Verification Plan

### Manual Verification
- Start Server and Agent.
- Kill the Agent process (Ctrl+C).
- Verify Server logs the alert.
- Verify Dashboard shows the agent as "Offline" (or removes it, depending on current logic. We should keep it but mark as offline).
