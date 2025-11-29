import { useState } from 'react';
import { X, Terminal, Copy, Check, Server, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddDeviceWizard = ({ isOpen, onClose }) => {
    const [os, setOs] = useState('linux'); // 'linux', 'windows', 'opnsense'
    const [copied, setCopied] = useState(false);

    // TODO: In production, fetch a unique API Key for this new device from the backend
    const apiKey = "YOUR_API_KEY_HERE";
    const serverUrl = "https://arushi-cloud-server-v1.onrender.com"; // Should match SERVER_URL in App.jsx

    const commands = {
        linux: `curl -sL ${serverUrl}/download/install.sh | sudo bash`,
        opnsense: `curl -sL ${serverUrl}/download/install.sh | sh`,
        windows: `iwr ${serverUrl}/download/install.ps1 -UseBasicParsing | iex`
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(commands[os]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#1e293b] w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                        <div>
                            <h2 className="text-xl font-bold text-white">Add New Device</h2>
                            <p className="text-sm text-slate-400">Deploy the Arushi Agent to your infrastructure</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* OS Selection */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <button
                                onClick={() => setOs('linux')}
                                className={`p-4 rounded-xl border flex flex-col items-center space-y-3 transition-all ${os === 'linux' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Server size={32} />
                                <span className="font-bold">Linux Server</span>
                            </button>

                            <button
                                onClick={() => setOs('opnsense')}
                                className={`p-4 rounded-xl border flex flex-col items-center space-y-3 transition-all ${os === 'opnsense' ? 'bg-orange-600/10 border-orange-500 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Shield size={32} />
                                <span className="font-bold">OPNsense Firewall</span>
                            </button>

                            <button
                                onClick={() => setOs('windows')}
                                className={`p-4 rounded-xl border flex flex-col items-center space-y-3 transition-all ${os === 'windows' ? 'bg-blue-400/10 border-blue-400 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <div className="w-8 h-8 flex items-center justify-center font-bold text-xl">W</div>
                                <span className="font-bold">Windows PC</span>
                            </button>
                        </div>

                        {/* Command Area */}
                        <div className="bg-black/50 rounded-xl border border-slate-700 p-4 relative group">
                            <div className="absolute top-0 left-0 px-3 py-1 bg-slate-800 rounded-br-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-700">
                                {os === 'windows' ? 'PowerShell (Admin)' : 'Terminal'}
                            </div>

                            <div className="mt-6 font-mono text-sm text-emerald-400 break-all">
                                {commands[os]}
                            </div>

                            <button
                                onClick={handleCopy}
                                className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex items-center space-x-2"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                <span className="text-xs font-bold">{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>

                        <div className="mt-6 flex items-start space-x-3 text-sm text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                            <div className="mt-0.5 text-blue-400"><Terminal size={16} /></div>
                            <div>
                                <p className="font-bold text-slate-300 mb-1">Installation Steps:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Open your terminal or PowerShell (as Admin).</li>
                                    <li>Paste the command above and press Enter.</li>
                                    <li>Follow the prompts to enter your API Key.</li>
                                    <li>The agent will register automatically.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddDeviceWizard;
