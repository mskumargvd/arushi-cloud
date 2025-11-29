import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Terminal, Activity, Server, Shield, Cpu, HardDrive, Clock, ChevronRight, Command, LayoutDashboard, Settings, Bell, Search, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// ... import your other components ...

// --- CONFIG ---
// In production, this URL must be your VPS URL (e.g., https://api.arushi.com)
// For local testing, keep http://localhost:3000
const SERVER_URL = 'https://arushi-cloud-server-v1.onrender.com';

function App() {
  // 1. AUTH STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [socket, setSocket] = useState(null);

  // 2. CHECK LOGIN ON LOAD
  useEffect(() => {
    const savedAuth = localStorage.getItem('arushi_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      initSocket();
    }
  }, []);

  // 3. INIT SOCKET (Only after login)
  const initSocket = () => {
    const newSocket = io(SERVER_URL, {
      autoConnect: true,
      auth: { token: 'my_super_secret_key_12345' } // Dashboard Key
    });
    setSocket(newSocket);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple Admin Password (Change this!)
    if (passwordInput === 'admin123') {
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
  };

  // --- RENDER LOGIN SCREEN ---
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

  // --- RENDER DASHBOARD (Your existing code goes here) ---
  // Just make sure to pass the `socket` object we created above to your components
  // And add a Logout button to your sidebar

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* ... Your Sidebar Code ... */}
      {/* Add this button to sidebar bottom */}
      <button onClick={handleLogout} className="mt-auto flex items-center px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
        <Lock className="w-4 h-4 mr-3" />
        <span className="font-medium text-sm">Logout</span>
      </button>

      {/* ... The rest of your dashboard code ... */}
    </div>
  );
}

export default App;