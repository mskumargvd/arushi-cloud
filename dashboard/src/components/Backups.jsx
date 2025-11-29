import { useState } from 'react';
import { Save, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

const Backups = ({ agentId, socket }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleBackup = () => {
        setLoading(true);
        setStatus(null);

        const resultHandler = (data) => {
            if (data && data.output) {
                const output = data.output;
                if (output.includes('✅')) {
                    setStatus({ type: 'success', message: output });
                } else {
                    setStatus({ type: 'error', message: output });
                }
            }
            setLoading(false);
            socket.off('command_output', resultHandler);
        };

        socket.on('command_output', resultHandler);

        socket.emit('send_command', {
            agentId: agentId,
            command: 'backup_config'
        });

        setTimeout(() => {
            if (loading) {
                setLoading(false);
                setStatus({ type: 'error', message: 'Backup timed out' });
                socket.off('command_output', resultHandler);
            }
        }, 15000); // Longer timeout for backups
    };

    return (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Save className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">System Backups</h3>
                        <p className="text-xs text-slate-500">Disaster Recovery</p>
                    </div>
                </div>
                <button
                    onClick={handleBackup}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{loading ? 'Downloading...' : 'Backup Now'}</span>
                </button>
            </div>

            <div className="space-y-3">
                {status && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-3 rounded-lg flex items-center space-x-2 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                    >
                        {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{status.message}</span>
                    </motion.div>
                )}

                {/* Mock List of Previous Backups */}
                <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Recent Backups</h4>
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-400">XML</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">config-backup-{i}.xml</p>
                                        <p className="text-[10px] text-slate-500">Nov {29 - i}, 2025 • 2.4 MB</p>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-blue-400 transition-colors">
                                    <Download size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Backups;
