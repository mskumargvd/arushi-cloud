import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Cpu, Database, Activity } from 'lucide-react';

export default function ProcessManager({ agentId, socket }) {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProcesses = () => {
        setLoading(true);
        setError(null);
        socket.emit('send_command', { agentId, command: 'get_processes' });
    };

    const killProcess = (pid, name) => {
        if (window.confirm(`Are you sure you want to kill process "${name}" (PID: ${pid})?`)) {
            socket.emit('send_command', {
                agentId,
                command: 'kill_process',
                payload: { pid }
            });
            // Optimistically remove or wait for refresh
            setTimeout(fetchProcesses, 2000);
        }
    };

    useEffect(() => {
        fetchProcesses();

        const handleOutput = (data) => {
            if (Array.isArray(data)) {
                setProcesses(data);
                setLoading(false);
            } else if (data && data.output && Array.isArray(data.output)) {
                // Handle wrapped output
                setProcesses(data.output);
                setLoading(false);
            } else if (typeof data === 'string' && data.startsWith('Error')) {
                setError(data);
                setLoading(false);
            }
        };

        socket.on('command_output', handleOutput);
        return () => socket.off('command_output', handleOutput);
    }, [agentId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                    <Activity className="mr-2 text-blue-400" size={20} />
                    Top Processes
                </h3>
                <button
                    onClick={fetchProcesses}
                    disabled={loading}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800/50 text-slate-200 font-medium">
                        <tr>
                            <th className="p-4">PID</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">CPU %</th>
                            <th className="p-4">RAM %</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {processes.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">
                                    No process data available.
                                </td>
                            </tr>
                        )}
                        {processes.map((proc) => (
                            <tr key={proc.pid} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4 font-mono text-slate-500">{proc.pid}</td>
                                <td className="p-4 font-medium text-white">{proc.name}</td>
                                <td className="p-4">
                                    <div className="flex items-center text-emerald-400">
                                        <Cpu size={14} className="mr-1.5" />
                                        {proc.cpu_percent?.toFixed(1)}%
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center text-purple-400">
                                        <Database size={14} className="mr-1.5" />
                                        {proc.memory_percent?.toFixed(1)}%
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => killProcess(proc.pid, proc.name)}
                                        className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                        title="Kill Process"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
