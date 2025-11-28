# Phase 4.1: Historical Charts - Implementation Plan

## Goal Description
Visualize the historical CPU and RAM usage of an agent using charts on the dashboard.

## Proposed Changes

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- Add API endpoint: `GET /api/stats/history/:agentId`
- Query `prisma.agentStat` for the last 50 records (or last 24h) for the given agent.

### Dashboard (React)
#### [NEW] [src/components/HistoricalChart.jsx](file:///d:/Business/arushi-cloud/dashboard/src/components/HistoricalChart.jsx)
- Use `recharts` library.
- Fetch data from `/api/stats/history/:agentId` on mount.
- Render a LineChart showing CPU and RAM over time.

#### [MODIFY] [src/App.jsx](file:///d:/Business/arushi-cloud/dashboard/src/App.jsx)
- Add the `HistoricalChart` component to the "Agent Details" view.

## Verification Plan

### Manual Verification
- Install `recharts` in dashboard.
- Restart Server and Dashboard.
- Click on an agent.
- Verify the chart appears and updates (or at least shows the fetched history).
