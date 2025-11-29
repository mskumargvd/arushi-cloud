# Arushi Cloud Agent Installer (Windows)
$SERVER_URL = "https://arushi-cloud-server-v1.onrender.com" # TODO: Replace with Render URL
$AGENT_DIR = "C:\ArushiAgent"
$AGENT_URL = "$SERVER_URL/download/agent"

Write-Host "--- Arushi Cloud Agent Installer ---" -ForegroundColor Green

# 1. Check Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Please run as Administrator!" -ForegroundColor Red
    exit
}

# 2. Setup Directory
if (!(Test-Path -Path $AGENT_DIR)) {
    New-Item -ItemType Directory -Force -Path $AGENT_DIR | Out-Null
}
Set-Location $AGENT_DIR

# 3. Install Python (if missing)
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Installing via Winget..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.11 --scope machine --accept-package-agreements --accept-source-agreements
    # Refresh env vars
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 4. Download Agent
Write-Host "Downloading Agent..."
Invoke-WebRequest -Uri $AGENT_URL -OutFile "agent.py"

# 5. Install Libs
Write-Host "Installing Dependencies..."
pip install python-socketio[client] psutil requests urllib3

# 6. Configure
$API_KEY = Read-Host "Enter your Agent API Key"
$config = @{
    server_url = $SERVER_URL
    api_key = $API_KEY
}
$config | ConvertTo-Json | Set-Content "agent_config.json"

# 7. Create Scheduled Task (Simpler than Service for Python)
Write-Host "Creating Background Task..."
$Action = New-ScheduledTaskAction -Execute "python" -Argument "$AGENT_DIR\agent.py"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "ArushiAgent" -Action $Action -Trigger $Trigger -Principal $Principal -Force

Write-Host "Starting Agent..."
Start-ScheduledTask -TaskName "ArushiAgent"

Write-Host "✅ Installation Complete!" -ForegroundColor Green
