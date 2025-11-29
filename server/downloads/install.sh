#!/bin/bash

# --- Arushi Cloud Universal Installer (Linux/BSD) ---
# Usage: curl ... | sudo bash -s -- --key=YOUR_KEY

SERVER_URL="https://arushi-cloud-server-v1.onrender.com"
INSTALL_DIR="/opt/arushi-agent"
SERVICE_NAME="arushi-agent"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Arushi Agent Installation...${NC}"

# 1. Parse Arguments (The "One-Line" Magic)
API_KEY=""
for i in "$@"
do
case $i in
    --key=*)
    API_KEY="${i#*=}"
    shift
    ;;
esac
done

# 2. Check Root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Error: Please run as root (sudo)${NC}"
  exit 1
fi

# 3. Detect OS
OS="$(uname -s)"
echo "Detected OS: $OS"

# 4. Install Dependencies
echo "📦 Installing Dependencies..."
if [ "$OS" = "Linux" ]; then
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y python3 python3-pip python3-venv -qq
    elif command -v yum &> /dev/null; then
        yum install -y python3 python3-pip
    fi
elif [ "$OS" = "FreeBSD" ]; then
    # OPNsense/FreeBSD
    pkg install -y python3 py311-psutil py311-requests py311-urllib3
fi

# 5. Setup Directory & Download
echo "📂 Setting up $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "⬇️ Downloading Agent..."
curl -sL "$SERVER_URL/download/agent" -o agent.py

# 6. Python Environment Setup
if [ "$OS" = "Linux" ]; then
    # Linux needs a venv to avoid messing with system python
    if [ ! -d "venv" ]; then
        echo "Creating Python Virtual Environment..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    echo "Installing Python Libraries..."
    pip install python-socketio[client] websocket-client psutil requests urllib3
    PYTHON_EXEC="$INSTALL_DIR/venv/bin/python"
elif [ "$OS" = "FreeBSD" ]; then
    # FreeBSD/OPNsense uses system python packages we installed earlier
    PYTHON_EXEC="/usr/local/bin/python3"
fi

# 7. Configure Agent
if [ -z "$API_KEY" ]; then
    echo -e "${RED}⚠️ No API Key provided in arguments.${NC}"
    read -p "Enter Agent Secret Key: " API_KEY
fi

# Check for OPNsense specific config
OPN_CONFIG=""
if [ "$OS" = "FreeBSD" ]; then
    # Optional: If on OPNsense, we can ask for local API keys for full features
    # For automated install, we skip this and let user edit later if they want blocking features
    # Or you can add logic here to ask if interactive.
    echo "Creating OPNsense compatible config..."
    OPN_CONFIG=", \"opnsense_url\": \"https://localhost/api\""
fi

echo "📝 Creating Configuration..."
cat > agent_config.json <<EOF
{
    "server_url": "$SERVER_URL",
    "api_key": "$API_KEY",
    "agent_id": "$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo 'manual-id')"
    $OPN_CONFIG
}
EOF

# 8. Create & Start Service
echo "⚙️ Configuring Startup Service..."

if [ "$OS" = "Linux" ]; then
    # Systemd (Ubuntu/Debian/CentOS)
    cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=Arushi Cloud Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$PYTHON_EXEC $INSTALL_DIR/agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl restart $SERVICE_NAME

elif [ "$OS" = "FreeBSD" ]; then
    # RC.d (OPNsense/FreeBSD)
    cat > /usr/local/etc/rc.d/arushi-agent <<EOF
#!/bin/sh
# PROVIDE: arushi_agent
# REQUIRE: DAEMON
# KEYWORD: shutdown

. /etc/rc.subr

name="arushi_agent"
rcvar="arushi_agent_enable"
command="$PYTHON_EXEC"
command_args="$INSTALL_DIR/agent.py &"
pidfile="/var/run/arushi_agent.pid"

load_rc_config \$name
run_rc_command "\$1"
EOF
    chmod +x /usr/local/etc/rc.d/arushi-agent
    sysrc arushi_agent_enable="YES"
    service arushi-agent restart
fi

echo -e "${GREEN}✅ Success! Agent is running and connected.${NC}"