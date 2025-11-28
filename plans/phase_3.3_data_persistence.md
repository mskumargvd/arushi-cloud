# Phase 3.3: Data Persistence - Implementation Plan

## Goal Description
Store historical system statistics (CPU, RAM) to enable historical charting in the dashboard.

## Proposed Changes

### Database Schema
#### [MODIFY] [server/prisma/schema.prisma](file:///d:/Business/arushi-cloud/server/prisma/schema.prisma)
- Add `AgentStat` model:
    - `id`: Int @id @default(autoincrement())
    - `agent_id`: String
    - `cpu`: Float
    - `ram`: Float
    - `timestamp`: DateTime @default(now())
    - Relation to `Agent`.

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- **On `heartbeat`**:
    - In addition to updating the `Agent` table, insert a new record into `AgentStat`.
    - (Optional) Implement a cleanup job to delete old stats (e.g., older than 24h) to keep SQLite small, but maybe later.

## Verification Plan

### Manual Verification
- Restart Server.
- Let Agent run for a minute.
- Check DB to see multiple rows in `AgentStat` for the agent.
