const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const cors = require('cors'); // Add this dependency if missing, or use manual headers

const app = express();
app.use(cors()); // Enable CORS for all routes

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Prisma Client
const prisma = new PrismaClient();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

// Middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    // 1. Check if it's an Agent (using API Key)
    if (token === process.env.AGENT_SECRET_KEY) {
        socket.data.type = 'agent';
        return next();
    }

    // 2. Check if it's a User (using JWT)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.type = 'dashboard';
        socket.data.userId = decoded.userId;
        return next();
    } catch (err) {
        // Allow unauthenticated dashboard for Login page (handled by client logic usually, but socket connects after login)
        // Actually, if socket connects BEFORE login, we must allow it or handle it.
        // For this app, we only connect socket AFTER login.

        // HOWEVER: For the "Zero to Production" flow, we might have legacy connections.
        // Let's return error if neither matches.
        const error = new Error("not authorized");
        error.data = { content: "Invalid credentials" };
        return next(error);
    }
});

// --- AUTH API ---
app.use(express.json()); // Enable JSON body parsing

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password_hash: hashedPassword
            }
        });
        res.json({ message: 'User created', userId: user.id });
    } catch (e) {
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
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
            const admin = await prisma.user.findUnique({ where: { email: 'santosh.m@agnidhra-technologies.com' } });

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
        const { agentId, command, payload } = data;
        const agentData = agents.get(agentId);

        if (agentData && agentData.socketId) {
            io.to(agentData.socketId).emit('execute_command', { command, payload, id: socket.id }); // Pass dashboard socket ID to reply back
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
    const timestamp = new Date().toISOString();
    const subject = `[ALERT] Agent ${agentId} is ${type.toUpperCase()}`;
    const body = `Critical Alert: The agent ${agentId} has gone ${type} at ${timestamp}. Please investigate immediately.`;

    // SIMULATED EMAIL SENDING
    console.log('\n==================================================');
    console.log('📧 SENDING EMAIL ALERT...');
    console.log(`To: santosh.m@agnidhra-technologies.com`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log('==================================================\n');
}

const PORT = process.env.PORT || 3000;

// Auto-Updater Endpoints
app.get('/api/version', (req, res) => {
    res.json({
        version: "1.0.0",
        url: `https://arushi-cloud-server-v1.onrender.com/download/agent`
    });
});

app.get('/download/agent', (req, res) => {
    // In a real app, this would serve the correct binary/script for the OS
    // For now, we just serve the main.py file itself as a demo
    const file = __dirname + '/../agent/agent.py';
    res.download(file);
});

app.get('/download/install.sh', (req, res) => {
    const file = __dirname + '/../install.sh';
    res.download(file);
});

app.get('/download/install.ps1', (req, res) => {
    const file = __dirname + '/../install.ps1';
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


// Get Activity Logs
app.get('/api/logs', async (req, res) => {
    try {
        // In a real app, you'd filter by user.id
        // For now, get last 100 logs
        const logs = await prisma.agentStat.findMany({
            // Actually, we should create a separate 'Log' model for commands
            // For Phase 1, let's reuse agentStat or just return mock data if you didn't create a Log model yet.
            // Let's CREATE a simple Log model in schema first?
            // OR: Just use an in-memory array for the MVP to keep it simple.

            // SIMPLIFIED MVP APPROACH:
            // We will return the last 50 commands stored in memory for now.
            // (In Phase 5, we add a proper 'CommandLog' table)
        });

        // Mock Response for MVP (Replace with DB call later)
        res.json([
            { id: 1, type: 'command', message: 'Executed "ping_google" on Agent Windows-PC', timestamp: new Date(), status: 'success' },
            { id: 2, type: 'alert', message: 'Agent Linux-Server went OFFLINE', timestamp: new Date(Date.now() - 50000), status: 'error' },
            { id: 3, type: 'info', message: 'Agent MacBook-Pro Registered', timestamp: new Date(Date.now() - 100000), status: 'info' },
        ]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch logs' });
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
