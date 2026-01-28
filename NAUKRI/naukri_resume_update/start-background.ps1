# Powershell script to start the scheduler in background
$ScriptPath = $PSScriptRoot
$LogFile = Join-Path $ScriptPath "logs\scheduler.log"

# Stop existing node scheduler processes if any (simple approach)
# Note: This kills ALL node processes running scheduler.js. Be careful.
Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like "*node*src/scheduler.js*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Write-Host "Starting Naukri Scheduler in background..."
Write-Host "Logs: $LogFile"

# Start-Process with -WindowStyle Hidden to run in background
$ArgumentList = "/c npm run start-scheduler > ""$LogFile"" 2>&1"
Start-Process -FilePath "cmd.exe" -ArgumentList $ArgumentList -WindowStyle Hidden

Write-Host "Scheduler started! Use Task Manager to stop it or run:"
Write-Host "Get-WmiObject Win32_Process | Where-Object { `$_.CommandLine -like '*node*src/scheduler.js*' } | ForEach-Object { Stop-Process -Id `$_.ProcessId -Force }"
