import socketio
import platform
import uuid
import psutil
import logging
import subprocess
import time
import os
import json
import requests
import urllib3
import threading
import random

# Disable warnings for self-signed certificates (OPNsense Localhost)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- CONFIGURATION LOADER ---
CONFIG_FILE = 'agent_config.json'
BLOCK_LIST_FILE = 'blocked_apps.json'
config = {}
blocked_apps_state = set()

def load_config():
    global config
    save_needed = False

    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
    else:
        print("\n--- 🚀 Arushi Agent First-Run Setup ---")
        config['server_url'] = input("Enter Cloud Server URL (e.g., https://...): ").strip()
        config['api_key'] = input("Enter Agent Secret Key: ").strip()
        
        # OPNsense Specifics
        if platform.system() == 'FreeBSD':
            print("\n--- OPNsense Configuration ---")
            config['opnsense_key'] = input("Enter OPNsense API Key: ").strip()
            config['opnsense_secret'] = input("Enter OPNsense API Secret: ").strip()
            config['opnsense_url'] = 'https://localhost/api'
        
    if 'agent_id' not in config:
        config['agent_id'] = str(uuid.uuid4())
        print(f"🆔 Generated New Agent ID: {config['agent_id']}")
        save_needed = True

    if save_needed:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
            print("✅ Configuration saved! Starting agent...\n")

def load_blocked_apps():
    global blocked_apps_state
    if os.path.exists(BLOCK_LIST_FILE):
        try:
            with open(BLOCK_LIST_FILE, 'r') as f:
                blocked_apps_state = set(json.load(f))
        except:
            blocked_apps_state = set()

def save_blocked_apps():
    with open(BLOCK_LIST_FILE, 'w') as f:
        json.dump(list(blocked_apps_state), f)

# Init
load_config()
load_blocked_apps()

SERVER_URL = config.get('server_url')
API_KEY = config.get('api_key')
AGENT_ID = config.get('agent_id')

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Socket.IO Client
sio = socketio.Client()

class BaseAgent:
    def __init__(self):
        self.id = AGENT_ID
        self.platform = platform.system()
        self.hostname = platform.node()

    def get_stats(self):
        try:
            return {
                'cpu': psutil.cpu_percent(interval=None),
                'ram': psutil.virtual_memory().percent,
                'disk': psutil.disk_usage('/').percent,
                'uptime': int((time.time() - psutil.boot_time()) / 3600)
            }
        except Exception as e:
            logger.error(f"Error collecting stats: {e}")
            return {}

    def _run_safe(self, command_list):
        try:
            result = subprocess.run(command_list, capture_output=True, text=True, timeout=10)
            return result.stdout.strip() or result.stderr.strip()
        except Exception as e:
            return f"Execution Error: {e}"

    def execute_command(self, command_key, payload=None):
        if payload is None: payload = {}
        return "Command not implemented"

class WindowsAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        if payload is None: payload = {}

        if command_key == 'ping_google':
            return self._run_safe(['ping', '-n', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['powershell', '-Command', 'Get-EventLog -LogName System -Newest 5 | Format-Table -AutoSize'])
        elif command_key == 'get_processes':
            try:
                procs = []
                for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        p_info = p.info
                        if p_info['cpu_percent'] is None: p_info['cpu_percent'] = 0.0
                        procs.append(p_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
                return procs[:20]
            except Exception as e:
                return f"Error: {e}"
        elif command_key == 'kill_process':
            pid = payload.get('pid')
            if not pid: return "Error: No PID"
            if int(pid) == os.getpid(): return "⚠️ Safety: Cannot kill self."
            try:
                psutil.Process(int(pid)).terminate()
                return f"✅ Killed process {pid}"
            except Exception as e:
                return f"❌ Error: {e}"
        
        return f"Unknown Windows Command: {command_key}"

class LinuxAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        if payload is None: payload = {}

        if command_key == 'ping_google':
            return self._run_safe(['ping', '-c', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['tail', '-n', '20', '/var/log/syslog'])
        elif command_key == 'pkg_update':
            return self._run_safe(['apt', 'update'])
        elif command_key == 'get_processes':
            try:
                procs = []
                for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        p_info = p.info
                        if p_info['cpu_percent'] is None: p_info['cpu_percent'] = 0.0
                        procs.append(p_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
                return procs[:20]
            except Exception as e:
                return f"Error: {e}"
        elif command_key == 'kill_process':
            pid = payload.get('pid')
            if not pid: return "Error: No PID"
            if int(pid) == os.getpid(): return "⚠️ Safety: Cannot kill self."
            try:
                psutil.Process(int(pid)).terminate()
                return f"✅ Killed process {pid}"
            except Exception as e:
                return f"❌ Error: {e}"
        
        return f"Unknown Linux Command: {command_key}"

class OPNsenseAgent(LinuxAgent):
    def __init__(self):
        super().__init__()
        self.api_key = config.get('opnsense_key')
        self.api_secret = config.get('opnsense_secret')
        self.api_url = config.get('opnsense_url')
        
        self.session = requests.Session()
        self.session.auth = (self.api_key, self.api_secret)
        self.session.verify = False 

    def execute_command(self, command_key, payload=None):
        if payload is None: payload = {}

        if command_key == 'check_logs' or command_key == 'get_logs':
            try:
                # Real OPNsense Log Endpoint
                res = self.session.get(f'{self.api_url}/diagnostics/log/core/firewall', timeout=5)
                if res.status_code == 200:
                    return res.json()['rows'][:50]
                return f"API Error {res.status_code}: {res.text}"
            except Exception as e:
                return f"Connection Failed: {e}"
        
        elif command_key == 'backup_config':
            try:
                res = self.session.get(f'{self.api_url}/core/backup/download', stream=True)
                if res.status_code == 200:
                    # In production, upload this to cloud storage
                    return f"✅ Backup Success: {len(res.content)} bytes retrieved."
                return f"Backup Error: {res.status_code}"
            except Exception as e:
                return f"Backup Failed: {e}"

        elif command_key == 'block_ip':
            try:
                ip = payload.get('ip')
                if not ip: return "Error: No IP"
                
                # 1. Add to Alias
                endpoint = f'{self.api_url}/firewall/alias_util/add/ARUSHI_BLOCKLIST'
                res = self.session.post(endpoint, json={'address': ip})
                
                if res.status_code == 200:
                    # 2. Apply Changes is usually automatic for aliases, but can force filter reload
                    # self.session.post(f'{self.api_url}/firewall/filter/apply')
                    return f"✅ IP {ip} added to Blocklist"
                return f"Block Failed: {res.text}"
            except Exception as e:
                return f"Block Error: {e}"

        # --- APP CONTROL (Layer 7 DNS Blocking) ---
        elif command_key == 'block_app':
            app_name = payload.get('app')
            domains = payload.get('domains', [])
            
            success_count = 0
            errors = []

            for domain in domains:
                try:
                    # OPNsense Unbound Override
                    data = {
                        "enabled": "1",
                        "domain": domain,
                        "server": "0.0.0.0",
                        "description": f"Arushi Block: {app_name}"
                    }
                    # Note: The exact endpoint depends on plugin version, usually /api/unbound/settings/addHostOverride
                    res = self.session.post(f'{self.api_url}/unbound/settings/addHostOverride', json={"host_override": data})
                    
                    if res.status_code == 200:
                        success_count += 1
                    else:
                        errors.append(f"{domain}: {res.status_code}")
                except Exception as e:
                    errors.append(str(e))
            
            # Apply Unbound Changes
            self.session.post(f'{self.api_url}/unbound/service/reconfigure')
            
            if success_count > 0:
                blocked_apps_state.add(app_name)
                save_blocked_apps()
                return f"✅ Blocked {app_name} ({success_count} domains)"
            return f"Failed to block {app_name}: {errors}"

        elif command_key == 'unblock_app':
            app_name = payload.get('app')
            domains = payload.get('domains', [])
            
            # To delete, we first need to find the UUIDs of the overrides
            try:
                search_res = self.session.get(f'{self.api_url}/unbound/settings/searchHostOverride')
                if search_res.status_code == 200:
                    overrides = search_res.json().get('rows', [])
                    deleted_count = 0
                    
                    for item in overrides:
                        # Check if this override belongs to our app block
                        if item.get('domain') in domains and f"Arushi Block: {app_name}" in item.get('description', ''):
                            uuid = item.get('uuid')
                            del_res = self.session.post(f'{self.api_url}/unbound/settings/delHostOverride/{uuid}')
                            if del_res.status_code == 200:
                                deleted_count += 1
                    
                    self.session.post(f'{self.api_url}/unbound/service/reconfigure')
                    
                    if app_name in blocked_apps_state:
                        blocked_apps_state.remove(app_name)
                        save_blocked_apps()
                        
                    return f"✅ Unblocked {app_name} (Removed {deleted_count} rules)"
            except Exception as e:
                return f"Unblock Error: {e}"

        elif command_key == 'get_blocked_apps':
            return list(blocked_apps_state)

        return super().execute_command(command_key, payload)

def get_agent():
    system = platform.system()
    if system == 'Windows': return WindowsAgent()
    elif system == 'Linux': return LinuxAgent()
    elif system == 'FreeBSD': return OPNsenseAgent()
    else: return LinuxAgent()

agent = get_agent()

@sio.event
def connect():
    logger.info("Connected to server!")
    sio.emit('register_agent', {'id': agent.id, 'platform': agent.platform, 'hostname': agent.hostname})

@sio.on('execute_command')
def on_execute_command(data):
    command_key = data.get('command')
    payload = data.get('payload')
    dashboard_id = data.get('id')
    logger.info(f"Executing: {command_key}")
    output = agent.execute_command(command_key, payload)
    sio.emit('command_result', {'dashboardId': dashboard_id, 'result': {'output': output}})

# --- THREAT MONITORING (REAL LOGS) ---
def monitor_threats():
    # Standard Suricata EVE Log path
    log_file = '/var/log/suricata/eve.json'
    
    # If file exists, tail it (Real Mode)
    if os.path.exists(log_file):
        logger.info(f"🛡️ Starting Real-Time Threat Monitor: {log_file}")
        try:
            # Tail -F keeps reading even if file rotates
            p = subprocess.Popen(['tail', '-F', log_file], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            while True:
                line = p.stdout.readline()
                if line:
                    try:
                        data = json.loads(line)
                        # Only care about alerts
                        if data.get('event_type') == 'alert':
                            alert = data.get('alert', {})
                            threat_payload = {
                                'src_ip': data.get('src_ip'),
                                'dest_ip': data.get('dest_ip'),
                                'proto': data.get('proto'),
                                'signature': alert.get('signature'),
                                'severity': alert.get('severity')
                            }
                            if sio.connected:
                                sio.emit('threat_alert', threat_payload)
                    except json.JSONDecodeError:
                        pass
        except Exception as e:
            logger.error(f"Threat Monitor Failed: {e}")

def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID[:8]}...)")
    
    # Start Threat Monitor thread
    t = threading.Thread(target=monitor_threats, daemon=True)
    t.start()
    
    psutil.cpu_percent(interval=None)
    msg_queue = [] 

    while True:
        try:
            if not sio.connected:
                sio.connect(SERVER_URL, auth={'token': API_KEY})
            
            while sio.connected:
                stats = agent.get_stats()
                stats['id'] = agent.id
                
                while msg_queue:
                    old_stats = msg_queue.pop(0)
                    sio.emit('heartbeat', old_stats)
                    time.sleep(0.1)

                sio.emit('heartbeat', stats)
                time.sleep(5)

        except Exception as e:
            logger.error(f"Connection lost: {e}")
            stats = agent.get_stats()
            stats['id'] = agent.id
            msg_queue.append(stats)
            if len(msg_queue) > 720: msg_queue.pop(0)
            time.sleep(5)

if __name__ == '__main__':
    main()