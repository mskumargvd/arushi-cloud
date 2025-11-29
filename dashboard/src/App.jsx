import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Terminal, Activity, Server, Shield, Cpu, HardDrive, Clock, ChevronRight, Command, LayoutDashboard, Settings, Bell, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HistoricalChart from './components/HistoricalChart';
import CommandCenter from './components/CommandCenter';

const API_KEY = 'my_super_secret_key_12345'; // Must match server to env/config

const socket = io('http://localhost:3000', {
  autoConnect: false,
  auth: {
    token: API_KEY
  }
});

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    socket.connect();
    socket.emit('register_dashboard');

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }
    function onAgentList(list) { setAgents(list); }
    function onAgentConnected(agent) { setAgents(prev => [...prev, agent]); }
    function onAgentDisconnected(data) { setAgents(prev => prev.filter(a => a.id !== data.id)); }
    function onAgentUpdate(data) {
      setAgents(prev => prev.map(agent =>
        agent.id === data.id ? { ...agent, stats: data, status: data.status || agent.status } : agent
      ));
      if (selectedAgent && selectedAgent.id === data.id) {
        setSelectedAgent(prev => ({ ...prev, stats: data, status: data.status || prev.status }));
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('agent_list', onAgentList);
    socket.on('agent_connected', onAgentConnected);
    socket.on('agent_disconnected', onAgentDisconnected);
    socket.on('agent_update', onAgentUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('agent_list', onAgentList);
      socket.off('agent_connected', onAgentConnected);
      socket.off('agent_disconnected', onAgentDisconnected);
      socket.off('agent_update', onAgentUpdate);
      socket.disconnect();
    };
  }, [selectedAgent]);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-[#1e293b]/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col"
      >
        <div className="p-6 flex items-center space-x-3 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Arushi Cloud</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<Server />} label="Agents" badge={agents.length} />
          <NavItem icon={<Activity />} label="Monitoring" />
          <NavItem icon={<Settings />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span>{isConnected ? 'System Online' : 'Disconnected'}</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-[#1e293b]/30 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-8">
          <div className="flex items-center text-slate-400 text-sm">
            <span className="hover:text-white cursor-pointer transition-colors">Overview</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-white font-medium">Agent Management</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search agents..."
                className="bg-slate-800/50 border border-slate-700 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all w-64"
              />
            </div>
            <button className="p-2 hover:bg-slate-700/50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0f172a]" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-12 gap-6 h-full">

            {/* Agent List Column */}
            <div className="col-span-4 flex flex-col space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Server className="w-5 h-5 mr-2 text-blue-500" />
                Connected Agents
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {agents.map(agent => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden ${selectedAgent?.id === agent.id
                        ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-[#1e293b]/50 border-slate-700/50 hover:border-slate-600 hover:bg-[#1e293b]'
                        } ${agent.status === 'offline' ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {agent.hostname || 'Unknown Host'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{agent.id.substring(0, 8)}...</div>
                        </div>
                        <StatusBadge status={agent.status || 'online'} />
                      </div>

                      {agent.stats && agent.status !== 'offline' && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <StatMini label="CPU" value={`${agent.stats.cpu}%`} color="bg-purple-500" />
                          <StatMini label="RAM" value={`${agent.stats.ram}%`} color="bg-emerald-500" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {agents.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                    <div className="text-slate-600 mb-2">No agents detected</div>
                    <div className="text-xs text-slate-700">Run the installer on your device</div>
                  </div>
                )}
              </div>
            </div>

            {/* Detail View Column */}
            <div className="col-span-8 flex flex-col h-full">
              {selectedAgent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={selectedAgent.id}
                  className="space-y-6 h-full flex flex-col"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard icon={<Cpu />} label="CPU Usage" value={`${selectedAgent.stats?.cpu || 0}%`} color="text-purple-400" />
                    <StatCard icon={<HardDrive />} label="Memory" value={`${selectedAgent.stats?.ram || 0}%`} color="text-emerald-400" />
                    <StatCard icon={<Server />} label="Disk" value={`${selectedAgent.stats?.disk || 0}%`} color="text-blue-400" />
                    <StatCard icon={<Clock />} label="Uptime" value={`${selectedAgent.stats?.uptime || 0}h`} color="text-amber-400" />
                  </div>

                  {/* Charts & Command Center Split */}
                  <div className="grid grid-cols-1 gap-6 flex-1 min-h-0">
                    <div className="bg-[#1e293b]/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-1 overflow-hidden flex flex-col">
                      <HistoricalChart agentId={selectedAgent.id} liveStats={selectedAgent.stats} />
                    </div>

                    <div className="bg-[#1e293b]/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                      <CommandCenter agentId={selectedAgent.id} socket={socket} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl bg-[#1e293b]/20">
                  <Server className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select an agent to view details</p>
                  <p className="text-sm">Real-time monitoring and command execution</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// UI Components
const NavItem = ({ icon, label, active, badge }) => (
  <div className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <div className="flex items-center space-x-3">
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge && <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
  </div>
);

const StatusBadge = ({ status }) => (
  <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'offline' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    }`}>
    <div className={`w-1.5 h-1.5 rounded-full ${status === 'offline' ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
    <span>{status}</span>
  </div>
);

const StatMini = ({ label, value, color }) => (
  <div className="bg-slate-900/50 rounded-lg p-2 flex items-center justify-between">
    <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
    <div className="flex items-center space-x-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-xs font-mono text-white">{value}</span>
    </div>
  </div>
);

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-[#1e293b]/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex items-center space-x-4 hover:bg-[#1e293b] transition-colors">
    <div className={`p-3 rounded-lg bg-slate-800/50 ${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xl font-bold text-white font-mono">{value}</div>
    </div>
  </div>
);

export default App;
