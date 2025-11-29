const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // TODO: Restrict in production
        methods: ["GET", "POST"]
    }
});

// Prisma Client
const prisma = new PrismaClient();

// Middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Allow dashboard to connect without token for now (or implement separate auth)
    // For simplicity, we check if it's an agent trying to register
    // Ideally, dashboard should also have auth

    // If it's a dashboard connection (we can distinguish by some handshake field or just allow all for now and filter in logic)
    // But here we want to secure AGENTS.

    // Let's enforce token for everyone, but Dashboard might need a way to pass it.
    // For Phase 1, let's assume Dashboard doesn't send auth yet, so we might break it if we enforce globally.
    // So we check: if it claims to be an agent, it MUST have a token.

    // Actually, the socket doesn't "claim" to be an agent until it emits 'register_agent'.
    // So we can't easily filter here unless we enforce it for ALL connections.

    // Let's enforce for ALL. Dashboard will need update.
    if (token === process.env.AGENT_SECRET_KEY) {
        next();
    } else {
        // Temporary: Allow dashboard if it doesn't send token? 
        // No, "Zero to Production" says Secure Core.
        // Let's hardcode a separate DASHBOARD_KEY or just use the same for now.
        // Or, we can check if token is missing, maybe it's a dashboard?
        // Risk: Rogue agent connects as dashboard.

        // Better approach:
        // Agents MUST send token.
        if (token === process.env.AGENT_SECRET_KEY) {
            next();
        } else {
            const err = new Error("not authorized");
            err.data = { content: "Please retry later" }; // additional details
            next(err);
        }
    }
});

// Redis Client
const redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Store connected agents
const agents = new Map();

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Identify if it's an agent or dashboard
    socket.on('register_agent', async (data) => {
        console.log('Agent registered:', data.id);
        // Set status to online
        agents.set(data.id, { socketId: socket.id, status: 'online', ...data });
        socket.join('agents');
        socket.data.type = 'agent';
        socket.data.agentId = data.id;

        // Persist to DB
        try {
            // Find the default admin user (for single tenant mode)
            const admin = await prisma.user.findUnique({ where: { email: 'admin@arushi.cloud' } });

            if (admin) {
                await prisma.agent.upsert({
                    where: { id: data.id },
                    update: {
                        hostname: data.hostname || 'unknown',
                        platform: data.platform,
                        last_seen: new Date(),
                        owner_id: admin.id
                    },
                    create: {
                        id: data.id,
                        hostname: data.hostname || 'unknown',
                        platform: data.platform,
                        last_seen: new Date(),
                        owner_id: admin.id
                    }
                });
                console.log(`Agent ${data.id} persisted to DB`);
            }
        } catch (e) {
            console.error('Error persisting agent:', e);
        }

        // Notify dashboards
        io.to('dashboard').emit('agent_connected', { id: data.id, ...data });
    });

    socket.on('register_dashboard', () => {
        console.log('Dashboard connected');
        socket.join('dashboard');
        socket.data.type = 'dashboard';

        // Send list of existing agents
        const agentList = Array.from(agents.entries()).map(([id, info]) => ({ id, ...info }));
        socket.emit('agent_list', agentList);
    });

    // Command routing: Dashboard -> Agent
    socket.on('send_command', (data) => {
        const { agentId, command } = data;
        const agentData = agents.get(agentId);

        if (agentData && agentData.socketId) {
            io.to(agentData.socketId).emit('execute_command', { command, id: socket.id }); // Pass dashboard socket ID to reply back
            console.log(`Command sent to agent ${agentId}: ${command}`);
        } else {
            console.log(`Agent ${agentId} not found`);
            socket.emit('command_error', { message: 'Agent not found' });
        }
    });

    // Command result: Agent -> Dashboard
    socket.on('command_result', (data) => {
        const { dashboardId, result } = data;
        // In a real app, we might broadcast to all dashboards or specific one
        // Here we assume dashboardId was passed down
        if (dashboardId) {
            io.to(dashboardId).emit('command_output', result);
        } else {
            io.to('dashboard').emit('command_output', result); // Broadcast to all dashboards
        }
    });

    // Heartbeat: Agent -> Server -> Dashboard
    socket.on('heartbeat', async (data) => {
        const { id } = data;
        if (agents.has(id)) {
            // Update stored agent data if needed
            const currentData = agents.get(id);
            agents.set(id, { ...currentData, lastHeartbeat: Date.now(), stats: data });

            // Persist stats to DB (Update last_seen and stats)
            try {
                // Update current state
                await prisma.agent.update({
                    where: { id: id },
                    data: {
                        last_seen: new Date(),
                        stats_cpu: data.cpu,
                        stats_ram: data.ram
                    }
                });

                // Insert historical record
                await prisma.agentStat.create({
                    data: {
                        agent_id: id,
                        cpu: data.cpu,
                        ram: data.ram
                    }
                });
            } catch (e) {
                // Suppress frequent errors to avoid log spam, or log debug
                // console.error('Error updating heartbeat:', e);
            }

            // Broadcast to dashboard
            io.to('dashboard').emit('agent_update', data);
        }
    });

    socket.on('disconnect', () => {
        if (socket.data.type === 'agent') {
            const agentId = socket.data.agentId;
            console.log('Agent disconnected:', agentId);

            // Mark as offline instead of deleting
            if (agents.has(agentId)) {
                const agent = agents.get(agentId);
                agent.status = 'offline';
                agent.socketId = null; // No longer reachable
                agents.set(agentId, agent);

                // Notify dashboard
                io.to('dashboard').emit('agent_update', { id: agentId, status: 'offline' });

                // Trigger Alert
                sendAlert(agentId, 'offline');
            }
        } else {
            console.log('Client disconnected:', socket.id);
        }
    });
});

function sendAlert(agentId, type) {
    console.log(`[ALERT] Agent ${agentId} is ${type.toUpperCase()}! Sending email to admin...`);
    // TODO: Integrate SendGrid/Resend here
}

const PORT = process.env.PORT || 3000;

// Auto-Updater Endpoints
app.get('/api/version', (req, res) => {
    res.json({
        version: "1.0.0",
        url: `http://localhost:${PORT}/download/agent`
    });
});

app.get('/download/agent', (req, res) => {
    // In a real app, this would serve the correct binary/script for the OS
    // For now, we just serve the main.py file itself as a demo
    const file = __dirname + '/../agent/agent.py';
    res.download(file);
});

// Historical Stats API
app.get('/api/stats/history/:agentId', async (req, res) => {
    const { agentId } = req.params;
    try {
        const stats = await prisma.agentStat.findMany({
            where: { agent_id: agentId },
            orderBy: { timestamp: 'desc' },
            take: 50 // Limit to last 50 records
        });
        // Reverse to show oldest to newest in chart
        res.json(stats.reverse());
    } catch (e) {
        console.error('Error fetching history:', e);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

async function startServer() {
    try {
        await prisma.$connect();
        console.log('Connected to Database (SQLite)');

        // Restore agents from DB
        const savedAgents = await prisma.agent.findMany();
        savedAgents.forEach(agent => {
            agents.set(agent.id, {
                ...agent,
                status: 'offline', // Assume offline until they reconnect
                socketId: null
            });
        });
        console.log(`Restored ${savedAgents.length} agents from DB`);

        // await redisClient.connect(); // TODO: Enable when Redis is ready
        server.listen(PORT, () => {
            console.log(`Server listening on *:${PORT}`);
        });
    } catch (e) {
        console.error('Failed to start server:', e);
    }
}

startServer();
