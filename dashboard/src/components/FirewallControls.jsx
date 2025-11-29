import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FirewallControls = ({ agentId, socket }) => {
    const [ip, setIp] = useState('');
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }
    const [loading, setLoading] = useState(false);

    const handleBlockIp = () => {
        if (!ip) return;
        setLoading(true);
        setStatus(null);

        // Listen for result (one-time listener)
        const resultHandler = (data) => {
            // data is { output: "..." }
            if (data && data.output) {
                const output = data.output;
                if (output.includes('✅')) {
                    setStatus({ type: 'success', message: output });
                    setIp('');
                } else {
                    setStatus({ type: 'error', message: output });
                }
            }
            setLoading(false);
            socket.off('command_output', resultHandler);
        };

        socket.on('command_output', resultHandler);

        // Send command
        socket.emit('send_command', {
            agentId: agentId,
            command: 'block_ip',
            payload: { ip: ip }
        });

        // Timeout safety
        setTimeout(() => {
            if (loading) {
                setLoading(false);
                setStatus({ type: 'error', message: 'Request timed out' });
                socket.off('command_output', resultHandler);
            }
        }, 10000);
    };

    return (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Firewall Controls</h3>
                    <p className="text-xs text-slate-500">Manage OPNsense Aliases & Rules</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Block IP Address</label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            placeholder="192.168.1.100"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                        />
                        <button
                            onClick={handleBlockIp}
                            disabled={loading || !ip}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${loading || !ip
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                                }`}
                        >
                            {loading ? 'Blocking...' : 'Block IP'}
                        </button>
                    </div>
                </div>

                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg flex items-center space-x-2 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                    >
                        {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        <span>{status.message}</span>
                    </motion.div>
                )}

                <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500">
                        <AlertTriangle className="inline w-3 h-3 mr-1 text-yellow-500" />
                        Actions are applied immediately to the <code>ARUSHI_BLOCKLIST</code> alias.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FirewallControls;
