# Starts the home kitchen stack: FastAPI always, Expo Metro unless -SkipExpo.
# Usage (from repo root or anywhere):
#   powershell -ExecutionPolicy Bypass -File scripts\start-home-stack.ps1
param(
    [switch]$SkipExpo
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "home-stack.ps1")

$root = Get-HomeStackRepoRoot
$serverDir = Join-Path $root "server"
$mobileDir = Join-Path $root "apps\mobile"

if (-not (Test-Path (Join-Path $serverDir "run.ps1"))) {
    throw "Could not find server\run.ps1 under $root"
}

Write-Host "AI Recipe home stack"
Write-Host "Repo: $root"
Write-Host ""

if (-not (Test-LocalPortListening -Port 8000)) {
    Write-Host "Starting API on port 8000..."
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $serverDir -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $serverDir "run.ps1")
    )
}
else {
    Write-Host "API already listening on port 8000."
}

if (-not $SkipExpo) {
    if (-not (Test-Path (Join-Path $mobileDir "package.json"))) {
        Write-Host "Skipping Expo: apps\mobile not found."
    }
    elseif (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "Skipping Expo: npm is not on PATH. Install Node.js 22 LTS to use Expo Go."
    }
    elseif (-not (Test-LocalPortListening -Port 8081)) {
        Write-Host "Starting Expo (Expo Go / Metro on port 8081)..."
        $expoCmd = "Set-Location -LiteralPath '$mobileDir'; if (-not (Test-Path 'node_modules')) { npm install }; npm start"
        Start-Process -FilePath "powershell.exe" -WorkingDirectory $mobileDir -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command", $expoCmd
        )
    }
    else {
        Write-Host "Metro already listening on port 8081."
    }
}

Write-Host "Waiting for API health..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2
        if ($health.status -eq "ok") {
            $healthy = $true
            $ollama = $health.ollama
            Write-Host "API is up. Ollama: $ollama"
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $healthy) {
    Write-Host "API did not respond yet. Leave the API window open and retry Test connection on the phone."
}

$urls = Get-HomeStackUrls
Write-Host ""
Write-Host "Home Wi-Fi API:        $($urls.LanApi)"
Write-Host "Tailscale IP API:      $($urls.TailscaleIpApi)"
Write-Host "Dedicated MagicDNS:    $($urls.DedicatedHttpApi)"
Write-Host "Optional HTTPS Serve:  $($urls.DedicatedHttpsApi)"
Write-Host "Expo Go (same Wi-Fi):  $($urls.ExpoHint)"
Write-Host ""
if (-not $urls.Tailscale.Installed) {
    Write-Host "Tailscale is not installed. For a dedicated URL, install Tailscale on this PC and each iPhone."
}
elseif (-not $urls.Tailscale.Running) {
    Write-Host "Tailscale is installed but not connected. Sign in, then re-run this script to refresh the dedicated URL."
}

$statusPath = Join-Path $env:TEMP "ai-recipe-home-stack.html"
Write-HomeStackStatusHtml -Urls $urls -Path $statusPath
Start-Process $statusPath

Write-Host "Status page opened. Use the dedicated Tailscale URL in the phone Settings tab."
Write-Host "Stop with:  powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\stop-home-stack.ps1`""
