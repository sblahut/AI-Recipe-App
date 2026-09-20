# Stops listeners on the API (8000) and Expo Metro (8081) ports.
# Does not quit Ollama.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "home-stack.ps1")

Write-Host "Stopping AI Recipe home stack (ports 8000 and 8081)..."
Stop-ListenersOnPorts -Ports @(8000, 8081)
Start-Sleep -Seconds 1
$apiUp = Test-LocalPortListening -Port 8000
$metroUp = Test-LocalPortListening -Port 8081
if ($apiUp -or $metroUp) {
    Write-Host "Some listeners are still up. API 8000=$apiUp  Metro 8081=$metroUp"
    exit 1
}
Write-Host "Home stack stopped."
