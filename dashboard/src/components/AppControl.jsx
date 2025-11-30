import React, { useState, useEffect } from 'react';
import { Facebook, Youtube, Instagram, Twitter, Video, Film, MessageSquare, Shield, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const APPS = [
    { id: 'facebook', name: 'Facebook', icon: <Facebook className="w-6 h-6 text-blue-500" />, domains: ['facebook.com', 'fbcdn.net', 'messenger.com'] },
    { id: 'youtube', name: 'YouTube', icon: <Youtube className="w-6 h-6 text-red-500" />, domains: ['youtube.com', 'googlevideo.com', 'ytimg.com'] },
    { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-6 h-6 text-pink-500" />, domains: ['instagram.com', 'cdninstagram.com'] },
    { id: 'twitter', name: 'Twitter / X', icon: <Twitter className="w-6 h-6 text-sky-500" />, domains: ['twitter.com', 'x.com', 'twimg.com'] },
    { id: 'tiktok', name: 'TikTok', icon: <Video className="w-6 h-6 text-black dark:text-white" />, domains: ['tiktok.com', 'tiktokcdn.com'] },
    { id: 'netflix', name: 'Netflix', icon: <Film className="w-6 h-6 text-red-600" />, domains: ['netflix.com', 'nflxvideo.net'] },
    { id: 'reddit', name: 'Reddit', icon: <MessageSquare className="w-6 h-6 text-orange-500" />, domains: ['reddit.com', 'redd.it'] },
];

const AppControl = ({ agentId, socket, blockedApps, setBlockedApps }) => {
    const [loading, setLoading] = useState({}); // { 'facebook': true }

    // Fetch initial state
    useEffect(() => {
        if (agentId && socket) {
            socket.emit('send_command', {
                agentId,
                command: 'get_blocked_apps',
                payload: {}
            });

            const handleCommandResult = (data) => {
                // Check if the result is a list (which means it's our get_blocked_apps response)
                // In a real app, we'd have a request ID to match.
                // Here we'll just check if it looks like a list of strings.
                if (data.result && data.result.output && Array.isArray(data.result.output)) {
                    const blockedMap = {};
                    data.result.output.forEach(app => blockedMap[app] = true);
                    setBlockedApps(blockedMap);
                }
            };

            socket.on('command_result', handleCommandResult);
            return () => socket.off('command_result', handleCommandResult);
        }
    }, [agentId, socket]);

    const toggleApp = (app) => {
        const isBlocked = blockedApps[app.id];
        const command = isBlocked ? 'unblock_app' : 'block_app';

        setLoading(prev => ({ ...prev, [app.id]: true }));

        // Optimistic Update
        setBlockedApps(prev => ({ ...prev, [app.id]: !isBlocked }));

        socket.emit('send_command', {
            agentId,
            command,
            payload: { app: app.id, domains: app.domains }
        });

        // Listen for confirmation (Optional, for now we assume success after a delay)
        setTimeout(() => {
            setLoading(prev => ({ ...prev, [app.id]: false }));
        }, 1500);
    };

    return (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Application Control</h3>
                    <p className="text-xs text-slate-500">Block access to specific apps via DNS</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {APPS.map(app => (
                    <div key={app.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                {app.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-200">{app.name}</h4>
                                <p className="text-[10px] text-slate-500">{blockedApps[app.id] ? 'Blocked' : 'Allowed'}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => toggleApp(app)}
                            disabled={loading[app.id]}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${blockedApps[app.id] ? 'bg-red-500' : 'bg-slate-600'
                                }`}
                        >
                            <span
                                className={`${blockedApps[app.id] ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
                <p>Note: Blocking applies to all devices using this firewall as their DNS server.</p>
            </div>
        </div>
    );
};

export default AppControl;
