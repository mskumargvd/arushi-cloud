import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Trash2 } from 'lucide-react';

export default function CommandCenter({ agentId, socket }) {
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleOutput = (data) => {
            // data.output contains the text
            const timestamp = new Date().toLocaleTimeString();
            setOutput(prev => [...prev, { time: timestamp, text: data.output }]);
            setIsRunning(false);
        };

        socket.on('command_output', handleOutput);

        return () => {
            socket.off('command_output', handleOutput);
        };
    }, [socket]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const sendCommand = (cmd) => {
        if (!socket) return;
        setIsRunning(true);
        setOutput(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `> Executing: ${cmd}...`, type: 'info' }]);
        socket.emit('send_command', { agentId, command: cmd });
    };

    const clearTerminal = () => {
        setOutput([]);
    };

    const commands = [
        { key: 'ping_google', label: 'Ping Google', icon: <ActivityIcon /> },
        { key: 'check_logs', label: 'Check Logs', icon: <FileTextIcon /> },
        { key: 'uptime', label: 'Check Uptime', icon: <ClockIcon /> },
        { key: 'pkg_update', label: 'Check Updates', icon: <DownloadIcon /> },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-300">Command Center</span>
                </div>
                <button onClick={clearTerminal} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors" title="Clear Output">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-black/50 min-h-[200px] max-h-[300px]">
                {output.length === 0 && (
                    <div className="text-gray-600 italic">Ready for commands...</div>
                )}
                {output.map((line, i) => (
                    <div key={i} className={`mb-1 ${line.type === 'info' ? 'text-blue-400' : 'text-green-400'} whitespace-pre-wrap break-all`}>
                        <span className="text-gray-600 mr-2">[{line.time}]</span>
                        {line.text}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Command Buttons */}
            <div className="p-2 bg-gray-800 border-t border-gray-700 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {commands.map((cmd) => (
                    <button
                        key={cmd.key}
                        onClick={() => sendCommand(cmd.key)}
                        disabled={isRunning}
                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded text-xs transition-colors border border-gray-600"
                    >
                        {isRunning ? <Square className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
                        <span>{cmd.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Simple icons to avoid extra imports if lucide doesn't have them or to keep it self-contained
const ActivityIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const FileTextIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClockIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DownloadIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
