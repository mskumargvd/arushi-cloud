const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // TODO: Restrict in production
        methods: ["GET", "POST"]
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
    socket.on('register_agent', (data) => {
        console.log('Agent registered:', data.id);
        agents.set(data.id, { socketId: socket.id, ...data });
        socket.join('agents');
        socket.data.type = 'agent';
        socket.data.agentId = data.id;

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
        console.log('Result received from agent');
    });

    // Heartbeat: Agent -> Server -> Dashboard
    socket.on('heartbeat', (data) => {
        const { id } = data;
        if (agents.has(id)) {
            // Update stored agent data if needed
            const currentData = agents.get(id);
            agents.set(id, { ...currentData, lastHeartbeat: Date.now(), stats: data });

            // Broadcast to dashboard
            io.to('dashboard').emit('agent_update', data);
        }
    });

    socket.on('disconnect', () => {
        if (socket.data.type === 'agent') {
            console.log('Agent disconnected:', socket.data.agentId);
            agents.delete(socket.data.agentId);
            io.to('dashboard').emit('agent_disconnected', { id: socket.data.agentId });
        } else {
            console.log('Client disconnected:', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    // await redisClient.connect(); // TODO: Enable when Redis is ready
    server.listen(PORT, () => {
        console.log(`Server listening on *:${PORT}`);
    });
}

startServer();
