import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Terminal, Activity, Server, Shield, Cpu, HardDrive, Clock, ChevronRight, Command, LayoutDashboard, Settings, Bell, Search, Lock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HistoricalChart from './components/HistoricalChart'; // Ensure you have this file
import CommandCenter from './components/CommandCenter'; // Ensure you have this file
import ActivityLogs from './components/ActivityLogs';
import SettingsView from './components/Settings';

// --- CONFIG ---
// YOUR RENDER URL GOES HERE
const SERVER_URL = 'https://arushi-cloud-server-v1.onrender.com';



function App() {
  // --- STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'agents', 'logs', 'settings'

  // --- 1. LOGIN & SOCKET SETUP ---
  useEffect(() => {
    const savedAuth = localStorage.getItem('arushi_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      initSocket();
    }
  }, []);

  const initSocket = () => {
    // Prevent multiple connections
    if (socket?.connected) return;

    const newSocket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token: 'my_super_secret_key_12345' } // Dashboard Key
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('register_dashboard');
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // Listen for Agent Events
    newSocket.on('agent_list', (list) => {
      // Convert the Map/Object to Array if needed, or just use list
      setAgents(list);
    });

    newSocket.on('agent_connected', (newAgent) => {
      setAgents(prev => {
        // Prevent duplicates
        if (prev.find(a => a.id === newAgent.id)) return prev;
        return [...prev, newAgent];
      });
    });

    newSocket.on('agent_update', (data) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.id ? { ...agent, stats: data, status: data.status || agent.status } : agent
      ));
    });

    setSocket(newSocket);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') { // Change this password!
      localStorage.setItem('arushi_auth', 'true');
      setIsAuthenticated(true);
      initSocket();
    } else {
      alert('Invalid Password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arushi_auth');
    setIsAuthenticated(false);
    if (socket) socket.disconnect();
    setSocket(null);
    setAgents([]);
  };

  // --- 2. RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a] text-slate-200">
        <div className="w-full max-w-md p-8 bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Arushi Cloud</h2>
          <p className="text-slate-400 text-center mb-8">Enterprise Security Console</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 3. RENDER MAIN DASHBOARD ---
  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <div className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col z-20">
        <div className="p-6 border-b border-slate-700/50 flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Arushi Cloud</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Overview"
            active={currentView === 'overview'}
            onClick={() => { setCurrentView('overview'); setSelectedAgent(null); }}
          />
          <SidebarItem
            icon={<Activity size={18} />}
            label="Activity Logs"
            active={currentView === 'logs'}
            onClick={() => setCurrentView('logs')}
          />
          <SidebarItem
            icon={<Settings size={18} />}
            label="Settings"
            active={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
          />
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-slate-800/50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">Server Status</span>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            </div>
            <div className="text-xs text-slate-500 truncate">{SERVER_URL.replace('https://', '')}</div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto relative">
        <header className="sticky top-0 z-10 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-700/50 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">
              {selectedAgent ? `Agent: ${selectedAgent.id.slice(0, 8)}...` : 'Dashboard Overview'}
            </h1>
            {selectedAgent && (
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
                {selectedAgent.platform}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search devices..." className="bg-slate-900 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 w-64" />
            </div>
            <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><Bell size={20} /></button>
          </div>
        </header>

        <div className="p-8">
          {currentView === 'logs' ? (
            <ActivityLogs />
          ) : currentView === 'settings' ? (
            <SettingsView />
          ) : (
            <AnimatePresence mode="wait">
              {!selectedAgent ? (
                /* --- AGENT GRID VIEW --- */
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {agents.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-500">
                      <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No agents connected.</p>
                      <p className="text-xs mt-2">Run the python script on your machine to connect.</p>
                    </div>
                  ) : (
                    agents.map(agent => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onClick={() => setSelectedAgent(agent)}
                      />
                    ))
                  )}
                </motion.div>
              ) : (
                /* --- AGENT DETAIL VIEW --- */
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="mb-4 text-sm text-slate-400 hover:text-white flex items-center"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to List
                  </button>

                  {/* Top Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <StatBig label="CPU Load" value={`${selectedAgent.stats?.cpu || 0}%`} icon={<Cpu />} color="text-purple-400" />
                    <StatBig label="Memory" value={`${selectedAgent.stats?.ram || 0}%`} icon={<HardDrive />} color="text-emerald-400" />
                    <StatBig label="Disk" value={`${selectedAgent.stats?.disk || 0}%`} icon={<Server />} color="text-blue-400" />
                    <StatBig label="Uptime" value={`${selectedAgent.stats?.uptime || 0}h`} icon={<Clock />} color="text-orange-400" />
                  </div>

                  {/* Middle Row: Charts & Terminal */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                    <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-4 flex flex-col">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Live Metrics</h3>
                      <div className="flex-1 min-h-0">
                        <HistoricalChart agentId={selectedAgent.id} liveStats={selectedAgent.stats} />
                      </div>
                    </div>
                    <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-4 flex flex-col overflow-hidden">
                      <CommandCenter agentId={selectedAgent.id} socket={socket} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const AgentCard = ({ agent, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors shadow-lg"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.platform === 'Windows' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
          {agent.platform === 'Windows' ? <Command size={20} /> : <Terminal size={20} />}
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">{agent.hostname || 'Unknown Host'}</h3>
          <p className="text-xs text-slate-500">{agent.id.slice(0, 12)}</p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${agent.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
        {agent.status || 'Offline'}
      </span>
    </div>

    <div className="grid grid-cols-3 gap-2 mt-4">
      <StatMini label="CPU" value={`${agent.stats?.cpu || 0}%`} />
      <StatMini label="RAM" value={`${agent.stats?.ram || 0}%`} />
      <StatMini label="DISK" value={`${agent.stats?.disk || 0}%`} />
    </div>
  </motion.div>
);

const StatMini = ({ label, value }) => (
  <div className="bg-slate-900/50 rounded p-2 text-center">
    <div className="text-[10px] text-slate-500 font-bold mb-1">{label}</div>
    <div className="text-xs font-mono text-white">{value}</div>
  </div>
);

const StatBig = ({ label, value, icon, color }) => (
  <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase mb-1">{label}</p>
      <h3 className={`text-2xl font-mono font-bold ${color}`}>{value}</h3>
    </div>
    <div className={`p-3 rounded-lg bg-slate-800 ${color} bg-opacity-10`}>
      {icon}
    </div>
  </div>
);

export default App;