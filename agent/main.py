import socketio
import time
import sys
import subprocess
import uuid
import platform
import logging
import psutil

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
SERVER_URL = 'http://localhost:3000' # TODO: Make configurable
AGENT_ID = str(uuid.uuid4()) # Generate a unique ID for this session (persist this in real app)

# Standard Python Socket.IO Client
sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=1)



def get_system_stats():
    try:
        return {
            'os': platform.system(),
            'cpu': psutil.cpu_percent(interval=None), # Non-blocking
            'ram': psutil.virtual_memory().percent,
            'disk': psutil.disk_usage('/').percent,
            'uptime': int(time.time() - psutil.boot_time()) // 3600 # Hours
        }
    except Exception as e:
        logger.error(f"Error collecting stats: {e}")
        return {}

@sio.event
def connect():
    logger.info("Connected to server!")
    # Register as agent
    sio.emit('register_agent', {'id': AGENT_ID, 'platform': platform.system()})

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

    output = ""
    system_os = platform.system()

    try:
        # 1. PING GOOGLE
        if command_key == 'ping_google':
            host = "8.8.8.8"
            # Windows uses -n, Linux uses -c
            param = '-n' if system_os == 'Windows' else '-c'
            cmd = ['ping', param, '4', host]
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)
        
        # 2. CHECK LOGS
        elif command_key == 'check_logs':
            if system_os == 'Windows':
                cmd = ['powershell', '-Command', 'Get-EventLog -LogName System -Newest 5 | Format-Table -AutoSize']
            else:
                cmd = ['tail', '-n', '20', '/var/log/system.log']
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)

        # 3. UPDATE PACKAGES
        elif command_key == 'pkg_update':
            if system_os == 'Windows':
                # Windows doesn't have a standardized 'update' for everything
                output = "Checking Windows Update status...\n(Note: Full update requires Admin rights)\n"
            else:
                cmd = ['pkg', 'update']
                output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)
        
        # 4. UPTIME
        elif command_key == 'uptime':
             if system_os == 'Windows':
                 cmd = ['powershell', '-Command', '(Get-CimInstance Win32_OperatingSystem).LastBootUpTime']
             else:
                 cmd = ['uptime']
             output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)

        else:
            output = f"Unknown command: {command_key}"

    except subprocess.CalledProcessError as e:
        output = f"Error executing command:\n{e.output}"
    except Exception as e:
        output = f"Failed: {str(e)}"

    # Send the result back to the dashboard
    sio.emit('command_result', {'dashboardId': dashboard_id, 'result': {'output': output}})

def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID})...")
    
    # Initial CPU call to set baseline
    psutil.cpu_percent(interval=None)

    while True:
        try:
            if not sio.connected:
                sio.connect(SERVER_URL)
            
            # Heartbeat loop
            while sio.connected:
                stats = get_system_stats()
                stats['id'] = AGENT_ID
                sio.emit('heartbeat', stats)
                time.sleep(5)
                
        except Exception as e:
            logger.error(f"Connection loop error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    main()
