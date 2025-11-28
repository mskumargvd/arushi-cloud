# Phase 3.1: Database Setup - Implementation Plan

## Goal Description
Set up the database layer using **Prisma ORM** and **PostgreSQL**. This will store user accounts and device information.

## Proposed Changes

### Server (Node.js)
#### [NEW] [prisma/schema.prisma](file:///d:/Business/arushi-cloud/server/prisma/schema.prisma)
- Define the data model:
    - `User`: id, email, password_hash, created_at
    - `Agent`: id, owner_id, hostname, platform, last_seen, api_key_hash

#### [MODIFY] [server.js](file:///d:/Business/arushi-cloud/server/server.js)
- Initialize Prisma Client.
- Connect to the database on startup.

### Configuration
#### [MODIFY] [.env](file:///d:/Business/arushi-cloud/server/.env)
- Add `DATABASE_URL="postgresql://user:password@localhost:5432/arushi_cloud"`.

## Verification Plan

### Manual Verification
- Run `npx prisma generate` and `npx prisma db push`.
- Verify tables are created in the local PostgreSQL database (User needs to have Postgres running).
- **Fallback:** If Postgres is not available locally, we can switch to SQLite for development (`file:./dev.db`) to keep moving fast without installing heavy DBs.

> [!NOTE]
> I will default to **SQLite** for this "Zero Capital" local prototype phase to avoid forcing you to install PostgreSQL right now. It is easy to switch to Postgres later by changing the provider in `schema.prisma`.
