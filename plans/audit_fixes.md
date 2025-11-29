# Audit Fixes Implementation Plan

## Goal Description
Address the critical findings from the Security, Stability, and Performance audit.
1.  **Server**: Persist agent state across restarts by loading from DB.
2.  **Dashboard**: Switch from polling to WebSocket updates for charts.
3.  **Agent**: Implement self-update mechanism.

## User Review Required
> [!IMPORTANT]
> The Agent self-update mechanism involves overwriting the running script and restarting the process. This requires the agent to have write permissions to its own directory.

## Proposed Changes

### Server Stability
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- In `startServer()`, fetch all agents from `prisma.agent.findMany()`.
- Populate the `agents` Map with these agents, setting their status to 'offline' initially (since they haven't reconnected yet) or 'unknown'.
- This ensures the dashboard sees them even if they haven't reconnected immediately.

### Dashboard Performance
#### [MODIFY] [HistoricalChart.jsx](file:///d:/Business/arushi-cloud/dashboard/src/components/HistoricalChart.jsx)
- Remove `setInterval` polling.
- Add a `useEffect` that listens to a new prop `liveStats` (or similar) or subscribes to the socket directly (though props is better if App.jsx manages state).
- Append new data points to the chart data dynamically.

#### [MODIFY] [App.jsx](file:///d:/Business/arushi-cloud/dashboard/src/App.jsx)
- Ensure `agent_update` events are passed down to the `HistoricalChart` or the specific device view that holds it.

### Agent Security & Features
#### [MODIFY] [agent.py](file:///d:/Business/arushi-cloud/agent/agent.py)
- Add `self_update` to `COMMAND_HANDLERS` (or `execute_command`).
- Implement `self_update` logic:
    - Download new `agent.py` from `SERVER_URL/download/agent`.
    - Backup current `agent.py`.
    - Overwrite `agent.py`.
    - Restart process using `os.execv(sys.executable, ['python'] + sys.argv)`.

## Verification Plan

### Server
- Restart server.
- Verify Dashboard still lists agents (even if offline) without needing them to reconnect first.

### Dashboard
- Open Dashboard.
- Verify Chart updates in real-time (watch for "jumping" line) without network tab showing 10s polling requests.

### Agent
- Trigger `self_update` command (mocking the download or using the actual endpoint).
- Verify Agent restarts and logs "Starting Arushi Cloud Agent...".
