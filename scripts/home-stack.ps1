# Shared helpers for the Windows home-stack launcher. Dot-source from other scripts.
$ErrorActionPreference = "Stop"

function Get-HomeStackRepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-LanIPv4Addresses {
    $rows = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.IPAddress -notlike "100.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        }
    return @($rows | Select-Object -ExpandProperty IPAddress -Unique)
}

function Get-TailscaleStatus {
    $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
    if (-not $cmd) {
        return [pscustomobject]@{
            Installed = $false
            Running   = $false
            IPv4      = $null
            DnsName   = $null
        }
    }

    $ipv4 = $null
    try {
        $ipv4 = (tailscale ip -4 2>$null | Select-Object -First 1).Trim()
        if ([string]::IsNullOrWhiteSpace($ipv4)) { $ipv4 = $null }
    }
    catch {
        $ipv4 = $null
    }

    $dnsName = $null
    try {
        $json = tailscale status --json 2>$null | ConvertFrom-Json
        $raw = [string]$json.Self.DNSName
        if ($raw) {
            $dnsName = $raw.TrimEnd(".")
        }
    }
    catch {
        $dnsName = $null
    }

    return [pscustomobject]@{
        Installed = $true
        Running   = -not [string]::IsNullOrWhiteSpace($ipv4)
        IPv4      = $ipv4
        DnsName   = $dnsName
    }
}

function Get-HomeStackUrls {
    $lanIps = @(Get-LanIPv4Addresses)
    $primaryLan = if ($lanIps.Count -gt 0) { $lanIps[0] } else { $null }
    $ts = Get-TailscaleStatus

    $lanApi = if ($primaryLan) { "http://${primaryLan}:8000" } else { $null }
    $tailscaleIpApi = if ($ts.IPv4) { "http://$($ts.IPv4):8000" } else { $null }
    $dedicatedHttp = if ($ts.DnsName) { "http://$($ts.DnsName):8000" } else { $null }
    $dedicatedHttps = if ($ts.DnsName) { "https://$($ts.DnsName)" } else { $null }

    return [pscustomobject]@{
        LanIps            = $lanIps
        LanApi            = $lanApi
        Tailscale         = $ts
        TailscaleIpApi    = $tailscaleIpApi
        DedicatedHttpApi  = $dedicatedHttp
        DedicatedHttpsApi = $dedicatedHttps
        ExpoHint          = if ($primaryLan) { "exp://${primaryLan}:8081" } else { $null }
    }
}

function Test-LocalPortListening {
    param([Parameter(Mandatory = $true)][int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Stop-ListenersOnPorts {
    param([int[]]$Ports)
    foreach ($port in $Ports) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        $pids = @($conns | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 })
        foreach ($procId in $pids) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Write-HomeStackStatusHtml {
    param(
        [Parameter(Mandatory = $true)]$Urls,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $apiUrl = $Urls.DedicatedHttpApi
    if (-not $apiUrl) { $apiUrl = $Urls.TailscaleIpApi }
    if (-not $apiUrl) { $apiUrl = $Urls.LanApi }
    if (-not $apiUrl) { $apiUrl = "Set a LAN or Tailscale URL in the app Settings (port 8000)." }
    $lan = if ($Urls.LanApi) { $Urls.LanApi } else { "-" }
    $tsIp = if ($Urls.TailscaleIpApi) { $Urls.TailscaleIpApi } else { "Tailscale not running" }
    $dedicated = if ($Urls.DedicatedHttpApi) { $Urls.DedicatedHttpApi } else { "MagicDNS name not available yet" }
    $https = if ($Urls.DedicatedHttpsApi) { "$($Urls.DedicatedHttpsApi) (after tailscale serve)" } else { "-" }
    $expo = if ($Urls.ExpoHint) { $Urls.ExpoHint } else { "Start Expo (port 8081), then refresh this page." }
    $metroUp = Test-LocalPortListening -Port 8081
    $expoQrBlock = if ($Urls.ExpoHint -and $metroUp) {
        $expoSrc = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=$([uri]::EscapeDataString($Urls.ExpoHint))"
        @"
  <h2>Open the app in Expo Go</h2>
  <p>On your iPhone (same Wi‑Fi), scan with the <strong>Camera</strong> app. This opens <strong>Expo Go</strong> and loads the recipe app UI.</p>
  <div class="qr"><img alt="Expo Go QR" src="$expoSrc" width="240" height="240" /></div>
  <p><code>$expo</code></p>
"@
    } else {
        @"
  <h2>Open the app in Expo Go</h2>
  <p>Waiting for Metro on port <strong>8081</strong>. When the Expo window is running, refresh this page (F5) to show the QR.</p>
  <p><code>$expo</code></p>
"@
    }

    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="8" />
  <title>AI Recipe — Home stack</title>
  <style>
    body { font-family: Segoe UI, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    code { background: #f3f3f3; padding: 0.15rem 0.35rem; }
    .qr { margin: 1rem 0; }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; }
    hr { margin: 1.5rem 0; border: none; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>AI Recipe home stack</h1>
  $expoQrBlock
  <hr />
  <h2>Home server API (Settings on the phone)</h2>
  <p>Type into <strong>Settings → Home server</strong>, then Test connection. Port <strong>8000</strong> — not Expo.</p>
  <p><strong>Dedicated Tailscale URL (preferred):</strong><br /><code>$dedicated</code></p>
  <p><strong>API URL for Settings:</strong><br /><code>$apiUrl</code></p>
  <ul>
    <li>Home Wi‑Fi API: <code>$lan</code></li>
    <li>Tailscale IP API: <code>$tsIp</code></li>
    <li>HTTPS name (optional Serve): <code>$https</code></li>
    <li>API docs on this PC: <a href="http://127.0.0.1:8000/docs">http://127.0.0.1:8000/docs</a></li>
  </ul>
  <p class="hint">This page refreshes every 8 seconds while Metro starts.</p>
</body>
</html>
"@
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    Set-Content -Path $Path -Value $html -Encoding UTF8
}
