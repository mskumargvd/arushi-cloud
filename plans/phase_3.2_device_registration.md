# Phase 3.2: Device Registration Flow - Implementation Plan

## Goal Description
Persist connected agents in the database and link them to a user account. This ensures that even if the server restarts, we know which agents belong to whom.

## Proposed Changes

### Database Seeding
#### [NEW] [server/prisma/seed.js](file:///d:/Business/arushi-cloud/server/prisma/seed.js)
- Create a script to insert a default "Admin User" if one doesn't exist.
- We will link all agents to this admin user for now (Single Tenant mode).

### Server (Node.js)
#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- **On `register_agent`**:
    - Use `prisma.agent.upsert` to create or update the agent record.
    - Store `hostname`, `platform`, and link to the Admin User.
- **On `heartbeat`**:
    - Update the `last_seen` timestamp and `stats` (CPU/RAM) in the `Agent` record.
    - (Note: We added `stats_cpu` and `stats_ram` to the schema in 3.1).

## Verification Plan

### Manual Verification
- Restart Server.
- Run `node prisma/seed.js`.
- Start Agent.
- Use `npx prisma studio` (a GUI for the DB) to verify the Agent record appears in the database.
