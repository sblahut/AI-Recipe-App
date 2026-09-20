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
    if (-not $apiUrl) { $apiUrl = "http://127.0.0.1:8000" }

    $qrSrc = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=$([uri]::EscapeDataString($apiUrl))"
    $lan = if ($Urls.LanApi) { $Urls.LanApi } else { "—" }
    $tsIp = if ($Urls.TailscaleIpApi) { $Urls.TailscaleIpApi } else { "Tailscale not running" }
    $dedicated = if ($Urls.DedicatedHttpApi) { $Urls.DedicatedHttpApi } else { "MagicDNS name not available yet" }
    $https = if ($Urls.DedicatedHttpsApi) { "$($Urls.DedicatedHttpsApi) (after tailscale serve)" } else { "—" }
    $expo = if ($Urls.ExpoHint) { $Urls.ExpoHint } else { "Start Expo, then scan the QR in that terminal" }

    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AI Recipe — Home stack</title>
  <style>
    body { font-family: Segoe UI, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    code { background: #f3f3f3; padding: 0.15rem 0.35rem; }
    .qr { margin: 1rem 0; }
    h1 { font-size: 1.4rem; }
  </style>
</head>
<body>
  <h1>AI Recipe is starting on this PC</h1>
  <p>Put this URL in the iPhone app <strong>Settings → Home server</strong>, then Test connection.</p>
  <p><strong>Dedicated Tailscale URL (preferred):</strong><br /><code>$dedicated</code></p>
  <div class="qr"><img alt="QR for home server URL" src="$qrSrc" width="220" height="220" /></div>
  <p>Scan the QR to copy/type the same API URL. The Expo Go QR is in the Metro terminal (opens the app UI, not this API).</p>
  <ul>
    <li>Home Wi‑Fi API: <code>$lan</code></li>
    <li>Tailscale IP API: <code>$tsIp</code></li>
    <li>HTTPS name (optional Serve): <code>$https</code></li>
    <li>Expo Go (same Wi‑Fi): <code>$expo</code></li>
    <li>API docs on this PC: <a href="http://127.0.0.1:8000/docs">http://127.0.0.1:8000/docs</a></li>
  </ul>
</body>
</html>
"@
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    Set-Content -Path $Path -Value $html -Encoding UTF8
}
