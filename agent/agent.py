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

# Disable warnings for self-signed certificates (OPNsense Localhost)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- CONFIGURATION LOADER ---
CONFIG_FILE = 'agent_config.json'
config = {}

def load_config():
    global config
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
        
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
            print("✅ Configuration saved! Starting agent...\n")

# Load config immediately
load_config()

SERVER_URL = config.get('server_url')
API_KEY = config.get('api_key')
AGENT_ID = str(uuid.uuid4()) # In production, save this ID to config too so it doesn't change on reboot

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
        return "Command not implemented"

class WindowsAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        if command_key == 'ping_google':
            return self._run_safe(['ping', '-n', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['powershell', '-Command', 'Get-EventLog -LogName System -Newest 5 | Format-Table -AutoSize'])
        elif command_key == 'pkg_update':
            return "Windows Update check requires Admin privileges."
        return f"Unknown command: {command_key}"

class LinuxAgent(BaseAgent):
    def execute_command(self, command_key, payload=None):
        if command_key == 'ping_google':
            return self._run_safe(['ping', '-c', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['tail', '-n', '20', '/var/log/syslog'])
        elif command_key == 'pkg_update':
            return self._run_safe(['apt', 'update'])
        return f"Unknown command: {command_key}"

class OPNsenseAgent(LinuxAgent):
    def __init__(self):
        super().__init__()
        self.api_key = config.get('opnsense_key')
        self.api_secret = config.get('opnsense_secret')
        self.api_url = config.get('opnsense_url')

    def execute_command(self, command_key, payload=None):
        if command_key == 'check_logs' or command_key == 'get_logs':
            # REAL API CALL with SSL Verify Disabled
            try:
                # OPNsense firewall log endpoint
                endpoint = f'{self.api_url}/diagnostics/log/core/firewall'
                res = requests.get(endpoint, auth=(self.api_key, self.api_secret), verify=False, timeout=5)
                if res.status_code == 200:
                    # Parse JSON response or return raw text
                    return res.json()['rows'][:50] # Return last 50 logs
                return f"API Error {res.status_code}: {res.text}"
            except Exception as e:
                return f"API Connection Failed: {e}"
        
        elif command_key == 'backup_config':
            try:
                endpoint = f'{self.api_url}/core/backup/download'
                res = requests.get(endpoint, auth=(self.api_key, self.api_secret), verify=False, stream=True)
                if res.status_code == 200:
                    # In real app, upload this content to S3
                    return f"✅ Success: Downloaded {len(res.content)} bytes. (Ready to upload)"
                return f"Backup Failed: {res.status_code}"
            except Exception as e:
                return f"Backup Error: {e}"

        elif command_key == 'block_ip':
            try:
                ip_to_block = payload.get('ip') if payload else None
                if not ip_to_block:
                    return "Error: No IP specified"
                
                # Add to OPNsense Alias
                alias_name = "ARUSHI_BLOCKLIST"
                endpoint = f'{self.api_url}/firewall/alias_util/add/{alias_name}'
                payload_data = {"address": ip_to_block}
                
                res = requests.post(endpoint, json=payload_data, auth=(self.api_key, self.api_secret), verify=False, timeout=5)
                
                if res.status_code == 200:
                    return f"✅ Blocked IP: {ip_to_block}"
                return f"Block Failed {res.status_code}: {res.text}"
            except Exception as e:
                return f"Block Error: {e}"

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

# --- MAIN LOOP WITH OFFLINE QUEUE ---
def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID[:8]}...)")
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