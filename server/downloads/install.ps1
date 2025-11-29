# Arushi Cloud - Universal Windows Installer
# Usage: powershell -Command "..." -Key "YOUR_KEY"

param (
    [string]$Key = ""
)

$ServerUrl = "https://arushi-cloud-server-v1.onrender.com"
$InstallDir = "C:\ArushiAgent"
$AgentUrl = "$ServerUrl/download/agent"

Write-Host "--- 🚀 Installing Arushi Cloud Agent ---" -ForegroundColor Cyan

# 1. Check Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ Error: Please run PowerShell as Administrator" -ForegroundColor Red
    exit
}

# 2. Setup Directory
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}
Set-Location $InstallDir

# 3. Check & Install Python (Smart Fallback)
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Python not found. Installing via Winget..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.11 --scope machine --accept-package-agreements --accept-source-agreements
    
    # Refresh Environment Variables so we can use 'python' immediately
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 4. Download Agent Code
Write-Host "⬇️ Downloading Agent Script..."
try {
    Invoke-WebRequest -Uri $AgentUrl -OutFile "agent.py"
} catch {
    Write-Host "❌ Failed to download agent. Check Server URL." -ForegroundColor Red
    exit
}

# 5. Install Python Dependencies
Write-Host "📦 Installing Libraries..." -ForegroundColor Yellow
pip install python-socketio[client] websocket-client psutil requests urllib3

# 6. Configure
if ([string]::IsNullOrEmpty($Key)) {
    $Key = Read-Host "Enter Agent Secret Key"
}

$ConfigContent = @"
{
    "server_url": "$ServerUrl",
    "api_key": "$Key",
    "agent_id": "$([guid]::NewGuid())"
}
"@
Set-Content -Path "agent_config.json" -Value $ConfigContent

# 7. Create Persistence (Scheduled Task)
Write-Host "⚙️ Creating Background Task..."
$Action = New-ScheduledTaskAction -Execute "pythonw" -Argument "$InstallDir\agent.py"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Unregister old task if exists
Unregister-ScheduledTask -TaskName "ArushiAgent" -Confirm:$false -ErrorAction SilentlyContinue

# Register new task
Register-ScheduledTask -TaskName "ArushiAgent" -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null

# Start it now
Start-ScheduledTask -TaskName "ArushiAgent"

Write-Host "✅ Installation Complete! Agent running in background." -ForegroundColor Green