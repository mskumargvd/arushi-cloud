import socketio
import time
import sys
import subprocess
import uuid
import platform
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
SERVER_URL = 'http://localhost:3000' # TODO: Make configurable
AGENT_ID = str(uuid.uuid4()) # Generate a unique ID for this session (persist this in real app)

# Standard Python Socket.IO Client
sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=1)

# Allowed commands (Whitelist)
ALLOWED_COMMANDS = {
    'pkg_update': ['pkg', 'update'],
    'pkg_upgrade': ['pkg', 'upgrade', '-y'],
    'check_logs': ['tail', '-n', '20', '/var/log/system.log'], # Example
    'uptime': ['uptime'],
    'ping_google': ['ping', '-c', '4', '8.8.8.8']
}

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
    
    logger.info(f"Received command request: {command_key}")
    
    if command_key not in ALLOWED_COMMANDS:
        error_msg = f"Command '{command_key}' is not allowed."
        logger.warning(error_msg)
        sio.emit('command_result', {'dashboardId': dashboard_id, 'result': {'error': error_msg}})
        return

    cmd_args = ALLOWED_COMMANDS[command_key]
    
    try:
        # Execute command safely without shell=True
        result = subprocess.run(cmd_args, capture_output=True, text=True, timeout=30)
        output = result.stdout + result.stderr
        logger.info(f"Command executed. Output length: {len(output)}")
        
        sio.emit('command_result', {
            'dashboardId': dashboard_id, 
            'result': {
                'output': output,
                'code': result.returncode
            }
        })
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        sio.emit('command_result', {
            'dashboardId': dashboard_id, 
            'result': {'error': str(e)}
        })

def main():
    logger.info(f"Starting Arushi Cloud Agent (ID: {AGENT_ID})...")
    
    while True:
        try:
            if not sio.connected:
                sio.connect(SERVER_URL)
            sio.wait()
        except Exception as e:
            logger.error(f"Connection loop error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    main()
