#!/bin/bash

# Arushi Cloud Agent Installer
# Supports: Linux (Systemd) and FreeBSD/OPNsense (RC.d)

SERVER_URL="https://arushi-cloud-server-v1.onrender.com" # TODO: Replace with Render URL in Prod
AGENT_DIR="/opt/arushi-agent"
AGENT_URL="$SERVER_URL/download/agent"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}--- Arushi Cloud Agent Installer ---${NC}"

# 1. Detect OS
OS="$(uname -s)"
echo "Detected OS: $OS"

# 2. Install Dependencies
if [ "$OS" = "Linux" ]; then
    if [ -f /etc/debian_version ]; then
        echo "Installing Python & Pip (Debian/Ubuntu)..."
        apt-get update -qq
        apt-get install -y python3 python3-pip python3-venv -qq
    elif [ -f /etc/redhat-release ]; then
        echo "Installing Python & Pip (RHEL/CentOS)..."
        yum install -y python3 python3-pip
    fi
elif [ "$OS" = "FreeBSD" ]; then
    echo "Installing Python (FreeBSD/OPNsense)..."
    pkg install -y python3 py39-psutil py39-requests py39-urllib3
fi

# 3. Setup Directory
echo "Setting up agent directory at $AGENT_DIR..."
mkdir -p "$AGENT_DIR"
cd "$AGENT_DIR"

# 4. Download Agent
echo "Downloading Agent..."
curl -sL "$AGENT_URL" -o agent.py

# 5. Setup Virtual Env (Linux Only - FreeBSD uses system packages usually)
if [ "$OS" = "Linux" ]; then
    echo "Creating Virtual Environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing Python Libs..."
    pip install python-socketio[client] psutil requests urllib3
fi

# 6. Configure
API_KEY=""
while [[ -z "$API_KEY" ]]; do
    read -p "Enter your Agent API Key: " API_KEY
done

cat > agent_config.json <<EOF
{
    "server_url": "$SERVER_URL",
    "api_key": "$API_KEY"
}
EOF

# OPNsense Specific Config
if [ "$OS" = "FreeBSD" ]; then
    echo -e "${GREEN}OPNsense Detected!${NC}"
    read -p "Enter OPNsense API Key: " OPN_KEY
    read -p "Enter OPNsense API Secret: " OPN_SECRET
    
    # Update config using jq or simple sed (since we just wrote it)
    # Re-writing for simplicity
cat > agent_config.json <<EOF
{
    "server_url": "$SERVER_URL",
    "api_key": "$API_KEY",
    "opnsense_key": "$OPN_KEY",
    "opnsense_secret": "$OPN_SECRET",
    "opnsense_url": "https://localhost/api"
}
EOF
fi

# 7. Create Service
if [ "$OS" = "Linux" ]; then
    echo "Creating Systemd Service..."
    cat > /etc/systemd/system/arushi-agent.service <<EOF
[Unit]
Description=Arushi Cloud Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$AGENT_DIR
ExecStart=$AGENT_DIR/venv/bin/python $AGENT_DIR/agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable arushi-agent
    systemctl restart arushi-agent

elif [ "$OS" = "FreeBSD" ]; then
    echo "Creating RC.d Service..."
    cat > /usr/local/etc/rc.d/arushi-agent <<EOF
#!/bin/sh
# PROVIDE: arushi_agent
# REQUIRE: DAEMON
# KEYWORD: shutdown

. /etc/rc.subr

name="arushi_agent"
rcvar="arushi_agent_enable"
command="/usr/local/bin/python3"
command_args="$AGENT_DIR/agent.py &"
pidfile="/var/run/arushi_agent.pid"

load_rc_config \$name
run_rc_command "\$1"
EOF
    chmod +x /usr/local/etc/rc.d/arushi-agent
    sysrc arushi_agent_enable="YES"
    service arushi-agent start
fi

echo -e "${GREEN}✅ Installation Complete! Agent is running.${NC}"
