import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function ActivityLogs() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        // Fetch logs (Replace URL with your Render URL)
        fetch(`${import.meta.env.VITE_SERVER_URL}/api/logs`)
            .then(res => res.json())
            .then(data => setLogs(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-6">System Activity</h2>
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
                {logs.map((log, i) => (
                    <div key={i} className="p-4 border-b border-slate-700/50 flex items-start space-x-4 hover:bg-slate-800/50 transition-colors">
                        <div className={`mt-1 ${log.status === 'error' ? 'text-red-400' :
                            log.status === 'success' ? 'text-emerald-400' : 'text-blue-400'
                            }`}>
                            {log.status === 'error' ? <AlertCircle size={18} /> :
                                log.status === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-200">
                                {log.agent?.hostname && <span className="font-bold text-blue-400 mr-2">[{log.agent.hostname}]</span>}
                                {log.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center">
                                <Clock size={12} className="mr-1" />
                                {new Date(log.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}