import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistoricalChart({ agentId, liveStats }) {
    const [data, setData] = useState([]);

    // Initial Load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`https://arushi-cloud-server-v1.onrender.com/api/stats/history/${agentId}`);
                const json = await res.json();
                // Format timestamp for display
                const formatted = json.map(item => ({
                    ...item,
                    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }));
                setData(formatted);
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
        };

        fetchData();
    }, [agentId]);

    // Real-time Update
    useEffect(() => {
        if (liveStats) {
            setData(prev => {
                const newPoint = {
                    ...liveStats,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };
                // Keep only last 50 points
                const newData = [...prev, newPoint];
                if (newData.length > 50) newData.shift();
                return newData;
            });
        }
    }, [liveStats]);

    if (data.length === 0) return <div className="text-gray-500 text-sm">Loading history...</div>;

    return (
        <div className="h-64 w-full bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <h3 className="text-gray-400 text-xs font-medium mb-4 uppercase tracking-wider">Performance History (Last 50 ticks)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                        itemStyle={{ color: '#F3F4F6' }}
                    />
                    <Line type="monotone" dataKey="cpu" stroke="#8B5CF6" strokeWidth={2} dot={false} name="CPU %" />
                    <Line type="monotone" dataKey="ram" stroke="#10B981" strokeWidth={2} dot={false} name="RAM %" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
