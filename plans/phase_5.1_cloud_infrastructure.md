# Phase 5.1: Cloud Infrastructure - Implementation Plan

## Goal Description
Containerize the application (Server + Database) to ensure it runs consistently on any VPS (DigitalOcean, Hetzner, etc.).

## Proposed Changes

### Docker Configuration
#### [NEW] [server/Dockerfile](file:///d:/Business/arushi-cloud/server/Dockerfile)
- Node.js base image.
- Install dependencies.
- Generate Prisma client.
- Expose port 3000.
- Command: `node server.js`.

#### [NEW] [docker-compose.yml](file:///d:/Business/arushi-cloud/docker-compose.yml)
- **Service: server**
    - Build from `./server`.
    - Ports: `3000:3000`.
    - Environment variables (DATABASE_URL, etc.).
    - Volumes: `./server/prisma/dev.db:/app/prisma/dev.db` (Persist SQLite for now, or switch to Postgres container).
- **Service: dashboard** (Optional for now, usually built statically and served by Nginx, but we can run dev server for demo).

## Verification Plan

### Manual Verification
- Run `docker-compose up --build`.
- Verify Server starts and connects to DB.
- Verify Dashboard (if included) or Agent can connect to localhost:3000.
