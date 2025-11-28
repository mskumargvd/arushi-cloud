# Phase 4.2: The "Command Center" UI - Implementation Plan

## Goal Description
Create a "Terminal-like" interface in the dashboard that allows the user to send commands to an agent and see the output in real-time.

## Proposed Changes

### Dashboard (React)
#### [NEW] [src/components/CommandCenter.jsx](file:///d:/Business/arushi-cloud/dashboard/src/components/CommandCenter.jsx)
- A component with:
    - A black "terminal" window (`<pre>`).
    - An input field at the bottom.
    - List of available commands (buttons) for quick access (`ping`, `uptime`, `check_logs`).
- Logic:
    - On submit, emit `send_command` event via Socket.IO.
    - Listen for `command_output` event and append to the terminal window.

#### [MODIFY] [src/App.jsx](file:///d:/Business/arushi-cloud/dashboard/src/App.jsx)
- Replace the simple "Command Output" div with the new `CommandCenter` component.

## Verification Plan

### Manual Verification
- Open Dashboard.
- Click "Ping Google".
- Verify "Pinging 8.8.8.8..." appears in the terminal window.
