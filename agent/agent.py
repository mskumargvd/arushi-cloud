import socketio
import platform
import uuid
import psutil
import logging
import subprocess
import time
import os

# Configuration
SERVER_URL = 'http://localhost:3000'
API_KEY = 'my_super_secret_key_12345'
AGENT_ID = str(uuid.uuid4())

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
        """Collect system statistics."""
        try:
            return {
                'cpu': psutil.cpu_percent(interval=None),
                'ram': psutil.virtual_memory().percent,
                'disk': psutil.disk_usage('/').percent,
                'uptime': int((time.time() - psutil.boot_time()) / 3600) # Hours
            }
        except Exception as e:
            logger.error(f"Error collecting stats: {e}")
            return {}

    def _run_safe(self, command_list):
        """Run a command safely and return output."""
        try:
            result = subprocess.run(command_list, capture_output=True, text=True, timeout=10)
            return result.stdout.strip() or result.stderr.strip()
        except Exception as e:
            return f"Execution Error: {e}"

    def execute_command(self, command_key):
        """Base method to be overridden."""
        return "Command not implemented"

class WindowsAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        logger.info("Initializing WindowsAgent...")

    def execute_command(self, command_key):
        if command_key == 'ping_google':
            return self._run_safe(['ping', '-n', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['powershell', '-Command', 'Get-EventLog -LogName System -Newest 5 | Format-Table -AutoSize'])
        elif command_key == 'pkg_update':
            return "Checking Windows Update status...\n(Note: Full update requires Admin rights)\n"
        elif command_key == 'uptime':
            return self._run_safe(['powershell', '-Command', '(Get-CimInstance Win32_OperatingSystem).LastBootUpTime'])
        return f"Unknown command: {command_key}"

class LinuxAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        logger.info("Initializing LinuxAgent...")

    def execute_command(self, command_key):
        if command_key == 'ping_google':
            return self._run_safe(['ping', '-c', '4', '8.8.8.8'])
        elif command_key == 'check_logs':
            return self._run_safe(['tail', '-n', '20', '/var/log/syslog']) # Default linux log
        elif command_key == 'pkg_update':
            return self._run_safe(['apt', 'update']) # Default to apt for now
        elif command_key == 'uptime':
            return self._run_safe(['uptime'])
        return f"Unknown command: {command_key}"

class OPNsenseAgent(LinuxAgent):
    def __init__(self):
        super().__init__()
        logger.info("Initializing OPNsenseAgent...")
        # TODO: Load these from secure storage or env vars
        self.api_key = 'YOUR_OPNSENSE_KEY'
        self.api_secret = 'YOUR_OPNSENSE_SECRET'
        self.api_url = 'https://localhost/api' # Localhost if running on the box itself

    def execute_command(self, command_key):
        # Override specific commands for FreeBSD/OPNsense
        if command_key == 'check_logs':
            # Try API first, fall back to file
            try:
                # In a real scenario, we would make a request:
                # response = requests.get(f'{self.api_url}/diagnostics/log/core/firewall', auth=(self.api_key, self.api_secret), verify=False)
                # return response.text
                return self._run_safe(['tail', '-n', '20', '/var/log/system.log'])
            except Exception as e:
                return f"API Error: {e}"
        
        elif command_key == 'pkg_update':
            return self._run_safe(['pkg', 'update'])
        
        elif command_key == 'backup_config':
            return "Simulating config backup download..."
            # Real implementation:
            # response = requests.get(f'{self.api_url}/core/backup/download', auth=(self.api_key, self.api_secret), verify=False)
            # return "Config backup downloaded successfully (size: ...)"
        
        # Fallback to standard Linux commands (like ping, uptime)
        return super().execute_command(command_key)

def get_agent():
    """Factory to return the correct agent instance."""
    system = platform.system()
    if system == 'Windows':
        return WindowsAgent()
    elif system == 'Linux':
        # Simple check for OPNsense (FreeBSD is reported as 'FreeBSD' usually, but python might say Linux if compat layer? 
        # Actually platform.system() returns 'FreeBSD' on FreeBSD.
        # Let's handle FreeBSD as OPNsense for now.
        return LinuxAgent()
    elif system == 'FreeBSD':
        return OPNsenseAgent()
    else:
        logger.warning(f"Unknown OS: {system}. Defaulting to LinuxAgent.")
        return LinuxAgent()

# Global Agent Instance
agent = get_agent()

@sio.event
def connect():
    logger.info("Connected to server!")
    sio.emit('register_agent', {'id': agent.id, 'platform': agent.platform})

@sio.event
def connect_error(data):
    logger.error(f"Connection failed: {data}")

@sio.event
def disconnect():
    logger.info("Disconnected from server!")

@sio.on('execute_command')
def on_execute_command(data):
    command_key = data.get('command')
    dashboard_id = data.get('id')
    print(f"Received command: {command_key}")

    output = agent.execute_command(command_key)

    # Send the result back to the dashboard
    sio.emit('command_result', {'dashboardId': dashboard_id, 'result': {'output': output}})

def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID})...")
    
    # Initial CPU call to set baseline
    psutil.cpu_percent(interval=None)

    while True:
        try:
            if not sio.connected:
                sio.connect(SERVER_URL, auth={'token': API_KEY})
            
            # Heartbeat loop
            while sio.connected:
                stats = agent.get_stats()
                stats['id'] = agent.id
                sio.emit('heartbeat', stats)
                time.sleep(5)
                
        except Exception as e:
            logger.error(f"Connection loop error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    main()
