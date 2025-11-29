import React, { useState } from 'react';
import { Save, Copy, Check } from 'lucide-react';

export default function Settings() {
    const [apiKey, setApiKey] = useState(import.meta.env.VITE_AGENT_SECRET_KEY);
    const [copied, setCopied] = useState(false);

    const installCommand = `curl -sL ${import.meta.env.VITE_SERVER_URL}/download/install.sh | sudo bash -s -- --key=${apiKey}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(installCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Platform Settings</h2>

            {/* Install Script Generator */}
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 mb-8">
                <h3 className="text-lg font-medium text-white mb-4">Agent Installation</h3>
                <p className="text-sm text-slate-400 mb-4">Run this command on your Linux/Mac servers to install the agent.</p>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between group">
                    <code className="text-xs font-mono text-blue-400 break-all">{installCommand}</code>
                    <button onClick={handleCopy} className="ml-4 p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>

            {/* Admin Preferences */}
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-medium text-white mb-4">Security</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">API Secret Key</label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Admin Password</label>
                        <input
                            type="password"
                            placeholder="Change admin password..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
                        <Save size={16} className="mr-2" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}