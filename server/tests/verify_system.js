const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// const axios = require('axios');

async function main() {
    console.log("--- Starting System Verification ---");

    // 1. Check DB Persistence
    console.log("\n[1] Checking Database Persistence...");
    const agents = await prisma.agent.findMany();
    if (agents.length > 0) {
        console.log(`✅ Found ${agents.length} agents in DB.`);
        const agent = agents[0];
        console.log(`   - Agent ID: ${agent.id}`);
        console.log(`   - Hostname: ${agent.hostname}`);
        console.log(`   - Status: ${agent.last_seen}`);

        // 2. Check Historical Stats API
        console.log("\n[2] Checking Historical Stats API...");
        try {
            const res = await fetch(`http://localhost:3000/api/stats/history/${agent.id}`);
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                console.log(`✅ API returned ${data.length} historical records.`);
            } else {
                console.error("❌ API returned unexpected format or status.");
            }
        } catch (e) {
            console.error(`❌ API Request Failed: ${e.message}`);
        }

    } else {
        console.error("❌ No agents found in DB. Persistence might be failing or no agent connected yet.");
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
