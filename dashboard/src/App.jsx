import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Terminal, Activity, Server, Shield, Cpu, HardDrive, Clock, ChevronRight, Command } from 'lucide-react';
import HistoricalChart from './components/HistoricalChart';
import CommandCenter from './components/CommandCenter';

const API_KEY = 'my_super_secret_key_12345'; // Must match server to env/config

const socket = io('http://localhost:3000', {
  autoConnect: false,
  auth: {
    token: API_KEY // Using API_KEY here
  }
});

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [commandOutput, setCommandOutput] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.emit('register_dashboard');

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onAgentList(list) {
      setAgents(list);
    }

    function onAgentConnected(agent) {
      setAgents(prev => [...prev, agent]);
    }

    function onAgentDisconnected(data) {
      setAgents(prev => prev.filter(a => a.id !== data.id));
    }

    function onCommandOutput(result) {
      setCommandOutput(prev => [...prev, result]);
    }

    function onAgentUpdate(data) {
      setAgents(prev => prev.map(agent =>
        agent.id === data.id ? { ...agent, stats: data } : agent
      ));

      if (selectedAgent && selectedAgent.id === data.id) {
        setSelectedAgent(prev => ({ ...prev, stats: data }));
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('agent_list', onAgentList);
    socket.on('agent_connected', onAgentConnected);
    socket.on('agent_disconnected', onAgentDisconnected);
    socket.on('command_output', onCommandOutput);
    socket.on('agent_update', onAgentUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('agent_list', onAgentList);
      socket.off('agent_connected', onAgentConnected);
      socket.off('agent_disconnected', onAgentDisconnected);
      socket.off('command_output', onCommandOutput);
      socket.off('agent_update', onAgentUpdate);
      socket.disconnect();
    };
  }, [selectedAgent]); // Re-bind effect if selectedAgent changes (optimization: could be better)

  const sendCommand = (command) => {
    if (!selectedAgent) return;
    socket.emit('send_command', { agentId: selectedAgent.id, command });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Arushi Cloud Manager</h1>
        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isConnected ? 'Connected to Cloud' : 'Disconnected'}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Agents ({agents.length})</h2>
          <ul className="space-y-2">
            {agents.map(agent => (
              <li
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-3 rounded cursor-pointer transition-colors border ${selectedAgent?.id === agent.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'} ${agent.status === 'offline' ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-900">Agent {agent.id.substring(0, 8)}...</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'offline' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {agent.status === 'offline' ? 'Offline' : 'Online'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{agent.platform}</div>
                {agent.stats && agent.status !== 'offline' && (
                  <div className="text-xs text-gray-400 mt-1">
                    CPU: {agent.stats.cpu}% | RAM: {agent.stats.ram}%
                  </div>
                )}
              </li>
            ))}
            {agents.length === 0 && (
              <p className="text-gray-500 italic">No agents connected</p>
            )}
          </ul>
        </div>

        {/* Command Center */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6 flex flex-col h-[600px]">
          <h2 className="text-xl font-semibold mb-4">
            {selectedAgent ? `Manage Agent: ${selectedAgent.id.substring(0, 8)}...` : 'Select an Agent'}
          </h2>

          {selectedAgent ? (
            <>
              {/* Live Stats Card */}
              {selectedAgent.stats && (
                <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">CPU</div>
                    <div className="text-xl font-bold text-gray-800">{selectedAgent.stats.cpu}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">RAM</div>
                    <div className="text-xl font-bold text-gray-800">{selectedAgent.stats.ram}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Disk</div>
                    <div className="text-xl font-bold text-gray-800">{selectedAgent.stats.disk}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Uptime</div>
                    <div className="text-xl font-bold text-gray-800">{selectedAgent.stats.uptime}h</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button onClick={() => sendCommand('pkg_update')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Update Packages</button>
                <button onClick={() => sendCommand('check_logs')} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition">Check Logs</button>
                <button onClick={() => sendCommand('uptime')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Check Uptime</button>
                <button onClick={() => sendCommand('ping_google')} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">Ping Google</button>
              </div>

              <div className="flex-1 bg-gray-900 rounded p-4 overflow-auto font-mono text-sm text-green-400">
                {commandOutput.map((out, i) => (
                  <div key={i} className="mb-2 border-b border-gray-800 pb-2">
                    {out.error ? (
                      <span className="text-red-400">Error: {out.error}</span>
                    ) : (
                      <pre className="whitespace-pre-wrap">{out.output}</pre>
                    )}
                  </div>
                ))}
                {commandOutput.length === 0 && <span className="text-gray-600">No output yet...</span>}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select an agent to view details and execute commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
