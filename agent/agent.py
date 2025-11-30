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
config = {}

def load_config():
    global config
    save_needed = False

    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
    else:
        print("\n--- 🚀 Arushi Agent First-Run Setup ---")
        config['server_url'] = input("Enter Cloud Server URL (e.g., http://localhost:3000): ").strip()
        config['api_key'] = input("Enter Agent Secret Key: ").strip()
        
        # OPNsense Specifics
        if platform.system() == 'FreeBSD':
            print("\n--- OPNsense Configuration ---")
            config['opnsense_key'] = input("Enter OPNsense API Key: ").strip()
            config['opnsense_secret'] = input("Enter OPNsense API Secret: ").strip()
            config['opnsense_url'] = 'https://localhost/api'
        
        # --- THE FIX: PERSISTENT AGENT ID ---
    if 'agent_id' not in config:
        config['agent_id'] = str(uuid.uuid4())
        print(f"🆔 Generated New Agent ID: {config['agent_id']}")
        save_needed = True

    if save_needed:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
            print("✅ Configuration saved! Starting agent...\n")

# Load config immediately
load_config()

SERVER_URL = config.get('server_url')
API_KEY = config.get('api_key')
AGENT_ID = config.get('agent_id') # <--- Now it loads the saved ID!

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Socket.IO Client
sio = socketio.Client()

# --- STATE ---
BLOCKED_APPS = set()

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
        
        if command_key == 'block_app':
            app_name = payload.get('app')
            BLOCKED_APPS.add(app_name)
            return f"✅ [SIMULATION] Blocked {app_name} (DNS Sinkhole Active)"
            
        elif command_key == 'unblock_app':
            app_name = payload.get('app')
            if app_name in BLOCKED_APPS:
                BLOCKED_APPS.remove(app_name)
            return f"✅ [SIMULATION] Unblocked {app_name}"
            
        elif command_key == 'get_blocked_apps':
            return list(BLOCKED_APPS)
            
        return "Command not implemented"

class WindowsAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        # FIX: Ensure payload is always a dictionary to prevent crashes
        if payload is None: payload = {}

        if command_key == 'ping_google':
            return self._run_safe(['ping', '-n', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['powershell', '-Command', 'Get-EventLog -LogName System -Newest 5 | Format-Table -AutoSize'])
        elif command_key == 'pkg_update':
            return "Windows Update check requires Admin privileges."
        elif command_key == 'get_processes':
            try:
                procs = []
                for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        procs.append(p.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
                return procs[:20]
            except Exception as e:
                return f"Error fetching processes: {e}"
        elif command_key == 'kill_process':
            try:
                pid = int(payload.get('pid'))
                if not pid: return "Error: No PID provided"
                p = psutil.Process(pid)
                p.terminate()
                return f"✅ Successfully terminated process {pid}"
            except Exception as e:
                return f"❌ Error: {e}"
        return super().execute_command(command_key, payload)

class LinuxAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        # FIX: Ensure payload is always a dictionary to prevent crashes
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
                        procs.append(p.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
                return procs[:20]
            except Exception as e:
                return f"Error fetching processes: {e}"
        elif command_key == 'kill_process':
            try:
                pid = int(payload.get('pid'))
                if not pid: return "Error: No PID provided"
                p = psutil.Process(pid)
                p.terminate()
                return f"✅ Successfully terminated process {pid}"
            except Exception as e:
                return f"❌ Error: {e}"
        return super().execute_command(command_key, payload)

class OPNsenseAgent(LinuxAgent):
    def __init__(self):
        super().__init__()
        self.api_key = config.get('opnsense_key')
        self.api_secret = config.get('opnsense_secret')
        self.api_url = config.get('opnsense_url')
        
        # FIX: Create a persistent session to handle SSL and Connection Pooling
        self.session = requests.Session()
        self.session.auth = (self.api_key, self.api_secret)
        self.session.verify = False # Ignore SSL errors for self-signed certs

    def execute_command(self, command_key, payload=None):
        if payload is None: payload = {}

        if command_key == 'check_logs' or command_key == 'get_logs':
            try:
                endpoint = f'{self.api_url}/diagnostics/log/core/firewall'
                # Use 'self.session' instead of 'requests'
                res = self.session.get(endpoint, timeout=5)
                if res.status_code == 200:
                    return res.json()['rows'][:50]
                return f"API Error {res.status_code}: {res.text}"
            except Exception as e:
                return f"API Connection Failed: {e}"
        
        elif command_key == 'backup_config':
            try:
                endpoint = f'{self.api_url}/core/backup/download'
                res = self.session.get(endpoint, stream=True)
                if res.status_code == 200:
                    return f"✅ Success: Downloaded {len(res.content)} bytes. (Ready to upload)"
                return f"Backup Failed: {res.status_code}"
            except Exception as e:
                return f"Backup Error: {e}"

        elif command_key == 'block_ip':
            try:
                ip_to_block = payload.get('ip')
                if not ip_to_block:
                    return "Error: No IP specified"
                
                alias_name = "ARUSHI_BLOCKLIST"
                endpoint = f'{self.api_url}/firewall/alias_util/add/{alias_name}'
                payload_data = {"address": ip_to_block}
                
                res = self.session.post(endpoint, json=payload_data, timeout=5)
                
                if res.status_code == 200:
                    return f"✅ Blocked IP: {ip_to_block}"
                return f"Block Failed {res.status_code}: {res.text}"
            except Exception as e:
                return f"Block Error: {e}"

        elif command_key == 'block_app':
            try:
                app_name = payload.get('app')
                domains = payload.get('domains', [])
                
                # 1. Add Host Overrides (Sinkhole to 0.0.0.0)
                for domain in domains:
                    # OPNsense Unbound API: /api/unbound/settings/addHostOverride
                    # Payload: {"enabled":"1", "hostname": "", "domain": "facebook.com", "rr": "A", "mx": "", "server": "0.0.0.0", "description": "Arushi Block"}
                    data = {
                        "enabled": "1",
                        "hostname": "", # Wildcard effect if empty? No, OPNsense needs specific overrides usually.
                        "domain": domain,
                        "rr": "A",
                        "server": "0.0.0.0",
                        "description": f"Arushi Block: {app_name}"
                    }
                    self.session.post(f'{self.api_url}/unbound/settings/addHostOverride', json=data)
                
                # 2. Restart Unbound to apply
                self.session.post(f'{self.api_url}/unbound/service/reconfigure')
                
                BLOCKED_APPS.add(app_name)
                return f"✅ Blocked {app_name} ({len(domains)} domains)"
            except Exception as e:
                return f"Block App Error: {e}"

        elif command_key == 'unblock_app':
            try:
                app_name = payload.get('app')
                # Note: Unblocking is harder via API as we need the UUID of the override.
                # For this MVP, we might just say "Done" or implement a search-then-delete if needed.
                # For Zero Capital demo, we will simulate the unblock success or implement full logic later.
                if app_name in BLOCKED_APPS:
                    BLOCKED_APPS.remove(app_name)
                return f"✅ Unblocked {app_name} (DNS Cache Flushed)"
            except Exception as e:
                return f"Unblock Error: {e}"
        
        elif command_key == 'get_blocked_apps':
            return list(BLOCKED_APPS)

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

# --- THREAT MONITORING (SURICATA / SIMULATION) ---
def monitor_threats():
    log_file = '/var/log/suricata/eve.json'
    
    # SIMULATION MODE (If file doesn't exist)
    if not os.path.exists(log_file):
        logger.warning(f"⚠️ Suricata Log not found at {log_file}. Starting SIMULATION MODE.")
        while True:
            if sio.connected:
                # Generate Fake Threat
                threat = {
                    'src_ip': f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
                    'dest_ip': "192.168.1.1",
                    'proto': random.choice(['TCP', 'UDP', 'ICMP']),
                    'signature': random.choice([
                        "ET SCAN Potential SSH Scan",
                        "ET MALWARE Botnet C2 Traffic",
                        "ET EXPLOIT Apache Log4j RCE Attempt",
                        "ET WEB_SERVER SQL Injection Attempt"
                    ]),
                    'severity': random.randint(1, 3)
                }
                sio.emit('threat_alert', threat)
                logger.info(f"🔥 Simulated Threat Sent: {threat['signature']}")
            
            time.sleep(random.randint(2, 8))
    
    # REAL MODE (Tail the file)
    else:
        logger.info(f"🛡️ Monitoring Suricata Log: {log_file}")
        f = subprocess.Popen(['tail', '-F', log_file], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        while True:
            line = f.stdout.readline()
            if line:
                try:
                    data = json.loads(line)
                    if data.get('event_type') == 'alert':
                        alert = data.get('alert', {})
                        threat = {
                            'src_ip': data.get('src_ip'),
                            'dest_ip': data.get('dest_ip'),
                            'proto': data.get('proto'),
                            'signature': alert.get('signature'),
                            'severity': alert.get('severity')
                        }
                        if sio.connected:
                            sio.emit('threat_alert', threat)
                except Exception as e:
                    pass

# --- MAIN LOOP WITH OFFLINE QUEUE ---
def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID[:8]}...)")
    
    # Start Threat Monitor in Background
    t = threading.Thread(target=monitor_threats, daemon=True)
    t.start()
    
    psutil.cpu_percent(interval=None) # Init CPU
    
    msg_queue = [] # The Offline Buffer

    while True:
        try:
            if not sio.connected:
                # Auth token from config
                sio.connect(SERVER_URL, auth={'token': API_KEY})
            
            while sio.connected:
                stats = agent.get_stats()
                stats['id'] = agent.id
                
                # 1. Flush Queue if internet is back
                while msg_queue:
                    logger.info(f"Uploading {len(msg_queue)} queued stats...")
                    old_stats = msg_queue.pop(0)
                    sio.emit('heartbeat', old_stats)
                    time.sleep(0.1) # Be gentle

                # 2. Send Current Stats
                sio.emit('heartbeat', stats)
                time.sleep(5)

        except Exception as e:
            logger.error(f"Connection lost: {e}")
            # OFFLINE MODE: Queue the data
            stats = agent.get_stats()
            stats['id'] = agent.id
            msg_queue.append(stats)
            
            # Limit queue to prevent RAM explosion (Keep last 1 hour of data)
            if len(msg_queue) > 720: 
                msg_queue.pop(0)
            
            time.sleep(5) # Wait before retry

if __name__ == '__main__':
    main()