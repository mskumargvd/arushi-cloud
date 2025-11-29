import { useState, useEffect } from 'react';
import { FileText, RefreshCw, AlertCircle } from 'lucide-react';

const LiveLogs = ({ agentId, socket }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLogs = () => {
        setLoading(true);
        setError(null);

        const resultHandler = (data) => {
            if (data && data.output) {
                const output = data.output;
                if (Array.isArray(output)) {
                    setLogs(output);
                } else if (typeof output === 'string' && output.startsWith('[')) {
                    try {
                        setLogs(JSON.parse(output));
                    } catch (e) {
                        setLogs([]); // Fallback
                        setError("Failed to parse logs");
                    }
                } else {
                    setError(typeof output === 'string' ? output : "Unknown error");
                }
            }
            setLoading(false);
            socket.off('command_output', resultHandler);
        };

        socket.on('command_output', resultHandler);

        socket.emit('send_command', {
            agentId: agentId,
            command: 'get_logs'
        });

        setTimeout(() => {
            if (loading) {
                setLoading(false);
                setError("Timeout fetching logs");
                socket.off('command_output', resultHandler);
            }
        }, 8000);
    };

    // Initial fetch
    useEffect(() => {
        fetchLogs();
        // Poll every 10 seconds
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [agentId]);

    return (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Live Firewall Logs</h3>
                        <p className="text-xs text-slate-500">Real-time Traffic Analysis</p>
                    </div>
                </div>
                <button
                    onClick={fetchLogs}
                    className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="flex-1 bg-[#0f172a] rounded-lg border border-slate-700/50 overflow-hidden font-mono text-xs relative">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center text-red-400 space-x-2">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                ) : logs.length === 0 && !loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        No logs available
                    </div>
                ) : (
                    <div className="overflow-auto h-full p-2 space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="flex space-x-3 hover:bg-slate-800/50 p-1 rounded cursor-default">
                                <span className="text-slate-500 w-32 shrink-0">{log.timestamp || new Date().toISOString().split('T')[1].split('.')[0]}</span>
                                <span className={`${log.action === 'block' ? 'text-red-400' : 'text-emerald-400'} w-16 shrink-0 font-bold uppercase`}>
                                    {log.action || 'PASS'}
                                </span>
                                <span className="text-blue-400 w-24 shrink-0">{log.interface || 'wan'}</span>
                                <span className="text-slate-300 flex-1 truncate">
                                    {log.src_ip || '192.168.1.50'} <span className="text-slate-600">→</span> {log.dst_ip || '8.8.8.8'}
                                </span>
                            </div>
                        ))}
                        {/* Mock Data if empty for demo */}
                        {logs.length === 0 && loading && (
                            <div className="text-slate-600 italic p-2">Fetching logs from OPNsense...</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveLogs;
